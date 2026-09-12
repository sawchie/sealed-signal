import { historyByDay, type PriceObservation } from "@/lib/price-history";
import { formatCompactDate, formatMoney } from "@/lib/format";

export function PriceHistory({ observations, currency, unavailable }: { observations: PriceObservation[]; currency: string; unavailable: boolean }) {
  const rows = historyByDay(observations, currency);
  const providers = new Set(rows.map(row => row.provider));
  const priced = rows.filter(row => row.amountCents !== null);
  const canChart = priced.length >= 2 && rows.length === priced.length && providers.size === 1;
  const low = priced.length ? Math.min(...priced.map(row => row.amountCents!)) : 0;
  const high = priced.length ? Math.max(...priced.map(row => row.amountCents!)) : 0;
  const start = rows.length ? Date.parse(rows[0].observedAt) : 0;
  const end = rows.length ? Date.parse(rows.at(-1)!.observedAt) : 0;
  const points = canChart ? priced.map(row => `${24 + (Date.parse(row.observedAt) - start) / Math.max(end - start, 1) * 672},${156 - (row.amountCents! - low) / Math.max(high - low, 1) * 124}`).join(" ") : "";
  return <section className="detail-panel price-history" aria-labelledby="price-history-title"><h2 id="price-history-title">Recorded market history</h2><p>Snapshots actually recorded by PokeScratch, not individual sold listings. Missing dates are not backfilled. Changes in source are shown separately in the table.</p>
    {unavailable && <p role="status">Earlier observations could not be loaded. The current snapshot remains available above.</p>}
    {canChart && end > start && <figure><figcaption>{formatMoney(low, currency)}–{formatMoney(high, currency)} recorded range · {rows[0].source}</figcaption><svg viewBox="0 0 720 188" role="img" aria-label={`Recorded market estimates from ${formatCompactDate(rows[0].observedAt)} to ${formatCompactDate(rows.at(-1)!.observedAt)}; exact values in the table below.`}><path d="M24 12v156h672" fill="none" stroke="#505973" /><polyline points={points} fill="none" stroke="#c994ff" strokeWidth="3" strokeLinejoin="round" /></svg><div className="history-dates"><span>{formatCompactDate(rows[0].observedAt)}</span><span>{formatCompactDate(rows.at(-1)!.observedAt)}</span></div></figure>}
    {rows.length < 2 && <p>{rows.length ? "One observation recorded so far. A trend will appear only after more dated snapshots are available." : "No historical observations available yet. Future successful refreshes retain dated snapshots."}</p>}
    {!!rows.length && <details open={!canChart}><summary>View {rows.length} recorded {rows.length === 1 ? "observation" : "observations"}</summary><div className="history-table-wrap"><table><caption className="sr-only">Recorded market snapshots, newest first</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Market</th><th scope="col">Source</th></tr></thead><tbody>{[...rows].reverse().map((row, i) => <tr key={`${row.observedAt}-${row.provider}-${i}`}><td>{formatCompactDate(row.observedAt)}</td><td>{formatMoney(row.amountCents, row.currency)}</td><td>{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer">{row.source}</a> : row.source}</td></tr>)}</tbody></table></div></details>}
  </section>;
}
