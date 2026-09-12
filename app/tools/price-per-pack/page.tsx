/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { PackCalculator } from "@/app/components/PackCalculator";
import styles from "@/app/components/CollectorContent.module.css";
export const metadata: Metadata = { title: "Price-per-pack calculator", description: "Compare two Pokémon purchases by total cost and price per booster pack, including shipping, tax, and discounts.", alternates: { canonical: "/tools/price-per-pack" } };
export default function PricePerPackPage() { return <div className="app-shell app-shell--detail"><SiteHeader compact /><main className={styles.main}><nav className={styles.crumbs} aria-label="Breadcrumb"><a href="/tools">Tools</a></nav><h1>What are you paying per pack?</h1><PackCalculator /><p><a href="/guides/compare-price-per-pack">How to make a fair comparison</a></p></main><SiteFooter /></div>; }
