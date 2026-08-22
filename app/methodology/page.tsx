import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { DEFAULT_RECOMMENDATION_THRESHOLDS } from "@/lib/domain";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pricing & Recommendation Methodology",
  description: "How Sealed Signal calculates estimated fees, net proceeds, profit, ROI, and resale recommendations.",
  alternates: { canonical: "/methodology" },
  openGraph: { url: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <main className="content-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Catalog</Link><span>/</span><span>Methodology</span></nav>
        <header className="content-hero">
          <span className="hero-kicker"><span className="status-pulse" /> Transparent by default</span>
          <h1>Every signal should be explainable.</h1>
          <p>Sealed Signal keeps source data, calculation assumptions, and recommendation thresholds separate so you can inspect—and replace—each one.</p>
        </header>

        <div className="content-grid">
          <article className="content-card content-card--wide">
            <span className="eyebrow">Core calculation</span>
            <h2>Profit is more than market minus MSRP</h2>
            <div className="formula-block" aria-label="Profit formulas">
              <code>selling fees = market price × fee rate + fixed fee</code>
              <code>net proceeds = market price − fees − seller shipping</code>
              <code>profit = net proceeds − purchase cost − purchase tax</code>
              <code>ROI = profit ÷ acquisition cost × 100</code>
            </div>
            <p>The default purchase price is retail / MSRP. Entering the actual shelf price immediately replaces that assumption. All stored currency amounts use integer cents.</p>
          </article>

          <article className="content-card">
            <span className="eyebrow">Default profile</span>
            <h2>Editable selling costs</h2>
            <dl className="method-list">
              <div><dt>Platform fee</dt><dd>13.25%</dd></div>
              <div><dt>Fixed fee</dt><dd>$0.30</dd></div>
              <div><dt>Seller shipping</dt><dd>$0.00</dd></div>
              <div><dt>Purchase tax</dt><dd>Excluded</dd></div>
            </dl>
            <p>These are a generic starting profile, not a claim about any specific marketplace. Adjust them to match where and how you sell.</p>
          </article>

          <article className="content-card">
            <span className="eyebrow">Recommendation engine</span>
            <h2>Dollar profit and ROI must both clear the bar</h2>
            <dl className="method-list">
              <div><dt>Strong buy</dt><dd>{formatMoney(DEFAULT_RECOMMENDATION_THRESHOLDS.strongBuy.minProfitCents)} + {DEFAULT_RECOMMENDATION_THRESHOLDS.strongBuy.minRoiPercent}%</dd></div>
              <div><dt>Buy</dt><dd>{formatMoney(DEFAULT_RECOMMENDATION_THRESHOLDS.buy.minProfitCents)} + {DEFAULT_RECOMMENDATION_THRESHOLDS.buy.minRoiPercent}%</dd></div>
              <div><dt>Marginal</dt><dd>{formatMoney(DEFAULT_RECOMMENDATION_THRESHOLDS.marginal.minProfitCents)} + {DEFAULT_RECOMMENDATION_THRESHOLDS.marginal.minRoiPercent}%</dd></div>
              <div><dt>Skip</dt><dd>Anything below</dd></div>
            </dl>
            <p>This prevents a tiny-dollar flip from looking attractive just because its percentage return is high.</p>
          </article>

          <article className="content-card content-card--wide">
            <span className="eyebrow">Market data integrity</span>
            <h2>Manual snapshots today; licensed providers tomorrow</h2>
            <p>V1 never fabricates a quote and never labels a stale or manual value as live. A quote stores source, retrieval time, currency, optional source URL, and optional sample size. Missing is a valid state.</p>
            <div className="provider-list">
              <a href="https://justtcg.com/docs/quickstart" target="_blank" rel="noreferrer"><strong>JustTCG</strong><span>Best current candidate after sealed-SKU coverage testing</span><b>Evaluate ↗</b></a>
              <a href="https://docs.tcgplayer.com/docs/getting-started" target="_blank" rel="noreferrer"><strong>TCGplayer</strong><span>Useful only with existing approved API credentials</span><b>Docs ↗</b></a>
              <a href="https://www.pricecharting.com/api-documentation" target="_blank" rel="noreferrer"><strong>PriceCharting</strong><span>Paid fallback; sealed coverage must be verified</span><b>Docs ↗</b></a>
              <a href="https://developer.ebay.com/api-docs/buy/api-browse.html" target="_blank" rel="noreferrer"><strong>eBay Browse</strong><span>Active asks for context, not completed-sale market value</span><b>Docs ↗</b></a>
            </div>
          </article>

          <article className="content-card content-card--wide">
            <span className="eyebrow">Product imagery</span>
            <h2>Authorized product photos, stored locally</h2>
            <p>
              Seeded products use locally stored TCGplayer catalog imagery under Sealed Signal&apos;s written
              authorization. Each asset is mapped to its TCGplayer catalog product ID, and the illustrated
              reference remains available when a future product has no rights-cleared image.
            </p>
          </article>

          <article className="content-card content-card--wide caution-card">
            <span className="eyebrow">Known limits</span>
            <h2>What this estimate does not know</h2>
            <ul>
              <li>Your actual sell-through time, returns, discounts, or promoted-listing spend.</li>
              <li>Whether a public marketplace snapshot matched the exact regional variant or case size.</li>
              <li>Income tax, storage cost, mileage, labor, or capital tied up while inventory sits.</li>
              <li>Whether retailer inventory is currently available; no restock monitoring is active.</li>
            </ul>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
