import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const candidates = JSON.parse(await read('.catalog-cache/candidates.json'));
const providerUpdatedAt = new Date((await read('.catalog-cache/last-updated.txt')).trim()).toISOString();
if (!Number.isFinite(Date.parse(providerUpdatedAt))) throw new Error('Missing provider timestamp');
const imageManifest = await read('data/tcgplayer-image-sources.ts');
const existingIds = new Map([...imageManifest.matchAll(/"([^"]+)": (\d+),/g)].map(([,id,sourceId]) => [Number(sourceId), id]));

// Parse the public release-calendar data, never execute page JavaScript.
const html = await read('.catalog-cache/retail-calendar.html');
const chunks = [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].flatMap(m => {
  try { const chunk = JSON.parse(m[1]); return typeof chunk[1] === 'string' ? [chunk[1]] : []; } catch { return []; }
}).join('');
const start = chunks.indexOf('"products":[');
if (start < 0) throw new Error('Retail calendar format changed');
let cursor = start + '"products":'.length, depth = 0, quoted = false, escaped = false, end = cursor;
for (; end < chunks.length; end++) {
  const char = chunks[end];
  if (escaped) { escaped = false; continue; }
  if (quoted && char === '\\') { escaped = true; continue; }
  if (char === '"') quoted = !quoted;
  if (quoted) continue;
  if (char === '[') depth++;
  if (char === ']' && --depth === 0) break;
}
const retailProducts = JSON.parse(chunks.slice(cursor, end + 1));
await writeFile(new URL('.catalog-cache/retail-products.json', root), JSON.stringify(retailProducts, null, 2));
const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/pokemon tcg:?|pokemon - |\(exclusive\)|\(assorted\)/g, '')
  .replace(/booster display box/g, 'booster box').replace(/single pack blister/g, 'checklane blister')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const retailByName = new Map(retailProducts.map(p => [normalize(p.name), p]));
