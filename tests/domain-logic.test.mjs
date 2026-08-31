import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProfitability,
  calculateRetailComparison,
  estimateProductProfit,
  isAtLeastDoubleMsrp,
  ProfitValidationError,
} from "../lib/domain/profit.ts";
import {
  getRecommendation,
  getRecommendationPresentation,
  RecommendationValidationError,
} from "../lib/domain/recommendation.ts";
import {
  createManualMarketPriceQuote,
  ManualMarketPriceProvider,
  MarketPriceValidationError,
} from "../lib/domain/market-price-provider.ts";
import {
  formatCompactDate,
  formatRelativeDate,
  formatUtcDateTimeInput,
  utcDateTimeInputToIso,
} from "../lib/format.ts";

test("keeps date-only and compact timestamp output stable west of UTC", () => {
  const originalTimeZone = process.env.TZ;
  try {
    process.env.TZ = "America/Denver";
    assert.equal(formatCompactDate("2025-05-30"), "May 30, 2025");
    assert.equal(
      formatCompactDate("2025-05-30T00:30:00.000Z"),
      "May 30, 2025",
    );
    assert.equal(formatCompactDate("2025-02-30"), "Unknown date");
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});

test("uses an explicit render instant for hydration-safe relative dates", () => {
  const snapshot = "2026-08-21T12:00:00.000Z";
  assert.equal(
    formatRelativeDate(snapshot, "2026-08-22T12:00:00.000Z"),
    "yesterday",
  );
  assert.equal(
    formatRelativeDate(snapshot, "2026-08-23T12:00:00.000Z"),
    "2 days ago",
  );
  assert.equal(formatRelativeDate(snapshot, "not-a-date"), "Unknown date");
});

test("round-trips admin snapshot fields explicitly as UTC", () => {
  const timestamp = "2026-08-22T06:15:00.000Z";
  assert.equal(formatUtcDateTimeInput(timestamp), "2026-08-22T06:15");
  assert.equal(utcDateTimeInputToIso("2026-08-22T06:15"), timestamp);
  assert.equal(utcDateTimeInputToIso("2026-02-30T06:15"), null);
});

test("calculates fees, proceeds, profit, and ROI with centralized defaults", () => {
  const result = calculateProfitability({
    marketPriceCents: 8_900,
    purchasePriceCents: 4_999,
  });

  assert.deepEqual(result, {
    marketPriceCents: 8_900,
    purchasePriceCents: 4_999,
    percentageSellingFeeCents: 1_179,
    fixedSellingFeeCents: 30,
    sellingFeesCents: 1_209,
    sellerShippingCostCents: 0,
    purchaseSalesTaxCents: 0,
    acquisitionCostCents: 4_999,
    netProceedsCents: 7_691,
    profitCents: 2_692,
    roiPercent: 53.85,
  });
});

test("supports fixed fees, seller shipping, and sales tax in acquisition cost", () => {
  const result = calculateProfitability(
    { marketPriceCents: 10_000, purchasePriceCents: 5_000 },
    {
      sellingPlatformFeeRate: 0.12,
      fixedSellingFeeCents: 30,
      sellerShippingCostCents: 500,
      purchaseSalesTaxTreatment: "included-in-cost",
      purchaseSalesTaxRate: 0.08,
    },
  );

  assert.equal(result.percentageSellingFeeCents, 1_200);
  assert.equal(result.sellingFeesCents, 1_230);
  assert.equal(result.purchaseSalesTaxCents, 400);
  assert.equal(result.acquisitionCostCents, 5_400);
  assert.equal(result.netProceedsCents, 8_270);
  assert.equal(result.profitCents, 2_870);
  assert.equal(result.roiPercent, 53.15);
});

test("uses custom purchase price when supplied and MSRP otherwise", () => {
  const atMsrp = estimateProductProfit({
    marketPriceCents: 8_900,
    msrpCents: 4_999,
  });
  const atRetailerPrice = estimateProductProfit({
    marketPriceCents: 8_900,
    msrpCents: 4_999,
    customPurchasePriceCents: 5_498,
  });

  assert.equal(atMsrp?.purchasePriceBasis, "msrp");
  assert.equal(atMsrp?.purchasePriceCents, 4_999);
  assert.equal(atRetailerPrice?.purchasePriceBasis, "custom");
  assert.equal(atRetailerPrice?.purchasePriceCents, 5_498);
  assert.ok(atRetailerPrice && atMsrp);
  assert.ok(atRetailerPrice.profitCents < atMsrp.profitCents);
  assert.ok(atRetailerPrice.roiPercent < atMsrp.roiPercent);
});

test("returns unavailable rather than inventing a value for missing prices", () => {
  assert.equal(
    estimateProductProfit({ marketPriceCents: null, msrpCents: 4_999 }),
    null,
  );
  assert.equal(
    estimateProductProfit({ marketPriceCents: 8_900, msrpCents: null }),
    null,
  );

  const withCustomPrice = estimateProductProfit({
    marketPriceCents: 8_900,
    msrpCents: null,
    customPurchasePriceCents: 5_000,
  });
  assert.equal(withCustomPrice?.purchasePriceBasis, "custom");
  assert.equal(withCustomPrice?.isAtLeastDoubleMsrp, false);
});

test("classifies recommendation thresholds using ROI and dollar profit", () => {
  assert.equal(
    getRecommendation({ profitCents: 2_500, roiPercent: 40 }),
    "STRONG BUY",
  );
  assert.equal(
    getRecommendation({ profitCents: 2_499, roiPercent: 80 }),
    "BUY",
  );
  assert.equal(
    getRecommendation({ profitCents: 1_000, roiPercent: 20 }),
    "BUY",
  );
  assert.equal(
    getRecommendation({ profitCents: 999, roiPercent: 50 }),
    "MARGINAL",
  );
  assert.equal(
    getRecommendation({ profitCents: 300, roiPercent: 8 }),
    "MARGINAL",
  );
  assert.equal(
    getRecommendation({ profitCents: 299, roiPercent: 50 }),
    "SKIP",
  );
  assert.equal(
    getRecommendation({ profitCents: 4_000, roiPercent: 7.99 }),
    "SKIP",
  );
});

test("keeps recommendation wording and color tone on one source of truth", () => {
  assert.deepEqual(getRecommendationPresentation("STRONG BUY"), {
    label: "STRONG BUY",
    tone: "positive",
  });
  assert.deepEqual(getRecommendationPresentation("MARGINAL"), {
    label: "FAIR",
    tone: "neutral",
  });
  assert.deepEqual(getRecommendationPresentation("SKIP"), {
    label: "BAD BUY",
    tone: "negative",
  });
  assert.deepEqual(getRecommendationPresentation(null), {
    label: "NEEDS PRICE",
    tone: "unpriced",
  });
});

test("keeps gross market spread distinct from fee-adjusted profit", () => {
  assert.deepEqual(calculateRetailComparison(7_499, 4_999), {
    grossSpreadCents: 2_500,
    premiumPercent: 50.01,
  });
  assert.equal(calculateRetailComparison(null, 4_999), null);
});

test("recommendation thresholds are centrally configurable", () => {
  assert.equal(
    getRecommendation(
      { profitCents: 2_000, roiPercent: 30 },
      {
        strongBuy: { minProfitCents: 2_000, minRoiPercent: 30 },
        buy: { minProfitCents: 1_000, minRoiPercent: 20 },
        marginal: { minProfitCents: 300, minRoiPercent: 8 },
      },
    ),
    "STRONG BUY",
  );
});

test("2× MSRP detection includes the exact boundary and handles missing data", () => {
  assert.equal(isAtLeastDoubleMsrp(9_998, 4_999), true);
  assert.equal(isAtLeastDoubleMsrp(9_997, 4_999), false);
  assert.equal(isAtLeastDoubleMsrp(null, 4_999), false);
  assert.equal(isAtLeastDoubleMsrp(9_998, null), false);
});

test("rejects invalid numeric calculation and recommendation inputs", () => {
  assert.throws(
    () =>
      calculateProfitability({
        marketPriceCents: Number.NaN,
        purchasePriceCents: 4_999,
      }),
    ProfitValidationError,
  );
  assert.throws(
    () =>
      calculateProfitability({
        marketPriceCents: 8_900.5,
        purchasePriceCents: 4_999,
      }),
    ProfitValidationError,
  );
  assert.throws(
    () =>
      calculateProfitability({
        marketPriceCents: 8_900,
        purchasePriceCents: 0,
      }),
    ProfitValidationError,
  );
  assert.throws(
    () =>
      calculateProfitability(
        { marketPriceCents: 8_900, purchasePriceCents: 4_999 },
        { sellingPlatformFeeRate: 1.01 },
      ),
    ProfitValidationError,
  );
  assert.throws(
    () => getRecommendation({ profitCents: 2_500, roiPercent: Infinity }),
    RecommendationValidationError,
  );
  assert.throws(
    () =>
      getRecommendation(
        { profitCents: 2_500, roiPercent: 40 },
        { strongBuy: { minProfitCents: -1 } },
      ),
    RecommendationValidationError,
  );
});

test("manual provider preserves attribution and returns null for no quote", async () => {
  const quote = createManualMarketPriceQuote({
    productId: "destined-rivals-etb",
    amountCents: 8_900,
    currency: "USD",
    updatedAt: "2026-08-22T12:00:00.000Z",
    sourceLabel: "Manual marketplace review",
    sampleSize: 18,
  });
  const provider = new ManualMarketPriceProvider([quote]);

  assert.deepEqual(await provider.getPrice("destined-rivals-etb"), quote);
  assert.equal(await provider.getPrice("unknown-product"), null);

  const prices = await provider.getPrices([
    "unknown-product",
    "destined-rivals-etb",
  ]);
  assert.equal(prices.size, 1);
  assert.deepEqual(prices.get("destined-rivals-etb"), quote);
});

test("manual provider rejects malformed or duplicate local price data", () => {
  assert.throws(
    () =>
      createManualMarketPriceQuote({
        productId: "product",
        amountCents: -1,
        currency: "USD",
        updatedAt: "2026-08-22T12:00:00.000Z",
      }),
    MarketPriceValidationError,
  );

  const quote = createManualMarketPriceQuote({
    productId: "product",
    amountCents: 1_000,
    currency: "USD",
    updatedAt: "2026-08-22T12:00:00.000Z",
  });
  assert.throws(
    () => new ManualMarketPriceProvider([quote, quote]),
    MarketPriceValidationError,
  );
});
