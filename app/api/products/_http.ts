import {
  ProductConflictError,
  ProductNotFoundError,
  catalogSorts,
  normalizeSlug,
  type CatalogQuery,
  type MarketPriceWrite,
  type ProductCreate,
  type ProductUpdate,
} from "../../../db/repository";

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(
  object: Record<string, unknown>,
  key: string,
  options: { required?: boolean; nullable: true; max?: number },
): string | null | undefined;
function stringValue(
  object: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; nullable?: false; max?: number },
): string | undefined;
function stringValue(
  object: Record<string, unknown>,
  key: string,
  options: { required?: boolean; nullable?: boolean; max?: number } = {},
): string | null | undefined {
  const value = object[key];
  if (value === undefined) {
    if (options.required) throw new RequestValidationError(`${key} is required.`);
    return undefined;
  }
  if (value === null && options.nullable) return null;
  if (typeof value !== "string") {
    throw new RequestValidationError(`${key} must be a string${options.nullable ? " or null" : ""}.`);
  }
  const trimmed = value.trim();
  if (!trimmed && options.required) {
    throw new RequestValidationError(`${key} cannot be empty.`);
  }
  if (trimmed.length > (options.max ?? 500)) {
    throw new RequestValidationError(`${key} is too long.`);
  }
  return trimmed || (options.nullable ? null : "");
}

function integerValue(
  object: Record<string, unknown>,
  key: string,
  options: { required?: boolean; nullable?: boolean; min?: number; max?: number } = {},
): number | null | undefined {
  const value = object[key];
  if (value === undefined) {
    if (options.required) throw new RequestValidationError(`${key} is required.`);
    return undefined;
  }
  if (value === null && options.nullable) return null;
  if (!Number.isSafeInteger(value)) {
    throw new RequestValidationError(`${key} must be an integer${options.nullable ? " or null" : ""}.`);
  }
  const number = value as number;
  if (number < (options.min ?? Number.MIN_SAFE_INTEGER)) {
    throw new RequestValidationError(`${key} is below the allowed minimum.`);
  }
  if (number > (options.max ?? Number.MAX_SAFE_INTEGER)) {
    throw new RequestValidationError(`${key} exceeds the allowed maximum.`);
  }
  return number;
}

function booleanValue(
  object: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new RequestValidationError(`${key} must be a boolean.`);
  }
  return value;
}

function aliasesValue(
  object: Record<string, unknown>,
): string[] | undefined {
  const value = object.aliases;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 50) {
    throw new RequestValidationError("aliases must be an array of at most 50 strings.");
  }
  return value.map((alias, index) => {
    if (typeof alias !== "string" || !alias.trim() || alias.trim().length > 200) {
      throw new RequestValidationError(`aliases[${index}] must be a non-empty string under 200 characters.`);
    }
    return alias.trim();
  });
}

function isoDate(value: string | null | undefined, key: string): string | null | undefined {
  if (value == null) return value;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new RequestValidationError(`${key} must use YYYY-MM-DD format.`);
  }
  return value;
}

function isoTimestamp(
  value: string | null | undefined,
  key: string,
): string | undefined {
  if (value == null) return undefined;
  const timestampPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!timestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new RequestValidationError(`${key} must be an ISO-8601 timestamp.`);
  }
  isoDate(value.slice(0, 10), key);
  return new Date(value).toISOString();
}

function currencyValue(
  object: Record<string, unknown>,
): string | undefined {
  const currency = stringValue(object, "currency", { max: 3 });
  if (currency === undefined) return undefined;
  if (!/^[A-Za-z]{3}$/.test(currency)) {
    throw new RequestValidationError("currency must be a three-letter ISO-4217 code.");
  }
  return currency.toUpperCase();
}

function webUrl(
  value: string | null | undefined,
  key: string,
  options: { allowRelative?: boolean } = {},
): string | null | undefined {
  if (value == null || value === "") return value;
  if (options.allowRelative && value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new RequestValidationError(`${key} must be an HTTPS URL${options.allowRelative ? " or a root-relative path" : ""}.`);
  }
  return value;
}

