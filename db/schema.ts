import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Canonical sealed products. Monetary values are stored as integer minor units
 * (cents for USD) so calculations never depend on floating-point persistence.
 */
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    setName: text("set_name"),
    series: text("series"),
    category: text("category").notNull(),
    releaseDate: text("release_date"),
    imageUrl: text("image_url"),
    msrpCents: integer("msrp_cents"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    /** Derived search document, maintained only through the repository. */
    searchText: text("search_text").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ux_products_slug").on(table.slug),
    index("idx_products_active_category").on(table.active, table.category),
    index("idx_products_active_set").on(table.active, table.setName),
    index("idx_products_active_updated").on(table.active, table.updatedAt),
    check(
      "ck_products_msrp_positive",
      sql`${table.msrpCents} IS NULL OR ${table.msrpCents} > 0`,
    ),
  ],
);

/** Retailer/common-name variants used for forgiving product identification. */
export const productAliases = sqliteTable(
  "product_aliases",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ux_product_aliases_product_normalized").on(
      table.productId,
      table.normalizedAlias,
    ),
    index("idx_product_aliases_normalized").on(table.normalizedAlias),
  ],
);

/**
 * Append-only market-price observations. The most recent observation is the
 * current estimate; older rows are retained for auditability and future charts.
 */
export const marketPriceSnapshots = sqliteTable(
  "market_price_snapshots",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Null records an explicit transition back to "price unavailable". */
    amountCents: integer("amount_cents"),
    currency: text("currency").notNull().default("USD"),
    providerKey: text("provider_key").notNull().default("local-manual"),
    sourceKind: text("source_kind", {
      enum: ["manual", "api", "marketplace", "aggregate"],
    })
      .notNull()
      .default("manual"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    priceType: text("price_type").notNull().default("market-estimate"),
    methodology: text("methodology"),
    sampleSize: integer("sample_size"),
    observedAt: text("observed_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_market_prices_product_observed").on(
      table.productId,
      table.observedAt,
      table.createdAt,
      table.id,
    ),
    index("idx_market_prices_provider_observed").on(
      table.providerKey,
      table.observedAt,
    ),
    check(
      "ck_market_prices_amount_positive",
      sql`${table.amountCents} IS NULL OR ${table.amountCents} > 0`,
    ),
    check(
      "ck_market_prices_sample_positive",
      sql`${table.sampleSize} IS NULL OR ${table.sampleSize} > 0`,
    ),
    check(
      "ck_market_prices_source_kind",
      sql`${table.sourceKind} IN ('manual', 'api', 'marketplace', 'aggregate')`,
    ),
  ],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductAliasRow = typeof productAliases.$inferSelect;
export type MarketPriceSnapshotRow = typeof marketPriceSnapshots.$inferSelect;
