import facts from "../data/product-facts.json";
export type ProductFacts = { sourceProductId: number; sourceUrl: string; sourceLabel: string; packCount: number | null; promos: string[]; language: string | null; edition: string | null; releaseDate?: string; upc?: string };
export function productFacts(id: string): ProductFacts | null { return (facts as Record<string, ProductFacts>)[id] ?? null; }
