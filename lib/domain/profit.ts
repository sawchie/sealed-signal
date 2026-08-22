export type PurchaseSalesTaxTreatment = "excluded" | "included-in-cost";

/** Central assumptions for a single-channel resale estimate. Rates are decimals. */
export interface ProfitAssumptions {
  sellingPlatformFeeRate: number;
  fixedSellingFeeCents: number;
  sellerShippingCostCents: number;
  purchaseSalesTaxTreatment: PurchaseSalesTaxTreatment;
  purchaseSalesTaxRate: number;
}

export const DEFAULT_PROFIT_ASSUMPTIONS: Readonly<ProfitAssumptions> =
  Object.freeze({
    sellingPlatformFeeRate: 0.1325,
    fixedSellingFeeCents: 30,
    sellerShippingCostCents: 0,
    purchaseSalesTaxTreatment: "excluded",
    purchaseSalesTaxRate: 0,
  });

export interface ProfitCalculationInput {
  /** Expected gross selling price, in integer minor currency units. */
  marketPriceCents: number;
  /** Actual retailer price when known; otherwise MSRP, in integer cents. */
  purchasePriceCents: number;
}

export interface ProfitCalculation extends ProfitCalculationInput {
  percentageSellingFeeCents: number;
  fixedSellingFeeCents: number;
  sellingFeesCents: number;
  sellerShippingCostCents: number;
  purchaseSalesTaxCents: number;
  acquisitionCostCents: number;
  netProceedsCents: number;
  profitCents: number;
  roiPercent: number;
}

export type PurchasePriceBasis = "custom" | "msrp";

export interface ProductProfitInput {
  msrpCents: number | null;
  marketPriceCents: number | null;
  /** Null/undefined means “use MSRP”; zero is treated as invalid input. */
  customPurchasePriceCents?: number | null;
}

export interface ProductProfitEstimate extends ProfitCalculation {
  purchasePriceBasis: PurchasePriceBasis;
  isAtLeastDoubleMsrp: boolean;
}

export class ProfitValidationError extends RangeError {
  override readonly name = "ProfitValidationError";
}

function assertIntegerCents(
  value: number,
  field: string,
  options: { allowZero: boolean },
): void {
  if (!Number.isSafeInteger(value)) {
    throw new ProfitValidationError(`${field} must be a safe integer number of cents`);
  }

  if (options.allowZero ? value < 0 : value <= 0) {
    const qualifier = options.allowZero ? "non-negative" : "greater than zero";
    throw new ProfitValidationError(`${field} must be ${qualifier}`);
  }
}

function assertRate(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ProfitValidationError(`${field} must be between 0 and 1`);
  }
}

function resolveAssumptions(
  overrides: Partial<ProfitAssumptions>,
): ProfitAssumptions {
  const assumptions = { ...DEFAULT_PROFIT_ASSUMPTIONS, ...overrides };

  assertRate(
    assumptions.sellingPlatformFeeRate,
    "sellingPlatformFeeRate",
  );
  assertRate(assumptions.purchaseSalesTaxRate, "purchaseSalesTaxRate");
  assertIntegerCents(
    assumptions.fixedSellingFeeCents,
    "fixedSellingFeeCents",
    { allowZero: true },
  );
  assertIntegerCents(
    assumptions.sellerShippingCostCents,
    "sellerShippingCostCents",
    { allowZero: true },
  );

  if (
    assumptions.purchaseSalesTaxTreatment !== "excluded" &&
    assumptions.purchaseSalesTaxTreatment !== "included-in-cost"
  ) {
    throw new ProfitValidationError(
      "purchaseSalesTaxTreatment must be excluded or included-in-cost",
    );
  }

  return assumptions;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates a conservative resale estimate. Currency math is rounded to the
 * nearest cent at each independently charged fee/tax boundary.
 */
export function calculateProfitability(
  input: ProfitCalculationInput,
  overrides: Partial<ProfitAssumptions> = {},
): ProfitCalculation {
  assertIntegerCents(input.marketPriceCents, "marketPriceCents", {
    allowZero: false,
  });
  assertIntegerCents(input.purchasePriceCents, "purchasePriceCents", {
    allowZero: false,
  });

  const assumptions = resolveAssumptions(overrides);
  const percentageSellingFeeCents = Math.round(
    input.marketPriceCents * assumptions.sellingPlatformFeeRate,
  );
  const sellingFeesCents =
    percentageSellingFeeCents + assumptions.fixedSellingFeeCents;
  const purchaseSalesTaxCents =
    assumptions.purchaseSalesTaxTreatment === "included-in-cost"
      ? Math.round(input.purchasePriceCents * assumptions.purchaseSalesTaxRate)
      : 0;
  const acquisitionCostCents =
    input.purchasePriceCents + purchaseSalesTaxCents;
  const netProceedsCents =
    input.marketPriceCents -
    sellingFeesCents -
    assumptions.sellerShippingCostCents;
  const profitCents = netProceedsCents - acquisitionCostCents;
  const roiPercent = roundToTwoDecimals(
    (profitCents / acquisitionCostCents) * 100,
  );

  return {
    ...input,
    percentageSellingFeeCents,
    fixedSellingFeeCents: assumptions.fixedSellingFeeCents,
    sellingFeesCents,
    sellerShippingCostCents: assumptions.sellerShippingCostCents,
    purchaseSalesTaxCents,
    acquisitionCostCents,
    netProceedsCents,
    profitCents,
    roiPercent,
  };
}

/** Null-safe helper used by the catalog's 2× MSRP badge and filter. */
export function isAtLeastDoubleMsrp(
  marketPriceCents: number | null,
  msrpCents: number | null,
): boolean {
  if (marketPriceCents === null || msrpCents === null) return false;

  assertIntegerCents(marketPriceCents, "marketPriceCents", {
    allowZero: false,
  });
  assertIntegerCents(msrpCents, "msrpCents", { allowZero: false });

  return marketPriceCents >= msrpCents * 2;
}

/**
 * Resolves custom purchase price → MSRP and returns null when an estimate
 * cannot be made. This keeps unavailable prices distinct from a real $0 value.
 */
export function estimateProductProfit(
  input: ProductProfitInput,
  overrides: Partial<ProfitAssumptions> = {},
): ProductProfitEstimate | null {
  if (input.marketPriceCents === null) return null;

  const hasCustomPrice = input.customPurchasePriceCents != null;
  const purchasePriceCents = hasCustomPrice
    ? input.customPurchasePriceCents
    : input.msrpCents;

  if (purchasePriceCents === null || purchasePriceCents === undefined) {
    return null;
  }

  const calculation = calculateProfitability(
    { marketPriceCents: input.marketPriceCents, purchasePriceCents },
    overrides,
  );

  return {
    ...calculation,
    purchasePriceBasis: hasCustomPrice ? "custom" : "msrp",
    isAtLeastDoubleMsrp: isAtLeastDoubleMsrp(
      input.marketPriceCents,
      input.msrpCents,
    ),
  };
}
