import type { Metadata } from "next";
import { CatalogApp } from "@/app/components/CatalogApp";
import { seedProducts } from "@/data/products";

export const metadata: Metadata = {
  title: "Compare Pokémon TCG MSRP & Resale",
  description:
    "Compare sealed Pokémon TCG MSRP and resale values, enter a shelf price, and find the best buys quickly.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CatalogApp initialProducts={seedProducts} />
  );
}
