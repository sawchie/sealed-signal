# Content quality release review — September 27, 2026

## What changed

- Three set guides with distinct decisions, hypothetical worked comparisons, format-specific reasons to pass, exact-product price tables, source dates, currency support, and source links.
- Five existing guides enriched with original calculations and practical listing checks. Separate publication/revision dates now match article metadata and sitemap.
- Fourteen unique product notes: twelve official-Pokémon-backed specifications and two explicitly incomplete marketplace-specification records. None are presented as hands-on reviews. Two previously unknown pack counts (Destined Rivals display: 36; bundle: 6) verified against the official product showcase.
- Honest, non-personal PokeScratch Editorial identity; no invented owner, credentials, firsthand testing, or personal information.
- Mobile details initially collapse the buy check, scenarios, breakdown, sources, contents, history, and collector notes. Headline prices, image, name and collection action remain available. Forms stay mounted; desktop sections open by default.
- Native same-page links open all enclosing disclosures, including repeated hashes and nested inputs. Catalog cards, saved collection schema, pricing logic, D1 architecture, and ad/consent behavior unchanged.
- Application-level permanent redirect for www to the canonical apex, ready when domain DNS is connected.

## Verification evidence

Full lint, typecheck, production build and 87 automated tests passed. Added exact-ID/source/alternative/guide coverage; rendered every annotated route; covered all eight guides, missing pack counts, clean parameterized canonicals, and www ads.txt redirect.

Browser checks on the local preview: desktop 1280px, mobile 390px and narrow 320px. Product pages and guides render; no page-wide horizontal overflow. Comparison tables scroll within their named keyboard-focusable region. Keyboard Enter opens/closes details. Entered purchase price 60 survives closing/reopening. Source and contents links expand their target; repeating a source hash reopens it. Desktop resize reopens sections. Save, add-to-collection and target-save/remove actions work on the local test origin. No runtime errors returned by the browser error log. Local test data is separate from production browser storage.

Impeccable's focused mobile simplification guidance retained the existing design. Its mechanical scan flagged a new decorative contents border, which was removed; other palette/type advisories reflect stale project design documentation and existing site styles, not an intentional redesign. React review kept editorial fetching server-side and reused the existing money/pack helpers.

## Critic rounds

Round 1: **7.7/10**. Independent read-only critic found an ETB-versus-bundle table with no bundle, insufficient primary-backed coverage for two records, and incomplete all-product test coverage. Also recommended nested-anchor handling, distinct worked examples, clearer table labels, and an empty comparison state.

Round 2: **8.6/10** (originality 2.6/3; evidence/privacy 1.8/2; mobile/accessibility 1.8/2; integrity/verification 1.9/2; discovery/handoff 0.5/1). No remaining must-fix implementation defect. The critic independently spot-checked the two added official specifications; browser and full-suite verification were performed by the implementing agent. Two of four allowed scored rounds used. Publication and Google's decisions are separate from this passing implementation score.

Additional browser check: changing the guide comparison from USD to CAD updates both totals and per-pack amounts; switching back restores USD. Source currency/data remain unchanged.

## Google findings

- Search Console indexing report (last updated September 20): 90 indexed; 417 excluded. Most are discovered/not-yet-indexed (396) or crawled/not-indexed (13), not syntax errors.
- Product snippets (last updated September 25): **0 invalid; missing offers/review/aggregateRating validation Passed**. Do not invent ratings or purchasable offers to regain this enhancement.
- The reported duplicate product URL with a return query already serves its clean canonical; regression tested. Private collection noindex and price-tool/canonical alternatives are intentional.
- AdSense still shows Low value content before this release. That is separate from Search Console indexing and requires Google's independent review.
- AdSense also displays an account-activation/payment-information reminder. Personal payment details were not entered or changed; account activation may still require the owner even after site approval.
- Apex ads.txt serves HTTP 200 with the correct publisher record; HTTP redirects to HTTPS. AdSense currently says Not found, so its crawler status has not been reconciled with the reachable file.
- www currently resolves to old Vercel addresses and returns DEPLOYMENT_NOT_FOUND. Sites binding prepared; DNS access unavailable because the Vercel browser session is logged out and no authenticated DNS tool is connected. This is NOT claimed fixed.
- Final checks: no manual actions or security issues; HTTPS has no critical issues; merchant listings has zero invalid items (the old optional-field rows each affect zero items). The 404 example is nonexistent `/page`, with no current application link found. The robots exclusion is `/admin`, which should remain private.

## Published release and submissions

- Public Site version **41**, source **25fa23880514903e5cd78c037a419bfd5f1629b2**, deployment **appgdep_6ab9be7172f88191b8ee42010752e859** succeeded. Source backed up in GitHub and the Sites repository. Built from a clean export of that exact commit.
- Live apex verification: new guide content and organizational byline visible, correct ads.txt publisher record, sitemap contains **494** URLs, query-bearing product serves its clean canonical.
- Fresh production browser session at 390px: all seven detail groups start closed; buy check opens/closes; no horizontal overflow or browser errors. A historical local hot-reload hydration warning in the earlier mixed-session log was not reproduced in this clean production session.
- Google confirmed **“Sitemap submitted successfully.”** Search Console may still display its previous 491-page discovery count until processing completes.
- AdSense confirmed **“Review requested.”** No approval or change to ad serving is claimed. The old table status and ads.txt crawler status may lag.
- Search Console canonical-duplicate validation confirmed **“Validation Started”** on September 27 after checking the live clean canonical. Intentional private/canonical exclusions and the nonexistent `/page` URL were not incorrectly submitted as bugs to fix.

Content-quality confidence: **8/10, subjective**, not an AdSense approval probability. The strongest remaining limitation is that original research covers a curated subset rather than every product; sustained genuine readership and Google's review cannot be manufactured in a code release.

## Remaining domain action

In Vercel's DNS settings for pokescratch.com, replace only the old www routing record(s) with:

| Type | Name | Value |
|---|---|---|
| CNAME | www | custom-domains.chatgpt.site. |
| TXT | _openai-site-verification.www | openai-site-verification=atGFTuJH5CCNj71tUdH1BH9ndwoX65bxd2N9jvjdj8U |
| TXT | _cf-custom-hostname.www | 9a587726-dd15-4b25-9073-b89ba83d7065 |

Preserve apex, email, and other verification records. Sites domain ID appgdom_6ab9baae682c8191b4b6f08c318a2455 then needs status refresh. Verification records are public DNS challenges, not login credentials.

## Honest limitations

This release creates a useful original layer; it does not turn every catalog record into original research. Unknown 151 bundle pack count and incomplete Destined Rivals PC promo details remain labeled. No fabricated transactions, print runs, return forecasts, or traffic. Approval and indexing cannot be guaranteed, and an internal implementation score is not an approval probability.

## Rollback

Baseline: public Site version 40 / source b27ad293d7e22333484ace99a5ab262141efa2ff. A rollback can redeploy that saved version; no destructive database rollback is needed because this release makes no schema or collection-storage changes. Preserve subsequent user edits rather than resetting the working tree.
