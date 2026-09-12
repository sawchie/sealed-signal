import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Research cache; never requested by the browser. Respect the provider's daily cadence.
const dir = new URL('../.catalog-cache/', import.meta.url);
await mkdir(dir, { recursive: true });
const headers = { 'User-Agent': 'PokeScratch/1.0 (catalog research; pokescratch.com)' };
let cacheIsCurrent = false;
async function get(path, file) {
  if (cacheIsCurrent) {
    try { return JSON.parse(await readFile(new URL(file, dir), 'utf8')); } catch { /* Fetch missing cache entry. */ }
  }
  await new Promise(resolve => setTimeout(resolve, 150));
  const response = await fetch(`https://tcgcsv.com/${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const result = await response.json();
  await writeFile(new URL(file, dir), JSON.stringify(result));
  return result;
}
const timestamp = await fetch('https://tcgcsv.com/last-updated.txt', { headers }).then(r => r.text());
if (!Number.isFinite(Date.parse(timestamp.trim()))) throw new Error('Invalid provider timestamp');
try { cacheIsCurrent = (await readFile(new URL('last-updated.txt', dir), 'utf8')).trim() === timestamp.trim(); } catch { /* First import. */ }
const { results: groups } = await get('tcgplayer/3/groups', 'groups.json');
const selected = groups.filter(g => /^(SV\d|SV:|SWSH\d|SWSH:|ME\d|ME:)/.test(g.name) && !/promo|energ|classic collection/i.test(g.name) && g.publishedOn.slice(0,10) <= new Date().toISOString().slice(0,10));
selected.push(...groups.filter(g => /Miscellaneous Cards & Products/.test(g.name)));
const all = [];
for (const group of selected) {
  const { results: products } = await get(`tcgplayer/3/${group.groupId}/products`, `${group.groupId}-products.json`);
  const { results: prices } = await get(`tcgplayer/3/${group.groupId}/prices`, `${group.groupId}-prices.json`);
  for (const product of products) {
    if (product.extendedData.some(e => /^(Rarity|Number|Card Type)$/.test(e.name))) continue;
    if (!/(box|bundle|tin|collection|blister|pack|chest|stadium)/i.test(product.name)) continue;
    if (/(code card|empty|jumbo|oversized|sleeves|playmat|deck box|supply|supply|dice|coin|damage counter|booster wrapper|binder only)/i.test(product.name)) continue;
    all.push({ ...product, groupName: group.name, groupPublishedOn: group.publishedOn, prices: prices.filter(p => p.productId === product.productId) });
  }
  process.stdout.write(`${group.name}: ${all.filter(p => p.groupId === group.groupId).length} sealed candidates\n`);
}
await writeFile(new URL('candidates.json', dir), JSON.stringify(all, null, 2));
// Freshness is committed only after the complete provider import succeeds.
await writeFile(new URL('last-updated.txt', dir), timestamp);
process.stdout.write(`${all.length} candidates; provider timestamp ${timestamp.trim()}\n`);
