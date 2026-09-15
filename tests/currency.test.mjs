import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import seed from '../data/exchange-rates.json' with { type: 'json' };
import * as currency from '../lib/currency.ts';

const now = Date.parse('2026-09-15T12:00:00Z');
const providerRows = date => Object.entries(seed.rates).filter(([quote]) => quote !== 'USD').map(([quote, rate]) => ({ date, base: 'USD', quote, rate }));

test('currency conversions preserve source amounts, unavailable values, signs and minor-unit precision', () => {
  const before = structuredClone(seed);
  assert.equal(currency.convertedMoney(10000, 'USD', 'CAD', seed), '$138.87');
  assert.equal(currency.convertedMoney(10000, 'USD', 'EUR', seed), '€86.57');
  assert.equal(currency.convertedMoney(10000, 'USD', 'JPY', seed), '¥15,455');
  assert.equal(currency.convertedMoney(15455, 'JPY', 'USD', seed), '$100.00');
  assert.equal(currency.convertedMoney(-10000, 'USD', 'GBP', seed), '-£74.10');
  assert.equal(currency.convertedMoney(0, 'USD', 'JPY', seed), '¥0');
  for (const amount of [null, undefined, NaN, Infinity]) assert.equal(currency.convertedMoney(amount, 'USD', 'CAD', seed), 'Unavailable');
  assert.deepEqual(seed, before);
  for (const code of Object.keys(currency.CURRENCIES)) assert.equal(currency.isDisplayCurrency(code), true);
  for (const code of ['BTC', 'cad', null, '__proto__']) assert.equal(currency.isDisplayCurrency(code), false);
});

test('exchange snapshots reject malformed, incomplete, future, inconsistent or nonpositive rates', () => {
  assert.deepEqual(currency.parseExchangeRates(seed, now), seed);
  for (const patch of [{ base: 'EUR' }, { date: '2026-02-30' }, { date: '2026-09-16' }, { checkedAt: 'bad' }, { checkedAt: '2026-09-13T00:00:00Z' }, { rates: {} }, { rates: { ...seed.rates, USD: 2 } }, ...[null, -1, 0, '1.4', NaN, Infinity].map(CAD => ({ rates: { ...seed.rates, CAD } }))]) assert.equal(currency.parseExchangeRates({ ...seed, ...patch }, now), null);
  const rows = providerRows('2026-09-14');
  assert.equal(currency.parseProviderRates(rows, now).date, '2026-09-14');
  for (const bad of [null, [], rows.slice(1), [...rows.slice(1), rows[1]], rows.map(row => ({ ...row, base: 'EUR' })), providerRows('2026-09-01'), rows.map((row, i) => i ? row : { ...row, date: '2026-09-13' })]) assert.throws(() => currency.parseProviderRates(bad, now));
});

test('daily FX refresh persists last-good rates, rejects redirects and failures, and cannot roll back newer data', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0002_talented_next_avengers.sql', import.meta.url), 'utf8'));
  const d1 = { prepare: sql => ({ bind: (...args) => ({ first: async () => db.prepare(sql).get(...args) ?? null, run: async () => db.prepare(sql).run(...args) }) }) };
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL('../db/exchange-rates.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = { '../data/exchange-rates.json': { default: seed }, '../lib/currency': currency, './index': { getD1: () => d1 } };
  new Function('require', 'exports', compiled)(path => dependencies[path], exports);
  const originalFetch = globalThis.fetch;
  const today = new Date().toISOString().slice(0, 10);
  let response = () => Response.json(providerRows(today));
  globalThis.fetch = async (url, options) => { assert.equal(url, currency.RATE_URL); assert.equal(options.redirect, 'manual'); return response(); };
  try {
    assert.deepEqual(await exports.getExchangeRates(), seed);
    await exports.refreshExchangeRates();
    const good = await exports.getExchangeRates();
    assert.equal(good.date, today);
    assert.deepEqual(good.rates, seed.rates);
    await exports.refreshExchangeRates();
    assert.equal(db.prepare('SELECT count(*) AS n FROM exchange_rates').get().n, 1);
    for (const failure of [() => new Response('', { status: 302 }), () => new Response('', { status: 503 }), () => Response.json([]), () => { throw new Error('Network unavailable'); }]) {
      response = failure;
      await assert.rejects(exports.refreshExchangeRates());
      assert.equal((await exports.getExchangeRates()).date, good.date);
    }
    response = () => Response.json(providerRows(new Date(Date.now() - 86400_000).toISOString().slice(0, 10)));
    await assert.rejects(exports.refreshExchangeRates(), /Older/);
    assert.equal((await exports.getExchangeRates()).date, today);
  } finally { globalThis.fetch = originalFetch; db.close(); }
});
