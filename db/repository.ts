import { getD1 } from "./index";
import { ensureCatalogSchema } from "./initialize";
import type { PriceObservation } from "../lib/price-history";
import type {
  MarketPriceQuote,
  MarketPriceSourceKind,
  ProductWithMarketPrice,
} from "../lib/domain/types";

export const catalogSorts = [
  "opportunity",
  "market-desc",
  "msrp-asc",
  "msrp-desc",
  "release-desc",
  "updated-desc",
  "alphabetical",
] as const;

export type CatalogSort = (typeof catalogSorts)[number];
export interface CatalogMarketPrice extends MarketPriceQuote {
  methodology?: string;
}

/** Indexed, bounded history for one public product; never loads histories across the whole shelf. */
export async function getProductPriceHistory(productId: string): Promise<PriceObservation[]> {
  const db = getD1();
  await ensureCatalogSchema();
  const result = await db.prepare(`SELECT amount_cents AS amountCents, currency, observed_at AS observedAt, source_name AS source, source_url AS sourceUrl, provider_key AS provider FROM market_price_snapshots WHERE product_id = ? ORDER BY observed_at DESC, created_at DESC, id DESC LIMIT 180`).bind(productId).all<PriceObservation>();
  // Reverse also preserves the repository's tie-break order for same-time revisions.
  return result.results.reverse();
}

export interface CatalogProduct extends ProductWithMarketPrice {
  createdAt: string;
  updatedAt: string;
  marketPrice: CatalogMarketPrice | null;
}

export interface CatalogQuery {
  search?: string;
  category?: string;
  setName?: string;
  minMsrpCents?: number;
  maxMsrpCents?: number;
  minMarketCents?: number;
  maxMarketCents?: number;
  activeOnly?: boolean;
  sort?: CatalogSort;
  limit?: number;
  offset?: number;
}

export interface MarketPriceWrite {
  amountCents: number | null;
  currency?: string;
  providerKey?: string;
  sourceKind?: MarketPriceSourceKind;
  sourceName: string;
  sourceUrl?: string | null;
  priceType?: string;
  methodology?: string | null;
  sampleSize?: number | null;
  observedAt?: string;
}

export interface RetailPriceSourceWrite {
  id: string;
  kind: MarketPriceSourceKind;
  label: string;
  url?: string | null;
}

export interface ProductCreate {
  slug: string;
  name: string;
  shortName?: string | null;
  aliases?: string[];
  setName?: string | null;
  series?: string | null;
  category: string;
  releaseDate?: string | null;
  imageUrl?: string | null;
  msrpCents?: number | null;
  retailPriceSource?: RetailPriceSourceWrite | null;
  currency?: string;
  notes?: string | null;
  active?: boolean;
  marketPrice?: MarketPriceWrite | null;
}

export interface ProductUpdate {
  slug?: string;
  name?: string;
  shortName?: string | null;
  aliases?: string[];
  setName?: string | null;
  series?: string | null;
  category?: string;
  releaseDate?: string | null;
  imageUrl?: string | null;
  msrpCents?: number | null;
  retailPriceSource?: RetailPriceSourceWrite | null;
  currency?: string;
  notes?: string | null;
  active?: boolean;
  /** Null appends an explicit "unavailable" observation. */
  marketPrice?: MarketPriceWrite | null;
}

export class ProductNotFoundError extends Error {
  constructor(slug: string) {
    super(`Product "${slug}" was not found.`);
    this.name = "ProductNotFoundError";
  }
}

export class ProductConflictError extends Error {
  constructor(message = "A product with that slug already exists.") {
    super(message);
    this.name = "ProductConflictError";
  }
}

type SqlValue = string | number | null;

interface JoinedProductRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  set_name: string | null;
  series: string | null;
  category: string;
  release_date: string | null;
  image_url: string | null;
  msrp_cents: number | null;
  retail_source_id: string | null;
  retail_source_kind: string | null;
  retail_source_name: string | null;
  retail_source_url: string | null;
  currency: string;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
  aliases_json: string;
  market_price_id: string | null;
  market_amount_cents: number | null;
  market_currency: string | null;
  market_provider_key: string | null;
  market_source_kind: string | null;
  market_source_name: string | null;
  market_source_url: string | null;
  market_price_type: string | null;
  market_methodology: string | null;
  market_sample_size: number | null;
  market_observed_at: string | null;
  total_count?: number;
}

