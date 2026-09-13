import type { ProductWithMarketPrice } from "./domain";
import type { CollectionProduct } from "./collection";

export function collectionProduct(product: ProductWithMarketPrice, packCount: number | null = null): CollectionProduct {
  return { slug: product.slug, name: product.name, setName: product.setName, category: product.category, imageUrl: product.imageUrl, packCount,
    msrpCents: product.currency === "USD" ? product.msrpCents : null,
    marketCents: product.marketPrice?.currency === "USD" ? product.marketPrice.amountCents : null,
    marketUpdatedAt: product.marketPrice?.updatedAt ?? null };
}
