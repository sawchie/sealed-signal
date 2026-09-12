import { DEFAULT_PROFIT_ASSUMPTIONS, calculateProfitability, type ProfitAssumptions } from "./domain/profit.ts";

export type CostFields = { feeRate: string; fixedFee: string; shipping: string; includeTax: boolean; taxRate: string };
export const COST_PROFILE_KEY = "pokescratch:cost-profile:v1";
export const defaultCostFields = (): CostFields => ({ feeRate: String(DEFAULT_PROFIT_ASSUMPTIONS.sellingPlatformFeeRate * 100), fixedFee: (DEFAULT_PROFIT_ASSUMPTIONS.fixedSellingFeeCents / 100).toFixed(2), shipping: (DEFAULT_PROFIT_ASSUMPTIONS.sellerShippingCostCents / 100).toFixed(2), includeTax: DEFAULT_PROFIT_ASSUMPTIONS.purchaseSalesTaxTreatment === "included-in-cost", taxRate: String(DEFAULT_PROFIT_ASSUMPTIONS.purchaseSalesTaxRate * 100) });

/** Accept conventional USD input (including pasted $ and grouped thousands), never coercion to zero. */
export function parseAmount(raw: string, { rate = false, positive = false } = {}): number | null {
  const value = raw.trim().replace(/^\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$|^\.\d{1,2}$/.test(value)) return null;
  const number = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(number) || number < 0 || (positive && number === 0) || number > (rate ? 100 : 1_000_000)) return null;
  return rate ? number / 100 : Math.round(number * 100);
}

export function validateCostFields(fields: CostFields) {
  const errors: Partial<Record<keyof CostFields, string>> = {};
  const fee = parseAmount(fields.feeRate, { rate: true });
  const fixed = parseAmount(fields.fixedFee);
  const shipping = parseAmount(fields.shipping);
  const tax = fields.includeTax ? parseAmount(fields.taxRate, { rate: true }) : 0;
  if (fee === null) errors.feeRate = "Enter a percentage from 0 to 100.";
  if (fixed === null) errors.fixedFee = "Enter a fee from $0 to $1,000,000, with up to two decimals.";
  if (shipping === null) errors.shipping = "Enter shipping from $0 to $1,000,000, with up to two decimals.";
  if (tax === null) errors.taxRate = "Enter a tax percentage from 0 to 100.";
  const assumptions: ProfitAssumptions | null = Object.keys(errors).length ? null : {
    sellingPlatformFeeRate: fee!, fixedSellingFeeCents: fixed!, sellerShippingCostCents: shipping!,
    purchaseSalesTaxTreatment: fields.includeTax ? "included-in-cost" : "excluded", purchaseSalesTaxRate: tax!,
  };
  return { errors, assumptions };
}

export function parseCostProfile(raw: string | null): CostFields | null {
  try {
    if (!raw || raw.length > 2000) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value.includeTax !== "boolean" || ["feeRate", "fixedFee", "shipping", "taxRate"].some(key => typeof value[key] !== "string")) return null;
    return validateCostFields(value).assumptions ? { feeRate: value.feeRate, fixedFee: value.fixedFee, shipping: value.shipping, taxRate: value.taxRate, includeTax: value.includeTax } : null;
  } catch { return null; }
}

/** Highest pre-tax purchase price meeting BOTH targets, using the same rounded-cent math as the verdict. */
export function maximumBuyPrice(marketCents: number | null, assumptions: ProfitAssumptions, minProfitCents: number, minRoiPercent: number): number | null {
  if (!marketCents || !Number.isSafeInteger(marketCents) || marketCents < 1 || !Number.isSafeInteger(minProfitCents) || minProfitCents < 0 || !Number.isFinite(minRoiPercent) || minRoiPercent < 0) return null;
  let low = 1, high = marketCents, best: number | null = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const result = calculateProfitability({ marketPriceCents: marketCents, purchasePriceCents: middle }, assumptions);
    // Compare unrounded ROI so a displayed rounding boundary cannot overpromise the target.
    if (result.profitCents >= minProfitCents && result.profitCents / result.acquisitionCostCents * 100 >= minRoiPercent) { best = middle; low = middle + 1; }
    else high = middle - 1;
  }
  return best;
}

export function priceFreshness(updatedAt: string | null | undefined, now: string) {
  const age = Date.parse(now) - Date.parse(updatedAt ?? "");
  return !Number.isFinite(age) || age < -86_400_000 ? "Unknown date" : age > 3 * 86_400_000 ? "Older snapshot" : "Recent snapshot";
}
