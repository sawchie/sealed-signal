import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import catalog from '../data/catalog-import.json' with { type: 'json' };
import references from '../data/retail-references.json' with { type: 'json' };

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
    assert.ok(existsSync(new URL(`../public${p.imageUrl}`, import.meta.url)), `Missing photo: ${p.name}`);
  }
});

test('every original source ID is present in the refreshed catalog', () => {
  const manifest = readFileSync(new URL('../data/tcgplayer-image-sources.ts', import.meta.url), 'utf8');
  const original = [...manifest.matchAll(/"([^"]+)": (\d+),/g)];
  for (const [, id, sourceId] of original) assert.ok(catalog.items.some(p => p.id === id && p.sourceProductId === Number(sourceId)), id);
});