const PRODUCT_SELECT = `
  p.id,
  p.slug,
  p.name,
  p.short_name,
  p.set_name,
  p.series,
  p.category,
  p.release_date,
  p.image_url,
  p.msrp_cents,
  p.retail_source_id,
  p.retail_source_kind,
  p.retail_source_name,
  p.retail_source_url,
  p.currency,
  p.notes,
  p.active,
  p.created_at,
  p.updated_at,
  COALESCE(
    (SELECT json_group_array(pa.alias)
     FROM product_aliases pa
     WHERE pa.product_id = p.id
     ORDER BY pa.normalized_alias),
    '[]'
  ) AS aliases_json,
  lp.id AS market_price_id,
  lp.amount_cents AS market_amount_cents,
  lp.currency AS market_currency,
  lp.provider_key AS market_provider_key,
  lp.source_kind AS market_source_kind,
  lp.source_name AS market_source_name,
  lp.source_url AS market_source_url,
  lp.price_type AS market_price_type,
  lp.methodology AS market_methodology,
  lp.sample_size AS market_sample_size,
  lp.observed_at AS market_observed_at
`;

const LATEST_PRICE_JOIN = `
LEFT JOIN market_price_snapshots lp
  ON lp.id = (
    SELECT candidate.id
    FROM market_price_snapshots candidate
    WHERE candidate.product_id = p.id
    ORDER BY candidate.observed_at DESC, candidate.created_at DESC, candidate.id DESC
    LIMIT 1
  )
`;

