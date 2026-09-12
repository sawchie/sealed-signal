import type { ProductWithMarketPrice } from "./domain/types";

/**
 * A persisted row wins whenever it exists. Inactive rows intentionally resolve
 * to null so they act as tombstones instead of exposing an active seed fallback.
 */
export function resolvePublicProduct(
  persisted: ProductWithMarketPrice | null,
  bundled: ProductWithMarketPrice | null,
): ProductWithMarketPrice | null {
  if (persisted) {
    if (!persisted.active) return null;
    const newerQuote = bundled?.marketPrice && bundled.marketPrice.updatedAt > (persisted.marketPrice?.updatedAt ?? "");
    return newerQuote ? { ...persisted, marketPrice: bundled.marketPrice, imageUrl: persisted.imageUrl ?? bundled.imageUrl, retailPriceSource: persisted.retailPriceSource ?? bundled.retailPriceSource } : persisted;
  }
  return bundled;
}
