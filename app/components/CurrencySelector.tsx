"use client";
import { useId } from "react";
import { CURRENCIES, isDisplayCurrency, RATE_SOURCE } from "@/lib/currency";
import { formatCompactDate } from "@/lib/format";
import { useCurrency } from "./CurrencyProvider";

export function CurrencySelector() {
  const { currency, setCurrency, rates, message, stale } = useCurrency();
  const id = useId();
  return <div className="currency-switcher">
    <label htmlFor={id} className="sr-only">Display currency</label>
    <select id={id} value={currency} onChange={event => { if (isDisplayCurrency(event.target.value)) setCurrency(event.target.value); }}>
      {Object.entries(CURRENCIES).map(([code, name]) => <option key={code} value={code} aria-label={`${code} — ${name}`}>{code === currency ? code : `${code} — ${name}`}</option>)}
    </select>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Native disclosure, with Escape restoring focus. */}
    <details className="currency-info" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary aria-label="About currency conversion"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 5.5v1" /></svg></summary>
      <div className="currency-info__panel">
        <strong>{currency === "USD" ? "US-dollar source prices" : `Converted to ${currency}`}</strong>
        {currency !== "USD" && <p>1 USD = {rates.rates[currency].toLocaleString("en-US", { maximumFractionDigits: 5 })} {currency}</p>}
        <p><a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">{RATE_SOURCE}</a><br />Rate date: <time dateTime={rates.date}>{formatCompactDate(rates.date)}</time></p>
        <p>Checked daily. Weekends and holidays use the latest published business-day rates.</p>
        <p>Display conversion only, not local-market pricing. Price inputs, filters and saved purchase costs remain USD; admin records keep their source currency. Historical values use this same rate, not historical exchange rates. Bank fees are excluded.</p>
        {(message || stale) && <p role="status" className="currency-warning">{stale ? "Rates are over a week old. Treat conversions as approximate. " : ""}{message}</p>}
      </div>
    </details>
    {stale && currency !== "USD" && <span className="currency-warning">Older rates</span>}
  </div>;
}
