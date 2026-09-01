import type { Metadata } from "next";
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
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {/* Native navigation avoids the production adapter swallowing client-side route clicks. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Catalog</a><span>/</span><span>Methodology</span>
        </nav>
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
            <h2>Recent-sales snapshots, never pretend live data</h2>
            <p>Sealed Signal never fabricates a quote and never labels a dated observation as live. A quote stores its source, observation time, currency, optional source URL, methodology, and optional sample size. Missing is a valid state.</p>
            <div className="provider-list">
              <a href="https://help.tcgplayer.com/hc/en-us/articles/213588017-TCGplayer-Market-Price" target="_blank" rel="noreferrer"><strong>TCGplayer Market Price</strong><span>Recent completed transactions, averaged across multiple sales with outlier resistance</span><b>Method ↗</b></a>
              <a href="https://www.ebay.com/sch/i.html?_nkw=pokemon+sealed&_sacat=0&LH_Sold=1&LH_Complete=1" target="_blank" rel="noreferrer"><strong>eBay sold review</strong><span>Use only exact sealed-product matches; exclude open, damaged, wrong-quantity, and variant-mismatched listings</span><b>Review ↗</b></a>
            </div>
            <p>When a vetted eBay sold sample is entered, the preferred estimate is a median of multiple recent exact matches. Automated completed-sales retrieval is not connected, so the site does not invent individual eBay comps.</p>
          </article>

          <article className="content-card content-card--wide caution-card">
            <span className="eyebrow">Known limits</span>
            <h2>What this estimate does not know</h2>
            <ul>
              <li>Your actual sell-through time, returns, discounts, or promoted-listing spend.</li>
              <li>Whether a public marketplace snapshot matched the exact regional variant or case size.</li>
              <li>Income tax, storage cost, mileage, labor, or capital tied up while inventory sits.</li>
              <li>Whether retailer inventory is currently available; no restock monitoring is active.</li>
              <li>Gross market spread is market minus retail. “Estimated profit” is different: it subtracts the active marketplace fee, fixed fee, seller shipping, and optional purchase tax.</li>
            </ul>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
