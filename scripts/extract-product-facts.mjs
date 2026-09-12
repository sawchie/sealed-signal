// Deterministic metadata extraction from the existing exact-ID TCGplayer export.
// No guessing pack counts from category defaults or case quantities.
import { readFileSync, writeFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog-import.json', import.meta.url)));
const groups = new Map();
const output = {};
for (const item of catalog.items) {
  if (!groups.has(item.sourceGroupId)) {
    try { groups.set(item.sourceGroupId, JSON.parse(readFileSync(new URL(`../.catalog-cache/${item.sourceGroupId}-products.json`, import.meta.url))).results ?? []); }
    catch { groups.set(item.sourceGroupId, []); }
  }
  const source = groups.get(item.sourceGroupId).find(row => row.productId === item.sourceProductId);
  if (!source) continue;
  const description = source.extendedData?.find(field => field.name === 'CardText')?.value ?? '';
  const lines = description.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/•(?=\s*\d)/g, '\n').replace(/•/g, ' ').split(/[\r\n]+/).map(line => line.replace(/^\s*[·*-]\s*/, '').trim());
  const packMatches = lines.flatMap(line => {
    const match = line.match(/^(\d+)\s+(?:(?:Pok[eé]mon\s+TCG|assorted\s+Pok[eé]mon\s+TCG)[^.!?\n]*?\s)?booster packs?\b/i);
    return match ? [Number(match[1])] : [];
  });
  const counts = [...new Set(packMatches)];
  const bundled = /\b(case|display|lot|set of|box of)\b/i.test(item.name) && item.category !== 'Booster Box';
  const packCount = counts.length === 1 && counts[0] > 0 && counts[0] <= 100 && !bundled ? counts[0] : null;
  const promos = lines.flatMap(line => {
    const m = line.match(/^(\d+)\s+.*?promo cards? featuring (.{1,100}?)(?:\.|$)/i);
    return m ? [`${m[1]} × ${m[2].trim()}`] : [];
  }).slice(0, 6);
  const upc = source.extendedData?.find(field => field.name === 'UPC')?.value?.trim();
  output[item.id] = { sourceProductId: item.sourceProductId, sourceUrl: source.url, sourceLabel: 'TCGplayer product specifications', packCount, promos, language: null, edition: /Pok[eé]mon Center/i.test(item.name) ? 'Pokémon Center exclusive' : null, ...(/^\d{12,14}$/.test(upc ?? '') ? { upc } : {}) };
}
// Independently cross-checked first-party facts. These override only these exact IDs.
for (const [id, packCount, promos, url] of [
  [501999, 11, ['1 × Snorlax (Pokémon Center stamp)', '1 × Snorlax (standard promo)'], 'scarlet-violet-151-pokemon-center-elite-trainer-box'],
  [503313, 9, ['1 × Snorlax'], 'scarlet-violet-151-elite-trainer-box'],
]) {
  const item = catalog.items.find(row => row.sourceProductId === id);
  if (item) output[item.id] = { ...output[item.id], packCount, promos, language: 'English (US product)', releaseDate: '2023-09-22', sourceUrl: `https://www.pokemon.com/us/pokemon-tcg/product-gallery/${url}`, sourceLabel: 'Official Pokémon product gallery' };
}
writeFileSync(new URL('../data/product-facts.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ identities: Object.keys(output).length, packCounts: Object.values(output).filter(p => p.packCount).length, promoFacts: Object.values(output).filter(p => p.promos.length).length }));
