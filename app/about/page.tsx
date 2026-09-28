/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { InformationPage } from "@/app/components/InformationPage";
export const metadata: Metadata = { title: "About PokeScratch", description: "Boxes, bundles, and a budget. Why PokeScratch exists and how to get in touch.", alternates: { canonical: "/about" } };
export default function AboutPage() {
  return <InformationPage title="About PokeScratch">
    <p>A booster bundle, an ETB, and a collection box can all contain the same set. Figuring out which one is worth picking up should not take twenty open tabs.</p>
    <p>That is what PokeScratch is for. Compare the boxes, check the price, and keep track of what is on your shelf.</p>
    <h2 id="editorial">Alex, at PokeScratch</h2>
    <p>I care about the difference between a box you want and a box that just looks like a deal. Sometimes the stamped promo is the point. Sometimes you already have three sets of dice and just want a few packs. Both are good reasons to choose differently.</p>
    <p>My rule for this site: show the useful numbers, make the exact edition clear, and leave room for collecting to be fun. A green buying signal is not a reason to spend beyond your budget.</p>
    <p>Alex is the public pen name used for PokeScratch. The site began as a college project; personal details stay private.</p>
    <h2>Start with the question you have</h2>
    <ul>
      <li><a href="/tools/pack-planner">What fits my opening budget?</a> Compare packs, total spend, and money left over across a set.</li>
      <li><a href="/guides">Is this the edition I want?</a> Check format differences before paying for the wrong box.</li>
      <li><a href="/collection">What do I already own?</a> Keep purchases, quantities, and sales together.</li>
    </ul>
    <h2>See something off?</h2>
    <p>A wrong pack count or a mixed-up PC ETB matters. Send the product link and a source to <a href="mailto:hello@pokescratch.com">hello@pokescratch.com</a>.</p>
    <details><summary>About the numbers and research</summary>
      <p>Prices are dated references, not stock offers. Open a listing for its source and update date. Pack counts come from linked product specifications; unknown counts stay out of pack calculations. Guides combine source research, calculations, and AI-assisted drafting—not claimed firsthand testing.</p>
      <p>Reference retail can be historical MSRP. Market estimates come from the provider named on the product, not automatically from eBay sold listings. Check your actual checkout costs before buying. PokeScratch is independent and not affiliated with The Pokémon Company.</p>
    </details>
  </InformationPage>;
}
