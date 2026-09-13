# My Collection

My Collection is a browser-local record of sealed products you own, what you paid, and what you have sold. Open `/collection` from the site navigation. It is separate from the heart-based watchlist.

## Add and manage purchases

- Use a product’s **plus** to add one owned unit. Each addition starts with today’s local date and an unknown paid price; open My Collection and **Edit purchase** to correct those details. A heart still watches a product without adding ownership.
- Use **Add a purchase** to choose an exact catalog product, quantity, paid price per unit, and purchase date. Include purchase tax and inbound shipping in your unit cost if you want them counted. Leave an unknown cost blank; enter zero only when it was actually free.
- Record separate purchases for different costs or dates. Matching unsold purchases with the same product, cost, and date may combine into one record.
- **Manage purchases** jumps to the record controls. Use **Owned**, **All purchases**, or **Sales history**, plus search and set filters, to find a record. Summary totals always describe the whole collection, not only filtered rows.
- **Edit purchase** changes total units acquired, unit cost, or date. **Remove mistaken entry** requires confirmation and is available only when that purchase has no sales; undo its sales first if the entire purchase was mistaken.

## Record a sale

Open **Mark sold** on a held purchase. Enter units sold, total gross proceeds for those units (including shipping collected), total fees plus seller shipping, and sale date. Do not enter an already-net payout as gross proceeds or costs will be deducted twice.

Sold units are removed from owned totals, not deleted. **Sales history** retains proceeds, costs, and realized profit when purchase cost is known. **Undo sale** returns those units to Owned. Sales cannot exceed purchased units or predate the purchase; future purchase and sale dates are rejected.

## Understand the numbers

- **Market estimate** is current available catalog market price multiplied by units still held. It is not a guaranteed cash-out value. Quote dates and provenance remain on each product page.
- **Reference retail** uses catalog MSRP/retail references, not your spending. **Recorded purchase cost** uses only actual paid amounts you entered for held units.
- **Unrealized spread** subtracts recorded purchase cost from market value only where both are known, before selling costs. **Realized profit** subtracts recorded sale costs and sold units’ purchase cost from gross proceeds. Unknown purchase costs never become zero-cost profit.
- Coverage labels identify incomplete subtotals. Units without a quote or cost remain counted as owned but do not contribute a fabricated value. Products removed from the current catalog retain your records and recorded metadata, but lack a current valuation.
- Verified packs equal verified product pack count times held quantity. Paid per verified pack includes only held units with both a known paid cost and verified pack count; nothing is deducted for promos or extras. Mixed-set boxes stay under their product’s set label, with no invented split across expansions.

All entered amounts and displayed collection quotes are USD. Non-USD catalog quotes are excluded rather than converted.

## History and its limits

Recorded collection value observes the collection when you visit or edit this page. There is no background portfolio tracking, historical backfill, or continuous live market feed. Adds, sales, corrections, holdings changes, and quote coverage can all move the chart; it is not investment return.

Purchase and sale dates use your local calendar. Snapshot timestamps and daily grouping use UTC: the latest changed observation replaces that UTC day’s prior observation, and up to 365 daily observations are retained. A comparison chart needs at least two observations; the expandable table exposes values and coverage. Missing quotes produce chart gaps, not zero values.

## Keep a backup

There are no accounts or cloud sync. Data belongs to this browser profile and site origin; clearing site data or losing the profile can remove it. **Download backup** regularly and before changing browsers or devices.

To restore, choose a PokeScratch JSON backup, review the purchase/sale counts, acknowledge that you backed up the current collection, and press **Replace with this backup**. Restore replaces this browser’s collection; it does not merge. Invalid or oversized backups are rejected. If stored data cannot be read, it is not silently overwritten; download the stored backup before trying a valid replacement.

Safe writes require browser Web Locks, normally available in a current browser over HTTPS. If cross-tab coordination or browser storage is unavailable, changes fail with an error instead of risking an overwrite. Existing stored data can still be exported when readable. Keep the backup outside browser storage.

## Maintenance and verification

UI: `app/collection/page.tsx`, `app/components/CollectionApp.tsx`, `app/components/Collection.module.css`, and `app/components/AddToCollection.tsx`. Data and persistence: `lib/collection.ts`, `lib/collection-store.ts`, and `lib/collection-product.ts`. Surface design context: `.impeccable/briefs/my-collection.md`.

The version-1 store uses `pokescratch:collection:v1`; amounts are integer cents. Import and persistence share a 12,000,000-byte UTF-8 limit. Validation protects purchase/sale links, quantities, chronological observations, and unknown-value semantics. Keep validation and cross-tab locked writes together when extending the feature.

Completion handoff: 75 automated tests passed, including collection calculations/validation and cross-tab persistence, with desktop/mobile browser checks. The finish review’s navigation finding was resolved by **Manage purchases**. Re-run `pnpm check` for maintenance changes; relevant regression suites include `tests/collection.test.mjs` and `tests/collection-store.test.mjs`.

Reviewed screenshots are in `.impeccable/review/collection/`: `desktop-final.png`, `mobile-final.png`, `desktop-purchase.png`, and `mobile-sale.png`; `mobile-catalog.png` additionally records the separate heart/plus controls. These verify the scoped feature, not accounts, cloud recovery, or background tracking that do not exist.
