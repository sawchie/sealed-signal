import type { Metadata } from "next";
import { CatalogApp } from "@/app/components/CatalogApp";
import { publicCatalog } from "@/lib/public-catalog";
import { productFacts } from "@/lib/product-facts";

export const metadata: Metadata = {
  title: "Compare Pokémon TCG MSRP & Resale",
  description:
    "Compare sealed Pokémon TCG MSRP and resale values, enter a shelf price, and find the best buys quickly.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await publicCatalog();
  return (
    <CatalogApp initialProducts={products} packCounts={Object.fromEntries(products.map(product => [product.id, productFacts(product.id)?.packCount ?? null]))} now={new Date().toISOString()} />
  );
}
