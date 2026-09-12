import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
import { parseSavedProducts, emptySavedProducts } from '../lib/saved-products.ts';
import { validRefreshClaims, REFRESH_AUDIENCE, selectMarketCents, validateProviderTimestamp } from '../lib/refresh-validation.ts';

test('workflow identity requires a valid RSA signature, not just matching claims', async () => {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL('../db/refresh-auth.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', compiled)(() => ({ validRefreshClaims }), exports);
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-key' };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => { assert.equal(options.redirect, 'manual', 'Workers require manual redirect rejection'); assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks'); return Response.json({ keys: [jwk] }); };
  try {
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: 'https://token.actions.githubusercontent.com', aud: REFRESH_AUDIENCE, repository_id: '1342934486', repository_owner_id: '319643758', repository: 'sawchie/sealed-signal', ref: 'refs/heads/main', workflow_ref: 'sawchie/sealed-signal/.github/workflows/refresh-prices.yml@refs/heads/main', event_name: 'workflow_dispatch', iat: now, nbf: now, exp: now + 300 };
    const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = `${encoded({ alg: 'RS256', kid: 'test-key' })}.${encoded(claims)}`;
    const signature = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(payload))).toString('base64url');
    const request = token => new Request(REFRESH_AUDIENCE, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(await exports.isRefreshRequest(request(`${payload}.${signature}`)), true);
    assert.equal(await exports.isRefreshRequest(request(`${payload}.${Buffer.alloc(256).toString('base64url')}`)), false);
    assert.equal(await exports.isRefreshRequest(request(`${encoded({ alg: 'none', kid: 'test-key' })}.${encoded(claims)}.${signature}`)), false);
    assert.equal(await exports.isRefreshRequest(request('not-a-jwt')), false);
  } finally { globalThis.fetch = originalFetch; }
});

test('saved list validates slugs, preserves preferences, and recovers corrupt storage', () => {
  for (const input of [null, '', '{', 'null', '[]', '{"slugs":null}']) assert.deepEqual(parseSavedProducts(input), emptySavedProducts());
  assert.deepEqual(parseSavedProducts(JSON.stringify({ slugs: ['151-etb', '151-etb', '<script>', 3, 'pc-etb'], openSaved: false })), { slugs: ['151-etb', 'pc-etb'], openSaved: false });
  assert.equal(parseSavedProducts('{"slugs":["etb"]}').openSaved, true);
});

test('refresh authorization is limited to our exact repository, workflow and main branch', () => {
  const claims = { iss: 'https://token.actions.githubusercontent.com', aud: REFRESH_AUDIENCE,
    repository_id: '1342934486', repository_owner_id: '319643758', repository: 'sawchie/sealed-signal', ref: 'refs/heads/main',
    workflow_ref: 'sawchie/sealed-signal/.github/workflows/refresh-prices.yml@refs/heads/main', event_name: 'schedule',
    iat: 995, nbf: 995, exp: 1200 };
  assert.equal(validRefreshClaims(claims, 1000), true);
  for (const key of ['iss', 'aud', 'repository_id', 'repository_owner_id', 'repository', 'ref', 'workflow_ref', 'event_name']) {
    assert.equal(validRefreshClaims({ ...claims, [key]: 'untrusted' }, 1000), false, key);
  }
  for (const patch of [{ exp: 1000 }, { exp: '1200' }, { iat: 0 }, { nbf: 1100 }, { iat: 1100 }]) assert.equal(validRefreshClaims({ ...claims, ...patch }, 1000), false);
});