const SORT_SQL: Record<CatalogSort, string> = {
  opportunity: `
    CASE
      WHEN p.msrp_cents > 0 AND lp.amount_cents IS NOT NULL
      THEN CAST(lp.amount_cents AS REAL) / p.msrp_cents
    END DESC,
    CASE
      WHEN p.msrp_cents IS NOT NULL AND lp.amount_cents IS NOT NULL
      THEN lp.amount_cents - p.msrp_cents
    END DESC,
    p.name COLLATE NOCASE ASC
  `,
  "market-desc":
    "lp.amount_cents IS NULL, lp.amount_cents DESC, p.name COLLATE NOCASE ASC",
  "msrp-asc":
    "p.msrp_cents IS NULL, p.msrp_cents ASC, p.name COLLATE NOCASE ASC",
  "msrp-desc":
    "p.msrp_cents IS NULL, p.msrp_cents DESC, p.name COLLATE NOCASE ASC",
  "release-desc":
    "p.release_date IS NULL, p.release_date DESC, p.name COLLATE NOCASE ASC",
  "updated-desc":
    "p.updated_at DESC, p.name COLLATE NOCASE ASC",
  alphabetical: "p.name COLLATE NOCASE ASC",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSlug(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

function categoryKeywords(category: string): string[] {
  const normalized = normalizeText(category);
  const keywords: Record<string, string[]> = {
    "elite trainer box": ["etb"],
    "pokemon center elite trainer box": ["pokemon center etb", "pc etb", "pcetb"],
    "booster box": ["bb"],
    "booster bundle": ["bundle"],
    "sleeved booster pack": ["sleeved pack", "booster pack"],
    "blister pack": ["blister"],
    "collection box": ["collection"],
    "premium collection box": ["premium collection"],
    "ultra premium collection": ["upc"],
    tin: ["tins"],
    "mini tin": ["mini tins"],
  };
  return keywords[normalized] ?? [];
}

function phraseInitialism(value: string): string {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}

function buildSearchText(input: {
  name: string;
  shortName?: string | null;
  aliases: string[];
  setName?: string | null;
  series?: string | null;
  category: string;
}): string {
  const phrases = [
    input.name,
    input.shortName,
    input.setName,
    input.series,
    input.category,
    ...input.aliases,
    ...categoryKeywords(input.category),
  ].filter((value): value is string => Boolean(value));

  const normalized = phrases.map(normalizeText).filter(Boolean);
  const initialisms = phrases.map(phraseInitialism).filter((value) => value.length > 1);
  return [...new Set([...normalized, ...initialisms])].join(" ");
}

function cleanAliases(aliases: readonly string[]): Array<{ alias: string; normalized: string }> {
  const unique = new Map<string, string>();
  for (const candidate of aliases) {
    const alias = candidate.trim();
    const normalized = normalizeText(alias);
    if (alias && normalized && !unique.has(normalized)) unique.set(normalized, alias);
  }
  return [...unique].map(([normalized, alias]) => ({ alias, normalized }));
}

function searchPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function marketSourceKind(
  explicitKind: string | null,
  providerKey: string,
  priceType: string,
): MarketPriceSourceKind {
  if (
    explicitKind === "manual" ||
    explicitKind === "api" ||
    explicitKind === "marketplace" ||
    explicitKind === "aggregate"
  ) {
    return explicitKind;
  }
  const haystack = `${providerKey} ${priceType}`.toLowerCase();
  if (
    haystack.includes("aggregate") ||
    haystack.includes("median") ||
    haystack.includes("tcgindex")
  ) {
    return "aggregate";
  }
  if (
    haystack.includes("marketplace") ||
    haystack.includes("ebay") ||
    haystack.includes("tcgplayer") ||
    haystack.includes("pricecharting") ||
    haystack.includes("cardmarket")
  ) {
    return "marketplace";
  }
  if (haystack.includes("manual") || haystack.includes("local")) return "manual";
  return "api";
}

function aliasesFromJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function toProduct(row: JoinedProductRow): CatalogProduct {
  const marketPrice =
    row.market_price_id &&
    row.market_amount_cents !== null &&
    row.market_currency &&
    row.market_provider_key &&
    row.market_source_name &&
    row.market_observed_at
      ? {
          productId: row.id,
          amountCents: row.market_amount_cents,
          currency: row.market_currency,
          source: {
            id: row.market_provider_key,
            label: row.market_source_name,
            kind: marketSourceKind(
              row.market_source_kind,
              row.market_provider_key,
              row.market_price_type ?? "market-estimate",
            ),
            ...(row.market_source_url ? { url: row.market_source_url } : {}),
          },
          updatedAt: row.market_observed_at,
          ...(row.market_sample_size !== null
            ? { sampleSize: row.market_sample_size }
            : {}),
          ...(row.market_methodology
            ? { methodology: row.market_methodology }
            : {}),
        }
      : null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    aliases: aliasesFromJson(row.aliases_json),
    setName: row.set_name,
    series: row.series,
    category: row.category,
    releaseDate: row.release_date,
    imageUrl: row.image_url,
    msrpCents: row.msrp_cents,
    retailPriceSource:
      row.retail_source_id && row.retail_source_name
        ? {
            id: row.retail_source_id,
            label: row.retail_source_name,
            kind: marketSourceKind(
              row.retail_source_kind,
              row.retail_source_id,
              "retail-reference",
            ),
            ...(row.retail_source_url ? { url: row.retail_source_url } : {}),
          }
        : null,
    currency: row.currency,
    notes: row.notes,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    marketPrice,
  };
}

function conflictFrom(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("unique constraint failed")) {
    throw new ProductConflictError();
  }
  throw error;
}

