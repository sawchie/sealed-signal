# PokeScratch content and mobile-detail improvement plan

Date: 2026-09-27. Baseline: b27ad293d7e22333484ace99a5ab262141efa2ff, published Site version 40. Preserve this commit as the rollback point; do not alter the database schema, stored collection records, product IDs, or price calculations.

## Objective and boundaries

Make the site useful beyond republishing a product feed, retain the fast catalog, reduce mobile-detail overload, and submit a stronger site for Google's independent review. An internal score cannot guarantee AdSense approval or indexing. No invented biography, credentials, hands-on experience, sales, prices, scarcity, or traffic. Use the non-personal PokeScratch Editorial identity; no owner's private information is published.

## Complete implementation checklist

1. Inspect current Search Console indexing, sitemap and enhancement reports, plus AdSense site status. Resolve actionable technical faults; document intentional exclusions and Google's pending decisions separately. Check live ads.txt and parameterized product canonicals.
2. Preserve a rollback reference and unrelated local files. Reuse the existing app, D1 resolution, price/FX helpers, source attribution, and UI palette.
3. Build three researched set guides (151, Prismatic Evolutions, Destined Rivals). Include distinct purchase considerations, exact edition notes, source links, and a useful comparison table using current resolved catalog data, verified packs, actual snapshot dates, and honest unavailable states. Do not present these as stock checks or guaranteed investment advice.
4. Enrich the five existing collector guides with substantial original reasoning, specific worked examples, checklists, and accurate publication/update dates. Link guides to relevant products and tools; don't mass-generate repetitive text.
5. Add researched collector notes to a curated group of at least twelve exact products from these sets, with variant cautions, useful alternatives and primary sources. Keep this secondary detail off catalog cards. Do not pretend selection reflects unavailable traffic analytics.
6. Strengthen About/editorial transparency: purpose, named organizational editorial identity, source hierarchy, automated versus researched content, corrections, actual limitations, and image rights. Keep private authorization documents and the owner's identity private. Do not resurrect a methodology dashboard or top-level methodology tab.
7. Improve discovery through the existing Guides navigation and appropriate product/set links. Put meaningful public content in rendered HTML; retain canonical URLs, sitemap coverage and honest structured data. Keep private/empty collection and admin surfaces out of indexing. Leave ads disabled until approval and appropriate consent/privacy setup; no fake ratings/offers.
8. Mobile product detail: retain photo, name and paired headline prices; group buy-check inputs/results, advanced scenarios, contents, sources, collector notes and history into accessible expandable sections, collapsed initially on mobile. Preserve desktop access, deep-link opening, keyboard behavior, all values and calculations. No duplicate hidden forms or catalog-card redesign.
9. Verify: full existing test suite/build/typecheck, added editorial/data/date/canonical coverage, desktop/mobile browser checks, interaction checks and no horizontal overflow. Test empty/unavailable data and mobile disclosures opening/closing.
10. Independent critic review, scored 0–10 against the rubric below. Fix actionable defects and repeat until >=8, with a maximum of four total scored rounds (initial plus three revisions). If score/confidence is still weak, improve the plan and implementation within that ceiling, rather than endlessly polishing or inventing evidence.
11. Publish the verified source, preserve rollback instructions, submit a truthful AdSense re-review when the changes are live and the review is available, and resubmit the updated sitemap if needed. Report confirmation or the exact external blocker. Never claim Google's decision is complete while it is pending.
12. Deliver the completed checklist, critic scores, a subjective confidence assessment of content quality (separate from unknowable approval probability), and any remaining Google/account actions.

## Critic rubric (10 points)

- Original, useful and differentiated content: 3.
- Evidence accuracy, editorial honesty and privacy: 2.
- Mobile simplification/accessibility and desktop preservation: 2.
- Functional/data integrity and verification: 2.
- Discovery, technical SEO, and complete handoff: 1.

Reject any passing score with fabricated expertise/prices, a broken core interaction, lost collection data, or missing major scope. Record evidence and remaining limitations, not just a number.

## Google baseline

Search Console read 2026-09-27, report last update 2026-09-20: 90 indexed, 417 excluded (396 discovered-not-indexed, 13 crawled-not-indexed, 4 canonical alternatives, 1 noindex, 1 duplicate without selected canonical, 1 robots exclusion, 1 404). AdSense: Needs attention / Low value content; ads.txt currently reported Not found. These are not all technical errors; inspect exact URLs before changing behavior.

## Outcomes

Implementation and verification complete: three new set guides, five enriched existing guides, fourteen annotated products (twelve primary-backed), accurate editorial identity, and mobile detail disclosures. Full lint/typecheck/build and 87 tests pass; desktop/mobile/keyboard/currency checks pass. Independent critic scores: 7.7 then 8.6/10, meeting the requested threshold in two rounds. No personal identity or fictitious author biography published.

See CONTENT-QUALITY-REVIEW.md for evidence, limitations and the precise www DNS action. Release and Google submission confirmations are recorded in the final handoff; Google approval and indexing remain external decisions, not implementation completion criteria.
