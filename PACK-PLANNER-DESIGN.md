# Pack Planner — shipped surface brief

## Overview

Mode: **Operate**. `/tools/pack-planner` extends the existing **Arcade After Dark** world; it does not replace `DESIGN.md`. The task is to choose a set, enter an opening budget, and compare how many packs each sealed format can provide within that budget. Controls and useful results lead, with product photography supporting identification.

Implementation sources: `app/components/PackPlanner.tsx`, `app/components/PackPlanner.module.css`, `app/tools/pack-planner/page.tsx`, and `lib/pack-planner.ts`. Related editorial voice lives in `app/about/page.tsx`.

## Colors

Reuse navy surfaces, purple links and selected controls, cyan focus and pack totals, pale foreground text, muted secondary text, and pink validation. Cyan pack totals are not a profitability signal. Preserve the readable content palette already documented in `DESIGN.md`; do not introduce a separate tool identity.

## Typography

Inherit the site typeface. The heading uses the existing responsive content scale; explanatory text remains readable, with complete product names. Tabular numbers align the four results: packs, total spend, per-pack cost, and money left over. Missing results display an em dash, not a fabricated zero.

## Layout

The centered surface has an 1180px maximum width, 32px desktop gutters, and 16px mobile gutters. Set, budget, and starting-price controls precede the assumptions disclosure and result count.

Desktop rows align product identity, editable price, and a two-by-two results block. Below 950px, results span the row in four columns. Below 600px, product rows stack, results return to two columns, and the set selector occupies the full control width. Keep all information available without horizontal scrolling.

## Elevation & Depth

Comparison rows are flat navy surfaces with thin dividers, not elevated dashboard tiles. Product images remain contain-fit. No new animation or decorative depth is needed for this working comparison surface.

## Shapes

Preserve the existing small corners: 5px controls and 7px rows. Inputs are at least 46px tall; buttons, checkbox labels, and disclosure summaries retain practical 44px interaction areas. Keyboard focus is a visible cyan outline.

## Components

- **Planning controls:** budgets, shipping, and editable box prices are explicitly USD. Currency selection converts displayed results only; it does not reinterpret the input amounts. Default budget is $150, starting prices are market references, and shipping/tax start at zero.
- **Price reference:** market and historical retail/MSRP are starting points, not checkout offers. Show snapshot dates, mark market snapshots older than seven days, and allow a visitor-entered price with a per-row return-to-reference action.
- **Scenario calculation:** each row repeats one product format, not a mixed basket. Apply shipping once per nonempty order and tax to merchandise only; round merchandise tax in cents. Rank by most packs, then lower total spend, then name. Zero boxes means zero spend and no per-pack result.
- **Eligibility and sources:** include only active, dated, released products with a positive verified pack count and linked specification. Unknown, unsourced, undated, and unreleased records stay out of calculations. Do not infer pack counts from product names or images. Non-USD catalog references are not silently treated as USD.
- **Assumptions disclosure:** explain order costs, ranking, single-format scenarios, exclusions, and visit-only edits. Reset clears price overrides and the shortlist; it does not promise to reset every planning field.
- **Shortlist:** per-row checkboxes and a shortlist-only filter help compare formats during this visit. These are not the persisted catalog Saved shelf. Empty states distinguish an empty shortlist from a set without eligible records.
- **Contents disclosure:** show edition, recorded promos, pack specification, and price sources. An absent verified promo list does not mean no promos. Total included packs do not guarantee any particular set mix or pulls.
- **Validation:** accept bounded decimal inputs, pair field errors with accessible invalid/described-by semantics, and announce result-count changes. A missing price must be supplied, not replaced with zero.

## Do's and Don'ts

- **Do** keep budget limits and total spend as visible as per-pack efficiency.
- **Do** state that quantities are assumed available; visitors must check stock and purchase limits. References are not in-stock deals or availability guarantees.
- **Do** leave accessories and promos out of the arithmetic and explain that choice. Their personal value may justify a different format.
- **Don't** predict pulls, turn pack count into a purchase recommendation, or encourage spending beyond the entered budget.
- **Don't** imply overrides change catalog prices or persist beyond this visit.
- **Do** preserve the About page's direct collector voice: useful numbers, exact editions, and room for collecting to be fun. Alex is explicitly a public pen name; the college-project origin and privacy disclosure stay plain.
- **Don't** invent biography, personal credentials, firsthand testing, or research provenance. Preserve the distinction between sourced research, calculations, and AI-assisted drafting.

## Delivery evidence

The parent implementation pass reported 89 passing tests, lint, typecheck, and production build, plus desktop (1280px) and mobile (390px) visual checks. The finish reviewer recommended shipping at 8.5/10. This documentation records that handoff evidence; it does not claim an additional verification run.