export async function listProducts(query: CatalogQuery = {}): Promise<{
  products: CatalogProduct[];
  total: number;
  limit: number;
  offset: number;
}> {
  await ensureCatalogSchema();
  const conditions: string[] = [];
  const values: SqlValue[] = [];
  const activeOnly = query.activeOnly ?? true;

  if (activeOnly) conditions.push("p.active = 1");

  for (const token of normalizeText(query.search ?? "").split(" ").filter(Boolean)) {
    conditions.push("p.search_text LIKE ? ESCAPE '\\'");
    values.push(searchPattern(token));
  }

  if (query.category) {
    conditions.push("LOWER(p.category) = ?");
    values.push(query.category.trim().toLowerCase());
  }
  if (query.setName) {
    conditions.push("LOWER(COALESCE(p.set_name, '')) = ?");
    values.push(query.setName.trim().toLowerCase());
  }
  if (query.minMsrpCents !== undefined) {
    conditions.push("p.msrp_cents >= ?");
    values.push(query.minMsrpCents);
  }
  if (query.maxMsrpCents !== undefined) {
    conditions.push("p.msrp_cents <= ?");
    values.push(query.maxMsrpCents);
  }
  if (query.minMarketCents !== undefined) {
    conditions.push("lp.amount_cents >= ?");
    values.push(query.minMarketCents);
  }
  if (query.maxMarketCents !== undefined) {
    conditions.push("lp.amount_cents <= ?");
    values.push(query.maxMarketCents);
  }

  const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = SORT_SQL[query.sort ?? "opportunity"];
  const statement = getD1().prepare(`
    SELECT
      ${PRODUCT_SELECT},
      COUNT(*) OVER() AS total_count
    FROM products p
    ${LATEST_PRICE_JOIN}
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `);

  const result = await statement
    .bind(...values, limit, offset)
    .all<JoinedProductRow>();
  const rows = result.results ?? [];

  return {
    products: rows.map(toProduct),
    total: rows[0]?.total_count ?? 0,
    limit,
    offset,
  };
}

export async function getProductBySlug(
  rawSlug: string,
  options: { includeInactive?: boolean } = {},
): Promise<CatalogProduct | null> {
  await ensureCatalogSchema();
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;

  const activeClause = options.includeInactive ? "" : "AND p.active = 1";
  const result = await getD1()
    .prepare(`
      SELECT ${PRODUCT_SELECT}
      FROM products p
      ${LATEST_PRICE_JOIN}
      WHERE p.slug = ? ${activeClause}
      LIMIT 1
    `)
    .bind(slug)
    .first<JoinedProductRow>();

  return result ? toProduct(result) : null;
}

