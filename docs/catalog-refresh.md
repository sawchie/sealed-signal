# Catalog refresh notes — private repository documentation

The September 11, 2026 import uses TCGCSV's public daily export of TCGplayer product identities and Normal marketPrice values. Source timestamp: 2026-09-11T20:05:58.000Z. No listing asking prices, synthetic quotes, or individual eBay sold listings are substituted.

- Provider documentation: https://tcgcsv.com/docs and https://tcgcsv.com/faq
- Retail/release references: exact-product public records at https://celadoninfo.com/us/releases, with individual URLs recorded in data/catalog-import.json. Celadon is an independent MSRP reference, not first-party retail. Existing verified retail references remain unchanged.
- 431 products; all 64 original records retained, 367 additions. The bundled snapshot contains 412 market quotes; 19 have no quote. September 12 retail review adds 84 previously missing prices, bringing retail coverage to 297/431. The remaining 134 retail values lack a sufficiently verified exact-product reference and remain null.
- New products exclude cases, mismatched quantities, international variants, presales/future releases, card singles, and records without a downloadable exact-product photo.
- 367 local cropped WebP derivatives. Eleven source images are below 600px on their longest edge; they are not artificially upscaled. Exact source dimensions and URLs are recorded in data/catalog-image-provenance.json. Higher-resolution replacements can use the same local references.
- Known provider-photo gaps excluded from new publication: product IDs 636312 and 686503.

## Repeatable maintenance

scripts/research-catalog.mjs downloads a daily provider snapshot with a custom User-Agent and throttling. Cache freshness is committed only after the complete fetch succeeds. scripts/prepare-catalog-import.mjs merges reviewed identities and exact retail metadata from the cached release calendar. Review changes before publication, particularly new variants and uncertain release records. scripts/download-catalog-images.mjs downloads new product assets; scripts/process-catalog-images.py crops and optimizes them without overwriting the source downloads.

The .catalog-cache directory is ignored and not deployed. The reviewed JSON import and local product assets are versioned. These scripts maintain catalog identities and assets; market refreshes now run separately below.

D1 metadata and deactivations remain authoritative. A newer bundled market quote replaces an older persisted quote, while a more recent admin quote wins. The catalog and sitemap traverse all D1 pages, not just the first 200 rows.

## Daily market refresh

`.github/workflows/refresh-prices.yml` schedules `scripts/daily-price-refresh.mjs` at 21:37 UTC daily, after TCGCSV's approximately 20:00 UTC export. It can also be run manually from GitHub Actions → Daily market prices → Run workflow. It runs independently of the developer's computer; scheduled GitHub runs may be delayed, and public-repository schedules can be disabled after 60 days without repository activity.

The workflow calls `POST https://pokescratch.com/api/prices/refresh` with a short-lived GitHub OIDC token. The Worker verifies its RSA signature against GitHub's public keys, issuer, audience, immutable repository/owner IDs, main branch, exact workflow path, event, and timestamps. No admin key or long-lived refresh secret is sent to GitHub or a browser. Unauthenticated callers cannot trigger provider requests or database writes.

The server fetches prices itself from hardcoded TCGCSV endpoints, matches exact product IDs and the Normal subtype, and accepts only positive finite marketPrice values. Provider timestamps must be within 72 hours and not in the future. Ten products per request keep database queries below the free D1 per-invocation limit. Snapshots are timestamped and idempotent; retries cannot duplicate them. Missing/malformed prices retain the last quote. Each successful batch is atomic; a failed group is reported in the Actions summary and fails the run after other groups have been attempted.

Bundled products are materialized only when absent from D1. Existing names, images, retail prices, manual edits, newer quotes, and deactivations are preserved. This is a daily TCGplayer market estimate via TCGCSV, not a live feed or an independently collected eBay sold-listing median. Catalog “Latest market update” is derived from actual displayed product quote timestamps, not a hardcoded refresh time; individual source dates remain on detail pages.

## Retail references

`data/retail-references.json` centralizes 85 exact product-ID references checked September 11–12, 2026 (84 fill previously missing values). Sources include Pokémon Center's retail catalog, Celadon Info, and launch-price reporting from PokeBeach and PokeGuardian. Source names, URLs, and check dates are retained. Existing non-null verified/admin retail values take precedence; reviewed references fill null retail values only. Historic retail/MSRP is not represented as current stock availability, and daily market refreshes do not rewrite it with asking prices or discounts.

## Saved products

The catalog's pixel hearts store only stable public product slugs and an opening preference under the versioned browser-local `pokescratch:saved:v1` key. Saved products compose with existing search, sets, sorting and filters. Saved becomes the next-visit default only when the preference is enabled and at least one saved product still exists. Users can switch to All products or turn the preference off. There is no account sync; clearing browser data removes the list. Storage failures retain a session-only list with a visible explanation.
