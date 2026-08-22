import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <main className="not-found">
        <span>404</span>
        <h1>That sealed product is not in the catalog.</h1>
        <p>Try searching by set, product type, retailer alias, or a shorthand like “ETB.”</p>
        <Link className="button button--primary" href="/">Search the catalog</Link>
      </main>
    </div>
  );
}

