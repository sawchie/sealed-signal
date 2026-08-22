import type {
  CurrencyCode,
  IsoDateTime,
  MarketPriceQuote,
  Product,
} from "./types";

/** Replaceable boundary for manual storage today and external APIs later. */
export interface MarketPriceProvider {
  readonly providerId: string;
  getPrice(productId: Product["id"]): Promise<MarketPriceQuote | null>;
  getPrices(
    productIds: readonly Product["id"][],
  ): Promise<ReadonlyMap<Product["id"], MarketPriceQuote>>;
}

export interface ManualMarketPriceInput {
  productId: Product["id"];
  amountCents: number;
  currency: CurrencyCode;
  updatedAt: IsoDateTime;
  sourceLabel?: string;
  sourceUrl?: string | null;
  sampleSize?: number | null;
}

export interface ManualMarketPriceProviderOptions {
  providerId?: string;
  sourceLabel?: string;
  sourceUrl?: string | null;
}

export class MarketPriceValidationError extends RangeError {
  override readonly name = "MarketPriceValidationError";
}

function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MarketPriceValidationError(`${field} must not be empty`);
  }
}

function assertQuote(quote: MarketPriceQuote): void {
  assertNonEmptyString(quote.productId, "productId");
  assertNonEmptyString(quote.source.id, "source.id");
  assertNonEmptyString(quote.source.label, "source.label");

  if (!Number.isSafeInteger(quote.amountCents) || quote.amountCents <= 0) {
    throw new MarketPriceValidationError(
      "amountCents must be a safe integer greater than zero",
    );
  }
  if (!/^[A-Z]{3}$/.test(quote.currency)) {
    throw new MarketPriceValidationError(
      "currency must be a three-letter uppercase ISO-4217 code",
    );
  }
  if (!Number.isFinite(Date.parse(quote.updatedAt))) {
    throw new MarketPriceValidationError("updatedAt must be a valid timestamp");
  }
  if (
    quote.sampleSize != null &&
    (!Number.isSafeInteger(quote.sampleSize) || quote.sampleSize <= 0)
  ) {
    throw new MarketPriceValidationError(
      "sampleSize must be a safe integer greater than zero when provided",
    );
  }
  if (quote.source.url) {
    let sourceUrl: URL;
    try {
      sourceUrl = new URL(quote.source.url);
    } catch {
      throw new MarketPriceValidationError("source.url must be a valid URL");
    }
    if (sourceUrl.protocol !== "https:" && sourceUrl.protocol !== "http:") {
      throw new MarketPriceValidationError("source.url must use HTTP or HTTPS");
    }
  }
}

function cloneQuote(quote: MarketPriceQuote): MarketPriceQuote {
  return { ...quote, source: { ...quote.source } };
}

/** Builds a fully attributed quote without implying that the value is live. */
export function createManualMarketPriceQuote(
  input: ManualMarketPriceInput,
  options: ManualMarketPriceProviderOptions = {},
): MarketPriceQuote {
  const quote: MarketPriceQuote = {
    productId: input.productId,
    amountCents: input.amountCents,
    currency: input.currency,
    updatedAt: input.updatedAt,
    source: {
      id: options.providerId ?? "manual-local",
      label: input.sourceLabel ?? options.sourceLabel ?? "Manual research",
      kind: "manual",
      url: input.sourceUrl ?? options.sourceUrl ?? null,
    },
    sampleSize: input.sampleSize ?? null,
  };

  assertQuote(quote);
  return cloneQuote(quote);
}

/**
 * Deterministic local provider for V1. It accepts explicit, attributed quotes
 * and returns null for unavailable data; it never manufactures a price.
 */
export class ManualMarketPriceProvider implements MarketPriceProvider {
  readonly providerId: string;
  readonly #quotes = new Map<Product["id"], MarketPriceQuote>();

  constructor(
    quotes: Iterable<MarketPriceQuote> = [],
    providerId = "manual-local",
  ) {
    assertNonEmptyString(providerId, "providerId");
    this.providerId = providerId;

    for (const quote of quotes) {
      if (this.#quotes.has(quote.productId)) {
        throw new MarketPriceValidationError(
          `Duplicate market-price quote for product ${quote.productId}`,
        );
      }
      assertQuote(quote);
      this.#quotes.set(quote.productId, cloneQuote(quote));
    }
  }

  async getPrice(productId: Product["id"]): Promise<MarketPriceQuote | null> {
    assertNonEmptyString(productId, "productId");
    const quote = this.#quotes.get(productId);
    return quote ? cloneQuote(quote) : null;
  }

  async getPrices(
    productIds: readonly Product["id"][],
  ): Promise<ReadonlyMap<Product["id"], MarketPriceQuote>> {
    const quotes = new Map<Product["id"], MarketPriceQuote>();
    for (const productId of productIds) {
      const quote = await this.getPrice(productId);
      if (quote) quotes.set(productId, quote);
    }
    return quotes;
  }
}
