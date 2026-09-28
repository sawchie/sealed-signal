import { seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";

/** Reuse the public catalog's D1 precedence, including intentional inactive records. */
export async function editorialProducts(ids: string[]) {
  const candidates = ids.flatMap(id => { const product = seedProducts.find(p => p.id === id); return product ? [product] : []; });
  return (await Promise.all(candidates.map(async product => {
    try {
      const { getProductBySlug } = await import("@/db/repository");
      return resolvePublicProduct(await getProductBySlug(product.slug, { includeInactive: true }), product);
    } catch { return product.active ? product : null; }
  }))).filter(p => p !== null);
}
