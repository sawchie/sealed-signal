/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { InformationPage } from "@/app/components/InformationPage";

export const metadata: Metadata = {
  title: "About PokeScratch",
  description: "Learn about PokeScratch, an independent catalog for comparing sealed Pokémon TCG products.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <InformationPage title="About PokeScratch">
    <p>PokeScratch is an independent catalog for people who collect sealed Pokémon Trading Card Game products. It brings product names, set information, retail references, and dated market snapshots together so you can compare the boxes, bundles, and tins you are considering.</p>
    <h2>Built around the product</h2>
    <p>Start with a set, a product name, or a familiar abbreviation like ETB. Open a product to check its details and sources. The catalog is a reference tool: PokeScratch does not sell these products, reserve stock, or guarantee availability at a displayed price.</p>
    <h2 id="editorial">Who makes this reference?</h2>
    <p>PokeScratch Editorial is the site’s publishing identity, not a fictional collector or a claim of professional credentials. The operator keeps their personal identity private. The purpose is straightforward: help collectors distinguish similar sealed products, compare costs, and keep track of what they own without mistaking a market estimate for money in the bank.</p>
    <p>Guides and collector notes are researched comparisons. They are not firsthand unboxings, authentication services, or claims that every product has been physically inspected. Software and AI-assisted drafting support the work; factual claims are tied to the listed sources, and hypothetical calculations are labeled as examples.</p>
    <h2>What is imported, and what is editorial?</h2>
    <p>The catalog combines product records with source-labeled price snapshots. Scheduled imports can refresh prices; that does not mean a guide or product specification was reviewed that day. Each price carries its own source and timestamp. Guides have separate publication and revision dates. Not every catalog entry has an individually researched collector note.</p>
    <p>For contents and edition differences, official Pokémon product specifications are preferred. Marketplace product specifications are used where clearly identified. Retail references may be historical MSRP or a sourced retail observation; they are not stock alerts. Market estimates are not automatically a median of recent eBay sales: the actual provider and any available sample information appear on the product page.</p>
    <h2>How to read our comparisons</h2>
    <p>Per-pack comparisons divide the complete product price by a verified pack count, without assigning resale values to promos or accessories. The buy check uses your entered purchase price and active selling-cost settings. Its signal evaluates a resale scenario, not authenticity, personal enjoyment, future appreciation, or an assurance that a buyer exists.</p>
    <p>We leave unknown information unavailable rather than treating it as zero. Collection values use recorded observations, not invented price history. Currency conversions are estimates using dated exchange rates, not prices from local retailers. Check the original listing and your actual checkout costs before buying.</p>
    <h2>Corrections and accountability</h2>
    <p>Send the exact product or guide URL, the disputed fact, and a supporting source. A useful correction distinguishes the edition, language, quantity, and date. Verified specification changes update the record; material guide changes update its revision date. Price refreshes do not silently rewrite an editorial publication date.</p>
    <p>Product imagery identifies the item and does not establish condition, availability, or endorsement. Attribution is not itself proof of permission. PokeScratch does not claim to be Pokémon, a marketplace, or a financial adviser, and no invented author biography is used to imply otherwise.</p>
    <p>PokeScratch is not affiliated with or endorsed by The Pokémon Company, Nintendo, Game Freak, Creatures, or the retailers and marketplaces mentioned on the site. Product names and trademarks belong to their respective owners.</p>
    <p>Found a mismatched product, outdated detail, or missing item? Email <a href="mailto:hello@pokescratch.com">hello@pokescratch.com</a> with the product link and a source we can check.</p>
    <p><a href="/">Browse the catalog</a> · <a href="/contact">Contact PokeScratch</a> · <a href="/privacy">Privacy policy</a></p>
  </InformationPage>;
}
