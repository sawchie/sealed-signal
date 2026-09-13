"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation preserves the production Sites adapter's route behavior. */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { addCollectionLot, localCalendarDay, MAX_COLLECTION_BACKUP_BYTES, ownedQuantity, parseCollection, recordCollectionSale, recordCollectionSnapshot, removeCollectionLot, summarizeCollection, undoCollectionSale, updateCollectionLot, type CollectionLot, type CollectionProduct, type CollectionSnapshot, type CollectionState } from "@/lib/collection";
import { changeCollection, storedCollectionBackup, useCollection } from "@/lib/collection-store";
import { formatCompactDate, formatMoney } from "@/lib/format";
import { parseAmount } from "@/lib/buy-check";
import { ProductImage } from "./ProductImage";
import styles from "./Collection.module.css";

const day = localCalendarDay;
const amount = (data: FormData, key: string, optional = false) => {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw && optional) return null;
  const value = parseAmount(raw);
  if (value === null) throw new Error("Enter a valid dollar amount, with up to two decimals.");
  return value;
};
const numeric = (data: FormData, key: string) => Number(data.get(key));
const moneyOrUnknown = (value: number, covered: number) => covered ? formatMoney(value) : "Unavailable";

function ValueHistory({ points }: { points: CollectionSnapshot[] }) {
  const quoted = (p: CollectionSnapshot) => p.units === 0 || p.pricedUnits > 0;
  const label = (p: CollectionSnapshot) => quoted(p) ? `${formatMoney(p.marketCents)}${p.pricedUnits < p.units ? " (partial)" : ""}` : "Market estimate unavailable";
  const max = Math.max(...points.map(p => p.marketCents), 1);
  const firstTime = points.length ? Date.parse(points[0].at) : 0;
  const timeRange = points.length > 1 ? Math.max(1, Date.parse(points.at(-1)!.at) - firstTime) : 1;
  const coords = points.map(p => `${40 + (Date.parse(p.at) - firstTime) / timeRange * 680},${160 - p.marketCents / max * 130}`);
  const segments: string[][] = [];
  points.forEach((p, i) => { if (!quoted(p)) segments.push([]); else { if (!segments.length) segments.push([]); segments.at(-1)!.push(coords[i]); } });
  return <section className={styles.history} aria-labelledby="collection-history-title"><h2 id="collection-history-title">Recorded collection value</h2>
    <p>Snapshots are recorded when you visit or edit this page—not while it is closed. Adds, sales, corrections, and quote coverage can change the total; this is not an investment-return chart.</p>
    {points.length < 2 ? <p className={styles.quiet}>Your history starts here. Return on another day to see a comparison. We don’t backfill prices or ownership you haven’t recorded.</p> : <>
      <svg className={styles.chart} viewBox="0 0 760 210" role="img" aria-label={`Recorded market value from ${label(points[0])} on ${formatCompactDate(points[0].at)} to ${label(points.at(-1)!)} on ${formatCompactDate(points.at(-1)!.at)}. Gaps mean no quoted units, not zero value. Includes changes to owned quantities and incomplete quote coverage.`}>
        <text x="40" y="18">{points.some(p => p.pricedUnits > 0) ? formatMoney(max) : "No quoted units"}</text><path d="M40 160H720" stroke="#505973" />{segments.filter(s => s.length > 1).map((s, i) => <polyline key={i} fill="none" stroke="#c68bff" strokeWidth="3" points={s.join(" ")} />)}
        {points.map((p, i) => { const [cx, cy] = coords[i].split(","); return quoted(p) ? <circle key={p.at} cx={cx} cy={cy} r="3" fill="#c68bff"><title>{formatCompactDate(p.at)}: {label(p)} · {p.pricedUnits}/{p.units} units priced</title></circle> : <text key={p.at} x={cx} y="176" textAnchor="middle">—<title>{formatCompactDate(p.at)}: market estimate unavailable</title></text>; })}
        <text x="40" y="196">{formatCompactDate(points[0].at)}</text><text x="720" y="196" textAnchor="end">{formatCompactDate(points.at(-1)!.at)}</text>
      </svg>
    </>}
    {!!points.length && <details><summary>View recorded values and coverage</summary><div className={styles.tableScroll}><table><caption className="sr-only">Collection value observations</caption><thead><tr><th>Date</th><th>Market subtotal</th><th>Priced units</th><th>Owned units</th></tr></thead><tbody>{[...points].reverse().map(p => <tr key={p.at}><td>{formatCompactDate(p.at)}</td><td>{label(p)}</td><td>{p.pricedUnits} / {p.units}</td><td>{p.units}</td></tr>)}</tbody></table></div></details>}
  </section>;
}

