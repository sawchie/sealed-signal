export type OpeningPlan = { boxes: number; packs: number; spendCents: number; remainingCents: number; perPackCents: number | null };

/** One format per scenario; shipping once per order, tax on merchandise only. */
export function planOpening(budgetCents: number | null, unitCents: number | null, packCount: number | null, shippingCents = 0, taxBasisPoints = 0): OpeningPlan | null {
  if (budgetCents == null || unitCents == null || packCount == null ||
      ![budgetCents, unitCents, packCount, shippingCents, taxBasisPoints].every(Number.isSafeInteger) ||
      budgetCents < 0 || budgetCents > 1000000 || unitCents <= 0 || unitCents > 100000000 || packCount < 1 || packCount > 100000 ||
      shippingCents < 0 || shippingCents > 100000000 || taxBasisPoints < 0 || taxBasisPoints > 10000) return null;
  const cost = (boxes: number) => boxes === 0 ? 0 : boxes * unitCents + Math.round(boxes * unitCents * taxBasisPoints / 10000) + shippingCents;
  let boxes = Math.max(0, Math.floor((budgetCents - shippingCents) / (unitCents * (1 + taxBasisPoints / 10000))));
  if (cost(boxes + 1) <= budgetCents) boxes++;
  if (cost(boxes) > budgetCents) boxes--;
  const spendCents = cost(boxes);
  return { boxes, packs: boxes * packCount, spendCents, remainingCents: budgetCents - spendCents, perPackCents: boxes > 0 ? spendCents / (boxes * packCount) : null };
}
export function plannerAmount(raw: string, maximum = 1000000): number | null {
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw.trim())) return null;
  const cents = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= maximum ? cents : null;
}
export type PlannerProduct = {
  id: string; slug: string; name: string; setName: string; category: string; imageUrl: string | null;
  packs: number | null; factsUrl: string | null; promos: string[]; edition: string | null;
  retail: number | null; market: number | null; marketDate: string | null; marketProvider: string | null;
  released: boolean;
};