test('provider quotes require a single exact Normal market price and a recent real timestamp', () => {
  const row = { productId: 1, subTypeName: 'Normal', marketPrice: 45.67 };
  assert.equal(selectMarketCents([row], 1), 4567);
  assert.equal(selectMarketCents([row], 2), null);
  assert.equal(selectMarketCents([row, row], 1), null);
  for (const value of [0, -1, '45', null, NaN, Infinity, 100001]) assert.equal(selectMarketCents([{ ...row, marketPrice: value }], 1), null);
  assert.equal(selectMarketCents([{ ...row, subTypeName: 'Holofoil' }], 1), null);
  const now = Date.parse('2026-09-12T00:00:00Z');
  assert.equal(validateProviderTimestamp('2026-09-11T20:05:58Z', now), '2026-09-11T20:05:58.000Z');
  for (const value of ['bad', '2026-09-01', '2026-09-15']) assert.throws(() => validateProviderTimestamp(value, now));
});

test('daily refresh writes real schema safely, is idempotent, and preserves admin/newer/missing values', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_skinny_silver_fox.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0001_dazzling_gorilla_man.sql', import.meta.url), 'utf8'));
  const products = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, slug: `product-${index}`, name: `Product ${index}`, shortName: null, setName: 'Test set', series: null, category: 'Booster Box', releaseDate: null, imageUrl: null, msrpCents: 1000, retailPriceSource: null, currency: 'USD', notes: null, aliases: ['bb'] }));
  const catalog = { items: products.map((p, index) => ({ ...p, sourceGroupId: 1, sourceProductId: index, sourceUrl: `https://www.tcgplayer.com/product/${index}` })) };
  let rows = catalog.items.map(item => ({ productId: item.sourceProductId, subTypeName: 'Normal', marketPrice: 20 }));
  const d1 = { prepare: sql => ({ bind: (...args) => ({ sql, args }) }), batch: async queries => {
    assert.ok(queries.length <= 30, 'bounded below free D1 per-request query limit');
    db.exec('BEGIN');
    try { const result = queries.map(q => ({ meta: db.prepare(q.sql).run(...q.args) })); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL('../db/refresh-prices.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = { '../data/catalog-import.json': { default: catalog }, '../data/products': { seedProducts: products }, './index': { getD1: () => d1 }, '../lib/refresh-validation': { selectMarketCents, validateProviderTimestamp } };
  new Function('require', 'exports', compiled)(path => { assert.ok(dependencies[path], path); return dependencies[path]; }, exports);
  const originalFetch = globalThis.fetch;
  const observedAt = new Date(Date.now() - 3600000).toISOString();
  globalThis.fetch = async (url, options) => { assert.equal(options.redirect, 'manual'); return url.endsWith('/last-updated.txt') ? new Response(observedAt) : Response.json({ results: rows }); };
  try {
    assert.equal((await exports.refreshPriceGroup(1)).nextOffset, 10);
    assert.equal((await exports.refreshPriceGroup(1, 10)).nextOffset, null);
    assert.equal(db.prepare('SELECT count(*) n FROM market_price_snapshots').get().n, 12);
    assert.equal((await exports.refreshPriceGroup(1)).databaseChanges, 0, 'repeat is idempotent');
    db.prepare("UPDATE products SET name='Admin title', active=0 WHERE id='p0'").run();
    db.prepare("INSERT INTO market_price_snapshots(id,product_id,amount_cents,source_name,observed_at) VALUES('admin','p1',3300,'Admin',?)").run(new Date().toISOString());
    rows = rows.map(row => ({ ...row, marketPrice: row.productId === 2 ? null : 22 }));
    await exports.refreshPriceGroup(1);
    assert.equal(db.prepare("SELECT name FROM products WHERE id='p0'").get().name, 'Admin title');
    assert.equal(db.prepare("SELECT amount_cents FROM market_price_snapshots WHERE product_id='p1' ORDER BY observed_at DESC LIMIT 1").get().amount_cents, 3300);
    assert.equal(db.prepare("SELECT amount_cents FROM market_price_snapshots WHERE product_id='p2'").get().amount_cents, 2000);
    globalThis.fetch = async () => new Response('Provider down', { status: 503 });
    await assert.rejects(exports.refreshPriceGroup(1));
    assert.equal(db.prepare('SELECT count(*) n FROM market_price_snapshots').get().n, 13);
  } finally { globalThis.fetch = originalFetch; db.close(); }
});
