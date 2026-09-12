export const PRICE_WATCH_KEY = "pokescratch:price-watches:v1";
export type PriceWatch = { targetCents: number; direction: "below" | "above" };
export type PriceWatches = Record<string, PriceWatch>;
export function parsePriceWatches(raw: string | null): PriceWatches {
  try {
    if (!raw || raw.length > 200_000) return {};
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).slice(0, 2000).filter(([slug, entry]) => {
      const value = entry as PriceWatch;
      return /^[a-z0-9-]{1,200}$/.test(slug) && value && Number.isSafeInteger(value.targetCents) && value.targetCents > 0 && value.targetCents <= 100_000_000 && ["below", "above"].includes(value.direction);
    })) as PriceWatches;
  } catch { return {}; }
}
export function watchReached(watch: PriceWatch, marketCents: number | null, updatedAt: string | null, now: string): boolean {
  const age = Date.parse(now) - Date.parse(updatedAt ?? "");
  if (!marketCents || !Number.isFinite(age) || age < 0 || age > 3 * 86_400_000) return false;
  return watch.direction === "below" ? marketCents <= watch.targetCents : marketCents >= watch.targetCents;
}
