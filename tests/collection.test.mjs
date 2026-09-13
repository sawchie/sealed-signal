import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyCollection, parseCollection, ownedQuantity, addCollectionLot, updateCollectionLot,
  removeCollectionLot, recordCollectionSale, undoCollectionSale, summarizeCollection, recordCollectionSnapshot,
  localCalendarDay, MAX_COLLECTION_BACKUP_BYTES,
} from '../lib/collection.ts';

const now = '2026-09-13T12:00:00.000Z';
const product = { slug: '151-etb', name: '151 Elite Trainer Box', setName: '151', category: 'Elite Trainer Box',
  imageUrl: '/product-images/151.jpg', packCount: 9, msrpCents: 4999, marketCents: 12001, marketUpdatedAt: now };
const add = (state = emptyCollection(), overrides = {}, id = 'lot-1', quantity = 3, cost = 4001) =>
  addCollectionLot(state, { ...product, ...overrides }, quantity, cost, '2026-09-01', now, id);
const sale = { id: 'sale-1', lotId: 'lot-1', quantity: 1, proceedsCents: 10001, feesCents: 1001, soldOn: '2026-09-12' };
const parse = value => parseCollection(JSON.stringify(value), now);

test('empty and valid backups round-trip; unknown cost is not replaced by MSRP', () => {
  assert.deepEqual(parseCollection(null), emptyCollection());
  const state = add(emptyCollection(), {}, 'unknown', 2, null);
  assert.equal(state.lots[0].unitCostCents, null);
  assert.deepEqual(parse(state), state);
  const summary = summarizeCollection(state, [product]);
  assert.equal(summary.retailCents, 9998);
  assert.equal(summary.paidCents, 0);
  assert.equal(summary.costedUnits, 0);
  assert.equal(summary.unrealizedUnits, 0);
  assert.equal(summary.packCostPacks, 0);
});

