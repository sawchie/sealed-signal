# Sealed Signal

Sealed Signal is a mobile-first Pokémon sealed-product resale decision desk. It helps a reseller identify a product, compare a shelf price with an attributed market estimate, and see fee-adjusted profit, ROI, and a recommendation before buying.

This repository is a deployment-ready V1 built with Vinext, React, TypeScript, Cloudflare Workers, D1, and Drizzle. It intentionally uses manual price snapshots rather than presenting simulated or stale values as live data.

## What is included

- 34 real sealed-product records spanning Elite Trainer Boxes, Pokémon Center ETBs, booster boxes and bundles, sleeved packs, blisters, tins, mini tins, collections, premium collections, UPCs, and warehouse-club bundles.
- Forgiving search across names, sets, aliases, abbreviations, and small typos.
- Quick filters, advanced range filters, nine sort modes, responsive cards, and a compact desktop table.
- Per-product purchase-price inputs with immediate profit, net-proceeds, ROI, badge, and recommendation recalculation.
- Configurable selling fee, fixed fee, shipping cost, and optional purchase-tax assumptions.
- SEO-friendly product detail routes with metadata, JSON-LD, sitemap, robots policy, and a generated social card.
- A D1-backed admin at `/admin` for importing the bundled dataset, creating and editing products, appending attributed price snapshots, and deactivating records without deleting their history.
- Protected write APIs, public read APIs, runtime schema bootstrap for a fresh local database, and versioned Drizzle migrations for deployment.

## Local setup

Requirements: Node.js `>=22.13.0` and pnpm.

```bash
pnpm install
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

Replace the placeholder in `.dev.vars` with a long, random admin secret. Then start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The local runtime creates the D1 schema idempotently on first use. Visit [http://localhost:3000/admin](http://localhost:3000/admin), enter the same `ADMIN_API_KEY`, and choose **Import bundled dataset** if you want D1 to become the editable source of truth. Until then, public pages safely use the bundled read-only dataset.

The admin key is held in component memory only; it is not written to browser storage. If `ADMIN_API_KEY` is missing, mutation endpoints fail closed.

## Quality checks

```bash
pnpm check
```

That command runs ESLint, TypeScript, a production Vinext build, domain/unit tests, catalog-resolution tests, and rendered HTML/SEO tests. Individual commands are also available:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` includes a production build because the rendered-output tests inspect the generated Worker assets.

## Profit model

All currency calculations use integer cents. The default fee profile is 13.25% of gross sale price plus $0.30, with seller-paid shipping and purchase tax set to zero until the user opts in.

```text
percentage selling fee = round(market estimate × fee rate)
selling fees           = percentage selling fee + fixed fee
purchase tax           = round(purchase price × tax rate), when enabled
net proceeds           = market estimate − selling fees − seller shipping
estimated profit       = net proceeds − purchase price − purchase tax
ROI                     = estimated profit ÷ (purchase price + purchase tax)
```

Both estimated dollar profit and ROI must meet a band:

| Signal | Minimum estimated profit | Minimum ROI |
| --- | ---: | ---: |
| Strong buy | $25 | 40% |
| Buy | $10 | 20% |
| Marginal | $3 | 8% |
| Skip | Below either marginal floor | Below either marginal floor |

These are decision-support estimates, not guarantees. They do not account for every marketplace, payment, return, storage, insurance, or income-tax cost.

## Price-data integrity

V1 price records are explicit manual observations. Each available quote stores:

- integer amount and currency;
- provider/source identifier and source kind;
- human-readable source name and source URL when available;
- observation timestamp, methodology, and optional sample size.

The UI displays the manual status and retrieval date next to every estimate. A missing quote remains unavailable; neither the provider layer nor the UI invents a number. D1 stores market prices as append-only snapshots so later updates do not erase provenance.

Some MSRP fields are ordinary observed retail prices for products that did not have a universally published manufacturer price. Product notes call out that distinction. Review every source and value before making a purchase decision.

Seeded product imagery is stored locally from TCGplayer&apos;s catalog under written authorization supplied for Sealed Signal. The source mapping in `data/tcgplayer-image-sources.ts` records each TCGplayer catalog product ID; images are downloaded into `public/product-images/` rather than hotlinked. Future records should use only photography you own or are licensed to publish through the admin `imageUrl` field. When no rights-cleared asset is available, the UI falls back to the set-aware illustrated reference.

## Live-provider path

`lib/domain/market-price-provider.ts` defines the replaceable `MarketPriceProvider` boundary and includes the honest V1 `ManualMarketPriceProvider`. A production adapter should resolve a canonical product identifier, fetch licensed data server-side, normalize it into integer cents, preserve the provider timestamp and methodology, and write a new snapshot rather than mutating history.

Provider candidates to validate during procurement:

- TCGplayer: familiar market-price vocabulary and product catalog. Seed imagery is locally stored only under the supplied written image authorization; market-data credentials and current API availability remain separate concerns.
- JustTCG or another licensed TCG data vendor: potentially simpler commercial access; verify exact sealed-SKU coverage, freshness, rate limits, and display/retention rights.
- PriceCharting: useful as an additional comparison source; confirm that product matching and the returned price type represent sealed inventory rather than a different condition.
- eBay developer data: useful for listing context, but sold-comparable access, category mapping, authentication, rate limits, and marketplace-data terms require a separate design and legal review.

Recommended production controls include scheduled server-side refreshes, provider-specific rate limiting, retry/backoff, normalized product mappings, anomaly detection, stale-data flags, an operator review queue, and a short cache appropriate to the license. Never scrape a marketplace merely because it is visible in a browser.

## Data and API architecture

The D1 schema has three normalized tables:

- `products`: canonical product identity, taxonomy, release data, MSRP/retail reference, image reference, search text, and active state;
- `product_aliases`: normalized alternate names for search and ingestion matching;
- `market_price_snapshots`: append-only price observations and provenance.

Public endpoints:

- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/products/:slug/prices`

`POST`, `PATCH`, and `DELETE` operations require `Authorization: Bearer <ADMIN_API_KEY>`. `DELETE` performs a soft deactivation. An inactive D1 row acts as a tombstone, so the same bundled record cannot reappear through fallback behavior.

## Database migrations

The application bootstraps an empty local D1 binding automatically. The checked-in migration remains authoritative for deployments and manual database setup.

```bash
pnpm db:migrate:local
pnpm db:migrate:remote
```

Generate a new migration after changing `db/schema.ts`:

```bash
pnpm db:generate
```

Inspect generated SQL before applying it. Back up production data before destructive schema changes.

## Deployment checklist

The `.openai/hosting.json` file declares the `DB` D1 binding expected by the Cloudflare/Sites runtime.

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before building.
2. Provision or attach the `DB` D1 binding and apply the remote migration.
3. Store a strong `ADMIN_API_KEY` as a server-side secret; never expose it through a `NEXT_PUBLIC_` variable.
4. Run `pnpm check` from a clean install.
5. Import or review the seed records, validate manual prices, and replace only with rights-cleared images.
6. Verify `/`, a product route, `/methodology`, `/robots.txt`, `/sitemap.xml`, and protected admin mutations in the deployed environment.

## V1 boundaries and next modules

The data model is ready for price history, recent sold listings, retail availability, and 30/90-day averages, but the UI leaves those modules visibly empty until a licensed provider supplies them. Saved watchlists, alerts, multi-currency conversion, marketplace-specific fee presets, user accounts, and automated product matching are intentionally outside V1.
