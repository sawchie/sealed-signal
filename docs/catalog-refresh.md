# Catalog refresh notes — private repository documentation

The September 11, 2026 import uses TCGCSV's public daily export of TCGplayer product identities and Normal marketPrice values. Source timestamp: 2026-09-11T20:05:58.000Z. No listing asking prices, synthetic quotes, or individual eBay sold listings are substituted.

- Provider documentation: https://tcgcsv.com/docs and https://tcgcsv.com/faq
- Retail/release references: exact-product public records at https://celadoninfo.com/us/releases, with individual URLs recorded in data/catalog-import.json. Celadon is an independent MSRP reference, not first-party retail. Existing verified retail references remain unchanged.
- 431 products; all 64 original records retained, 367 additions. 412 current market quotes; 19 have no quote. 213 records have a retail reference after preserving the original 64. Unknown values remain null.
- New products exclude cases, mismatched quantities, international variants, presales/future releases, card singles, and records without a downloadable exact-product photo.
- 367 local cropped WebP derivatives. Eleven source images are below 600px on their longest edge; they are not artificially upscaled. Exact source dimensions and URLs are recorded in data/catalog-image-provenance.json. Higher-resolution replacements can use the same local references.
- Known provider-photo gaps excluded from new publication: product IDs 636312 and 686503.

## Repeatable maintenance

scripts/research-catalog.mjs downloads a daily provider snapshot with a custom User-Agent and throttling. Cache freshness is committed only after the complete fetch succeeds. scripts/prepare-catalog-import.mjs merges reviewed identities and exact retail metadata from the cached release calendar. Review changes before publication, particularly new variants and uncertain release records. scripts/download-catalog-images.mjs downloads new product assets; scripts/process-catalog-images.py crops and optimizes them without overwriting the source downloads.

The .catalog-cache directory is ignored and not deployed. The reviewed JSON import and local product assets are versioned. These scripts are maintenance tools, not a scheduled live-price service.

D1 metadata and deactivations remain authoritative. A newer bundled market quote replaces an older persisted quote, while a more recent admin quote wins. The catalog and sitemap traverse all D1 pages, not just the first 200 rows.
