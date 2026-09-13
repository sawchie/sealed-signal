# Announced products and presale pricing

Added September 12, 2026: 32 exact 30th Celebration identities, 13 Delta Reign identities, and the three 2026 First Partner Illustration Collections. Cases, assorted art bundles, regional half booster boxes, and loose First Partner promo packs are excluded to avoid duplicate or misleading retail comparisons. This is the confirmed US-facing provider lineup, not a claim to cover every worldwide anniversary promotion.

Official expansion announcements:

- [30th Celebration — September 16, 2026](https://www.pokemon.com/us/news/get-ready-for-pokemon-tcg-30th-celebration)
- [Delta Reign — November 6, 2026](https://www.pokemon.com/us/news/the-pokemon-tcg-mega-evolution-delta-reign-expansion-arrives-november-6-2026)

Individual products launch in different waves. The exact TCGplayer identity and provider estimated shipping date are retained in `data/announced-products.json`. Build & Battle retail shipping can be later than local prerelease events; dates are expectations, not verified stock. Regional schedules may differ.

## Data handling

- `research-upcoming.mjs` retrieves only the relevant TCGCSV groups. `import-upcoming.mjs` appends reviewed exact identities without changing existing prices, IDs, slugs, or admin records. Research caches are private/ignored.
- Retail references are exact-name/variant matches against the existing Celadon US retail calendar, with source URLs. An unmatched variant remains null; asking prices and temporary discounts are not substituted.
- New quotes are the single exact product's positive `Normal.marketPrice` from the TCGplayer export. They retain the provider timestamp **2026-09-12T20:05:09.000Z** per record. The old catalog timestamp remains unchanged. Presale estimates are not independent eBay sold comps and can move sharply before launch.
- The existing daily refresh discovers groups from the catalog, so these additions join its existing authenticated workflow without a new schedule. Missing quotes never erase a good saved quote.
- Prerelease browse cards say PREORDER/ANNOUNCED, not Strong Buy. Detail calculations remain available as explicitly labeled presale scenarios. Release status is derived from the server's UTC date. A registered announcement with no date remains ANNOUNCED; absent prices read TBD. Once its expected date arrives it joins released browsing; this does not assert retail availability.
- `release=upcoming` and `release=released` compose with set, search, sort, and saved filters and survive detail-page return navigation. “30th anniversary” also finds the First Partner collections; “Delta Rain” is an alias for Delta Reign.

## Images and remaining gaps

47 exact-product TCGplayer photos are stored as optimized local WebP cutouts. Original URLs and dimensions remain in `data/catalog-image-provenance.json`; use the established image permission/source policy. Provider artwork may be preliminary.

Delta Reign Target-exclusive Keldeo blister (712109) has no provider photo and uses the existing intentional placeholder. Thirteen new identities have no exact-match retail reference; seven have no provider market quote. These remain null/TBD rather than borrowing another variant's price or image.

Future entries must represent an identifiable announced product with a source. Do not create invented SKU variants to fill an announcement with no product-level details.
