# My Collection

My Collection is a browser-local inventory ledger of sealed products you own, what you paid, and what you have sold. Open `/collection` from My Collection, first in the left site navigation. It is separate from the heart-based watchlist.

## Add and manage purchases

- **Paid / unit is editable directly in each purchase row.** Enter a cost and press Enter, Tab, or click elsewhere to save; Escape cancels the draft. Blank means unknown, while zero means free. Totals and gains recalculate on save. Correcting the cost of a partly sold purchase also updates its sale-profit calculation.

- Use a product’s **plus** to add one owned unit. Each addition starts with today’s local date and an unknown paid price; open My Collection, then the row’s **Manage → Edit purchase**, to correct those details. A heart still watches a product without adding ownership.
- Press **+ Add purchase** to open the purchase form; press it again or **Close** to hide the form. Choose an exact catalog product, quantity, paid price per unit, and purchase date. Include purchase tax and inbound shipping in your unit cost if you want them counted. Leave an unknown cost blank; enter zero only when it was actually free.
- Record separate purchases for different costs or dates. Matching unsold purchases with the same product, cost, and date may combine into one record.
- Use **Owned**, **All purchases**, or **Sold**, plus search and set filters directly above the list, to find a record. Summary totals and the Packs by set / Sales sidebar always describe the whole collection, not only filtered rows.
- Each row’s **Manage** reveals purchase and sale actions. **Edit purchase** changes total units acquired, unit cost, or date. **Remove mistaken entry** requires confirmation and is available only when that purchase has no sales; undo its sales first if the entire purchase was mistaken.

## Record a sale

Open **Manage → Mark sold** on a held purchase. Enter units sold, total gross proceeds for those units (including shipping collected), total fees plus seller shipping, and sale date. Do not enter an already-net payout as gross proceeds or costs will be deducted twice.

Sold units are removed from owned totals, not deleted. **Sold** retains the sale history with Sold for, Fees + shipping, and Sale profit when purchase cost is known. **Undo sale** returns those units to Owned. Sales cannot exceed purchased units or predate the purchase; future purchase and sale dates are rejected.

## Understand the numbers

The title sits at the top with Backup and Add purchase. Below it, value history occupies the left half and the six totals form a compact block on the right; the collection list follows immediately. On mobile these sections stack. Browser-only storage guidance is inside Backup rather than above the title.

- The six compact totals are **Market**, **Paid**, **Retail**, **Est. gain**, **Packs**, and **Paid / pack**. Ordinary figures are white; signed gains are green when positive, red when negative, and neutral at zero or when unknown.
- **Market** is current available catalog market price multiplied by units still held. It is not a guaranteed cash-out value. Quote dates and provenance remain on each product page. **Retail** uses catalog MSRP/retail references, not your spending; **Paid** uses only actual paid amounts entered for held units.
- **Est. gain** subtracts recorded purchase cost from market value only where both are known, before selling costs. Row Paid / unit and Market / unit are unit prices; Value and Est. gain cover that row’s held quantity. **Sale profit / Realized profit** subtracts recorded sale costs and sold units’ purchase cost from gross proceeds. Unknown purchase costs never become zero-cost profit, and realized profit is not combined with held estimated gain.
- Coverage labels identify incomplete subtotals. Units without a quote or cost remain counted as owned but do not contribute a fabricated value. Products removed from the current catalog retain your records and recorded metadata, but lack a current valuation.
- Verified packs equal verified product pack count times held quantity. Paid per verified pack includes only held units with both a known paid cost and verified pack count; nothing is deducted for promos or extras. Mixed-set boxes stay under their product’s set label, with no invented split across expansions.

All entered amounts and displayed collection quotes are USD. Non-USD catalog quotes are excluded rather than converted.

Use an **Info** icon for calculation or storage explanations: hover, focus with the keyboard, or tap/click to open; press Escape or move focus away to dismiss. Essential partial-coverage labels stay visible without opening Info. A dash indicates a needed cost or quote is unknown, or no held quantity supports the row calculation.

## History and its limits

**Value history**, beside the title on desktop and below it on mobile, observes the collection when you visit or edit this page. There is no background portfolio tracking, historical backfill, or continuous live market feed. Adds, sales, corrections, holdings changes, and quote coverage can all move the chart; it is not investment return.

Purchase and sale dates use your local calendar. Snapshot timestamps and daily grouping use UTC: the latest changed observation replaces that UTC day’s prior observation, and up to 365 daily observations are retained. A comparison chart needs at least two observations; until then it asks you to return another day instead of inventing a curve. **View observations** opens the values-and-coverage table. Missing quotes produce chart gaps, not zero values.

## Keep a backup

There are no accounts or cloud sync. Data belongs to this browser profile and site origin; clearing site data or losing the profile can remove it. Open the compact **Backup** menu and **Download backup** regularly and before changing browsers or devices. Backup files contain private purchase and sale records; keep them somewhere safe.

To restore, open **Backup → Restore backup**, choose a PokeScratch JSON backup, review the purchase/sale counts, acknowledge that you backed up the current collection, and press **Replace with this backup**. Restore replaces this browser’s collection; it does not merge. Invalid or oversized backups are rejected. If stored data cannot be read, it is not silently overwritten; download the stored backup before trying a valid replacement.

Safe writes require browser Web Locks, normally available in a current browser over HTTPS. If cross-tab coordination or browser storage is unavailable, changes fail with an error instead of risking an overwrite. Existing stored data can still be exported when readable. Keep the backup outside browser storage.

## Maintenance and verification

UI: `app/collection/page.tsx`, `app/components/CollectionApp.tsx`, `app/components/Collection.module.css`, and `app/components/AddToCollection.tsx`. Data and persistence: `lib/collection.ts`, `lib/collection-store.ts`, and `lib/collection-product.ts`. Shared gain arithmetic and display tone: `lib/collection-gain.ts`. Surface design context: `.impeccable/briefs/my-collection.md`. The Inventory ledger redesign leaves collection state/storage unchanged and does not refresh root design artifacts.

The version-1 store uses `pokescratch:collection:v1`; amounts are integer cents. Import and persistence share a 12,000,000-byte UTF-8 limit. Validation protects purchase/sale links, quantities, chronological observations, and unknown-value semantics. Keep validation and cross-tab locked writes together when extending the feature.

Completion handoff: 76 automated tests, lint, typecheck, and production build passed, with desktop/mobile browser checks. The `ledger_finish_reviewer` critic approved scoped ship with no material fixes. A browser example verified $124 proceeds − $10 fees − $60 purchase cost = **+$54 sale profit**. Re-run `pnpm check` for maintenance changes; relevant regression suites include `tests/collection.test.mjs` and `tests/collection-store.test.mjs`.

Opened and validated screenshots are in `.impeccable/review/collection-ledger/`: `desktop.png`, `mobile.png`, and `mobile-sale.png`. With only one genuine observation available, the actual history curve was source-reviewed only; no fake curve was added for screenshots. The design detector was attempted but its output pipe failed, so no clean detector result is claimed. These checks verify the scoped feature, not accounts, cloud recovery, or background tracking that do not exist.