test('purchase and sale days use the local calendar while timestamps remain UTC instants', () => {
  const originalZone = process.env.TZ;
  try {
    for (const [zone, instant, expectedDay, futureDay] of [
      ['America/Denver', '2026-09-14T01:00:00.000Z', '2026-09-13', '2026-09-14'],
      ['Asia/Tokyo', '2026-09-13T16:00:00.000Z', '2026-09-14', '2026-09-15'],
    ]) {
      process.env.TZ = zone;
      assert.equal(localCalendarDay(new Date(instant)), expectedDay);
      const state = addCollectionLot(emptyCollection(), product, 1, null, expectedDay, instant, 'local-date');
      const sold = recordCollectionSale(state, { ...sale, lotId: 'local-date', soldOn: expectedDay }, instant);
      assert.equal(parseCollection(JSON.stringify(sold), instant).lots[0].addedAt, instant);
      assert.throws(() => addCollectionLot(emptyCollection(), product, 1, null, futureDay, instant, 'future'));
      assert.throws(() => recordCollectionSale(state, { ...sale, lotId: 'local-date', soldOn: futureDay }, instant));
      assert.throws(() => parseCollection(JSON.stringify({ ...state, lots: [{ ...state.lots[0], addedAt: new Date(Date.parse(instant) + 1000).toISOString() }] }), instant));
      const observed = recordCollectionSnapshot(state, [product], instant);
      assert.deepEqual(parseCollection(JSON.stringify(observed), instant), observed);
      assert.throws(() => parseCollection(JSON.stringify({ ...observed, snapshots: [{ ...observed.snapshots[0], at: new Date(Date.parse(instant) + 1000).toISOString() }] }), instant));
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
  assert.throws(() => localCalendarDay(new Date('invalid')));
});

test('backup limit counts UTF-8 bytes, matching the downloadable file size', () => {
  const raw = JSON.stringify({ ...emptyCollection(), padding: 'é'.repeat(MAX_COLLECTION_BACKUP_BYTES / 2) });
  assert.ok(raw.length < MAX_COLLECTION_BACKUP_BYTES);
  assert.ok(new TextEncoder().encode(raw).byteLength > MAX_COLLECTION_BACKUP_BYTES);
  assert.throws(() => parseCollection(raw, now), /too large/);
  assert.deepEqual(parseCollection(JSON.stringify({ ...emptyCollection(), padding: 'é'.repeat(100) }), now), emptyCollection());
});

test('held values and realized profit use exact cents, quantities and matched coverage', () => {
  const original = add();
  const state = recordCollectionSale(original, sale, now);
  assert.equal(original.sales.length, 0);
  assert.equal(ownedQuantity(state, state.lots[0]), 2);
  const result = summarizeCollection(state, [product]);
  assert.equal(result.ownedUnits, 2);
  assert.equal(result.distinctProducts, 1);
  assert.equal(result.marketCents, 24002);
  assert.equal(result.retailCents, 9998);
  assert.equal(result.paidCents, 8002);
  assert.equal(result.unrealizedCents, 16000);
  assert.equal(result.unrealizedUnits, 2);
  assert.equal(result.knownPacks, 18);
  assert.equal(result.packCostCents, 8002);
  assert.equal(result.packCostPacks, 18);
  assert.equal(result.saleProceedsCents, 10001);
  assert.equal(result.saleFeesCents, 1001);
  assert.equal(result.realizedCents, 4999);
  assert.equal(result.realizedUnits, 1);
  assert.equal(result.soldUnits, 1);
  assert.deepEqual(result.setPacks, [{ setName: '151', units: 2, packs: 18, unknownPackUnits: 0 }]);
});

test('repeated adds merge matching unsold batches but preserve different cost, date and sold batches', () => {
  const original = add();
  const merged = add(original, {}, 'next-id', 2);
  assert.equal(merged.lots.length, 1);
  assert.equal(merged.lots[0].quantity, 5);
  assert.equal(original.lots[0].quantity, 3);
  assert.equal(add(merged, {}, 'new-cost', 1, null).lots.length, 2);
  assert.equal(addCollectionLot(merged, product, 1, 4001, '2026-09-02', now, 'new-date').lots.length, 2);
  assert.equal(add(recordCollectionSale(original, sale, now), {}, 'after-sale', 1).lots.length, 2);
  assert.throws(() => add(original, {}, 'lot-1', 1));
});

test('pack cost numerator and denominator exclude unknown costs and unknown pack counts together', () => {
  let state = add(emptyCollection(), {}, 'known', 2, 1000);
  state = add(state, {}, 'free', 1, 0);
  state = add(state, {}, 'unknown-cost', 3, null);
  const unknownPack = { ...product, slug: 'unknown-pack', packCount: null, marketCents: null, msrpCents: null };
  state = add(state, unknownPack, 'unknown-pack', 4, 2000);
  const result = summarizeCollection(state, [product, unknownPack]);
  assert.equal(result.packCostCents, 2000);
  assert.equal(result.packCostPacks, 27);
  assert.equal(result.knownPacks, 54);
  assert.equal(result.packKnownUnits, 6);
  assert.equal(result.costedUnits, 7);
  assert.equal(result.pricedUnits, 6);
  assert.equal(result.retailUnits, 6);
  assert.equal(result.unrealizedUnits, 3);
  assert.equal(result.unrealizedCents, 3 * 12001 - 2000);
  assert.equal(result.setPacks[0].unknownPackUnits, 4);
});

test('removed catalog products retain owned metadata and verified packs but have no current valuation', () => {
  const result = summarizeCollection(add(), []);
  assert.equal(result.knownPacks, 27);
  assert.equal(result.marketCents, 0);
  assert.equal(result.pricedUnits, 0);
  assert.equal(result.retailUnits, 0);
  assert.equal(result.unrealizedUnits, 0);
});

test('unknown-cost sales do not fabricate realized returns; deliberate zero-cost sales do', () => {
  const unknown = recordCollectionSale(add(emptyCollection(), {}, 'lot-1', 3, null), sale, now);
  assert.equal(summarizeCollection(unknown, [product]).realizedUnits, 0);
  const free = recordCollectionSale(add(emptyCollection(), {}, 'lot-1', 3, 0), sale, now);
  assert.equal(summarizeCollection(free, [product]).realizedCents, 9000);
});

test('edits, sales, undo and removal are immutable and protect sold inventory', () => {
  const initial = add();
  const state = recordCollectionSale(initial, { ...sale, quantity: 2 }, now);
  assert.throws(() => recordCollectionSale(state, { ...sale, id: 'too-many', quantity: 2 }, now));
  assert.throws(() => updateCollectionLot(state, 'lot-1', { quantity: 1, unitCostCents: 0, acquiredOn: '2026-09-01' }, now));
  assert.throws(() => updateCollectionLot(state, 'lot-1', { quantity: 3, unitCostCents: 0, acquiredOn: '2026-09-13' }, now));
  assert.throws(() => removeCollectionLot(state, 'lot-1'));
  const updated = updateCollectionLot(state, 'lot-1', { quantity: 2, unitCostCents: null, acquiredOn: '2026-09-01' }, now);
  assert.equal(ownedQuantity(updated, updated.lots[0]), 0);
  assert.equal(state.lots[0].quantity, 3);
  const undone = undoCollectionSale(state, 'sale-1');
  assert.equal(ownedQuantity(undone, undone.lots[0]), 3);
  assert.equal(state.sales.length, 1);
  assert.equal(removeCollectionLot(undone, 'lot-1').lots.length, 0);
  assert.throws(() => undoCollectionSale(state, 'missing'));
  assert.throws(() => removeCollectionLot(state, 'missing'));
});

test('malformed backups fail closed instead of silently emptying user records', () => {
  for (const raw of ['', '{bad', 'null', '[]', '1']) assert.throws(() => parseCollection(raw, now));
  for (const version of [0, 2, '1', null]) assert.throws(() => parse({ ...emptyCollection(), version }));
  const valid = add();
  for (const quantity of [0, -1, 1.5, 10001, null, '2', Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => parse({ ...valid, lots: [{ ...valid.lots[0], quantity }] }));
  }
  for (const unitCostCents of [-1, .5, 100000001, '100', undefined]) {
    assert.throws(() => parse({ ...valid, lots: [{ ...valid.lots[0], unitCostCents }] }));
  }
  for (const acquiredOn of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-09-14', '9/1/2026']) {
    assert.throws(() => parse({ ...valid, lots: [{ ...valid.lots[0], acquiredOn }] }));
  }
  assert.throws(() => parse({ ...valid, lots: [...valid.lots, ...valid.lots] }));
  assert.throws(() => parse({ ...valid, lots: [{ ...valid.lots[0], imageUrl: 'javascript:alert(1)' }] }));
  assert.throws(() => parse({ ...valid, lots: [{ ...valid.lots[0], packCount: 0 }] }));
  assert.throws(() => parse({ ...valid, sales: [{ ...sale, lotId: 'missing' }] }));
  assert.throws(() => parse({ ...valid, sales: [sale, sale] }));
  assert.throws(() => parse({ ...valid, sales: [{ ...sale, quantity: 4 }] }));
  assert.throws(() => parse({ ...valid, sales: [{ ...sale, soldOn: '2026-08-31' }] }));
  assert.throws(() => parse({ ...valid, sales: [{ ...sale, soldOn: '2026-09-14' }] }));
  assert.throws(() => parse({ ...valid, lots: Array.from({ length: 101 }, (_, i) => ({ ...valid.lots[0], id: `lot-${i}`, quantity: 10000 })) }));
  assert.throws(() => parse({ ...valid, sales: Array(10001).fill(sale) }));
  assert.throws(() => parseCollection(' '.repeat(12000001), now));
});

test('snapshot history is observed only, has coverage and separates holdings changes', () => {
  const empty = emptyCollection();
  assert.equal(recordCollectionSnapshot(empty, [product], now), empty);
  const state = recordCollectionSnapshot(add(), [product], now);
  assert.equal(state.snapshots.length, 1);
  assert.equal(state.snapshots[0].marketCents, 36003);
  assert.equal(recordCollectionSnapshot(state, [product], '2026-09-13T13:00:00Z'), state);
  const revised = recordCollectionSnapshot(state, [{ ...product, marketCents: null }], '2026-09-13T14:00:00Z');
  assert.equal(revised.snapshots.length, 1);
  assert.equal(revised.snapshots[0].pricedUnits, 0);
  const nextDay = recordCollectionSnapshot(revised, [product], '2026-09-15T12:00:00Z');
  assert.equal(nextDay.snapshots.length, 2);
  const changed = updateCollectionLot(nextDay, 'lot-1', { quantity: 2, unitCostCents: 4001, acquiredOn: '2026-09-01' }, '2026-09-15T12:00:00Z');
  const next = recordCollectionSnapshot(changed, [product], '2026-09-16T12:00:00Z');
  assert.notEqual(next.snapshots[1].holdingsKey, next.snapshots[2].holdingsKey);
  const soldAll = recordCollectionSale(next, { ...sale, quantity: 2 }, '2026-09-16T12:00:00Z');
  const closed = recordCollectionSnapshot(soldAll, [product], '2026-09-16T13:00:00Z');
  assert.equal(closed.snapshots.at(-1).units, 0);
  assert.equal(closed.snapshots.at(-1).holdingsKey, '[]');
  assert.throws(() => recordCollectionSnapshot(next, [product], now));
});

test('snapshot retention is bounded and imports validate coverage and chronology', () => {
  let state = add();
  for (let i = 0; i < 400; i++) {
    const date = new Date(Date.parse(now) + i * 86400000).toISOString();
    state = recordCollectionSnapshot(state, [product], date);
  }
  assert.equal(state.snapshots.length, 365);
  const row = state.snapshots[0];
  const importAt = '2028-01-01T12:00:00Z';
  assert.deepEqual(parseCollection(JSON.stringify(state), importAt), state);
  for (const changes of [{ pricedUnits: 4 }, { units: -1 }, { marketCents: -1 }, { at: '2027-02-30T12:00:00Z' }, { holdingsKey: '' }]) {
    assert.throws(() => parseCollection(JSON.stringify({ ...state, snapshots: [{ ...row, ...changes }] }), importAt));
  }
  assert.throws(() => parseCollection(JSON.stringify({ ...state, snapshots: [...state.snapshots].reverse() }), importAt));
  assert.throws(() => parseCollection(JSON.stringify({ ...state, snapshots: Array(366).fill(row) }), importAt));
});
