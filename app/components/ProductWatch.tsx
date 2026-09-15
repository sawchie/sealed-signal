"use client";
import { useEffect, useState } from "react";
import { SaveHeart } from "./SaveHeart";
import { SAVED_PRODUCTS_KEY, parseSavedProducts } from "@/lib/saved-products";
import { PRICE_WATCH_KEY, parsePriceWatches, watchReached, type PriceWatch } from "@/lib/price-watch";
import { parseAmount } from "@/lib/buy-check";
import { useCurrency } from "./CurrencyProvider";

export function ProductWatch({ slug, name, marketCents, updatedAt, now }: { slug: string; name: string; marketCents: number | null; updatedAt: string | null; now: string }) {
  const { formatMoney } = useCurrency();
  const [saved, setSaved] = useState(false);
  const [watch, setWatch] = useState<PriceWatch | null>(null);
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"below" | "above">("below");
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [checkedAt, setCheckedAt] = useState(now);
  useEffect(() => {
    const load = () => { setCheckedAt(new Date().toISOString()); try {
      setSaved(parseSavedProducts(localStorage.getItem(SAVED_PRODUCTS_KEY)).slugs.includes(slug));
      const item = parsePriceWatches(localStorage.getItem(PRICE_WATCH_KEY))[slug] ?? null;
      setWatch(item); setTarget(item ? (item.targetCents / 100).toFixed(2) : ""); setDirection(item?.direction ?? "below");
    } catch { setMessage("Browser storage is unavailable. Saving cannot persist on this device."); } };
    const refreshAge = () => setCheckedAt(new Date().toISOString());
    load(); window.addEventListener("storage", load); window.addEventListener("focus", refreshAge); return () => { window.removeEventListener("storage", load); window.removeEventListener("focus", refreshAge); };
  }, [slug]);
  const targetCents = parseAmount(target, { positive: true });
  function toggleSaved() {
    try {
      const current = parseSavedProducts(localStorage.getItem(SAVED_PRODUCTS_KEY));
      const removing = current.slugs.includes(slug);
      localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify({ ...current, slugs: removing ? current.slugs.filter(value => value !== slug) : [...current.slugs, slug] }));
      setSaved(!removing); setMessage(removing ? "Removed from saved items. Any price watch stays active until removed below." : "Saved on this browser. No account or cross-device sync.");
    } catch { setMessage("Could not save: browser storage is unavailable. Keep this page bookmarked instead."); }
  }
  function saveWatch(remove = false) {
    setCheckedAt(new Date().toISOString());
    setAttempted(true);
    if (!remove && targetCents === null) return;
    try {
      const watches = parsePriceWatches(localStorage.getItem(PRICE_WATCH_KEY));
      const next = remove ? null : { targetCents: targetCents!, direction };
      if (next) watches[slug] = next; else delete watches[slug];
      localStorage.setItem(PRICE_WATCH_KEY, JSON.stringify(watches));
      setWatch(next); setMessage(remove ? "Price watch removed." : "Target saved. Checked against fresh snapshots when you visit; no background or email notifications.");
      if (remove) { setTarget(""); setAttempted(false); }
    } catch { setMessage("Could not save your target. Browser storage is unavailable; your entry is still here."); }
  }
  return <div className="product-watch">
    <div className="product-watch__actions"><SaveHeart name={name} saved={saved} onToggle={toggleSaved} /><span>{saved ? "On your saved shelf" : "Save for another look"}</span></div>
    <details><summary>Watch a market-price target</summary><p>On this browser only. Targets are checked when you visit PokeScratch, not while the site is closed. No email or push alerts.</p>
      <label className="watch-direction">Alert on your next visit when market is<select value={direction} onChange={e => setDirection(e.target.value as "below" | "above")}><option value="below">At or below</option><option value="above">At or above</option></select></label>
      <label>Target market price (USD)<input inputMode="decimal" value={target} maxLength={14} onChange={e => setTarget(e.target.value)} aria-invalid={attempted && targetCents === null} aria-describedby="watch-target-help" /></label>
      <p id="watch-target-help" className={attempted && targetCents === null ? "form-error" : ""}>{attempted && targetCents === null ? "Enter a positive USD amount with up to two decimals." : "This watches the market estimate, not a retailer’s price or stock."}</p>
      <div className="inline-actions"><button className="button button--secondary" type="button" onClick={() => saveWatch()}>Save target</button>{watch && <button className="button button--quiet" type="button" onClick={() => saveWatch(true)}>Remove target</button>}</div>
      {watch && <p>{watchReached(watch, marketCents, updatedAt, checkedAt) ? "Target reached in the current snapshot." : `Watching for ${watch.direction === "below" ? "at or below" : "at or above"} ${formatMoney(watch.targetCents)}. Older or missing snapshots do not trigger alerts.`}</p>}
    </details><p className="saved-help" role="status">{message}</p>
  </div>;
}
