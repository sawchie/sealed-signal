import type { Metadata } from "next";
import { publicCatalog } from "@/lib/public-catalog";
import { productFacts } from "@/lib/product-facts";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { PackPlanner } from "@/app/components/PackPlanner";

export const metadata: Metadata = { title: "Pack Planner — what fits your opening budget?", description: "Compare Pokémon sealed formats by packs within your budget, total checkout cost, and money left over. Use sourced counts and enter the prices you find.", alternates: { canonical: "/tools/pack-planner" } };
export const dynamic = "force-dynamic";
export default async function PackPlannerPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const products = (await publicCatalog()).filter(p => p.active && p.setName).map(p => {
    const facts = productFacts(p.id);
    return { id: p.id, slug: p.slug, name: p.name, setName: p.setName!, category: p.category, imageUrl: p.imageUrl,
      packs: facts?.packCount ?? null, factsUrl: facts?.sourceUrl ?? null, promos: facts?.promos ?? [], edition: facts?.edition ?? null,
      retail: p.currency === "USD" ? p.msrpCents : null, market: p.marketPrice?.currency === "USD" ? p.marketPrice.amountCents : null,
      marketDate: p.marketPrice?.updatedAt ?? null, marketProvider: p.marketPrice?.source.label ?? null,
      released: !!p.releaseDate && p.releaseDate <= today };
  });
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><PackPlanner products={products} initialSet={query?.set} today={today} /><SiteFooter /></div>;
}
