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
    const persisted = await listProducts({ activeOnly: false, limit: 200 });
    for (const product of persisted.products) {
      products.delete(product.slug);
      if (product.active) {
        products.set(product.slug, {
          slug: product.slug,
          lastModified:
            product.marketPrice?.updatedAt ?? product.updatedAt ?? product.releaseDate ?? undefined,
        });
      }
    }
  } catch {
    // The bundled catalog remains indexable before a D1 binding is provisioned.
  }

  return [...products.values()];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getSitemapProducts();
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    ...products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
