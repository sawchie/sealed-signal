/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { PackCalculator } from "@/app/components/PackCalculator";
import styles from "@/app/components/CollectorContent.module.css";
import { publicCatalog } from "@/lib/public-catalog";
import { productFacts } from "@/lib/product-facts";
export const metadata: Metadata = { title: "Price-per-pack calculator", description: "Compare two Pokémon purchases by total cost and price per booster pack, including shipping, tax, and discounts.", alternates: { canonical: "/tools/price-per-pack" } };
export const dynamic = "force-dynamic";
export default async function PricePerPackPage() {
  const products = (await publicCatalog()).map(product => ({ slug: product.slug, name: product.name, priceCents: product.msrpCents, packs: productFacts(product.id)?.packCount ?? null, setName: product.setName, sourceUrl: productFacts(product.id)?.sourceUrl ?? null })).sort((a, b) => a.name.localeCompare(b.name));
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><main className={styles.main}><nav className={styles.crumbs} aria-label="Breadcrumb"><a href="/tools">Tools</a></nav><h1>What are you paying per pack?</h1><PackCalculator products={products} /><p><a href="/guides/compare-price-per-pack">How to make a fair comparison</a></p></main><SiteFooter /></div>;
}
