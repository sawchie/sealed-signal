/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve navigation through the Sites adapter. */
import type { Metadata } from "next";
import { InformationPage } from "@/app/components/InformationPage";
export const metadata: Metadata = { title: "Collector tools", description: "Compare sealed Pokémon purchases using your own checkout costs.", alternates: { canonical: "/tools" } };
export default function ToolsPage() { return <InformationPage title="Collector tools"><h2><a href="/tools/price-per-pack">Price-per-pack comparison</a></h2><p>Compare two products using their item prices, pack counts, shipping, tax, and discounts. No account needed.</p><p>Not sure what to include? <a href="/guides/compare-price-per-pack">Read the price-per-pack guide</a>.</p></InformationPage>; }
