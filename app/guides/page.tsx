import type { Metadata } from "next";
import guides from "@/data/guides.json";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import styles from "@/app/components/CollectorContent.module.css";
export const metadata: Metadata = { title: "Collector guides", description: "Practical guides to sealed Pokémon products, editions, and purchase comparisons.", alternates: { canonical: "/guides" } };
export default function GuidesPage() {
  return <div className="app-shell app-shell--detail"><SiteHeader compact /><main className={styles.main}><h1>Know the box before you buy.</h1><p className={styles.intro}>Collector guides for choosing the right edition, comparing checkout costs, and checking a sealed listing.</p><ul className={styles.list}>{guides.map(guide => <li key={guide.slug}><a href={`/guides/${guide.slug}`}>{guide.title}</a><p>{guide.description}</p><span className={styles.topic}>{guide.topic}</span></li>)}</ul><p>Comparing packs to open? <a href="/tools/price-per-pack">Use the price-per-pack calculator</a>.</p></main><SiteFooter /></div>;
}
