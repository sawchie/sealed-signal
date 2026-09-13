// Append exact, announced US product identities without refreshing unrelated prices.
// Run research-upcoming.mjs first; retail references must already be cached/reviewed.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root)));
const catalog = read('data/catalog-import.json');
const research = read('.catalog-cache/upcoming-candidates.json');
const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(exclusive\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const retail = new Map(read('.catalog-cache/retail-products.json').map(p => [normalize(p.name), p]));
const announcements = {};
const category = name => {
  if (/pokemon center.*elite trainer/i.test(name)) return 'Pokémon Center Elite Trainer Box';
  if (/elite trainer/i.test(name)) return 'Elite Trainer Box';
  if (/booster box/i.test(name)) return 'Booster Box';
  if (/booster bundle/i.test(name)) return 'Booster Bundle';
  if (/ultra.premium/i.test(name)) return 'Ultra-Premium Collection';
  if (/premium|figure collection/i.test(name)) return 'Premium Collection Box';
  if (/mini tin/i.test(name)) return 'Mini Tin';
  if (/tin/i.test(name)) return 'Tin';
  if (/sleeved booster/i.test(name)) return 'Sleeved Booster Pack';
  if (/blister/i.test(name)) return 'Blister Pack';
  if (/collection/i.test(name)) return 'Special Collection';
  if (/booster pack|battle deck/i.test(name)) return 'Other Sealed Product';
  return 'Collection Box';
};
let added = 0;
for (const p of research.candidates) {
  // Half boxes have different regional retail conventions. Loose First Partner
  // promo packs are not standalone retail products; include the actual collections.
  if (/Half Booster Box|First Partner.*Booster Pack/i.test(p.name)) continue;
  const name = p.name.replace(/Pokemon/g, 'Pokémon').replace(' (Exclusive)', '').replace('[Spitzee]', '[Spritzee]');
  const reference = retail.get(normalize(name)); // Exact variant only, never an assorted/art substitution.
  const id = `tcg-${p.productId}`;
  const releaseDate = p.presaleInfo?.releasedOn?.slice(0, 10) ?? reference?.release_date ?? null;
  const marketRows = p.prices.filter(q => q.subTypeName === 'Normal' && Number.isFinite(q.marketPrice) && q.marketPrice > 0);
  const sourceUrl = p.url;
  announcements[id] = { sourceProductId: p.productId, sourceUrl, checkedAt: research.retrievedAt, providerPresale: p.presaleInfo?.isPresale === true, expectedReleaseDate: releaseDate, dateContext: p.presaleInfo?.isPresale ? 'Provider estimated shipping date; release timing can change and vary by region.' : 'Published product release date.', collection: p.groupName.includes('Delta Reign') ? 'Delta Reign' : '30th anniversary' };
  if (catalog.items.some(item => item.sourceProductId === p.productId)) continue;
  catalog.items.push({ sourceProductId: p.productId, sourceGroupId: p.groupId, existingId: null, id,
    slug: `${normalize(name).replaceAll(' ', '-')}-${p.productId}`, name,
    shortName: name.replace('Pokémon Center Elite Trainer Box', 'PC ETB').replace('Elite Trainer Box', 'ETB'),
    setName: p.groupName.replace(/^[^:]+:\s*/, ''), series: p.groupName.startsWith('ME') ? 'Mega Evolution' : null,
    category: category(p.name), releaseDate,
    msrpCents: reference?.msrp_usd > 0 ? Math.round(reference.msrp_usd * 100) : null,
    retailSourceUrl: reference?.msrp_usd > 0 ? `https://celadoninfo.com/us/products/${reference.slug}` : null,
    sourceUrl, sourceImageUrl: p.imageCount && p.imageUrl ? p.imageUrl.replace('_200w', '_in_1000x1000') : null,
    imageUrl: p.imageCount && p.imageUrl ? `/product-images/catalog/${p.productId}.webp` : null,
    marketCents: marketRows.length === 1 ? Math.round(marketRows[0].marketPrice * 100) : null,
    marketUpdatedAt: research.providerUpdatedAt,
  });
  added++;
}
writeFileSync(new URL('data/catalog-import.json', root), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('data/announced-products.json', root), JSON.stringify(announcements, null, 2) + '\n');
console.log(JSON.stringify({ added, total: catalog.items.length, reviewed: Object.keys(announcements).length, retail: catalog.items.filter(p => announcements[p.id] && p.msrpCents).length, photos: catalog.items.filter(p => announcements[p.id] && p.imageUrl).length }));