function retailMatch(p) {
  const names = [p.name, p.name.replace(/^Mega Evolution:\s*/, '').replace(/\s*\(3-Tab\)$/, ''), `${p.groupName.replace(/^[^:]+:\s*/, '')} ${p.name}`];
  // Provider spelling/order differences, retaining the exact character/art variant.
  names.push(p.name.replace('Whimsicot]', 'Whimsicott]').replace('Elektross', 'Eelektross'));
  names.push(p.name.replace(/Premium Collection \[([^\]]+)\]/, '$1 Premium Collection'));
  names.push(p.name.replace(/Tech Sticker Collection \[/, 'Tech Sticker Collection [Shiny '));
  names.push(p.name.replace(/Elite Trainer Box \[([^\]]+) ex\]/, 'Elite Trainer Box [$1]'));
  return names.map(name => retailByName.get(normalize(name))).find(Boolean);
}
const slugify = name => normalize(name).replaceAll(' ', '-');
function category(name) {
  if (/pokemon center.*elite trainer/i.test(name)) return 'Pokémon Center Elite Trainer Box';
  if (/elite trainer/i.test(name)) return 'Elite Trainer Box';
  if (/booster box/i.test(name)) return 'Booster Box';
  if (/booster bundle/i.test(name)) return 'Booster Bundle';
  if (/ultra.?premium/i.test(name)) return 'Ultra-Premium Collection';
  if (/premium|figure collection/i.test(name)) return 'Premium Collection Box';
  if (/costco|sam.s club/i.test(name)) return 'Warehouse Club Bundle';
  if (/mini tin/i.test(name)) return 'Mini Tin';
  if (/tin|chest/i.test(name)) return 'Tin';
  if (/sleeved booster/i.test(name)) return 'Sleeved Booster Pack';
  if (/blister/i.test(name)) return 'Blister Pack';
  if (/collection/i.test(name)) return 'Special Collection';
  return 'Collection Box';
}
const items = [], excluded = [];
for (const p of candidates) {
  const existingId = existingIds.get(p.productId);
  // These exact records lack a usable provider photo; don't publish incomplete new listings.
  if (!existingId && ([636312, 686503].includes(p.productId) || /fun pack|Epic Collection ex Deck|EX Tin: Keldeo|Blastoise EX Tin/i.test(p.name))) continue;
  if (!existingId && (/(case|\[set of|\[bundle of|art bundle|half booster|international|EU Exclusive|battle deck|deck box|booster pack$|display|mini portfolio|checklane|single pack blister|2.pack blister|3.pack blister)/i.test(p.name) || p.presaleInfo.isPresale || (p.groupName.startsWith('SWSH') && !/elite trainer|booster box|booster bundle/i.test(p.name)) || (p.groupId === 2374 && p.productId < 490000))) continue;
  if (!p.imageCount || !p.imageUrl) { excluded.push({id:p.productId, reason:'No product photo'}); continue; }
  const prices = p.prices.filter(q => q.subTypeName === 'Normal' && Number.isFinite(q.marketPrice) && q.marketPrice > 0);
  const market = prices.length === 1 ? prices[0] : null;
  const retail = retailMatch(p);
  const setName = p.groupId === 2374 ? (retail?.set_name ?? null) : p.groupName.replace(/^[^:]+:\s*/, '').replace('Scarlet & Violet 151', '151');
  const name = p.name.replace(/Pokemon/g, 'Pokémon').replace(' (Exclusive)', '');
  const releaseDate = retail?.release_date ?? null;
  if (!existingId && releaseDate && releaseDate > new Date().toISOString().slice(0,10)) continue;
  items.push({
    sourceProductId: p.productId,
    sourceGroupId: p.groupId,
    existingId: existingId ?? null,
    id: existingId ?? `tcg-${p.productId}`,
    slug: `${slugify(name)}-${p.productId}`,
    name,
    shortName: name.replace('Pokémon Center Elite Trainer Box', 'PC ETB').replace('Elite Trainer Box', 'ETB'),
    setName,
    series: p.groupName.startsWith('SWSH') ? 'Sword & Shield' : p.groupName.startsWith('SV') ? 'Scarlet & Violet' : p.groupName.startsWith('ME') ? 'Mega Evolution' : null,
    category: category(p.name),
    releaseDate,
    msrpCents: retail?.msrp_usd > 0 ? Math.round(retail.msrp_usd * 100) : null,
    retailSourceUrl: retail ? `https://celadoninfo.com/us/products/${retail.slug}` : null,
    sourceUrl: p.url,
    sourceImageUrl: p.imageUrl.replace('_200w', '_in_1000x1000'),
    imageUrl: existingId ? `/product-images/cutouts/${existingId}.webp` : `/product-images/catalog/${p.productId}.webp`,
    marketCents: market ? Math.round(market.marketPrice * 100) : null,
  });
}
// The separately reviewed upcoming catalog permits TBD prices/photos. Preserve it
// when rebuilding the stricter released-product import, including quote dates.
const announced = JSON.parse(await read('data/announced-products.json'));
const prior = JSON.parse(await read('data/catalog-import.json'));
for (const item of prior.items) if (announced[item.id] && !items.some(p => p.id === item.id)) items.push(item);
const result = { provider: 'TCGplayer via TCGCSV', providerUpdatedAt, retrievedAt: new Date().toISOString(), items };
await writeFile(new URL('data/catalog-import.json', root), JSON.stringify(result, null, 2) + '\n');
await writeFile(new URL('.catalog-cache/import-audit.json', root), JSON.stringify({ excluded, matchedRetail: items.filter(p=>p.msrpCents!==null).map(p=>({id:p.id,name:p.name,msrp:p.msrpCents,url:p.retailSourceUrl})), missingRetail:items.filter(p=>p.msrpCents===null).map(p=>({id:p.id,name:p.name})), missingMarket:items.filter(p=>p.marketCents===null).map(p=>({id:p.id,name:p.name})) }, null, 2));
console.log(JSON.stringify({total:items.length,existing:items.filter(p=>p.existingId).length,retail:items.filter(p=>p.msrpCents).length,market:items.filter(p=>p.marketCents).length,release:items.filter(p=>p.releaseDate).length}));
