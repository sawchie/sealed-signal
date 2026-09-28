"use client";
import type { ProductWithMarketPrice } from "@/lib/domain";
import { useCurrency } from "./CurrencyProvider";
import { pricePerPackCents } from "@/lib/pack-comparison";
import styles from "./CollectorContent.module.css";

export function GuideComparison({ products, counts, now }: { products: ProductWithMarketPrice[]; counts: Record<string, number | null>; now: string }) {
  const { formatMoney, currency } = useCurrency();
  if (!products.length) return <section id="compare-formats"><h2>Comparison currently unavailable</h2><p>These catalog records are not currently published. The researched guidance remains available; no substitute prices have been inserted.</p></section>;
  return <section className={styles.guideComparison} aria-labelledby="compare-formats"><h2 id="compare-formats">Compare the exact boxes</h2>
    <p>Displayed in {currency}. Retail is a historical reference, not stock. Market figures use the catalog’s dated source snapshots, not live offers. Per-pack figures allocate the whole box price to packs; tax, shipping, and accessory deductions are excluded.</p>
    {/* A named, focusable scroll region lets keyboard users reach offscreen columns. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div className={styles.comparisonScroll} role="region" aria-label="Product price comparison; scroll horizontally on small screens" tabIndex={0}><table><caption>Product identity, verified packs, and dated prices</caption><thead><tr><th scope="col">Product</th><th scope="col">Packs</th><th scope="col">Retail total / per pack</th><th scope="col">Market total / per pack</th></tr></thead><tbody>{products.map(p => {
      const quote = p.marketPrice;
      const stale = quote && (Date.parse(now) - Date.parse(quote.updatedAt) > 7 * 86400_000);
      return <tr key={p.id}><th scope="row"><a href={`/products/${p.slug}`}>{p.name}</a><small>{quote ? <>{quote.source.label} · {quote.updatedAt.slice(0, 10)}{stale ? " · Older snapshot" : ""}</> : "Market estimate unavailable"}</small><a className={styles.sourceLink} href={`/products/${p.slug}#price-data`}>Sources & dates</a></th><td>{counts[p.id] ?? "Unverified"}</td><td><strong>{formatMoney(p.msrpCents, p.currency)}</strong><small>{counts[p.id] && p.msrpCents != null ? `${formatMoney(pricePerPackCents(p.msrpCents, counts[p.id]), p.currency)} / pack` : "Per-pack unavailable"}</small></td><td><strong>{formatMoney(quote?.amountCents, quote?.currency ?? p.currency)}</strong><small>{counts[p.id] && quote ? `${formatMoney(pricePerPackCents(quote.amountCents, counts[p.id]), quote.currency)} / pack` : "Per-pack unavailable"}</small></td></tr>;
    })}</tbody></table></div></section>;
}
