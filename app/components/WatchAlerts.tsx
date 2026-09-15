"use client";
import { useEffect, useState } from "react";
import { PRICE_WATCH_KEY, parsePriceWatches, watchReached, type PriceWatches } from "@/lib/price-watch";
import { useCurrency } from "./CurrencyProvider";
type WatchProduct = { slug: string; name: string; marketCents: number | null; updatedAt: string | null };
export function WatchAlerts({ products, now }: { products: WatchProduct[]; now: string }) {
  const { formatMoney } = useCurrency();
  const [watches, setWatches] = useState<PriceWatches>({});
  const [checkedAt, setCheckedAt] = useState(now);
  useEffect(() => {
    const load = () => { setCheckedAt(new Date().toISOString()); try { setWatches(parsePriceWatches(localStorage.getItem(PRICE_WATCH_KEY))); } catch { /* No watches can be read. */ } };
    load(); window.addEventListener("storage", load); window.addEventListener("focus", load);
    return () => { window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, []);
  const entries = products.filter(p => watches[p.slug]);
  if (!entries.length) return null;
  const matches = entries.filter(p => watchReached(watches[p.slug], p.marketCents, p.updatedAt, checkedAt));
  return <details className="watch-alerts"><summary>{matches.length ? `${matches.length} price ${matches.length === 1 ? "target" : "targets"} reached` : `${entries.length} market-price ${entries.length === 1 ? "watch" : "watches"}`}</summary><p>Checked on this visit against snapshots up to 3 days old. These are market-price targets, not in-stock offers.</p><ul>{entries.map(p => <li key={p.slug}><a href={`/products/${p.slug}`}>{p.name}</a><span>{watchReached(watches[p.slug], p.marketCents, p.updatedAt, checkedAt) ? "Target reached" : "Watching"} · Market {formatMoney(p.marketCents)} · Target {watches[p.slug].direction === "below" ? "≤" : "≥"} {formatMoney(watches[p.slug].targetCents)}</span></li>)}</ul></details>;
}
