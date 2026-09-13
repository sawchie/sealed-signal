/** Gross held spread, or realized sale profit after recorded selling costs. USD cents. */
export function collectionGain(proceedsCents: number | null | undefined, unitCostCents: number | null, quantity: number, feesCents = 0): number | null {
  if (proceedsCents == null || unitCostCents === null || !Number.isSafeInteger(quantity) || quantity < 1) return null;
  return proceedsCents - unitCostCents * quantity - feesCents;
}

export function gainTone(value: number | null): "positive" | "negative" | "neutral" {
  return value === null || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";
}
