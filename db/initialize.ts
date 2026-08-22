import { getD1 } from "./index";

let initialization: Promise<void> | null = null;

/**
 * Makes a brand-new local D1 binding usable without a separate bootstrap CLI.
 * Deployment migrations remain authoritative; every statement here is
 * idempotent and mirrors the baseline migration.
 */
export function ensureCatalogSchema(): Promise<void> {
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

async function initialize(): Promise<void> {
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT,
        set_name TEXT,
        series TEXT,
        category TEXT NOT NULL,
        release_date TEXT,
        image_url TEXT,
        msrp_cents INTEGER,
        currency TEXT DEFAULT 'USD' NOT NULL,
        notes TEXT,
        active INTEGER DEFAULT 1 NOT NULL,
        search_text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT ck_products_msrp_positive
          CHECK(msrp_cents IS NULL OR msrp_cents > 0)
      )
    `),
    d1.prepare(`
      CREATE TABLE IF NOT EXISTS product_aliases (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        normalized_alias TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `),
    d1.prepare(`
      CREATE TABLE IF NOT EXISTS market_price_snapshots (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL,
        amount_cents INTEGER,
        currency TEXT DEFAULT 'USD' NOT NULL,
        provider_key TEXT DEFAULT 'local-manual' NOT NULL,
        source_kind TEXT DEFAULT 'manual' NOT NULL,
        source_name TEXT NOT NULL,
        source_url TEXT,
        price_type TEXT DEFAULT 'market-estimate' NOT NULL,
        methodology TEXT,
        sample_size INTEGER,
        observed_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT ck_market_prices_amount_positive
          CHECK(amount_cents IS NULL OR amount_cents > 0),
        CONSTRAINT ck_market_prices_sample_positive
          CHECK(sample_size IS NULL OR sample_size > 0),
        CONSTRAINT ck_market_prices_source_kind
          CHECK(source_kind IN ('manual', 'api', 'marketplace', 'aggregate'))
      )
    `),
    d1.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS ux_products_slug ON products (slug)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_products_active_category ON products (active, category)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_products_active_set ON products (active, set_name)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_products_active_updated ON products (active, updated_at)",
    ),
    d1.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS ux_product_aliases_product_normalized ON product_aliases (product_id, normalized_alias)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_product_aliases_normalized ON product_aliases (normalized_alias)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_market_prices_product_observed ON market_price_snapshots (product_id, observed_at, created_at, id)",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_market_prices_provider_observed ON market_price_snapshots (provider_key, observed_at)",
    ),
    d1.prepare("PRAGMA optimize"),
  ]);
}
