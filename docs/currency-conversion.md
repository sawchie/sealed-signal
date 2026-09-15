# Display currencies

PokeScratch supports USD, CAD, EUR, GBP, AUD, NZD, JPY and CHF. The navigation selector remembers a device-local display preference and synchronizes open tabs. Mobile uses the existing Menu. Catalog cards, table values, detail calculations, recorded market history, collection totals/sales/history, watch amounts and pack-comparison results share one formatter.

All original product data, USD calculations, buying thresholds, saved costs and backups remain unchanged. Price inputs and numeric filters are explicitly USD; the editable collection cost also shows a converted equivalent. Changing display currency never rewrites records or recalculates buying classifications. History is converted with the current reference rate, not historical FX. This is not local-market pricing, bank-execution pricing or multicurrency cost-basis accounting. Admin and SEO retain source prices.

Rates: [European Central Bank via Frankfurter](https://frankfurter.dev/), pinned to the ECB provider. The ECB publishes [business-day reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html). The existing daily GitHub workflow checks rates at 21:37 UTC. An authenticated `exchange=1` branch uses the existing signed workflow policy; the public GET endpoint only reads the last-good snapshot. No API key is required.

The additive `exchange_rates` D1 table stores the provider's actual rate date and a separate successful-check timestamp. Invalid, incomplete, redirected, nonpositive, older or excessively stale provider responses cannot replace good rates. Network/database failures preserve a dated bundled fallback. A visible warning marks conversion rates more than seven days old. The information disclosure explains source, date, weekend/holiday behavior and limitations.

The workflow's optional `exchange_only` dispatch input checks only exchange rates. Normal scheduled runs refresh FX then market quotes; FX failure does not prevent the market step from running. Public reads have a five-minute cache; open tabs check again every six hours or when returning after that interval.
