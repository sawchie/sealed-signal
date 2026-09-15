export const CURRENCIES = {
  USD: "US dollar", CAD: "Canadian dollar", EUR: "Euro", GBP: "British pound",
  AUD: "Australian dollar", NZD: "New Zealand dollar", JPY: "Japanese yen", CHF: "Swiss franc",
} as const;
export type DisplayCurrency = keyof typeof CURRENCIES;
export type ExchangeRates = { base: "USD"; date: string; checkedAt: string; rates: Record<DisplayCurrency, number> };
export const CURRENCY_KEY = "pokescratch:display-currency:v1";
export const RATE_SOURCE = "European Central Bank via Frankfurter";
export const RATE_URL = "https://api.frankfurter.dev/v2/providers/ecb/rates?base=USD&quotes=CAD,EUR,GBP,AUD,NZD,JPY,CHF";

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === "string" && Object.hasOwn(CURRENCIES, value);
}
function validDay(value: unknown, now: number) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value && Date.parse(value) <= now;
}
export function parseExchangeRates(value: unknown, now = Date.now()): ExchangeRates | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ExchangeRates;
  if (row.base !== "USD" || !validDay(row.date, now) || !Number.isFinite(Date.parse(row.checkedAt))
    || Date.parse(row.checkedAt) > now + 300_000 || Date.parse(row.checkedAt) < Date.parse(row.date) || !row.rates) return null;
  const rates = {} as Record<DisplayCurrency, number>;
  for (const code of Object.keys(CURRENCIES) as DisplayCurrency[]) {
    const rate = row.rates[code];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || rate > 10000) return null;
    rates[code] = rate;
  }
  if (rates.USD !== 1) return null;
  return { base: "USD", date: row.date, checkedAt: row.checkedAt, rates };
}
export function parseProviderRates(value: unknown, now = Date.now()): ExchangeRates {
  if (!Array.isArray(value) || value.length !== Object.keys(CURRENCIES).length - 1) throw new Error("Incomplete exchange-rate response");
  const rates: Partial<Record<DisplayCurrency, number>> = { USD: 1 };
  let date: string | undefined;
  for (const row of value) {
    const quote: unknown = row?.quote;
    if (!row || row.base !== "USD" || !isDisplayCurrency(quote) || Object.hasOwn(rates, quote)
      || (date && row.date !== date)) throw new Error("Mismatched exchange-rate response");
    date = row.date; rates[quote] = row.rate;
  }
  const parsed = parseExchangeRates({ base: "USD", date, checkedAt: new Date(now).toISOString(), rates }, now);
  if (!parsed || now - Date.parse(parsed.date) > 7 * 86400_000) throw new Error("Invalid or stale provider rates");
  return parsed;
}
const formatters = new Map<string, Intl.NumberFormat>();
function formatter(currency: string) {
  let result = formatters.get(currency);
  if (!result) { result = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }); formatters.set(currency, result); }
  return result;
}
/** Display conversion only. Never persist this result or feed it into buying signals. */
export function convertedMoney(amount: number | null | undefined, source: string, target: DisplayCurrency, rates: ExchangeRates): string {
  if (amount == null || !Number.isFinite(amount)) return "Unavailable";
  const digits = formatter(source).resolvedOptions().maximumFractionDigits ?? 2;
  const major = amount / 10 ** digits;
  if (source === target) return formatter(target).format(major);
  if (!isDisplayCurrency(source)) return `${formatter(source).format(major)} ${source}`;
  return formatter(target).format(major / rates.rates[source] * rates.rates[target]);
}
