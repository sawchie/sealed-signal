import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import catalog from '../data/catalog-import.json' with { type: 'json' };
import references from '../data/retail-references.json' with { type: 'json' };
import announcements from '../data/announced-products.json' with { type: 'json' };
import { productRelease, releaseMatches } from '../lib/product-release.ts';

test('reviewed retail references target unique real products with positive sourced prices', () => {
  const seen = new Set();
  for (const reference of references) {
    assert.ok(reference.sourceName);
    assert.equal(new URL(reference.sourceUrl).protocol, 'https:');
    assert.match(reference.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    for (const [id, cents] of Object.entries(reference.products)) {
      assert.ok(!seen.has(id), `Duplicate retail reference ${id}`);
      seen.add(id);
      assert.ok(catalog.items.some(item => item.sourceProductId === Number(id)), id);
      assert.ok(Number.isInteger(cents) && cents > 0, id);
    }
  }
  assert.ok(seen.size >= 85);
});

test('expanded catalog preserves all existing records and unique exact variants', () => {
  assert.ok(catalog.items.length > 400);
  assert.equal(catalog.items.filter(p => p.existingId).length, 64);
  for (const key of ['id', 'sourceProductId', 'slug']) assert.equal(new Set(catalog.items.map(p => p[key])).size, catalog.items.length, key);
  assert.ok(Number.isFinite(Date.parse(catalog.providerUpdatedAt)));
  for (const p of catalog.items) {
    assert.ok(p.name && p.category && p.sourceUrl);
    assert.ok(p.marketCents === null || Number.isInteger(p.marketCents) && p.marketCents > 0, p.name);
    assert.ok(p.msrpCents === null || Number.isInteger(p.msrpCents) && p.msrpCents > 0 && p.retailSourceUrl, p.name);
    assert.ok(p.releaseDate === null || /^\d{4}-\d{2}-\d{2}$/.test(p.releaseDate), p.name);
    if (p.imageUrl) assert.ok(existsSync(new URL(`../public${p.imageUrl}`, import.meta.url)), `Missing photo: ${p.name}`);
    else assert.ok(announcements[p.id] && p.sourceImageUrl === null, `Unexplained missing photo: ${p.name}`);
  }
});

test('announced exact variants retain honest quote dates and join daily refresh groups', () => {
  const items = catalog.items.filter(p => announcements[p.id]);
  assert.equal(items.length, 48);
  assert.equal(items.filter(p => p.imageUrl).length, 47);
  assert.ok(items.some(p => p.marketCents === null));
  assert.ok(items.some(p => p.msrpCents === null));
  for (const p of items) {
    assert.equal(p.sourceProductId, announcements[p.id].sourceProductId);
    assert.ok(Number.isFinite(Date.parse(p.marketUpdatedAt)));
    assert.ok(Number.isInteger(p.sourceGroupId));
    assert.equal(new URL(announcements[p.id].sourceUrl).hostname, 'www.tcgplayer.com');
  }
  assert.equal(catalog.providerUpdatedAt, '2026-09-11T20:05:58.000Z');
});

test('release status changes on UTC release day, supports undated announcements, and filters compose', () => {
  const p = { id: 'tcg-712094', releaseDate: '2026-11-06' };
  assert.equal(productRelease(p, '2026-11-05T23:59:59Z').label, 'PREORDER');
  assert.equal(productRelease(p, '2026-11-06T00:00:00Z').upcoming, false);
  assert.equal(productRelease({ id: 'unknown', releaseDate: null }, '2026-09-12').upcoming, false);
  assert.equal(productRelease({ id: 'announced-new', releaseDate: '2027-01-01' }, '2026-09-12').label, 'ANNOUNCED');
  announcements['undated-test'] = { sourceUrl: 'https://www.tcgplayer.com/', expectedReleaseDate: null, providerPresale: false, dateContext: 'Announced' };
  try { assert.equal(productRelease({ id: 'undated-test', releaseDate: null }, '2026-09-12').label, 'ANNOUNCED'); }
  finally { delete announcements['undated-test']; }
  assert.equal(releaseMatches(true, 'upcoming'), true);
  assert.equal(releaseMatches(false, 'upcoming'), false);
  assert.equal(releaseMatches(true, 'released'), false);
  assert.equal(releaseMatches(true, 'all'), true);
});

test('every original source ID is present in the refreshed catalog', () => {
  const manifest = readFileSync(new URL('../data/tcgplayer-image-sources.ts', import.meta.url), 'utf8');
  const original = [...manifest.matchAll(/"([^"]+)": (\d+),/g)];
  for (const [, id, sourceId] of original) assert.ok(catalog.items.some(p => p.id === id && p.sourceProductId === Number(sourceId)), id);
});
