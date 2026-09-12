# Buy-check refinement — September 12, 2026

The approved critique is implemented as a buying workflow, not a portfolio redesign.

## What changed

- Cost fields validate deliberate zero separately from invalid input; invalid costs pause the verdict. Actual purchase price precedes the verdict. Catalog signals explicitly assume reference retail, not an available offer.
- One category state drives quick and advanced filters. Search relevance is the default; explicit sorting remains available. Removable filters, shareable query URLs, and session scroll/load-more restoration preserve browsing context.
- Mobile keeps identity and paired prices in compact horizontal cards. Secondary signal/sort controls live in Refine. Detail uses an expandable thumbnail beside identity and prioritizes shelf-price entry.
- Details reuse the saved heart, offer optional browser-local cost profiles, and calculate maximum purchase price meeting both profit and ROI targets. The inverse calculation uses the same rounded-cent cost math and unrounded ROI to avoid overstating a target.
- Source-backed metadata is centralized in `data/product-facts.json`: 431 exact product identities, 306 usable pack counts and 163 promo-content records. Unknown language, UPC, or ambiguous bundle contents remain unknown. Two 151 editions were cross-checked against official Pokémon product pages. The extraction script reads cached exact-ID TCGplayer specifications; it does not guess a count from category.
- Catalog-connected pack comparisons prefill reference retail and verified counts, permit actual checkout costs, and create shareable comparison URLs. Different-set comparisons carry a warning. Pack comparisons do not value promos or expected pulls.
- Product history reads actual D1 observations, capped and deduplicated by provider/day. Missing days are not synthesized; unavailable data remains explicit. Charts require multiple comparable dated points from one provider. No database migration was needed.
- Market-price targets are stored on this browser and checked against snapshots up to three days old when the site is visited. No background, email, or push delivery is claimed.
- Optional table columns expose net profit, ROI and price age without expanding browse cards. Manage catalog remains in the footer, not primary public navigation. Privacy describes local storage and shared URL contents.

## Preserved

Existing product prices, source provenance, image assets, recommendation thresholds, refresh authorization/workflow, D1/admin precedence, inactive-product tombstones, public routes, and the arcade collector identity remain intact. No historical prices, stock offers, sales volume or eBay sample sizes were invented.

## External follow-ups

Retail availability and exact sold comps/sell-through require a reliable authorized feed. Email/push alerts require a delivery service and consent/account design. Unknown product specifications require source verification. These are not disguised as completed live-data features.

## Validation

Typecheck and lint; 50 domain, catalog, rendered-page, saved/refresh and new buy-check tests; production build. Browser checks cover desktop/mobile catalog, compatible filters/search/sort, navigation restoration, real price entry and invalid costs, saved/profile/target persistence, comparison prefill/share restoration, and responsive overflow. Test-only local targets and saved additions are removed after verification.
