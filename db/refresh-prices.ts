import catalog from "../data/catalog-import.json";
import { seedProducts } from "../data/products";
import { getD1 } from "./index";
import { selectMarketCents, validateProviderTimestamp } from "../lib/refresh-validation";

export const refreshGroups = [...new Set(catalog.items.map(item => item.sourceGroupId))];
const headers = { "User-Agent": "PokeScratch/1.0 (daily price refresh; hello@pokescratch.com)" };
async function provider(path: string) {
  const response = await fetch(`https://tcgcsv.com/${path}`, { headers, signal: AbortSignal.timeout(20000), redirect: "error" });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response;
}

/** Fetch one bounded group. No client-supplied prices, metadata, or source URLs. */
export async function refreshPriceGroup(groupId: number, offset = 0) {
  if (!refreshGroups.includes(groupId)) throw new Error("Unknown provider group");
  const observedAt = validateProviderTimestamp(await (await provider("last-updated.txt")).text());
  const body = await (await provider(`tcgplayer/3/${groupId}/prices`)).json() as { results?: unknown; success?: boolean };
  if (body.success === false || !Array.isArray(body.results) || !body.results.length) throw new Error("Empty or malformed provider response");
  const d1 = getD1();
  const group = catalog.items.filter(item => item.sourceGroupId === groupId);
  const mapped = group.slice(offset, offset + 10);
  const pending: D1PreparedStatement[] = [];
  let available = 0;
  for (const item of mapped) {
    const amount = selectMarketCents(body.results, item.sourceProductId);
    if (amount === null) continue; // Never clear a good quote when a provider has no price.
    const product = seedProducts.find(product => product.id === item.id);
    if (!product) continue;
    available++;
    const retail = product.retailPriceSource;
    // First refresh materializes bundled records, but never overwrites an admin row.
    pending.push(d1.prepare(`INSERT INTO products
      (id, slug, name, short_name, set_name, series, category, release_date, image_url, msrp_cents,
       retail_source_id, retail_source_kind, retail_source_name, retail_source_url, currency, notes, active, search_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING`).bind(
      product.id, product.slug, product.name, product.shortName, product.setName, product.series, product.category,
      product.releaseDate, product.imageUrl, product.msrpCents, retail?.id ?? null, retail?.kind ?? null,
      retail?.label ?? null, retail?.url ?? null, product.currency, product.notes,
      [product.name, product.shortName, product.setName, product.category, ...product.aliases].filter(Boolean).join(" ").toLowerCase(),
    ));
    pending.push(d1.prepare(`INSERT INTO market_price_snapshots
      (id, product_id, amount_cents, provider_key, source_kind, source_name, source_url, methodology, observed_at)
      SELECT ?, p.id, ?, 'tcgplayer-tcgcsv', 'aggregate', 'TCGplayer via TCGCSV', ?, ?, ? FROM products p
      WHERE p.slug = ? AND p.active = 1
      AND NOT EXISTS (SELECT 1 FROM market_price_snapshots s WHERE s.product_id = p.id AND s.observed_at >= ?)
      ON CONFLICT(id) DO NOTHING`).bind(
      `tcgcsv:${item.sourceProductId}:${observedAt}`, amount, item.sourceUrl,
      "Daily TCGCSV export: exact TCGplayer product ID, Normal marketPrice. Not a live quote or independently collected eBay sold sample.",
      observedAt, product.slug, observedAt,
    ));
    pending.push(d1.prepare(`INSERT INTO product_aliases (id, product_id, alias, normalized_alias)
      SELECT 'refresh:' || p.id || ':' || a.value, p.id, a.value, lower(a.value)
      FROM products p, json_each(?) a WHERE p.slug = ? ON CONFLICT DO NOTHING`)
      .bind(JSON.stringify(product.aliases), product.slug));
  }
  let updated = 0;
  // D1 subrequest limits stay bounded; each batch commits atomically and retries are idempotent.
  for (let index = 0; index < pending.length; index += 40) {
    const results = await d1.batch(pending.slice(index, index + 40));
    updated += results.reduce((sum, result) => sum + Number(result.meta.changes ?? 0), 0);
  }
  return { groupId, offset, nextOffset: offset + 10 < group.length ? offset + 10 : null, observedAt, products: mapped.length, available, missing: mapped.length - available, databaseChanges: updated };
}
