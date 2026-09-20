import type { MetadataRoute } from "next";
import { seedProducts } from "@/data/products";
import guides from "@/data/guides.json";
import { latestSitemapDate } from "@/lib/sitemap-dates";

type SitemapProduct = {
  slug: string;
  lastModified?: string;
};

async function getSitemapProducts(): Promise<SitemapProduct[]> {
  const now = Date.now();
  const products = new Map(
    seedProducts.map((product) => [
      product.slug,
      {
        slug: product.slug,
        // A release date is not a page edit date, particularly for preorders.
        lastModified: latestSitemapDate([product.marketPrice?.updatedAt], now),
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
            lastModified: latestSitemapDate([bundledDate, product.marketPrice?.updatedAt, product.updatedAt], now),
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
    ...["about", "contact", "privacy", "guides", "tools", "tools/price-per-pack"].map(path => ({ url: `${baseUrl}/${path}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...guides.map(guide => ({ url: `${baseUrl}/guides/${guide.slug}`, lastModified: latestSitemapDate([guide.published]), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
