"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation preserves the production Sites adapter's route behavior. */
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { addCollectionLot, localCalendarDay, MAX_COLLECTION_BACKUP_BYTES, ownedQuantity, parseCollection, recordCollectionSale, recordCollectionSnapshot, removeCollectionLot, summarizeCollection, undoCollectionSale, updateCollectionLot, type CollectionLot, type CollectionProduct, type CollectionSnapshot, type CollectionState } from "@/lib/collection";
import { changeCollection, storedCollectionBackup, useCollection } from "@/lib/collection-store";
import { formatCompactDate, formatMoney } from "@/lib/format";
import { parseAmount } from "@/lib/buy-check";
import { collectionGain, gainTone } from "@/lib/collection-gain";
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

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  return <span className={styles.info}>
    <button type="button" aria-label={`About ${label}`} aria-expanded={open || hover} aria-describedby={open || hover ? id : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => { setHover(false); setOpen(false); }}
      onClick={() => { setHover(false); setOpen(!open); }} onKeyDown={e => { if (e.key === "Escape") { setOpen(false); setHover(false); } }}>
      <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 5.5v1" /></svg>
    </button>{(open || hover) && <span id={id} role="tooltip" className={styles.tooltip}>{children}</span>}
  </span>;
}

function Gain({ value }: { value: number | null }) {
  return <span className={styles[gainTone(value)]}>{value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatMoney(Math.abs(value))}`}</span>;
}

function ValueHistory({ points }: { points: CollectionSnapshot[] }) {
  const [observationsOpen, setObservationsOpen] = useState(false);
  const observationsId = useId();
  const observationsToggle = useRef<HTMLButtonElement>(null);
  const quoted = (p: CollectionSnapshot) => p.units === 0 || p.pricedUnits > 0;
  const label = (p: CollectionSnapshot) => quoted(p) ? `${formatMoney(p.marketCents)}${p.pricedUnits < p.units ? " (partial)" : ""}` : "Market estimate unavailable";
  const max = Math.max(...points.map(p => p.marketCents), 1);
  const firstTime = points.length ? Date.parse(points[0].at) : 0;
  const timeRange = points.length > 1 ? Math.max(1, Date.parse(points.at(-1)!.at) - firstTime) : 1;
  const coords = points.map(p => `${40 + (Date.parse(p.at) - firstTime) / timeRange * 680},${160 - p.marketCents / max * 130}`);
  const segments: string[][] = [];
  points.forEach((p, i) => { if (!quoted(p)) segments.push([]); else { if (!segments.length) segments.push([]); segments.at(-1)!.push(coords[i]); } });
  return <section className={styles.history} aria-labelledby="collection-history-title"><h2 id="collection-history-title">Value history <Info label="value history">Recorded on visits and edits, once per UTC day. Adds, sales and quote coverage change the total. This is collection value, not investment return. Missing quotes leave gaps.</Info></h2>
    {points.length < 2 ? <div className={styles.historyEmpty}><span>{points.length ? "First snapshot saved" : "Your history starts here"}</span><small>Return another day to see the graph.</small></div> : <>
      <svg className={styles.chart} viewBox="0 0 760 210" role="img" aria-label={`Recorded market value from ${label(points[0])} on ${formatCompactDate(points[0].at)} to ${label(points.at(-1)!)} on ${formatCompactDate(points.at(-1)!.at)}. Gaps mean no quoted units, not zero value. Includes changes to owned quantities and incomplete quote coverage.`}>
        <text x="40" y="18">{points.some(p => p.pricedUnits > 0) ? formatMoney(max) : "No quoted units"}</text><path d="M40 160H720" stroke="#505973" />{segments.filter(s => s.length > 1).map((s, i) => <polyline key={i} fill="none" stroke="#c68bff" strokeWidth="3" points={s.join(" ")} />)}
        {points.map((p, i) => { const [cx, cy] = coords[i].split(","); return quoted(p) ? <circle key={p.at} cx={cx} cy={cy} r="3" fill="#c68bff"><title>{formatCompactDate(p.at)}: {label(p)} · {p.pricedUnits}/{p.units} units priced</title></circle> : <text key={p.at} x={cx} y="176" textAnchor="middle">—<title>{formatCompactDate(p.at)}: market estimate unavailable</title></text>; })}
        <text x="40" y="196">{formatCompactDate(points[0].at)}</text><text x="720" y="196" textAnchor="end">{formatCompactDate(points.at(-1)!.at)}</text>
      </svg>
    </>}
    {!!points.length && <div className={styles.historyRecords} role="presentation" onKeyDown={event => { if (event.key === "Escape" && observationsOpen) { event.preventDefault(); setObservationsOpen(false); observationsToggle.current?.focus(); } }}>
      <button ref={observationsToggle} type="button" aria-expanded={observationsOpen} aria-controls={observationsId} onClick={() => setObservationsOpen(open => !open)}>
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 3 5 5-5 5" /></svg>{observationsOpen ? "Hide observations" : "View observations"}
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The bounded table region must be focusable for keyboard scrolling. */}
      <div id={observationsId} hidden={!observationsOpen} className={styles.tableScroll} role="region" aria-label="Collection value observations" tabIndex={0}><table><caption className="sr-only">Collection value observations</caption><thead><tr><th scope="col">Date</th><th scope="col">Market subtotal</th><th scope="col">Priced units</th><th scope="col">Owned units</th></tr></thead><tbody>{[...points].reverse().map(p => <tr key={p.at}><td>{formatCompactDate(p.at)}</td><td>{label(p)}</td><td>{p.pricedUnits} / {p.units}</td><td>{p.units}</td></tr>)}</tbody></table></div>
    </div>}
  </section>;
}

function LotRow({ lot, state, product }: { lot: CollectionLot; state: CollectionState; product?: CollectionProduct }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const [costDraft, setCostDraft] = useState<string | null>(null);
  const [costError, setCostError] = useState("");
  const costSaving = useRef(false);
  const costHelpId = useId();
  const owned = ownedQuantity(state, lot);
  const sold = lot.quantity - owned;
  async function saveInlineCost() {
    if (costDraft === null || costSaving.current) return;
    const raw = costDraft.trim();
    const cents = raw ? parseAmount(raw) : null;
    if (raw && cents === null) { setCostError("Enter a non-negative dollar amount with up to two decimals, or leave blank if unknown."); return; }
    if (cents === lot.unitCostCents) { setCostDraft(null); setCostError(""); return; }
    costSaving.current = true; setBusy(true); setCostError(""); setMessage("");
    try {
      const ok = await changeCollection(latest => {
        const current = latest.lots.find(row => row.id === lot.id);
        if (!current) throw new Error("This purchase no longer exists. Refresh your collection.");
        return updateCollectionLot(latest, lot.id, { quantity: current.quantity, acquiredOn: current.acquiredOn, unitCostCents: cents });
      });
      if (ok) { setCostDraft(null); setMessage("Paid per unit saved."); }
      else setCostError("Price not saved. Check the collection message above, then try again.");
    } finally { costSaving.current = false; setBusy(false); }
  }
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
      <dl className={styles.rowPrices}><div><dt>Paid / unit</dt><dd><span className={styles.inlineCost}><span aria-hidden="true">$</span><input aria-label={`Paid per unit for ${lot.name}`} aria-describedby={costHelpId} aria-invalid={!!costError} inputMode="decimal" autoComplete="off" placeholder="—" disabled={busy}
        value={costDraft ?? (lot.unitCostCents === null ? "" : formatMoney(lot.unitCostCents).replace(/^\$/, ""))}
        onChange={e => { setCostDraft(e.target.value); setCostError(""); setMessage(""); }} onBlur={saveInlineCost}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") { e.preventDefault(); setCostDraft(null); setCostError(""); } }} /></span></dd></div><div><dt>Market / unit</dt><dd>{product?.marketCents == null ? "—" : formatMoney(product.marketCents)}</dd></div><div><dt>Value</dt><dd>{owned ? formatMoney(product?.marketCents == null ? null : product.marketCents * owned) : "—"}</dd></div><div><dt>Est. gain</dt><dd><Gain value={collectionGain(product?.marketCents == null ? null : product.marketCents * owned, lot.unitCostCents, owned)} /></dd></div></dl>
    </div>
    <details className={styles.manageRow}><summary aria-label={`Manage ${lot.name}`}>Manage</summary>
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
    </details>
    <p id={costHelpId} className={costError ? styles.error : styles.costHint} role={costError ? "alert" : undefined}>{costError || `Paid per unit saves on Enter or when you leave the field. Escape cancels. Blank means unknown.${sold ? " Updating this purchase cost also recalculates its recorded sale profit." : ""}`}</p>
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
  const [addOpen, setAddOpen] = useState(false);
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
    <header className={styles.header}>
      <div><h1>My Collection</h1><p>{ready ? `${totals.ownedUnits} owned · ${totals.distinctProducts} products · USD` : "Your sealed collection"} <Info label="collection totals">Totals cover all held units, not just filtered rows. Sold units are excluded. “—” means the cost or quote needed for a calculation is unknown.</Info></p></div>
    <div className={styles.utility}>
      <details className={styles.backupMenu}><summary>Backup</summary><div className={styles.backupPanel}><p>Your collection stays in this browser, without an account or cloud sync. Clearing site data removes it. Keep a backup of your private purchase and sale records.</p><button onClick={backup} disabled={!ready}>Download backup</button><details><summary>Restore backup</summary><label>Choose a PokeScratch JSON backup<input type="file" accept="application/json,.json" onChange={async e => { setPending(null); setImportConfirm(false); const file = e.target.files?.[0]; if (!file) return; try { if (file.size > MAX_COLLECTION_BACKUP_BYTES) throw new Error("Backup is too large."); setPending(parseCollection(await file.text())); setMessage(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid backup."); } }} /></label>{pending && <div><p>{pending.lots.length} purchase records · {pending.sales.length} sales. Restoring replaces this browser’s collection; it does not merge it.</p><label><input type="checkbox" checked={importConfirm} onChange={e => setImportConfirm(e.target.checked)} />I have backed up my current collection and want to replace it.</label><button disabled={!importConfirm} onClick={async () => { if (await changeCollection(() => pending, true)) { setPending(null); setImportConfirm(false); setMessage("Backup restored."); } }}>Replace with this backup</button><button onClick={() => setPending(null)}>Cancel</button></div>}</details></div></details>
      <button className={styles.primary} onClick={() => setAddOpen(!addOpen)} aria-expanded={addOpen} aria-controls="collection-add-purchase">+ Add purchase</button>
    </div>
    </header>
    {error && <p role="alert" className={styles.error}>{error}</p>}<p className={styles.feedback} role="status">{message}</p>
    {!ready ? <p role="status">Loading your collection from this browser…</p> : <>
      <div className={styles.overview}>
      <ValueHistory points={state.snapshots} />
      <dl className={styles.totals} aria-label="Owned collection totals">
        <div><dt>Market <Info label="market value">{totals.pricedUnits} of {totals.ownedUnits} units quoted. Gross market estimate, not guaranteed cash-out proceeds. Quote sources and dates are on each product page.</Info></dt><dd>{totals.ownedUnits ? moneyOrUnknown(totals.marketCents, totals.pricedUnits) : "$0.00"}</dd>{totals.pricedUnits < totals.ownedUnits && <small>Partial · {totals.pricedUnits}/{totals.ownedUnits} quoted</small>}</div>
        <div><dt>Paid <Info label="paid cost">Actual purchase cost for held units. {totals.costedUnits} of {totals.ownedUnits} units have a recorded cost. Unknown costs are never assumed to be zero.</Info></dt><dd>{totals.ownedUnits ? moneyOrUnknown(totals.paidCents, totals.costedUnits) : "$0.00"}</dd>{totals.costedUnits < totals.ownedUnits && <small>Partial · {totals.costedUnits}/{totals.ownedUnits} costed</small>}</div>
        <div><dt>Retail <Info label="retail">Original MSRP or sourced retail reference, not what you paid or an in-stock offer. {totals.retailUnits} of {totals.ownedUnits} units covered.</Info></dt><dd>{totals.ownedUnits ? moneyOrUnknown(totals.retailCents, totals.retailUnits) : "$0.00"}</dd>{totals.retailUnits < totals.ownedUnits && <small>Partial · {totals.retailUnits}/{totals.ownedUnits} covered</small>}</div>
        <div><dt>Est. gain <Info label="estimated gain">Market minus your paid cost for held units with both values, before selling fees or shipping. {totals.unrealizedUnits} of {totals.ownedUnits} units covered. Not realized profit.</Info></dt><dd><Gain value={!totals.ownedUnits ? 0 : totals.unrealizedUnits ? totals.unrealizedCents : null} /></dd><small>{totals.unrealizedUnits < totals.ownedUnits ? `Partial · ${totals.unrealizedUnits}/${totals.ownedUnits}` : "Before selling costs"}</small></div>
        <div><dt>Packs <Info label="verified packs">{totals.packKnownUnits} of {totals.ownedUnits} units have verified pack counts. Promos, accessories and unknown contents are not counted.</Info></dt><dd>{totals.knownPacks.toLocaleString()}</dd>{totals.packKnownUnits < totals.ownedUnits && <small>Partial · verified only</small>}</div>
        <div><dt>Paid / pack <Info label="paid per pack">Paid cost divided by verified booster packs. Uses only {totals.packCostPacks} packs with a recorded cost. No value deducted for promos or extras.</Info></dt><dd>{costPerPack === null ? "—" : formatMoney(costPerPack)}</dd></div>
      </dl>
      </div>
      {addOpen && <section id="collection-add-purchase" className={styles.addPurchase}><div className={styles.sectionHeading}><h2>Add a purchase</h2><button onClick={() => setAddOpen(false)}>Close</button></div><form onSubmit={add} className={styles.form}><label className={styles.wide}>Product<select name="product" required defaultValue=""><option value="" disabled>Choose an exact product</option>{[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="10000" defaultValue="1" required /></label><label>Paid per unit ($)<input name="cost" inputMode="decimal" placeholder="Leave blank if unknown" /></label><label>Purchase date<input name="date" type="date" max={day()} defaultValue={day()} required /></label><p>Record what you actually paid, including purchase tax and inbound shipping if known. Plus-button additions start with an unknown cost and today’s date; edit those after adding.</p><button type="submit" disabled={adding || blocked}>Add purchase</button></form></section>}
      <div className={styles.collectionLayout}>
        <div className={styles.holdings}>
          <div id="collection-purchases" tabIndex={-1} className={styles.browse}>
            <div className={styles.tabs} role="group" aria-label="Collection view">{[["owned", "Owned"], ["all", "All purchases"], ["sold", "Sold"]].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
            <label><span className="sr-only">Search collection</span><input placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <label><span className="sr-only">Filter collection by set</span><select value={set} onChange={e => setSet(e.target.value)}><option value="">All sets</option>{sets.map(s => <option key={s}>{s}</option>)}</select></label>
          </div>
          <div className={styles.listContext}><span>{tab === "sold" ? `${sales.length} sales` : `${lots.length} purchases`}</span><span>{tab === "sold" ? "Actual sale results" : "Held units"} <Info label="row values">Paid and Market are per unit; Value and Est. gain cover the row’s held quantity. Estimated gain is before selling costs. Manage opens cost, quantity and sale controls. Unknown values show a dash.</Info></span></div>
          {!state.lots.length ? <section className={styles.empty}><h2>Your shelf starts with one box.</h2><p>Add a purchase or use + on any catalog product.</p><a href="/">Browse products</a></section> : tab === "sold" ? <section aria-label="Sales history">
            {!sales.length && <p>No matching sales.</p>}
            {sales.map(sale => { const lot = state.lots.find(l => l.id === sale.lotId)!; const profit = collectionGain(sale.proceedsCents, lot.unitCostCents, sale.quantity, sale.feesCents); return <article key={sale.id} className={styles.sale}>
              <ProductImage src={catalog.get(lot.slug)?.imageUrl ?? lot.imageUrl} alt={`${lot.name} packaging`} category={lot.category} setName={lot.setName} productName={lot.name} className={styles.thumb} />
              <div className={styles.identity}><h3>{lot.name}</h3><p>{sale.quantity} sold · {formatCompactDate(sale.soldOn)}</p></div>
              <dl><div><dt>Sold for</dt><dd>{formatMoney(sale.proceedsCents)}</dd></div><div><dt>Fees + shipping</dt><dd>{formatMoney(sale.feesCents)}</dd></div><div><dt>Sale profit</dt><dd><Gain value={profit} /></dd>{profit === null && <small>Cost unknown</small>}</div></dl>
              <button onClick={async () => { if (await changeCollection(state => undoCollectionSale(state, sale.id))) setMessage("Sale undone. Units returned to Owned."); }}>Undo sale</button>
            </article>; })}
          </section> : <section aria-label="Collection purchases">
            {!!lots.length && <div className={styles.ledgerHeader} aria-hidden="true"><span>Product / qty</span><span>Paid / unit</span><span>Market / unit</span><span>Value</span><span>Est. gain</span><span /></div>}
            {!lots.length && <p>No matching purchases. Try All purchases or clear your filters.</p>}
            {lots.map(lot => <LotRow key={lot.id} lot={lot} state={state} product={catalog.get(lot.slug)} />)}
          </section>}
        </div>
        <aside className={styles.sidebar} aria-label="Collection breakdown">
          <section><h2>Packs by set <Info label="packs by set">Verified packs held, grouped by product set. Mixed-set products stay grouped; we do not invent an expansion split. These totals ignore list filters.</Info></h2>
            {!totals.setPacks.length ? <p>No packs recorded yet.</p> : <ul className={styles.setList}>{totals.setPacks.map(row => <li key={row.setName}><div><span>{row.setName}</span><strong>{row.packs.toLocaleString()}</strong></div><div className={styles.barTrack} aria-hidden="true"><span style={{ width: `${totals.knownPacks ? row.packs / totals.knownPacks * 100 : 0}%` }} /></div>{row.unknownPackUnits > 0 && <small>+ {row.unknownPackUnits} units unverified</small>}</li>)}</ul>}
          </section>
          <section className={styles.salesSummary}><h2>Sales <Info label="sale profit">Realized profit = gross sale proceeds minus recorded fees, seller shipping and purchase cost. {totals.realizedUnits} of {totals.soldUnits} sold units have known costs. Not combined with estimated gains on held items.</Info></h2><dl><div><dt>Realized profit</dt><dd><Gain value={!totals.soldUnits ? 0 : totals.realizedUnits ? totals.realizedCents : null} /></dd></div><div><dt>Sold units</dt><dd>{totals.soldUnits}</dd></div><div><dt>Proceeds</dt><dd>{formatMoney(totals.saleProceedsCents)}</dd></div><div><dt>Fees + shipping</dt><dd>{formatMoney(totals.saleFeesCents)}</dd></div></dl>{totals.realizedUnits < totals.soldUnits && <small>Partial · {totals.realizedUnits}/{totals.soldUnits} costed</small>}</section>
        </aside>
      </div>
    </>}
  </main>;
}
