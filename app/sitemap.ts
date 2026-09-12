import type { MetadataRoute } from "next";
import { seedProducts } from "@/data/products";

type SitemapProduct = {
  slug: string;
  lastModified?: string;
};

async function getSitemapProducts(): Promise<SitemapProduct[]> {
  const products = new Map(
    seedProducts.map((product) => [
      product.slug,
      {
        slug: product.slug,
        lastModified: product.marketPrice?.updatedAt ?? product.releaseDate ?? undefined,
      },
    ]),
  );

  try {
    const { listProducts } = await import("@/db/repository");
    let offset = 0;
    for (;;) {
      const persisted = await listProducts({ activeOnly: false, limit: 200, offset });
      for (const product of persisted.products) {
      const bundledDate = products.get(product.slug)?.lastModified;
      products.delete(product.slug);
      if (product.active) {
        products.set(product.slug, {
          slug: product.slug,
          lastModified:
            [bundledDate, product.marketPrice?.updatedAt, product.updatedAt, product.releaseDate].filter(Boolean).sort().at(-1) ?? undefined,
        });
      }
      }
      offset += persisted.products.length;
      if (!persisted.products.length || offset >= persisted.total) break;
    }
  } catch {
    // The bundled catalog remains indexable before a D1 binding is provisioned.
  }

  return [...products.values()];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokescratch.com";
  const products = await getSitemapProducts();
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    ...["about", "contact", "privacy"].map(path => ({ url: `${baseUrl}/${path}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
