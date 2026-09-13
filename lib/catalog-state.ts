export const BROWSE_SESSION_KEY = "pokescratch:browse:v1";
export const NUMERIC_KEYS = ["msrpMin", "msrpMax", "marketMin", "marketMax", "profitMin", "profitMax", "roiMin", "roiMax"] as const;
export const SORT_KEYS = ["relevance", "opportunity", "profit-desc", "roi-desc", "market-desc", "msrp-asc", "msrp-desc", "release-desc", "updated-desc", "alpha"] as const;
export type CatalogState = { query: string; category: string; setName: string; release?: string; recommendation: string; sort: string; view: "grid" | "table"; savedOnly: boolean; count: number; numeric: Record<typeof NUMERIC_KEYS[number], string> };
export function readCatalogState(search: string): CatalogState {
  const p = new URLSearchParams(search);
  const count = Number(p.get("count"));
  return {
    query: (p.get("q") ?? "").slice(0, 200), category: (p.get("type") ?? "all").slice(0, 100), setName: (p.get("set") ?? "all").slice(0, 150),
    release: ["upcoming", "released"].includes(p.get("release") ?? "") ? p.get("release")! : "all",
    recommendation: ["STRONG BUY", "BUY", "MARGINAL", "SKIP"].includes(p.get("signal") ?? "") ? p.get("signal")! : "all",
    sort: SORT_KEYS.includes(p.get("sort") as typeof SORT_KEYS[number]) ? p.get("sort")! : "relevance",
    view: p.get("view") === "table" ? "table" : "grid", savedOnly: p.get("list") === "saved",
    count: Number.isSafeInteger(count) && count >= 48 && count <= 5000 ? count : 48,
    numeric: Object.fromEntries(NUMERIC_KEYS.map(key => [key, /^-?\d*(?:\.\d{0,2})?$/.test(p.get(key) ?? "") ? (p.get(key) ?? "").slice(0, 12) : ""])) as CatalogState["numeric"],
  };
}
export function writeCatalogState(state: CatalogState): string {
  const p = new URLSearchParams();
  if (state.query) p.set("q", state.query);
  if (state.category !== "all") p.set("type", state.category);
  if (state.setName !== "all") p.set("set", state.setName);
  if (state.release && state.release !== "all") p.set("release", state.release);
  if (state.recommendation !== "all") p.set("signal", state.recommendation);
  if (state.sort !== "relevance") p.set("sort", state.sort);
  if (state.view !== "grid") p.set("view", state.view);
  p.set("list", state.savedOnly ? "saved" : "all");
  if (state.count > 48) p.set("count", String(state.count));
  for (const key of NUMERIC_KEYS) if (state.numeric[key]) p.set(key, state.numeric[key]);
  return `/?${p}`;
}
export function categoryMatches(category: string, selection: string): boolean {
  if (selection === "all") return true;
  if (selection === "group:etb") return ["Elite Trainer Box", "Pokémon Center Elite Trainer Box"].includes(category);
  if (selection === "group:tin") return category.includes("Tin");
  if (selection === "group:collection") return category.includes("Collection");
  return category === selection;
}
export function safeCatalogReturn(raw: string | null): string {
  return raw && raw.length < 4000 && (raw === "/" || raw === "/collection" || raw.startsWith("/?")) ? raw : "/";
}
