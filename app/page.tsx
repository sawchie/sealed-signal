import type { Metadata } from "next";
import { CatalogApp } from "@/app/components/CatalogApp";
import { seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";

export const metadata: Metadata = {
  title: "Compare Pokémon TCG MSRP & Resale",
  description:
    "Compare sealed Pokémon TCG MSRP and resale values, enter a shelf price, and find the best buys quickly.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let products = seedProducts;
  try {
    const { listProducts } = await import("@/db/repository");
    const saved = new Map<string, (typeof seedProducts)[number]>();
    let offset = 0;
    for (;;) {
      const page = await listProducts({ activeOnly: false, limit: 200, offset });
      for (const product of page.products) saved.set(product.slug, product);
      offset += page.products.length;
      if (!page.products.length || offset >= page.total) break;
    }
    products = seedProducts.flatMap(product => {
      const resolved = resolvePublicProduct(saved.get(product.slug) ?? null, product);
      saved.delete(product.slug);
      return resolved ? [resolved] : [];
    });
    products.push(...[...saved.values()].filter(product => product.active));
  } catch {
    // Source-attributed bundled catalog is the offline/first-run fallback.
  }
  return (
    <CatalogApp initialProducts={products} />
  );
}