export function parseMarketPrice(value: unknown): MarketPriceWrite | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new RequestValidationError("marketPrice must be an object or null.");
  }
  const amountCents = integerValue(value, "amountCents", {
    required: true,
    nullable: true,
    min: 1,
    max: 100_000_000,
  });
  const sourceName = stringValue(value, "sourceName", { required: true, max: 160 });
  const sourceUrl = webUrl(
    stringValue(value, "sourceUrl", { nullable: true, max: 2_000 }),
    "sourceUrl",
  );
  const providerKey = stringValue(value, "providerKey", { max: 80 });
  const sourceKind = stringValue(value, "sourceKind", { max: 20 });
  if (
    sourceKind &&
    !["manual", "api", "marketplace", "aggregate"].includes(sourceKind)
  ) {
    throw new RequestValidationError(
      "sourceKind must be manual, api, marketplace, or aggregate.",
    );
  }
  const priceType = stringValue(value, "priceType", { max: 80 });
  const methodology = stringValue(value, "methodology", {
    nullable: true,
    max: 1_000,
  });
  const sampleSize = integerValue(value, "sampleSize", {
    nullable: true,
    min: 1,
    max: 1_000_000,
  });
  const observedAt = isoTimestamp(
    stringValue(value, "observedAt", { max: 64 }),
    "observedAt",
  );

  return {
    amountCents: amountCents ?? null,
    sourceName: sourceName as string,
    ...(currencyValue(value) ? { currency: currencyValue(value) } : {}),
    ...(providerKey ? { providerKey } : {}),
    ...(sourceKind
      ? {
          sourceKind: sourceKind as
            | "manual"
            | "api"
            | "marketplace"
            | "aggregate",
        }
      : {}),
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(priceType ? { priceType } : {}),
    ...(methodology !== undefined ? { methodology } : {}),
    ...(sampleSize !== undefined ? { sampleSize } : {}),
    ...(observedAt ? { observedAt } : {}),
  };
}

export async function parseMarketPriceRequest(
  request: Request,
): Promise<MarketPriceWrite | null> {
  return parseMarketPrice(await jsonObject(request));
}

async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 100_000) {
    throw new RequestValidationError("Request body is too large.");
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestValidationError("Request body must be valid JSON.");
  }
  if (!isObject(value)) {
    throw new RequestValidationError("Request body must be a JSON object.");
  }
  return value;
}

function productFields(object: Record<string, unknown>) {
  const slug = stringValue(object, "slug", { max: 180 });
  if (slug !== undefined && !normalizeSlug(slug)) {
    throw new RequestValidationError("slug must contain at least one letter or number.");
  }
  const imageUrl = webUrl(
    stringValue(object, "imageUrl", { nullable: true, max: 2_000 }),
    "imageUrl",
    { allowRelative: true },
  );
  const marketPrice = Object.hasOwn(object, "marketPrice")
    ? parseMarketPrice(object.marketPrice)
    : undefined;

  return {
    ...(slug !== undefined ? { slug } : {}),
    ...(stringValue(object, "name", { max: 240 }) !== undefined
      ? { name: stringValue(object, "name", { max: 240 }) as string }
      : {}),
    ...(stringValue(object, "shortName", { nullable: true, max: 160 }) !== undefined
      ? { shortName: stringValue(object, "shortName", { nullable: true, max: 160 }) }
      : {}),
    ...(aliasesValue(object) !== undefined ? { aliases: aliasesValue(object) } : {}),
    ...(stringValue(object, "setName", { nullable: true, max: 160 }) !== undefined
      ? { setName: stringValue(object, "setName", { nullable: true, max: 160 }) }
      : {}),
    ...(stringValue(object, "series", { nullable: true, max: 160 }) !== undefined
      ? { series: stringValue(object, "series", { nullable: true, max: 160 }) }
      : {}),
    ...(stringValue(object, "category", { max: 160 }) !== undefined
      ? { category: stringValue(object, "category", { max: 160 }) as string }
      : {}),
    ...(isoDate(
      stringValue(object, "releaseDate", { nullable: true, max: 10 }),
      "releaseDate",
    ) !== undefined
      ? {
          releaseDate: isoDate(
            stringValue(object, "releaseDate", { nullable: true, max: 10 }),
            "releaseDate",
          ),
        }
      : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(integerValue(object, "msrpCents", {
      nullable: true,
      min: 1,
      max: 100_000_000,
    }) !== undefined
      ? {
          msrpCents: integerValue(object, "msrpCents", {
            nullable: true,
            min: 1,
            max: 100_000_000,
          }),
        }
      : {}),
    ...(currencyValue(object) ? { currency: currencyValue(object) } : {}),
    ...(stringValue(object, "notes", { nullable: true, max: 5_000 }) !== undefined
      ? { notes: stringValue(object, "notes", { nullable: true, max: 5_000 }) }
      : {}),
    ...(booleanValue(object, "active") !== undefined
      ? { active: booleanValue(object, "active") }
      : {}),
    ...(marketPrice !== undefined ? { marketPrice } : {}),
  };
}

export async function parseProductCreate(request: Request): Promise<ProductCreate> {
  const object = await jsonObject(request);
  const fields = productFields(object);
  const slug = stringValue(object, "slug", { required: true, max: 180 }) as string;
  const name = stringValue(object, "name", { required: true, max: 240 }) as string;
  const category = stringValue(object, "category", {
    required: true,
    max: 160,
  }) as string;
  if (!normalizeSlug(slug)) {
    throw new RequestValidationError("slug must contain at least one letter or number.");
  }
  return { ...fields, slug, name, category };
}

export async function parseProductUpdate(request: Request): Promise<ProductUpdate> {
  const object = await jsonObject(request);
  if (Object.keys(object).length === 0) {
    throw new RequestValidationError("At least one product field is required.");
  }
  const fields = productFields(object);
  if (Object.keys(fields).length === 0) {
    throw new RequestValidationError("No recognized product fields were provided.");
  }
  if (fields.name !== undefined && !fields.name) {
    throw new RequestValidationError("name cannot be empty.");
  }
  if (fields.category !== undefined && !fields.category) {
    throw new RequestValidationError("category cannot be empty.");
  }
  return fields;
}

function queryInteger(
  params: URLSearchParams,
  key: string,
  options: { min?: number; max?: number } = {},
): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new RequestValidationError(`${key} must be an integer.`);
  }
  if (value < (options.min ?? Number.MIN_SAFE_INTEGER) || value > (options.max ?? Number.MAX_SAFE_INTEGER)) {
    throw new RequestValidationError(`${key} is outside the allowed range.`);
  }
  return value;
}

