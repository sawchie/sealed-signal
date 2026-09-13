# My Collection — surface brief

Mode: **Operate**. Target: `/collection`, with ownership entry points in the catalog and product detail. Status: scoped implementation complete, September 13, 2026.

## Scope and authority

This is an ordinary extension of PokeScratch’s existing Arcade After Dark collector world: navy ground, restrained purple/cyan accents, real product packaging, and clear financial labels. The collection is a quiet working ledger within that world, not a new global design direction. `PRODUCT.md` supplies product commitments; the built components and styles supply this surface’s implementation truth.

This brief records local composition and behavior only. It does not replace or refresh root `DESIGN.md` or `.impeccable/design.json`; their reported drift remains outside this change’s authority.

## Visitor task and hierarchy

Collectors record exact sealed products, quantities, actual paid costs, and sales, then inspect held value with explicit data coverage. Hearts continue to mean watch/save; the separate plus means add one owned unit. No MSRP is silently entered as a purchase cost.

The page order is: title and shortcuts; browser-storage warning and backup controls; three held-value totals; pack and cost/sales summaries; collapsed purchase form; purchase views and filters; records; recorded-value history. “Manage purchases” jumps directly to the working records beneath the summaries. “Browse & add products” returns to the catalog. Product names lead to their exact detail page with `/collection` as return context.

## Layout and components

- A centered container (maximum 1320px) uses three summary columns and two analytical columns on desktop. Dividers and restrained dark rows organize the page without adding dashboard decoration.
- Purchase rows align packaging, identity/owned quantity, and three price fields. Below 900px the price fields move beneath identity. Below 650px the header, totals, analytics, and forms stack; page gutters reduce to 16px. Search, filters, and record actions wrap.
- Controls have a 44px minimum height, visible cyan keyboard focus, persistent labels, and native disclosure behavior. Selected collection views use a restrained purple treatment and `aria-pressed`; save feedback uses status regions and failures use alerts.
- “Add a purchase,” “Edit purchase,” “Mark sold,” and “Restore backup” disclose detailed forms only when needed. Removal requires a separate confirmation; restore requires a checked acknowledgement and explicit replacement action.
- The three principal values stay distinct: market estimate, reference retail, and recorded purchase cost. Coverage text stays adjacent to totals. Missing costs, quotes, or verified contents remain unavailable/unknown, not zero.
- Sold quantities leave held totals but remain in All purchases and Sales history. The record’s owned/sold labels do not depend on color alone.
- The history chart appears after at least two observations and has a corresponding values-and-coverage table. Missing quote observations create gaps, not zero-value points. Its explanatory copy must remain: this is visit/edit history, not an investment-return chart.

## Source boundaries

- `app/collection/page.tsx`: public-catalog projection, route metadata, existing header/footer shell.
- `app/components/CollectionApp.tsx`: page hierarchy, purchase and sale forms, history, filtering, backup/restore controls.
- `app/components/Collection.module.css`: collection-only layout and visual treatment.
- `app/components/AddToCollection.tsx`: catalog/detail plus action and live owned count; one-unit additions start with unknown cost and the local current date.
- `lib/collection.ts`: validated versioned records, integer-cent calculations, quantities, sale protection, coverage, and bounded UTC observations.
- `lib/collection-store.ts`: browser-local persistence, cross-tab synchronization, locked reread-before-write, recoverable errors.
- `lib/collection-product.ts`: catalog adapter; only USD retail/market quotes enter collection valuation. Verified pack counts come from product facts, never category guesses.

Catalog administration, product IDs/URLs, market sourcing, recommendation thresholds, and the global visual system are not owned by this surface. No accounts, cloud sync, or background portfolio tracking are implied.

## Acceptance evidence

The completion review’s sole navigation finding was resolved with the visible “Manage purchases” shortcut. The scoped finish handoff reports 75 passing automated tests and desktop/mobile browser verification. Required reviewed captures:

- `.impeccable/review/collection/desktop-final.png`
- `.impeccable/review/collection/mobile-final.png`
- `.impeccable/review/collection/desktop-purchase.png`
- `.impeccable/review/collection/mobile-sale.png`

The additional `.impeccable/review/collection/mobile-catalog.png` capture covers separate mobile heart/plus entry points. Future changes should preserve accessible operation, honest partial coverage, retained sales, and explicit backup replacement before pursuing visual refinements.
