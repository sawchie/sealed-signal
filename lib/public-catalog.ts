import { seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";

/** Shared public projection: D1 remains authoritative, including inactive tombstones. */
export async function publicCatalog() {
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
    const products = seedProducts.flatMap(product => {
      const resolved = resolvePublicProduct(saved.get(product.slug) ?? null, product);
      saved.delete(product.slug);
      return resolved ? [resolved] : [];
    });
    products.push(...[...saved.values()].filter(product => product.active));
    return products;
  } catch { return seedProducts; }
}