export function parseCatalogQuery(url: URL): CatalogQuery & { includeInactive: boolean } {
  const params = url.searchParams;
  const search = params.get("q")?.trim() || undefined;
  if (search && search.length > 160) {
    throw new RequestValidationError("q is too long.");
  }
  const sort = params.get("sort") ?? undefined;
  if (sort && !catalogSorts.includes(sort as (typeof catalogSorts)[number])) {
    throw new RequestValidationError(`sort must be one of: ${catalogSorts.join(", ")}.`);
  }
  const status = params.get("status") ?? "active";
  if (status !== "active" && status !== "all") {
    throw new RequestValidationError("status must be active or all.");
  }
  const minMsrpCents = queryInteger(params, "minMsrpCents", { min: 0 });
  const maxMsrpCents = queryInteger(params, "maxMsrpCents", { min: 0 });
  const minMarketCents = queryInteger(params, "minMarketCents", { min: 0 });
  const maxMarketCents = queryInteger(params, "maxMarketCents", { min: 0 });
  if (
    minMsrpCents !== undefined &&
    maxMsrpCents !== undefined &&
    minMsrpCents > maxMsrpCents
  ) {
    throw new RequestValidationError(
      "minMsrpCents cannot be greater than maxMsrpCents.",
    );
  }
  if (
    minMarketCents !== undefined &&
    maxMarketCents !== undefined &&
    minMarketCents > maxMarketCents
  ) {
    throw new RequestValidationError(
      "minMarketCents cannot be greater than maxMarketCents.",
    );
  }

  return {
    ...(search ? { search } : {}),
    ...(params.get("category") ? { category: params.get("category") as string } : {}),
    ...(params.get("set") ? { setName: params.get("set") as string } : {}),
    ...(minMsrpCents !== undefined ? { minMsrpCents } : {}),
    ...(maxMsrpCents !== undefined ? { maxMsrpCents } : {}),
    ...(minMarketCents !== undefined ? { minMarketCents } : {}),
    ...(maxMarketCents !== undefined ? { maxMarketCents } : {}),
    ...(sort ? { sort: sort as (typeof catalogSorts)[number] } : {}),
    limit: queryInteger(params, "limit", { min: 1, max: 200 }) ?? 100,
    offset: queryInteger(params, "offset", { min: 0 }) ?? 0,
    activeOnly: status === "active",
    includeInactive: status === "all",
  };
}

export function apiError(error: unknown): Response {
  if (error instanceof RequestValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ProductNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ProductConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error("Product API error", error);
  if (message.includes("no such table") || message.includes("D1 binding `DB`")) {
    return Response.json(
      { error: "The product catalog database is not initialized." },
      { status: 503 },
    );
  }
  return Response.json({ error: "An unexpected product catalog error occurred." }, { status: 500 });
}
