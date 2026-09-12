export const SAVED_PRODUCTS_KEY = "pokescratch:saved:v1";
export type SavedProducts = { slugs: string[]; openSaved: boolean };
export const emptySavedProducts = (): SavedProducts => ({ slugs: [], openSaved: true });

/** Only stable public slugs and the device-local opening preference are stored. */
export function parseSavedProducts(raw: string | null): SavedProducts {
  if (!raw || raw.length > 200_000) return emptySavedProducts();
  try {
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.slugs)) return emptySavedProducts();
    return {
      slugs: [...new Set<string>(value.slugs.filter((slug: unknown) => typeof slug === "string" && /^[a-z0-9-]{1,200}$/.test(slug)))].slice(0, 2000),
      openSaved: value.openSaved !== false,
    };
  } catch { return emptySavedProducts(); }
}
