import seed from "../data/exchange-rates.json";
import { parseExchangeRates, parseProviderRates, RATE_URL, type ExchangeRates } from "../lib/currency";

export async function getExchangeRates(): Promise<ExchangeRates> {
  const fallback = seed as ExchangeRates;
  try {
    const { getD1 } = await import("./index");
    const row = await getD1().prepare("SELECT rate_date, checked_at, rates_json FROM exchange_rates WHERE base = ?").bind("USD")
      .first<{ rate_date: string; checked_at: string; rates_json: string }>();
    const saved = row && parseExchangeRates({ base: "USD", date: row.rate_date, checkedAt: row.checked_at, rates: JSON.parse(row.rates_json) });
    return saved && saved.date >= fallback.date ? saved : fallback;
  } catch {
    // Local preview, database outage, or rollout before migration: keep the dated bundled quote.
    return fallback;
  }
}
export async function refreshExchangeRates() {
  const response = await fetch(RATE_URL, { signal: AbortSignal.timeout(20000), redirect: "manual" });
  if (!response.ok) throw new Error(`Exchange-rate provider HTTP ${response.status}`);
  const next = parseProviderRates(await response.json());
  const previous = await getExchangeRates();
  if (next.date < previous.date) throw new Error("Older exchange rates rejected; previous rates retained");
  const { getD1 } = await import("./index");
  // Atomic monotonic upsert: retries and overlapping runs cannot roll rates back.
  await getD1().prepare(`INSERT INTO exchange_rates (base, rate_date, checked_at, rates_json) VALUES (?, ?, ?, ?)
    ON CONFLICT(base) DO UPDATE SET rate_date = excluded.rate_date, checked_at = excluded.checked_at, rates_json = excluded.rates_json
    WHERE excluded.rate_date >= exchange_rates.rate_date AND excluded.checked_at >= exchange_rates.checked_at`)
    .bind(next.base, next.date, next.checkedAt, JSON.stringify(next.rates)).run();
  return { date: next.date, checkedAt: next.checkedAt, currencies: Object.keys(next.rates).length };
}
