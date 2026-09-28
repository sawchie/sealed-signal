/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { guides, editorialDate } from "@/lib/guides";
import { editorialProducts } from "@/lib/editorial-products";
import { productFacts } from "@/lib/product-facts";
import { collectorNotes } from "@/data/collector-notes";
import { GuideComparison } from "@/app/components/GuideComparison";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import styles from "@/app/components/CollectorContent.module.css";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find(g => g.slug === slug);
  if (!guide) return { title: "Guide not found" };
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guides/${slug}`, publishedTime: guide.published, modifiedTime: guide.updated }, twitter: { title: guide.title, description: guide.description } };
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
  const products = await editorialProducts(guide.productIds);
  const notes = collectorNotes.filter(n => guide.productIds.includes(n.productId));
  const counts = Object.fromEntries(products.map(p => [p.id, productFacts(p.id)?.packCount ?? null]));
  const structured = [{ "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, datePublished: guide.published, dateModified: guide.updated, author: { "@type": "Organization", name: "PokeScratch Editorial", url: "https://pokescratch.com/about#editorial" }, mainEntityOfPage: `https://pokescratch.com/guides/${slug}` }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Guides", item: "https://pokescratch.com/guides" }, { "@type": "ListItem", position: 2, name: guide.title, item: `https://pokescratch.com/guides/${slug}` }] }];
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><main className={`${styles.main} ${styles.reading}`}><nav className={styles.crumbs} aria-label="Breadcrumb"><a href="/">Catalog</a><span aria-hidden="true">/</span><a href="/guides">Guides</a></nav><article><h1>{guide.title}</h1><div className={styles.meta}>By <a href="/about#editorial">PokeScratch Editorial</a> · Published <time dateTime={guide.published}>{editorialDate(guide.published)}</time> · Updated <time dateTime={guide.updated}>{editorialDate(guide.updated)}</time></div><p>{guide.description}</p>
    <nav className={styles.guideContents} aria-label="In this guide">{guide.sections.map((s, i) => <a key={s.heading} href={`#section-${i}`}>{s.heading}</a>)}<a href="#compare-formats">Compare prices</a></nav>
    {guide.sections.map((section, i) => <section key={section.heading} id={`section-${i}`}><h2>{section.heading}</h2>{section.paragraphs.map(p => <p key={p}><LinkedText text={p} /></p>)}{section.bullets && <ul>{section.bullets.map(b => <li key={b}>{b}</li>)}</ul>}</section>)}
    <GuideComparison products={products} counts={counts} now={new Date().toISOString()} />
    {notes.length > 0 && <section><h2>Specification sources & scope</h2><p>These are researched format comparisons, not firsthand opening tests. Official product specifications are preferred; imported marketplace specifications and gaps are explicitly labeled. No pull-rate, print-run, or future-return claim is made.</p><ul>{notes.map(n => <li key={n.productId}><a href={n.sourceUrl}>{n.sourceLabel}</a></li>)}</ul></section>}
    </article><section className={styles.related} aria-labelledby="continue-title"><h2 id="continue-title">Keep comparing</h2><ul><li><a href="/tools/price-per-pack">Compare two purchases by price per pack</a></li>{products.map(product => <li key={product.id}><a href={`/products/${product.slug}`}>{product.name}</a></li>)}<li><a href={`/guides/${guides[(guides.indexOf(guide) + 1) % guides.length].slug}`}>{guides[(guides.indexOf(guide) + 1) % guides.length].title}</a></li></ul></section></main><SiteFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /></div>;
}
