import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root = new URL('../.catalog-cache/', import.meta.url);
await mkdir(root, { recursive: true });
async function get(path) {
  return JSON.parse(execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '30', `https://tcgcsv.com/${path}`], { encoding: 'utf8', maxBuffer: 20_000_000 }));
}
const timestamp = execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '30', 'https://tcgcsv.com/last-updated.txt'], { encoding: 'utf8' }).trim();
if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Invalid provider date');
const groups = (await get('tcgplayer/3/groups')).results.filter(g => /30th|Delta Reign|First Partner Collection 2026/i.test(g.name));
const candidates = [];
for (const group of groups) {
  const products = await get(`tcgplayer/3/${group.groupId}/products`);
  const prices = await get(`tcgplayer/3/${group.groupId}/prices`);
  await writeFile(new URL(`${group.groupId}-products.json`, root), JSON.stringify(products));
  await writeFile(new URL(`${group.groupId}-prices.json`, root), JSON.stringify(prices));
  for (const p of products.results) {
    if (p.extendedData.some(e => /^(Rarity|Number|Card Type)$/.test(e.name))) continue;
    if (!/box|bundle|tin|collection|blister|pack|chest|stadium|battle deck/i.test(p.name)) continue;
    if (/code card|empty|jumbo|oversized|sleeves|playmat|deck box|wrapper|binder only|\bcase\b|\bdisplay\b|\[set of|art bundle/i.test(p.name)) continue;
    candidates.push({ ...p, groupName: group.name, prices: prices.results.filter(q => q.productId === p.productId) });
  }
}
await writeFile(new URL('upcoming-candidates.json', root), JSON.stringify({ providerUpdatedAt: new Date(timestamp).toISOString(), retrievedAt: new Date().toISOString(), candidates }, null, 2));
console.log(JSON.stringify({ groups: groups.map(g => ({ id:g.groupId, name:g.name })), candidates:candidates.map(p=>({id:p.productId,name:p.name,presale:p.presaleInfo,market:p.prices.map(q=>({type:q.subTypeName,market:q.marketPrice}))})) }, null, 2));