function LotRow({ lot, state, product }: { lot: CollectionLot; state: CollectionState; product?: CollectionProduct }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const owned = ownedQuantity(state, lot);
  const sold = lot.quantity - owned;
  async function submit(event: FormEvent<HTMLFormElement>, kind: "edit" | "sale") {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const ok = await changeCollection(state => kind === "edit" ? updateCollectionLot(state, lot.id, { quantity: numeric(data, "quantity"), unitCostCents: amount(data, "cost", true), acquiredOn: String(data.get("date")) })
        : recordCollectionSale(state, { id: crypto.randomUUID(), lotId: lot.id, quantity: numeric(data, "quantity"), proceedsCents: amount(data, "proceeds")!, feesCents: amount(data, "fees")!, soldOn: String(data.get("date")) }));
      if (ok) setMessage(kind === "sale" ? "Sale recorded. Sold units stay in your sales history." : "Purchase updated.");
      else setError("Not saved. Check the collection message above.");
    } catch (error) { setError(error instanceof Error ? error.message : "Check your inputs."); }
    setBusy(false);
  }
  return <article className={styles.lot}>
    <div className={styles.lotTop}><ProductImage src={product?.imageUrl ?? lot.imageUrl} alt={`${lot.name} packaging`} category={lot.category} setName={lot.setName} productName={lot.name} className={styles.thumb} />
      <div className={styles.identity}>{product ? <a href={`/products/${lot.slug}?return=%2Fcollection`}>{lot.name}</a> : <strong>{lot.name}</strong>}<p>{lot.setName ?? "Mixed / unverified set"} · {formatCompactDate(lot.acquiredOn)}</p>{!product && <p>Not in the current catalog. Your record is preserved; current prices are unavailable.</p>}<span className={owned ? styles.owned : styles.sold}>{owned} owned{sold ? ` · ${sold} sold` : ""}</span></div>
      <dl className={styles.rowPrices}><div><dt>Paid / unit</dt><dd>{lot.unitCostCents === null ? "Not entered" : formatMoney(lot.unitCostCents)}</dd></div><div><dt>Market / unit</dt><dd>{formatMoney(product?.marketCents)}</dd></div><div><dt>Held market value</dt><dd>{owned ? formatMoney(product?.marketCents == null ? null : product.marketCents * owned) : "No units held"}</dd></div></dl>
    </div>
    <div className={styles.rowActions}>
      <details><summary>Edit purchase</summary><form key={`${lot.quantity}:${lot.unitCostCents}:${lot.acquiredOn}`} onSubmit={e => submit(e, "edit")} className={styles.form}>
        <label>Total units acquired<input name="quantity" type="number" min={Math.max(1, sold)} max="10000" step="1" defaultValue={lot.quantity} required /></label>
        <label>Paid per unit ($)<input name="cost" inputMode="decimal" placeholder="Unknown" defaultValue={lot.unitCostCents === null ? "" : (lot.unitCostCents / 100).toFixed(2)} /></label>
        <label>Purchase date<input name="date" type="date" max={day()} defaultValue={lot.acquiredOn} required /></label>
        <p>Include purchase tax and inbound shipping in your paid amount if you want them included in your cost basis. Leave blank if unknown. Use a separate purchase for a different unit cost.</p>
        <button type="submit" disabled={busy}>Save purchase</button>
      </form></details>
      {!!owned && <details><summary>Mark sold</summary><form onSubmit={e => submit(e, "sale")} className={styles.form}>
        <label>Units sold<input name="quantity" type="number" min="1" max={owned} defaultValue="1" required /></label>
        <label>Total sale proceeds ($)<input name="proceeds" inputMode="decimal" placeholder="For all units sold" required /></label>
        <label>Total fees + seller shipping ($)<input name="fees" inputMode="decimal" defaultValue="0" required /></label>
        <label>Sale date<input name="date" type="date" min={lot.acquiredOn} max={day()} defaultValue={day()} required /></label>
        <p>Record actual proceeds, including shipping collected. Costs are deducted once; don’t enter an already-net payout as gross proceeds.</p>
        <button type="submit" disabled={busy}>Record sale</button>
      </form></details>}
      {!sold && <div>{remove ? <><span>Remove this purchase record?</span><button onClick={async () => { if (await changeCollection(state => removeCollectionLot(state, lot.id))) setRemove(false); }}>Confirm removal</button><button onClick={() => setRemove(false)}>Cancel</button></> : <button onClick={() => setRemove(true)}>Remove mistaken entry</button>}</div>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}<p role="status" className={styles.feedback}>{message}</p>
  </article>;
}

