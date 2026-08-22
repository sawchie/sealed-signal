import type { Metadata } from "next";
import { CatalogApp } from "@/app/components/CatalogApp";
import { seedProducts } from "@/data/products";

export const metadata: Metadata = {
  title: "Collector-Built Pokémon TCG Buy Checks",
  description:
    "Identify sealed Pokémon TCG products and estimate fees, net proceeds, profit, ROI, and resale opportunity from the price you see in store.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CatalogApp
      initialProducts={seedProducts}
      relativeDateReference={new Date().toISOString()}
    />
  );
}
