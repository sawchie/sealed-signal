import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, validateCostFields, defaultCostFields, parseCostProfile, maximumBuyPrice, priceFreshness } from '../lib/buy-check.ts';
import { calculateProfitability, DEFAULT_PROFIT_ASSUMPTIONS } from '../lib/domain/profit.ts';
import { readCatalogState, writeCatalogState, categoryMatches, safeCatalogReturn } from '../lib/catalog-state.ts';
import { parsePriceWatches, watchReached } from '../lib/price-watch.ts';
import { historyByDay } from '../lib/price-history.ts';
import facts from '../data/product-facts.json' with { type: 'json' };
import catalog from '../data/catalog-import.json' with { type: 'json' };

test('selling costs reject invalid text, blank, negative, nonfinite and out-of-range values', () => {
  for (const key of ['feeRate', 'fixedFee', 'shipping', 'taxRate']) for (const value of ['abc', '', '-1', 'Infinity', '1e3', '1.234']) {
    const result = validateCostFields({ ...defaultCostFields(), includeTax: true, [key]: value });
    assert.equal(result.assumptions, null, `${key}: ${value}`); assert.ok(result.errors[key]);
  }
  assert.equal(validateCostFields({ ...defaultCostFields(), feeRate: '101' }).assumptions, null);
  assert.equal(validateCostFields({ ...defaultCostFields(), feeRate: '0' }).assumptions.sellingPlatformFeeRate, 0);
  assert.equal(parseAmount('$1,234.50'), 123450);
  assert.equal(parseAmount('12,34.50'), null);
  assert.equal(parseAmount('0', { positive: true }), null);
  assert.equal(parseAmount('100', { rate: true }), 1);
  assert.equal(parseAmount('1000001'), null);
});
test('saved cost profiles fail closed and preserve deliberate zeros', () => {
  assert.equal(parseCostProfile('{broken'), null);
  assert.equal(parseCostProfile(JSON.stringify({ ...defaultCostFields(), feeRate: 'abc' })), null);
  assert.deepEqual(parseCostProfile(JSON.stringify(defaultCostFields())), defaultCostFields());
});
test('maximum buy price is maximal and meets both targets after rounded fees and tax', () => {
  for (const price of [500, 4999, 55455, 131612]) for (const tax of [0, .0825]) for (const profit of [0, 300, 1000, 2500]) {
    const costs = { ...DEFAULT_PROFIT_ASSUMPTIONS, sellerShippingCostCents: 700, purchaseSalesTaxTreatment: 'included-in-cost', purchaseSalesTaxRate: tax };
    const limit = maximumBuyPrice(price, costs, profit, 20);
    if (limit !== null) {
      const at = calculateProfitability({ marketPriceCents: price, purchasePriceCents: limit }, costs);
      assert.ok(at.profitCents >= profit && at.profitCents / at.acquisitionCostCents * 100 >= 20);
      const above = calculateProfitability({ marketPriceCents: price, purchasePriceCents: limit + 1 }, costs);
      assert.ok(above.profitCents < profit || above.profitCents / above.acquisitionCostCents * 100 < 20);
    }
  }
  assert.equal(maximumBuyPrice(null, DEFAULT_PROFIT_ASSUMPTIONS, 0, 0), null);
  assert.equal(maximumBuyPrice(10, { ...DEFAULT_PROFIT_ASSUMPTIONS, sellerShippingCostCents: 100 }, 0, 0), null);
});
test('category groups and exact selections have one meaning', () => {
  assert.ok(categoryMatches('Pokémon Center Elite Trainer Box', 'group:etb'));
  assert.ok(categoryMatches('Booster Box', 'Booster Box'));
  assert.equal(categoryMatches('Elite Trainer Box', 'Booster Box'), false);
  assert.ok(categoryMatches('Mini Tin', 'group:tin'));
});
test('catalog URL round-trips search, type, set, signal, sort, view, saved and page count', () => {
  const state = { ...readCatalogState(''), query: '151 etb', category: 'group:etb', setName: '151', recommendation: 'BUY', sort: 'roi-desc', view: 'table', savedOnly: true, count: 144 };
  state.numeric.profitMin = '-5';
  assert.deepEqual(readCatalogState(writeCatalogState(state).slice(1)), state);
  assert.equal(readCatalogState('?sort=invalid&count=Infinity').count, 48);
  for (const value of ['https://evil.test/', '//evil.test', '/products/abc', '/\\evil.test']) assert.equal(safeCatalogReturn(value), '/');
  assert.equal(safeCatalogReturn('/?q=151'), '/?q=151');
});
test('market target alerts require fresh exact-product quotes and valid targets', () => {
  const now = '2026-09-12T12:00:00Z';
  assert.equal(watchReached({ targetCents: 10000, direction: 'below' }, 9000, '2026-09-11T12:00:00Z', now), true);
  assert.equal(watchReached({ targetCents: 10000, direction: 'below' }, 9000, '2026-08-11T12:00:00Z', now), false);
  assert.equal(watchReached({ targetCents: 10000, direction: 'above' }, null, null, now), false);
  assert.deepEqual(parsePriceWatches('{bad'), {});
  assert.deepEqual(parsePriceWatches('{"abc":{"targetCents":-1,"direction":"below"}}'), {});
  assert.equal(priceFreshness('2026-09-01', now), 'Older snapshot');
});
test('history retains actual unavailable observations and provider changes without invented dates', () => {
  const row = { amountCents: 1000, currency: 'USD', observedAt: '2026-09-01T12:00:00Z', source: 'Test', sourceUrl: null, provider: 'a' };
  const result = historyByDay([row, { ...row, amountCents: 1200, observedAt: '2026-09-01T18:00:00Z' }, { ...row, amountCents: null, observedAt: '2026-09-04T00:00:00Z' }, { ...row, currency: 'EUR' }], 'USD');
  assert.equal(result.length, 2); assert.equal(result[0].amountCents, 1200); assert.equal(result[1].amountCents, null);
});
test('source-backed contents match exact IDs and distinguish regular/PC editions', () => {
  const bySource = id => facts[catalog.items.find(item => item.sourceProductId === id).id];
  assert.equal(bySource(501999).packCount, 11); assert.equal(bySource(503313).packCount, 9);
  assert.equal(bySource(503313).releaseDate, '2023-09-22');
  assert.ok(Object.values(facts).filter(row => row.packCount !== null).length >= 300);
  for (const [id, row] of Object.entries(facts)) {
    assert.ok(catalog.items.some(item => item.id === id && item.sourceProductId === row.sourceProductId));
    assert.equal(new URL(row.sourceUrl).protocol, 'https:');
    assert.ok(row.packCount === null || Number.isSafeInteger(row.packCount) && row.packCount > 0);
  }
  const meganium = catalog.items.find(item => item.name === 'Ascended Heroes Mega Meganium ex Box');
  assert.notEqual(facts[meganium.id].packCount, 1, 'Malformed promo bullet must not become the pack count');
});