export function CollectionApp({ products }: { products: CollectionProduct[] }) {
  const { state, ready, error, blocked } = useCollection();
  const [tab, setTab] = useState("owned");
  const [query, setQuery] = useState("");
  const [set, setSet] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<CollectionState | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [adding, setAdding] = useState(false);
  const observation = useRef("");
  const catalog = useMemo(() => new Map(products.map(p => [p.slug, p])), [products]);
  const totals = useMemo(() => summarizeCollection(state, products), [state, products]);
  const sets = [...new Set(state.lots.map(lot => lot.setName ?? "Mixed / unverified set"))].sort();
  useEffect(() => {
    if (!ready || blocked) return;
    const key = JSON.stringify([state.lots, state.sales, products.map(p => [p.slug, p.marketCents, p.marketUpdatedAt]), day()]);
    if (key === observation.current) return;
    observation.current = key;
    void changeCollection(state => recordCollectionSnapshot(state, products, new Date().toISOString()));
  }, [ready, blocked, state.lots, state.sales, products]);
  const matches = (lot: CollectionLot) => (!set || (lot.setName ?? "Mixed / unverified set") === set) && `${lot.name} ${lot.setName ?? ""} ${lot.category}`.toLowerCase().includes(query.trim().toLowerCase());
  const lots = state.lots.filter(lot => matches(lot) && (tab === "all" || ownedQuantity(state, lot) > 0));
  const sales = state.sales.filter(sale => { const lot = state.lots.find(l => l.id === sale.lotId); return lot && matches(lot); });
  const costPerPack = totals.packCostPacks ? totals.packCostCents / totals.packCostPacks : null;
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setAdding(true);
    const data = new FormData(event.currentTarget);
    try {
      const product = catalog.get(String(data.get("product")));
      if (!product) throw new Error("Choose a catalog product.");
      const now = new Date().toISOString();
      const ok = await changeCollection(state => addCollectionLot(state, product, numeric(data, "quantity"), amount(data, "cost", true), String(data.get("date")), now, crypto.randomUUID()));
      if (ok) setMessage(`Added ${data.get("quantity")} × ${product.name}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Check your purchase details."); }
    setAdding(false);
  }
  function backup() {
    try { const url = URL.createObjectURL(new Blob([storedCollectionBackup()], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `pokescratch-collection-${day()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch { setMessage("Could not read your backup. Browser storage is unavailable."); }
  }
  return <main className={styles.main}>
    <header className={styles.header}><div><h1>My Collection</h1><p>Your sealed shelf, what you paid, and what you’ve sold.</p></div><nav className={styles.headerActions} aria-label="Collection shortcuts"><a href="#collection-purchases">Manage purchases</a><a href="/">Browse & add products</a></nav></header>
    <div className={styles.storage}><p>Saved on this browser only—not an account. Clearing site data removes your collection. Download a backup to keep a copy or move devices.</p><button onClick={backup} disabled={!ready}>Download backup</button><details><summary>Restore backup</summary><label>Choose a PokeScratch JSON backup<input type="file" accept="application/json,.json" onChange={async e => { setPending(null); setImportConfirm(false); const file = e.target.files?.[0]; if (!file) return; try { if (file.size > MAX_COLLECTION_BACKUP_BYTES) throw new Error("Backup is too large."); setPending(parseCollection(await file.text())); setMessage(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid backup."); } }} /></label>{pending && <div><p>{pending.lots.length} purchase records · {pending.sales.length} sales. Restoring replaces this browser’s collection; it does not merge it.</p><label><input type="checkbox" checked={importConfirm} onChange={e => setImportConfirm(e.target.checked)} />I have backed up my current collection and want to replace it.</label><button disabled={!importConfirm} onClick={async () => { if (await changeCollection(() => pending, true)) { setPending(null); setImportConfirm(false); setMessage("Backup restored."); } }}>Replace with this backup</button><button onClick={() => setPending(null)}>Cancel</button></div>}</details></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}<p className={styles.feedback} role="status">{message}</p>
    {!ready ? <p role="status">Loading your collection from this browser…</p> : <>
      <dl className={styles.totals} aria-label="Owned collection totals">
        <div><dt>Market estimate{totals.pricedUnits < totals.ownedUnits ? " · partial" : ""}</dt><dd>{moneyOrUnknown(totals.marketCents, totals.pricedUnits)}</dd><span>{totals.pricedUnits} of {totals.ownedUnits} owned units priced</span></div>
        <div><dt>Reference retail{totals.retailUnits < totals.ownedUnits ? " · partial" : ""}</dt><dd>{moneyOrUnknown(totals.retailCents, totals.retailUnits)}</dd><span>MSRP / retail references, not your spending</span></div>
        <div><dt>Recorded purchase cost</dt><dd>{moneyOrUnknown(totals.paidCents, totals.costedUnits)}</dd><span>{totals.costedUnits} of {totals.ownedUnits} owned units have a paid price</span></div>
      </dl>
      <p className={styles.valuationNote}>USD estimates for held units only; sold units are excluded. Market values are not cash-out proceeds. <strong>{totals.ownedUnits} {totals.ownedUnits === 1 ? "unit" : "units"} · {totals.distinctProducts} {totals.distinctProducts === 1 ? "product" : "products"}</strong>. Quote dates remain on each product page.</p>
      <div className={styles.analytics}>
        <section><h2>Your booster packs</h2><dl className={styles.packStats}><div><dt>Verified packs held</dt><dd>{totals.knownPacks.toLocaleString()}</dd></div><div><dt>Paid per verified pack</dt><dd>{formatMoney(costPerPack)}</dd></div></dl><p>{totals.packKnownUnits} of {totals.ownedUnits} units have verified pack counts. Paid-per-pack uses only the {totals.packCostPacks.toLocaleString()} packs with a recorded cost; no value deducted for extras.</p>
          {!!totals.setPacks.length && <ul className={styles.setList}>{totals.setPacks.map(row => <li key={row.setName}><span>{row.setName}</span><strong>{row.packs.toLocaleString()} packs</strong>{row.unknownPackUnits > 0 && <small>{row.unknownPackUnits} units have unknown pack counts</small>}</li>)}</ul>}
          <p>Mixed-set boxes stay grouped under their product’s set label; pack counts are not split among expansions without verified contents.</p>
        </section>
        <section><h2>Cost & sales</h2><dl className={styles.ledgerTotals}><div><dt>Unrealized spread before selling costs</dt><dd>{moneyOrUnknown(totals.unrealizedCents, totals.unrealizedUnits)}</dd></div><div><dt>Gross proceeds recorded · {totals.soldUnits} units sold</dt><dd>{formatMoney(totals.saleProceedsCents)}</dd></div><div><dt>Sale fees & shipping recorded</dt><dd>{formatMoney(totals.saleFeesCents)}</dd></div><div><dt>Realized profit after recorded costs</dt><dd>{moneyOrUnknown(totals.realizedCents, totals.realizedUnits)}</dd></div></dl><p>Unrealized spread covers {totals.unrealizedUnits} owned units with both cost and market data. Realized profit covers {totals.realizedUnits} of {totals.soldUnits} sold units with recorded purchase costs. Unknown costs are not assumed to be zero.</p></section>
      </div>
      <details className={styles.addPurchase}><summary>Add a purchase</summary><form onSubmit={add} className={styles.form}><label className={styles.wide}>Product<select name="product" required defaultValue=""><option value="" disabled>Choose an exact product</option>{[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="10000" defaultValue="1" required /></label><label>Paid per unit ($)<input name="cost" inputMode="decimal" placeholder="Leave blank if unknown" /></label><label>Purchase date<input name="date" type="date" max={day()} defaultValue={day()} required /></label><p>Record what you actually paid, including purchase tax and inbound shipping if known. Plus-button additions start with an unknown cost and today’s date; edit those after adding.</p><button type="submit" disabled={adding || blocked}>Add purchase</button></form></details>
      <div id="collection-purchases" tabIndex={-1} className={styles.browse}><div className={styles.tabs} role="group" aria-label="Collection view">{[["owned", "Owned"], ["all", "All purchases"], ["sold", "Sales history"]].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div><label><span className="sr-only">Search collection</span><input placeholder="Search your collection" value={query} onChange={e => setQuery(e.target.value)} /></label><label><span className="sr-only">Filter collection by set</span><select value={set} onChange={e => setSet(e.target.value)}><option value="">All sets</option>{sets.map(s => <option key={s}>{s}</option>)}</select></label></div>
      {!state.lots.length ? <section className={styles.empty}><h2>Your shelf starts with one box.</h2><p>Use the plus button on any catalog product to add one, or open “Add a purchase” to enter a quantity and what you paid. Hearts still save things you’re watching.</p><a href="/">Find your first product</a></section> : tab === "sold" ? <section aria-label="Sales history">{!sales.length && <p>No matching sales recorded.</p>}{sales.map(sale => { const lot = state.lots.find(l => l.id === sale.lotId)!; return <article key={sale.id} className={styles.sale}><div><h3>{lot.name}</h3><p>{sale.quantity} sold · {formatCompactDate(sale.soldOn)}</p></div><dl><div><dt>Proceeds</dt><dd>{formatMoney(sale.proceedsCents)}</dd></div><div><dt>Fees & shipping</dt><dd>{formatMoney(sale.feesCents)}</dd></div><div><dt>Realized profit</dt><dd>{formatMoney(lot.unitCostCents === null ? null : sale.proceedsCents - sale.feesCents - lot.unitCostCents * sale.quantity)}</dd></div></dl><button onClick={async () => { if (await changeCollection(state => undoCollectionSale(state, sale.id))) setMessage("Sale undone. Units returned to Owned."); }}>Undo sale</button></article>; })}</section> : <section aria-label="Collection purchases">{!lots.length && <p>No matching purchases. Try All purchases or clear your filters.</p>}{lots.map(lot => <LotRow key={lot.id} lot={lot} state={state} product={catalog.get(lot.slug)} />)}</section>}
      <ValueHistory points={state.snapshots} />
    </>}
  </main>;
}
