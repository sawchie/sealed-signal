"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import seed from "@/data/exchange-rates.json";
import { CURRENCY_KEY, convertedMoney, isDisplayCurrency, parseExchangeRates, type DisplayCurrency, type ExchangeRates } from "@/lib/currency";

const initialRates = seed as ExchangeRates;
const CurrencyContext = createContext({
  currency: "USD" as DisplayCurrency, rates: initialRates, message: "", stale: false,
  setCurrency: (value: DisplayCurrency) => { void value; },
  formatMoney: (amount: number | null | undefined, source = "USD") => convertedMoney(amount, source, "USD", initialRates),
});
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setSelected] = useState<DisplayCurrency>("USD");
  const [rates, setRates] = useState(initialRates);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Keep the server and first client render identical; preferences are device-local.
    try { const saved = localStorage.getItem(CURRENCY_KEY); if (isDisplayCurrency(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(saved);
    } } catch { /* The selector remains usable for this visit. */ }
    const onStorage = (event: StorageEvent) => { if (event.key === CURRENCY_KEY || event.key === null) setSelected(isDisplayCurrency(event.newValue) ? event.newValue : "USD"); };
    window.addEventListener("storage", onStorage);
    const controller = new AbortController();
    let lastCheck = 0;
    const refresh = async () => {
      if (Date.now() - lastCheck < 6 * 3600_000) return;
      lastCheck = Date.now(); setNow(lastCheck);
      try {
        const response = await fetch("/api/exchange-rates", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
        const next = response.ok && parseExchangeRates(await response.json());
        if (!next) throw new Error("Rates unavailable");
        setRates(previous => next.date > previous.date || (next.date === previous.date && next.checkedAt >= previous.checkedAt) ? next : previous);
        setMessage("");
      } catch { if (!controller.signal.aborted) setMessage("Could not check rates. Showing the last available dated rates."); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const timer = window.setInterval(onVisible, 6 * 3600_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  const setCurrency = useCallback((value: DisplayCurrency) => {
    if (!isDisplayCurrency(value)) return;
    setSelected(value);
    try { localStorage.setItem(CURRENCY_KEY, value); } catch { setMessage("Currency applies to this visit; browser storage is unavailable."); }
  }, []);
  const formatMoney = useCallback((amount: number | null | undefined, source = "USD") => convertedMoney(amount, source, currency, rates), [currency, rates]);
  const stale = now !== null && now - Date.parse(rates.date) > 7 * 86400_000;
  const value = useMemo(() => ({ currency, rates, message, stale, setCurrency, formatMoney }), [currency, rates, message, stale, setCurrency, formatMoney]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
export function useCurrency() { return useContext(CurrencyContext); }
