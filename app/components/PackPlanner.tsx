"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import { useMemo, useState } from "react";
import { planOpening, plannerAmount, type PlannerProduct } from "@/lib/pack-planner";
import { useCurrency } from "./CurrencyProvider";
import { ProductImage } from "./ProductImage";
import styles from "./PackPlanner.module.css";

// Extend Arcade After Dark with a working comparison bench. Controls and budget results lead;
// an edited checkout price reranks same-set scenarios without changing any catalog prices.
export function PackPlanner({ products, initialSet, today }: { products: PlannerProduct[]; initialSet?: string; today: string }) {
  const sets = useMemo(() => [...new Set(products.map(p => p.setName))].sort(), [products]);
  const [set, setSet] = useState(initialSet && sets.includes(initialSet) ? initialSet : sets.includes("Destined Rivals") ? "Destined Rivals" : sets[0] ?? "");
  const [budget, setBudget] = useState("150");
  const [basis, setBasis] = useState<"market" | "retail">("market");
  const [shipping, setShipping] = useState("0");
  const [tax, setTax] = useState("0");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const { formatMoney, currency } = useCurrency();
  const budgetCents = plannerAmount(budget);
  const shippingCents = plannerAmount(shipping);
  const taxBps = plannerAmount(tax, 10000);
  const valid = budgetCents !== null && shippingCents !== null && taxBps !== null;
  const inSet = products.filter(p => p.setName === set);
  const eligible = inSet.filter(p => p.released && p.packs != null && p.packs > 0 && p.factsUrl);
  const excluded = inSet.length - eligible.length;
  const rows = eligible.map(p => {
    const custom = Object.hasOwn(overrides, p.id);
    const price = custom ? plannerAmount(overrides[p.id]) : p[basis];
    const plan = valid ? planOpening(budgetCents, price, p.packs, shippingCents, taxBps) : null;
    return { p, custom, price, plan };
  }).sort((a, b) => (b.plan?.packs ?? -1) - (a.plan?.packs ?? -1) || (a.plan?.spendCents ?? Infinity) - (b.plan?.spendCents ?? Infinity) || a.p.name.localeCompare(b.p.name));
  const visible = onlyShortlist ? rows.filter(r => shortlist.includes(r.p.id)) : rows;
  const count = rows.filter(r => r.plan && r.plan.boxes > 0).length;
  const toggle = (id: string) => setShortlist(previous => previous.includes(id) ? previous.filter(x => x !== id) : [...previous, id]);
  return <main className={styles.main}>
    <nav aria-label="Breadcrumb"><a href="/tools">Collector tools</a></nav>
    <header className={styles.heading}><h1>Pack Planner</h1><p>Pick a set. Set a budget. See which boxes fit.</p></header>
    <div className={styles.controls}>
      <label>Pokémon set<select value={set} onChange={e => { setSet(e.target.value); setOnlyShortlist(false); }}>{sets.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Opening budget · USD<input aria-label="Opening budget · USD" inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} aria-invalid={budgetCents === null} aria-describedby={budgetCents === null ? "budget-error" : undefined} />{budgetCents === null && <span id="budget-error" className={styles.error}>Enter $0–$10,000 with up to two decimals.</span>}</label>
      <label>Starting prices<select value={basis} onChange={e => setBasis(e.target.value as "market" | "retail")}><option value="market">Market</option><option value="retail">Retail / MSRP</option></select></label>
    </div>
    <p className={styles.scope}>References, not in-stock deals. Results in {currency}.</p>
    <details className={styles.costs}><summary>Costs &amp; assumptions</summary><div className={styles.costInputs}>
      <label>Shipping per order · USD<input aria-label="Shipping per order · USD" inputMode="decimal" value={shipping} onChange={e => setShipping(e.target.value)} aria-invalid={shippingCents === null} aria-describedby={shippingCents === null ? "shipping-error" : undefined} />{shippingCents === null && <span id="shipping-error" className={styles.error}>Enter $0–$10,000.</span>}</label>
      <label>Tax on items · %<input aria-label="Tax on items · %" inputMode="decimal" value={tax} onChange={e => setTax(e.target.value)} aria-invalid={taxBps === null} aria-describedby={taxBps === null ? "tax-error" : undefined} />{taxBps === null && <span id="tax-error" className={styles.error}>Enter 0–100%.</span>}</label>
    </div><p>One shipping charge per scenario. Tax applies to merchandise, not shipping. Enter any shipping tax in the shipping amount. All inputs are USD. Replace a box price with the offer you found; your changes last for this visit only.</p><p>Most packs first; lower total spend breaks a tie. Each row buys only that format—not a mixed basket. {excluded > 0 && `${excluded} other records excluded: unreleased, undated, or without a sourced pack count.`}</p><button type="button" onClick={() => { setOverrides({}); setShortlist([]); setOnlyShortlist(false); }}>Reset box prices &amp; shortlist</button></details>
    <div className={styles.resultBar}><p role="status">{valid ? `${count} formats fit your budget` : "Check the amounts above"}</p><label className={styles.check}><input type="checkbox" checked={onlyShortlist} onChange={e => setOnlyShortlist(e.target.checked)} />Shortlist only</label></div>
    {visible.length === 0 && <p className={styles.empty}>{onlyShortlist ? "No shortlisted boxes in this set. Turn off Shortlist only to choose some." : "No released formats with sourced pack counts in this set yet. Choose another set or use the manual comparison below."}</p>}
    <div className={styles.rows}>{visible.map(({p, custom, price, plan}) => <article key={p.id} className={styles.row}>
      <a href={`/products/${p.slug}`} className={styles.product}>
        <ProductImage className={styles.image} src={p.imageUrl} alt="" category={p.category} setName={p.setName} />
        <div><h2>{p.name}</h2><span>{p.packs} packs / box</span></div>
      </a>
      <div className={styles.price}><label htmlFor={`price-${p.id}`}>Price per box · USD<span className="sr-only"> {p.name}</span></label><input id={`price-${p.id}`} inputMode="decimal" placeholder="Enter price" value={custom ? overrides[p.id] : price == null ? "" : (price / 100).toFixed(2)} onChange={e => setOverrides(previous => ({...previous, [p.id]: e.target.value}))} aria-invalid={custom && (price === null || price === 0)} aria-describedby={custom && (price === null || price === 0) ? `error-${p.id}` : undefined} />
        {custom && (price === null || price === 0) && <span id={`error-${p.id}`} className={styles.error}>Enter $0.01–$10,000 with up to two decimals.</span>}
        <small>{custom ? "Your price" : basis === "retail" ? "Historical retail reference" : p.marketDate ? `${p.marketDate.slice(0,10)} snapshot${Date.parse(today) - Date.parse(p.marketDate) > 7 * 86400000 ? " · older than 7 days" : ""}` : "No market quote"}</small>
        {custom && <button className={styles.textButton} onClick={() => setOverrides(previous => { const next = {...previous}; delete next[p.id]; return next; })}>Use {basis === "market" ? "market" : "retail"} reference<span className="sr-only"> for {p.name}</span></button>}
      </div>
      <dl className={styles.numbers}><div><dt>Packs</dt><dd>{plan?.packs ?? "—"}</dd></div><div><dt>Total spend</dt><dd>{formatMoney(plan?.spendCents)}</dd></div><div><dt>Per pack</dt><dd>{formatMoney(plan?.perPackCents)}</dd></div><div><dt>Left over</dt><dd>{formatMoney(plan?.remainingCents)}</dd></div></dl>
      <div className={styles.rowFoot}><span>{plan ? plan.boxes ? `${plan.boxes} ${plan.boxes === 1 ? "box" : "boxes"} in this scenario` : "Over budget at this price" : "Price or budget needed"}</span><label className={styles.check}><input type="checkbox" checked={shortlist.includes(p.id)} onChange={() => toggle(p.id)} />Shortlist<span className="sr-only"> {p.name}</span></label></div>
      <details className={styles.notes}><summary>Contents &amp; sources</summary><p>{p.edition || p.category}. {p.promos.length ? `Listed promos: ${p.promos.join(", ")}.` : "No verified promo list recorded; this does not mean no promos are included."}</p><p>{p.marketProvider ? `Market source: ${p.marketProvider}. ` : ""}Accessories and promos are not deducted from the cost. Counts describe total included packs, not guaranteed pulls; confirm the set mix in the specification.</p><a href={p.factsUrl!} target="_blank" rel="noreferrer">Check pack specification</a><a href={`/products/${p.slug}#price-data`}>Price sources &amp; dates</a></details>
    </article>)}</div>
    <section className={styles.guide}><h2>Do you want the packs—or the whole box?</h2><p>A PC ETB can make sense for its stamped promo even when a bundle gives you more packs for the money. This planner counts packs, not the value of everything else in the box. It does not predict pulls or recommend a purchase.</p><p>Each scenario repeats one product at the entered price. It assumes that quantity is available; check stock and purchase limits with the seller. A cheaper per-pack price is only useful if the total stays within the budget you meant to spend.</p><a href="/tools/price-per-pack">Compare two actual checkout totals</a><a href="/guides/etb-vs-booster-bundle">ETB or booster bundle?</a></section>
  </main>;
}