function priceStatement(
  productId: string,
  input: MarketPriceWrite | null,
  fallbackCurrency: string,
  now: string,
): D1PreparedStatement {
  const price = input ?? {
    amountCents: null,
    sourceName: "Manual price cleared",
    providerKey: "local-manual",
    sourceKind: "manual" as const,
    priceType: "unavailable",
  };

  return getD1()
    .prepare(`
      INSERT INTO market_price_snapshots (
        id, product_id, amount_cents, currency, provider_key, source_kind,
        source_name, source_url, price_type, methodology, sample_size,
        observed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      productId,
      price.amountCents,
      (price.currency ?? fallbackCurrency).toUpperCase(),
      price.providerKey ?? "local-manual",
      price.sourceKind ??
        marketSourceKind(
          null,
          price.providerKey ?? "local-manual",
          price.priceType ?? "market-estimate",
        ),
      price.sourceName,
      price.sourceUrl ?? null,
      price.priceType ?? "market-estimate",
      price.methodology ?? null,
      price.sampleSize ?? null,
      price.observedAt ?? now,
      now,
    );
}

export async function createProduct(input: ProductCreate): Promise<CatalogProduct> {
  await ensureCatalogSchema();
  const d1 = getD1();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug);
  const currency = (input.currency ?? "USD").toUpperCase();
  const aliases = cleanAliases(input.aliases ?? []);
  const searchText = buildSearchText({ ...input, aliases: aliases.map(({ alias }) => alias) });
  const statements: D1PreparedStatement[] = [
    d1
      .prepare(`
        INSERT INTO products (
          id, slug, name, short_name, set_name, series, category, release_date,
          image_url, msrp_cents, retail_source_id, retail_source_kind,
          retail_source_name, retail_source_url, currency, notes, active,
          search_text, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        slug,
        input.name.trim(),
        input.shortName?.trim() || null,
        input.setName?.trim() || null,
        input.series?.trim() || null,
        input.category.trim(),
        input.releaseDate ?? null,
        input.imageUrl?.trim() || null,
        input.msrpCents ?? null,
        input.retailPriceSource?.id ?? null,
        input.retailPriceSource?.kind ?? null,
        input.retailPriceSource?.label ?? null,
        input.retailPriceSource?.url ?? null,
        currency,
        input.notes?.trim() || null,
        input.active === false ? 0 : 1,
        searchText,
        now,
        now,
      ),
  ];

  for (const alias of aliases) {
    statements.push(
      d1
        .prepare(
          "INSERT INTO product_aliases (id, product_id, alias, normalized_alias, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), id, alias.alias, alias.normalized, now),
    );
  }
  if (input.marketPrice !== undefined) {
    statements.push(priceStatement(id, input.marketPrice, currency, now));
  }

  try {
    await d1.batch(statements);
  } catch (error) {
    conflictFrom(error);
  }

  const product = await getProductBySlug(slug, { includeInactive: true });
  if (!product) throw new Error("The product was created but could not be reloaded.");
  return product;
}

export async function updateProductBySlug(
  rawSlug: string,
  patch: ProductUpdate,
): Promise<CatalogProduct> {
  const existing = await getProductBySlug(rawSlug, { includeInactive: true });
  if (!existing) throw new ProductNotFoundError(rawSlug);

  const d1 = getD1();
  const now = new Date().toISOString();
  const aliases = cleanAliases(patch.aliases ?? existing.aliases);
  const merged = {
    slug: normalizeSlug(patch.slug ?? existing.slug),
    name: (patch.name ?? existing.name).trim(),
    shortName: patch.shortName !== undefined ? patch.shortName : existing.shortName,
    setName: patch.setName !== undefined ? patch.setName : existing.setName,
    series: patch.series !== undefined ? patch.series : existing.series,
    category: (patch.category ?? existing.category).trim(),
    releaseDate:
      patch.releaseDate !== undefined ? patch.releaseDate : existing.releaseDate,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : existing.imageUrl,
    msrpCents: patch.msrpCents !== undefined ? patch.msrpCents : existing.msrpCents,
    retailPriceSource:
      patch.retailPriceSource !== undefined
        ? patch.retailPriceSource
        : existing.retailPriceSource,
    currency: (patch.currency ?? existing.currency).toUpperCase(),
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    active: patch.active ?? existing.active,
  };
  const searchText = buildSearchText({
    ...merged,
    aliases: aliases.map(({ alias }) => alias),
  });
  const statements: D1PreparedStatement[] = [
    d1
      .prepare(`
        UPDATE products SET
          slug = ?, name = ?, short_name = ?, set_name = ?, series = ?,
          category = ?, release_date = ?, image_url = ?, msrp_cents = ?,
          retail_source_id = ?, retail_source_kind = ?, retail_source_name = ?,
          retail_source_url = ?, currency = ?, notes = ?, active = ?, search_text = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(
        merged.slug,
        merged.name,
        merged.shortName?.trim() || null,
        merged.setName?.trim() || null,
        merged.series?.trim() || null,
        merged.category,
        merged.releaseDate ?? null,
        merged.imageUrl?.trim() || null,
        merged.msrpCents,
        merged.retailPriceSource?.id ?? null,
        merged.retailPriceSource?.kind ?? null,
        merged.retailPriceSource?.label ?? null,
        merged.retailPriceSource?.url ?? null,
        merged.currency,
        merged.notes?.trim() || null,
        merged.active ? 1 : 0,
        searchText,
        now,
        existing.id,
      ),
  ];

  if (patch.aliases !== undefined) {
    statements.push(
      d1.prepare("DELETE FROM product_aliases WHERE product_id = ?").bind(existing.id),
    );
    for (const alias of aliases) {
      statements.push(
        d1
          .prepare(
            "INSERT INTO product_aliases (id, product_id, alias, normalized_alias, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(crypto.randomUUID(), existing.id, alias.alias, alias.normalized, now),
      );
    }
  }
  if (patch.marketPrice !== undefined) {
    statements.push(
      priceStatement(existing.id, patch.marketPrice, merged.currency, now),
    );
  }

  try {
    await d1.batch(statements);
  } catch (error) {
    conflictFrom(error);
  }

  const updated = await getProductBySlug(merged.slug, { includeInactive: true });
  if (!updated) throw new Error("The product was updated but could not be reloaded.");
  return updated;
}

export async function deactivateProductBySlug(slug: string): Promise<CatalogProduct> {
  return updateProductBySlug(slug, { active: false });
}
