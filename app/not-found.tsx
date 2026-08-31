import { SiteHeader } from "@/app/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <main className="not-found">
        <span>404</span>
        <h1>That sealed product is not in the catalog.</h1>
        <p>Try searching by set, product type, retailer alias, or a shorthand like “ETB.”</p>
        {/* Native navigation avoids the production adapter swallowing client-side route clicks. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="button button--primary" href="/">Search the catalog</a>
      </main>
    </div>
  );
}
