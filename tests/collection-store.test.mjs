import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { COLLECTION_KEY, addCollectionLot, emptyCollection, localCalendarDay, parseCollection } from '../lib/collection.ts';

const source = await readFile(new URL('../lib/collection-store.ts', import.meta.url), 'utf8');
let moduleId = 0;

// Exercise the real store with only React's subscription hook replaced by a
// synchronous test observer. Resolve its extensionless domain import for Node.
async function createStore() {
  assert.ok(source.includes('import { useSyncExternalStore } from "react";'));
  const testSource = source
    .replace('import { useSyncExternalStore } from "react";', 'const useSyncExternalStore = (subscribe, getSnapshot) => { subscribe(() => {}); return getSnapshot(); };')
    .replace('from "./collection"', `from ${JSON.stringify(new URL('../lib/collection.ts', import.meta.url).href)}`);
  const { outputText } = ts.transpileModule(testSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(`${outputText}\n// store instance ${moduleId++}`).toString('base64')}`);
}

function browser(t, initial = null) {
  const values = new Map(initial === null ? [] : [[COLLECTION_KEY, initial]]);
  const events = [];
  let queue = Promise.resolve();
  let writes = 0;
  let readError = null;
  let writeError = null;
  const storage = {
    getItem(key) { if (readError) throw readError; return values.get(key) ?? null; },
    setItem(key, value) { if (writeError) throw writeError; writes++; values.set(key, value); },
  };
  const navigator = { locks: {
    request(name, callback) {
      assert.equal(name, COLLECTION_KEY);
      const result = queue.then(() => callback({ name }));
      queue = result.catch(() => {});
      return result;
    },
  } };
  for (const [key, value] of Object.entries({ localStorage: storage, navigator, window: {
    addEventListener(name, callback) { assert.equal(name, 'storage'); events.push(callback); },
  } })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  return {
    navigator, values,
    get writes() { return writes; },
    setReadError(value) { readError = value; },
    setWriteError(value) { writeError = value; },
    notify() { for (const callback of events) callback({ key: COLLECTION_KEY }); },
  };
}

const product = { slug: '151-etb', name: '151 Elite Trainer Box', setName: '151', category: 'Elite Trainer Box',
  imageUrl: null, packCount: 9, msrpCents: 4999, marketCents: 12001, marketUpdatedAt: null };
function add(id) {
  return state => {
    const now = new Date();
    return addCollectionLot(state, product, 1, null, localCalendarDay(now), now.toISOString(), id);
  };
}

test('two store instances serialize concurrent adds and reread the committed collection', async t => {
  const env = browser(t);
  const first = await createStore();
  const second = await createStore();
  assert.equal(first.useCollection().state.lots.length, 0);
  assert.equal(second.useCollection().state.lots.length, 0);
  assert.deepEqual(await Promise.all([first.changeCollection(add('first')), second.changeCollection(add('second'))]), [true, true]);
  assert.equal(parseCollection(env.values.get(COLLECTION_KEY)).lots[0].quantity, 2);
  assert.equal(env.writes, 2);
  env.notify();
  assert.equal(first.useCollection().state.lots[0].quantity, 2);
  assert.equal(second.useCollection().state.lots[0].quantity, 2);
});

test('quota failures preserve committed records and recover on a later successful write', async t => {
  const env = browser(t);
  const store = await createStore();
  assert.equal(await store.changeCollection(add('first')), true);
  const before = store.storedCollectionBackup();
  env.setWriteError(new DOMException('Storage quota exceeded', 'QuotaExceededError'));
  assert.equal(await store.changeCollection(add('failed')), false);
  assert.equal(store.storedCollectionBackup(), before);
  assert.equal(store.useCollection().state.lots[0].quantity, 1);
  assert.match(store.useCollection().error, /Not saved.*quota/i);
  env.setWriteError(null);
  assert.equal(await store.changeCollection(add('recovered')), true);
  assert.equal(store.useCollection().state.lots[0].quantity, 2);
  assert.equal(store.useCollection().error, null);
});

test('unreadable storage never runs mutations and recovers after access returns', async t => {
  const env = browser(t);
  const store = await createStore();
  assert.equal(await store.changeCollection(add('first')), true);
  const before = env.values.get(COLLECTION_KEY);
  store.useCollection();
  env.setReadError(new DOMException('Storage access denied', 'SecurityError'));
  env.notify();
  assert.equal(store.useCollection().blocked, true);
  let called = false;
  assert.equal(await store.changeCollection(state => { called = true; return state; }), false);
  assert.equal(called, false);
  assert.equal(env.values.get(COLLECTION_KEY), before);
  assert.throws(() => store.storedCollectionBackup(), /denied/);
  env.setReadError(null);
  assert.equal(await store.changeCollection(add('recovered')), true);
  assert.equal(store.useCollection().blocked, false);
  assert.equal(store.useCollection().state.lots[0].quantity, 2);
});

test('corrupt data stays exportable and only explicit replacement restores writing', async t => {
  const broken = '{ damaged collection';
  const env = browser(t, broken);
  const store = await createStore();
  assert.equal(store.useCollection().blocked, true);
  assert.equal(store.storedCollectionBackup(), broken);
  assert.equal(await store.changeCollection(add('not-written')), false);
  assert.equal(env.values.get(COLLECTION_KEY), broken);
  assert.equal(env.writes, 0);
  assert.equal(await store.changeCollection(() => emptyCollection(), true), true);
  assert.equal(store.useCollection().blocked, false);
  assert.equal(store.useCollection().error, null);
  assert.equal(await store.changeCollection(add('restored')), true);
});

test('missing Web Locks fails closed without running mutations and permits backup export', async t => {
  const original = JSON.stringify(emptyCollection());
  const env = browser(t, original);
  delete env.navigator.locks;
  const store = await createStore();
  store.useCollection();
  let called = false;
  const change = state => { called = true; return state; };
  assert.equal(await store.changeCollection(change), false);
  assert.equal(await store.changeCollection(change, true), false);
  assert.equal(called, false);
  assert.equal(env.writes, 0);
  assert.equal(store.storedCollectionBackup(), original);
  assert.match(store.useCollection().error, /cannot safely coordinate.*HTTPS/);
});

test('lock-request failures do not write or change committed records', async t => {
  const original = JSON.stringify(emptyCollection());
  const env = browser(t, original);
  env.navigator.locks.request = async () => { throw new Error('Lock service denied'); };
  const store = await createStore();
  assert.equal(await store.changeCollection(add('never-written')), false);
  assert.equal(env.writes, 0);
  assert.equal(store.storedCollectionBackup(), original);
  assert.match(store.useCollection().error, /Not saved/);
});
