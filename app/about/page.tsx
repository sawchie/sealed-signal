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
    <h2>Independent and open to corrections</h2>
    <p>PokeScratch is not affiliated with or endorsed by The Pokémon Company, Nintendo, Game Freak, Creatures, or the retailers and marketplaces mentioned on the site. Product names and trademarks belong to their respective owners.</p>
    <p>Found a mismatched product, outdated detail, or missing item? Email <a href="mailto:hello@pokescratch.com">hello@pokescratch.com</a> with the product link and a source we can check.</p>
    <p><a href="/">Browse the catalog</a> · <a href="/contact">Contact PokeScratch</a> · <a href="/privacy">Privacy policy</a></p>
  </InformationPage>;
}
