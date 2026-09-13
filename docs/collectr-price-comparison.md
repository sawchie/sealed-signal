# Collectr comparison — limited public sample

Assessment date: September 13, 2026. Research only; no catalog prices or deployed site were changed.

## Result and coverage

This is **not an all-price audit**. Ten identifiable sealed products visible on Collectr's public homepage were compared with PokeScratch's live public API. Nine differ by less than 2%; the remaining product differs by 4.67%. This does not establish the accuracy of the rest of the catalog, nor establish either price provider as ground truth.

The comparison covers 10 of 457 active public-API records (2.19% of that API inventory); the other 447 API records have not been compared with Collectr. Three API pages returned a consistent total of 457 and 457 unique product IDs. **457 is not a verified count of all displayed site listings.** The website's `publicCatalog()` merges database records with bundled seed products by slug; `resolvePublicProduct()` suppresses inactive database records and can use newer bundled quotes. Consequently, additional seed-only listings may remain uncompared, and the full browser-visible denominator is unverified. Only the active API inventory—not the complete displayed catalog—was enumerated.

## Evidence and timing

- PokeScratch evidence: [public API, page 1](https://pokescratch.com/api/products?limit=200&offset=0), [page 2](https://pokescratch.com/api/products?limit=200&offset=200&audit=20260913T2144), and [page 3](https://pokescratch.com/api/products?limit=200&offset=400), retrieved `2026-09-13T21:43–21:45Z`. Every compared API quote identifies `TCGplayer via TCGCSV`, USD, and source update `2026-09-13T20:05:38.000Z`. Earlier cached responses reported inconsistent totals of 413 and 416; refreshed responses were used instead. These are daily market estimates, not live executable offers.
- The saved `data/catalog-import.json` was checked first but is older (normally source-dated September 11, with some September 12 entries), so it is not used for the final table. The local public-resolution code chooses a newer bundled quote over a persisted quote; for all ten comparisons, the API quote is newer than the local bundled quote.
- Collectr evidence: [public product search homepage](https://app.getcollectr.com/), retrieved during `2026-09-13T21:40–21:42Z`. The page explicitly displayed USD and marked these products Sealed. It did not expose their source-quote timestamps. Retrieval time must not be presented as the market-data update time.
- Rows were matched by the full product name and sealed variant, preserving Pokémon Center versus regular ETB and Series 1 versus other series. Accents, hyphenation, and the explicit “Exclusive” suffix were normalized only where identity stayed clear. These are name/variant matches, not a verified cross-provider identifier mapping. Singles, unrelated games, and unmatched products were excluded. English-language product names match the import; no independent language-ID mapping was available.

## Observations (USD)

Collectr values below come from the [public homepage](https://app.getcollectr.com/). PokeScratch values come from the live public API. Difference is `(PokeScratch − Collectr) / Collectr × 100`; a positive difference means PokeScratch is higher. ETB means Elite Trainer Box; PC means Pokémon Center; UPC means Ultra-Premium Collection.

| Product / TCGplayer ID | PokeScratch API | Collectr | Difference |
| --- | ---: | ---: | ---: |
| Perfect Order Booster Box / 672394 | $176.77 | $174.74 | +1.16% |
| Perfect Order PC ETB / 672404 | $124.10 | $122.88 | +0.99% |
| Ascended Heroes ETB / 668496 | $161.42 | $158.34 | +1.95% |
| Ascended Heroes PC ETB / 668497 | $381.68 | $383.29 | −0.42% |
| Phantasmal Flames Booster Box / 654137 | $397.55 | $398.61 | −0.27% |
| 151 UPC / 502005 | $921.17 | $924.18 | −0.33% |
| Blooming Waters Premium Collection / 609597 | $327.35 | $326.81 | +0.17% |
| Mega Charizard X ex UPC / 654213 | $232.18 | $234.27 | −0.89% |
| 30th Celebration PC ETB / 704144 | $469.48 | $492.46 | −4.67% |
| First Partner Illustration Collection (Series 1) / 673436 | $67.11 | $68.06 | −1.40% |

No sampled difference reaches a 10% screening threshold (an audit convention, not a user-specified definition of “major”). The largest gap is $22.98, or 4.67%, on 30th Celebration PC ETB. Its local release date is September 16, 2026, so the comparison precedes release and should not be treated as a settled post-release valuation. Different observation dates, update cycles, or valuation methodology may account for differences; no causal explanation was verified. No inference about untested products is justified.

## Dependency for complete coverage

Collectr's official [API terms](https://getcollectr.com/api-terms-and-conditions.html), updated March 19, 2024 and retrieved September 13, 2026, describe an approval process and application keys, limit use to approved purposes, and restrict automated pricing collection outside approved API access. No approved Collectr API connection or credentials were available to this assessment. Undocumented endpoints, automated catalog scraping, auth bypasses, and purchases were not used.

The official [PRO feature page](https://www.getcollectr.com/pro) advertises collection export. That is an export of an account's collection, not evidence of an unrestricted whole-catalog export. A user-provided export would only support products it actually contains, and its price/currency/date fields would need inspection before comparison.

To finish the requested full comparison, obtain an appropriately authorized Collectr dataset covering every active PokeScratch product, with product identity, sealed variant, language, currency, value, and quote date. Capture PokeScratch's authoritative active-product prices at the same time, match products explicitly, and report unmatched/undated rows rather than treating them as passes. Exporting only a partial personal collection would not finish an all-price audit.

The public evidence confirms that Collectr can supply another comparison value; it does not verify statistical independence from PokeScratch's upstream source. Agreement between two displayed valuations is not proof of a realizable sale price after fees, shipping, tax, or condition differences.
