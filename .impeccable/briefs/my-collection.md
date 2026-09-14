# My Collection — surface brief

Mode: **Operate**. Target: `/collection`, with ownership entry points in the catalog and product detail. Approved expression: **Inventory ledger**. Status: scoped redesign complete, September 13, 2026.

## Scope and authority

The approved Inventory ledger redesign keeps PokeScratch’s navy collector world and real product packaging, with quiet white figures, restrained cool controls, and signed gain colors. It changes this surface’s composition, not the global visual direction. `PRODUCT.md` supplies product commitments; the built components and styles supply this surface’s implementation truth. Collection state, validation, and browser-local storage behavior are unchanged.

This brief records local composition and behavior only. It does not replace or refresh root `DESIGN.md` or `.impeccable/design.json`; their reported drift remains outside this change’s authority.

## Visitor task and hierarchy

Collectors record exact sealed products, quantities, actual paid costs, and sales, then inspect held value with explicit data coverage. Hearts continue to mean watch/save; the separate plus means add one owned unit. No MSRP is silently entered as a purchase cost.

My Collection is first in the left site navigation. A compact utility row holds browser-local context, Backup, and + Add purchase. A roomy header pairs the title and owned counts with real value history. Six compact totals precede the working ledger; Owned / All purchases / Sold, search, and set filtering sit directly above records. Packs by set and sales totals occupy the supporting right sidebar. Product names lead to their exact detail page with `/collection` as return context.

## Layout and components

Observations now use an explicit View/Hide button with expanded state and Escape-to-close focus return. The bounded table stays in normal flow rather than an absolute overlay. The overview reserves 36px above the ledger on desktop and 28px on mobile; expanded history does not stretch the price tiles. Verified open/close by click and keyboard, mobile width 390px without page overflow, and 77 passing tests.

Latest refinement: title and Backup/Add purchase actions lead the page. The overview below pairs left-hand value history with six totals in a right-hand three-by-two grid; mobile stacks history above two-column totals. Browser-local guidance moved inside Backup. Paid / unit is a bordered inline decimal field, saving on blur/Enter, cancelling with Escape, validating non-negative amounts, and retaining unknown costs as blank. Writes reuse the current locked store record to preserve quantities/dates and recalculate held and sold gains.

- A centered container (maximum 1440px) uses six compact summary columns, a two-part header, and a ledger with a 248px sidebar. Flat dividers and aligned figures make records the primary working area.
- Totals are Market, Paid, Retail, Est. gain, Packs, and Paid / pack. Neutral figures are white; gains are signed green for positive and red for negative, with zero/unknown neutral. Market, actual paid cost, and reference retail stay distinct. Essential partial-coverage labels remain visible beside totals; unknown inputs never become zero-valued holdings or fabricated gain.
- Rows align a small packaging image, identity/owned quantity, Paid / unit, Market / unit, held Value, and Est. gain. Row gain is held market value minus recorded cost before selling costs. Sale profit uses actual proceeds minus recorded fees/shipping and sold purchase cost; realized and estimated results are not combined.
- Below 1150px totals use three columns, row labels become visible, and row figures move beneath identity. Below 800px the sidebar moves below the ledger. Below 600px totals use two columns, header and forms stack, row figures use a two-by-two grid, and page gutters reduce to 16px.
- Buttons and form controls use 44px minimum heights and visible cyan keyboard focus. Collection views have an understated underline and `aria-pressed`. Info explanations work by hover, focus, or tap and dismiss with Escape or blur; essential partial coverage is not hidden in them. Save feedback uses status regions and failures use alerts.
- + Add purchase toggles a form with a Close action. Each row’s Manage disclosure reveals Edit purchase, Mark sold when held, and mistaken-entry removal when eligible. Backup is a compact disclosure containing download and restore. Removal still requires confirmation; restore still requires acknowledgement and explicit replacement.
- Sold quantities leave held totals but remain in All purchases and Sold. Owned/sold labels and signed gains do not depend on color alone.
- Value history sits beside the title on desktop, uses only recorded observations, and exposes a View observations table. With fewer than two observations it shows an honest first-snapshot/return-another-day state, never a decorative curve. Missing quotes create gaps. The Info explanation identifies visit/edit history, not investment return.

## Source boundaries

- `app/collection/page.tsx`: public-catalog projection, route metadata, existing header/footer shell.
- `app/components/CollectionApp.tsx`: page hierarchy, purchase and sale forms, history, filtering, backup/restore controls.
- `app/components/Collection.module.css`: collection-only layout and visual treatment.
- `app/components/AddToCollection.tsx`: catalog/detail plus action and live owned count; one-unit additions start with unknown cost and the local current date.
- `lib/collection.ts`: validated versioned records, integer-cent calculations, quantities, sale protection, coverage, and bounded UTC observations.
- `lib/collection-store.ts`: browser-local persistence, cross-tab synchronization, locked reread-before-write, recoverable errors.
- `lib/collection-product.ts`: catalog adapter; only USD retail/market quotes enter collection valuation. Verified pack counts come from product facts, never category guesses.
- `lib/collection-gain.ts`: shared held-spread/sale-profit arithmetic and positive, negative, or neutral display tone.

Catalog administration, product IDs/URLs, market sourcing, recommendation thresholds, and the global visual system are not owned by this surface. No accounts, cloud sync, or background portfolio tracking are implied.

## Acceptance evidence

The `ledger_finish_reviewer` critic approved scoped ship with no material fixes. The completion handoff reports 76 passing automated tests, lint, typecheck, and production build, plus desktop/mobile browser checks. A browser sale check confirmed $124 proceeds minus $10 recorded fees and $60 purchase cost displays +$54 sale profit. Opened and validated captures:

- `.impeccable/review/collection-ledger/desktop.png`
- `.impeccable/review/collection-ledger/mobile.png`
- `.impeccable/review/collection-ledger/mobile-sale.png`

Only one genuine observation was available in the reviewed browser state, so the actual history curve was source-reviewed rather than visually verified with multiple observations; no fake curve was inserted. The design detector was attempted but its output pipe failed, so this handoff does not claim a clean detector result. Preserve accessible operation, honest partial coverage, retained sales, and explicit backup replacement in future work.

## Mobile refinement — September 13, 2026

**Catalog correction:** The user rejected the full-width mobile image stage. Preserve compact horizontal catalog cards: packaging left, identity and paired prices right. The subsequent correction changes only catalog CSS, restoring that layout and removing the identity's flex expansion that separated the name from its prices. My Collection remains as refined below. Production compilation passed; the local browser connection failed during this follow-up, so do not claim new visual verification for the catalog correction.

The user's clarified scope preserves every catalog-card field and action. Mobile catalog changes repair the narrow image column with a full-width packaging stage and left-aligned identity/prices; simplification is limited to My Collection.

Two bounded critics ran sequentially: one hierarchy critique (28/40), then one evidence check confirming the inherited image min-height and narrow column. Applied their image-hierarchy and progressive-disclosure recommendations without changing data or calculations. The detector completed with zero findings after one output-truncation retry.

Collection keeps all six totals and four row values. Consolidated definitions and purchase dates into accessible information buttons, removed repeated save instructions from visible rows, enlarged mobile thumbnails, and placed Manage below the numbers. Mobile history is expandable; desktop history remains visible. Unknown-cost and partial-coverage warnings remain explicit. Browser checks covered 320px, 390px and 1440px, editable paid costs, history/observations opening and closing, and viewport-safe help bubbles. Temporary QA purchases were removed through the normal UI. The shared footer now wraps on narrow screens.
