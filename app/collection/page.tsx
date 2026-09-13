import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { CollectionApp } from "@/app/components/CollectionApp";
import { publicCatalog } from "@/lib/public-catalog";
import { productFacts } from "@/lib/product-facts";
import { collectionProduct } from "@/lib/collection-product";

export const metadata: Metadata = { title: "My Collection", description: "Your sealed Pokémon collection, quantities, purchase costs, and sales ledger.", robots: { index: false, follow: true }, alternates: { canonical: "/collection" } };
export const dynamic = "force-dynamic";
export default async function CollectionPage() {
  const products = (await publicCatalog()).map(product => collectionProduct(product, productFacts(product.id)?.packCount ?? null));
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><CollectionApp products={products} /><SiteFooter /></div>;
}
