export type PackInput = { label: string; price: string; shipping: string; tax: string; discount: string; packs: string };
export type PackResult = { errors: Partial<Record<keyof PackInput, string>>; totalCents: number | null; perPackCents: number | null; packs: number | null };
export const emptyPackInput = (): PackInput => ({ label: "", price: "", shipping: "0", tax: "0", discount: "0", packs: "" });

/** Keep fractional cents until formatting; unknown prices/counts are never zero. */
export function pricePerPackCents(priceCents: number | null | undefined, packCount: number | null | undefined): number | null {
  if (priceCents == null || !Number.isSafeInteger(priceCents) || priceCents < 0 || packCount == null || !Number.isSafeInteger(packCount) || packCount <= 0) return null;
  return priceCents / packCount;
}

export function calculatePackCost(input: PackInput): PackResult {
  const errors: PackResult["errors"] = {};
  const cents: Record<string, number> = {};
  for (const field of ["price", "shipping", "tax", "discount"] as const) {
    const raw = input[field].trim();
    if (field === "price" && raw === "") { errors[field] = "Enter an item price, including 0 for a free item."; continue; }
    const value = raw === "" ? 0 : Number(raw);
    if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})?$/.test(raw) || !Number.isFinite(value) || value < 0 || value > 1000000) errors[field] = "Enter a USD amount from 0 to 1,000,000 with up to two decimals.";
    else cents[field] = Math.round(value * 100);
  }
  const packs = Number(input.packs);
  if (!/^\d+$/.test(input.packs.trim()) || !Number.isSafeInteger(packs) || packs < 1 || packs > 100000) errors.packs = "Enter a whole pack count from 1 to 100,000.";
  const total = cents.price + cents.shipping + cents.tax - cents.discount;
  if (total < 0) errors.discount = "Discount cannot exceed the item price, shipping, and tax combined.";
  if (Object.keys(errors).length) return { errors, totalCents: null, perPackCents: null, packs: null };
  return { errors, totalCents: total, perPackCents: pricePerPackCents(total, packs), packs };
}

export function comparePackCosts(a: PackResult, b: PackResult) {
  if (a.perPackCents === null || b.perPackCents === null) return null;
  const tie = Math.round(a.perPackCents) === Math.round(b.perPackCents);
  return { winner: tie ? null : a.perPackCents < b.perPackCents ? "A" : "B", differenceCents: Math.abs(Math.round(a.perPackCents) - Math.round(b.perPackCents)) };
}
