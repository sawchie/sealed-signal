/** ISO-4217 currency code (for example, `USD`). */
export type CurrencyCode = string;

/** Calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

/** Timestamp in ISO-8601 form. */
export type IsoDateTime = string;

/**
 * Canonical, UI-facing category names. Keep persisted values human readable so
 * a newly added category can be shown safely before a dedicated icon exists.
 */
export const PRODUCT_CATEGORIES = [
  "Elite Trainer Box",
  "Pokémon Center Elite Trainer Box",
  "Booster Box",
  "Booster Bundle",
  "Sleeved Booster Pack",
  "Blister Pack",
  "Collection Box",
  "Premium Collection Box",
  "Ultra-Premium Collection",
  "Tin",
  "Mini Tin",
  "Booster Multipack",
  "Special Collection",
  "Warehouse Club Bundle",
  "Retail-Exclusive Bundle",
  "Other Sealed Product",
] as const;

export type KnownProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Allows new categories without requiring a domain-layer release first. */
export type ProductCategory = KnownProductCategory | (string & {});

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  aliases: readonly string[];
  /** Null is intentional for mixed-set bundles or genuinely unknown sets. */
  setName: string | null;
  series: string | null;
  category: ProductCategory;
  releaseDate: IsoDate | null;
  imageUrl: string | null;
  /** Integer minor currency units. Null means unavailable, never zero. */
  msrpCents: number | null;
  currency: CurrencyCode;
  notes: string | null;
  active: boolean;
}

export type MarketPriceSourceKind =
  | "manual"
  | "api"
  | "marketplace"
  | "aggregate";

export interface MarketPriceSource {
  /** Stable machine-readable source/provider key. */
  id: string;
  /** User-facing attribution, such as “Manual research”. */
  label: string;
  kind: MarketPriceSourceKind;
  url?: string | null;
}

export interface MarketPriceQuote {
  productId: Product["id"];
  /** Integer minor currency units. */
  amountCents: number;
  currency: CurrencyCode;
  source: MarketPriceSource;
  updatedAt: IsoDateTime;
  /** Present only when the source really supplies a supporting sample. */
  sampleSize?: number | null;
}

/** Canonical catalog/API aggregate. Missing market data is represented by null. */
export interface ProductWithMarketPrice extends Product {
  marketPrice: MarketPriceQuote | null;
}
