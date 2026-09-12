/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import guides from "@/data/guides.json";
import { seedProducts } from "@/data/products";
import { resolvePublicProduct } from "@/lib/catalog-resolution";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import styles from "@/app/components/CollectorContent.module.css";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find(g => g.slug === slug);
  if (!guide) return { title: "Guide not found" };
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guides/${slug}`, publishedTime: guide.published, modifiedTime: guide.published }, twitter: { title: guide.title, description: guide.description } };
}
function LinkedText({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\]\(https:\/\/[^)]+\))/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    return link ? <a key={index} href={link[2]}>{link[1]}</a> : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find(g => g.slug === slug);
  if (!guide) notFound();
  const productIds = slug === "pokemon-center-etb-vs-regular" ? ["tcg-503313", "151-pc-etb"] : ["journey-together-booster-bundle", "tcg-503313"];
  const candidates = productIds.flatMap(id => { const product = seedProducts.find(p => p.id === id); return product ? [product] : []; });
  const products = (await Promise.all(candidates.map(async product => {
    try { const { getProductBySlug } = await import("@/db/repository"); return resolvePublicProduct(await getProductBySlug(product.slug, { includeInactive: true }), product); } catch { return product; }
  }))).filter(p => p !== null);
  const structured = [{ "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, datePublished: guide.published, dateModified: guide.published, author: { "@type": "Organization", name: "PokeScratch", url: "https://pokescratch.com/about" }, mainEntityOfPage: `https://pokescratch.com/guides/${slug}` }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Guides", item: "https://pokescratch.com/guides" }, { "@type": "ListItem", position: 2, name: guide.title, item: `https://pokescratch.com/guides/${slug}` }] }];
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><main className={`${styles.main} ${styles.reading}`}><nav className={styles.crumbs} aria-label="Breadcrumb"><a href="/">Catalog</a><span aria-hidden="true">/</span><a href="/guides">Guides</a></nav><article><h1>{guide.title}</h1><div className={styles.meta}>By PokeScratch · Published <time dateTime={guide.published}>September 12, 2026</time></div>{guide.paragraphs.map((paragraph, index) => <Fragment key={index}>{index % 2 === 0 && <h2>{guide.sectionHeadings[Math.floor(index / 2)]}</h2>}<p><LinkedText text={paragraph} /></p></Fragment>)}</article><section className={styles.related} aria-labelledby="continue-title"><h2 id="continue-title">Keep comparing</h2><ul><li><a href="/tools/price-per-pack">Compare two purchases by price per pack</a></li>{products.slice(0, 2).map(product => <li key={product.id}><a href={`/products/${product.slug}`}>{product.name}</a></li>)}<li><a href={`/guides/${guides[(guides.indexOf(guide) + 1) % guides.length].slug}`}>{guides[(guides.indexOf(guide) + 1) % guides.length].title}</a></li></ul></section></main><SiteFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /></div>;
}
