import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductDetailClient } from "@/app/components/ProductDetailClient";
import { ProductExtras } from "@/app/components/ProductExtras";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { getSeedProductBySlug, seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";
import { formatMoney } from "@/lib/format";
import { productFacts } from "@/lib/product-facts";
import { PriceHistory } from "@/app/components/PriceHistory";
import type { PriceObservation } from "@/lib/price-history";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

/**
 * D1 is authoritative once a row exists. An inactive row is an intentional
 * tombstone and must never fall through to the bundled active seed record.
 * The seed remains the resilient first-run/offline fallback when D1 has no
 * matching row or the binding is unavailable.
 */
const getPublicProductBySlug = cache(async (slug: string) => {
  const bundled = getSeedProductBySlug(slug);
  try {
    const { getProductBySlug } = await import("@/db/repository");
    const persisted = await getProductBySlug(slug, { includeInactive: true });
    return resolvePublicProduct(persisted, bundled);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Received protocol 'cloudflare:'")) {
      console.warn(
        `D1 product lookup unavailable for "${slug}"; using bundled fallback.`,
        message,
      );
    }
  }

  return bundled;
});

export function generateStaticParams() {
  return seedProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const priceText = product.marketPrice
    ? `market snapshot ${formatMoney(product.marketPrice.amountCents)}`
    : "market estimate unavailable";
  return {
    title: `${product.name} Buy Check`,
    description: `${product.name}: retail / MSRP ${formatMoney(product.msrpCents)}, ${priceText}, plus fee-adjusted profit and ROI estimates.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — Collector buy check`,
      description: `Check retail price, market source, estimated selling fees, net proceeds, profit, and ROI.`,
      url: `/products/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) notFound();

  let history: PriceObservation[] = [];
  let historyUnavailable = false;
  try { const { getProductPriceHistory } = await import("@/db/repository"); history = await getProductPriceHistory(product.id); }
  catch { historyUnavailable = true; }
  if (product.marketPrice && !history.some(row => row.observedAt === product.marketPrice!.updatedAt && row.provider === product.marketPrice!.source.id)) history.push({ amountCents: product.marketPrice.amountCents, observedAt: product.marketPrice.updatedAt, source: product.marketPrice.source.label, sourceUrl: product.marketPrice.source.url ?? null, provider: product.marketPrice.source.id, currency: product.marketPrice.currency });

  // Informational buy checks are not purchasable offers or product reviews.
  // Only opt into Product rich results once genuine qualifying data exists.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${product.name} Buy Check`,
    url: new URL(`/products/${product.slug}`, process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokescratch.com").href,
    description: "Retail references, market snapshots, and fee-adjusted resale estimates. Not an in-stock offer.",
    image: product.imageUrl ?? undefined,
  };

  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <ProductDetailClient initialProduct={product} facts={productFacts(product.id)} now={new Date().toISOString()} />
      <div className="detail-history-wrap"><PriceHistory observations={history} currency={product.currency} unavailable={historyUnavailable} /></div>
      <ProductExtras product={product} />
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
