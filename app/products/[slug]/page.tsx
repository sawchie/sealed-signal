import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductDetailClient } from "@/app/components/ProductDetailClient";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { getSeedProductBySlug, seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";
import { formatMoney } from "@/lib/format";

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
    ? `market estimate ${formatMoney(product.marketPrice.amountCents)}`
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

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    category: product.category,
    releaseDate: product.releaseDate ?? undefined,
    image: product.imageUrl ?? undefined,
    offers: product.msrpCents
      ? {
          "@type": "Offer",
          priceCurrency: product.currency,
          price: (product.msrpCents / 100).toFixed(2),
          availability: "https://schema.org/OutOfStock",
          description: "Reference retail / MSRP only; retailer availability is not tracked.",
        }
      : undefined,
  };

  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <ProductDetailClient initialProduct={product} />
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
