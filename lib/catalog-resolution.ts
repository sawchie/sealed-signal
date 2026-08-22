import type { ProductWithMarketPrice } from "./domain/types";

/**
 * A persisted row wins whenever it exists. Inactive rows intentionally resolve
 * to null so they act as tombstones instead of exposing an active seed fallback.
 */
export function resolvePublicProduct(
  persisted: ProductWithMarketPrice | null,
  bundled: ProductWithMarketPrice | null,
): ProductWithMarketPrice | null {
  if (persisted) return persisted.active ? persisted : null;
  return bundled;
}
