"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductWithMarketPrice, Recommendation } from "@/lib/domain";
import {
  DEFAULT_PROFIT_ASSUMPTIONS,
  calculateRetailComparison,
  estimateProductProfit,
  getRecommendation,
  getRecommendationPresentation,
} from "@/lib/domain";
import { centsFromInput, formatCompactDate, formatMoney, formatPercent } from "@/lib/format";
import { ProductImage } from "./ProductImage";

function signalClass(recommendation: Recommendation | null) {
  if (!recommendation) return "signal--unpriced";
  return `signal--${recommendation.toLowerCase().replace(" ", "-")}`;
}

export function ProductDetailClient({ initialProduct }: { initialProduct: ProductWithMarketPrice }) {
  const [product, setProduct] = useState(initialProduct);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [feeRate, setFeeRate] = useState(
    (DEFAULT_PROFIT_ASSUMPTIONS.sellingPlatformFeeRate * 100).toString(),
  );
  const [fixedFee, setFixedFee] = useState(
    (DEFAULT_PROFIT_ASSUMPTIONS.fixedSellingFeeCents / 100).toFixed(2),
  );
  const [shipping, setShipping] = useState("0.00");
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState("0");

  useEffect(() => {
    fetch(`/api/products/${initialProduct.slug}`, { headers: { accept: "application/json" } })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.product) {
          setProduct({
            ...initialProduct,
            ...(payload.product as ProductWithMarketPrice),
            retailPriceSource:
              (payload.product as ProductWithMarketPrice).retailPriceSource ??
              initialProduct.retailPriceSource,
          });
        }
      })
      .catch(() => {
        // Keep the bundled, source-attributed fallback.
      });
  }, [initialProduct]);

  const actualPurchaseCents = centsFromInput(purchasePrice);
  const purchaseInvalid = purchasePrice.trim() !== "" && actualPurchaseCents === null;

  const estimate = useMemo(() => {
    if (purchaseInvalid) return null;
    try {
      return estimateProductProfit(
        {
          msrpCents: product.msrpCents,
          marketPriceCents: product.marketPrice?.amountCents ?? null,
          customPurchasePriceCents: purchasePrice.trim() ? actualPurchaseCents : null,
        },
        {
          sellingPlatformFeeRate: Math.max(0, Number(feeRate) || 0) / 100,
          fixedSellingFeeCents: Math.max(0, Math.round((Number(fixedFee) || 0) * 100)),
          sellerShippingCostCents: Math.max(0, Math.round((Number(shipping) || 0) * 100)),
          purchaseSalesTaxTreatment: includeTax ? "included-in-cost" : "excluded",
          purchaseSalesTaxRate: Math.max(0, Number(taxRate) || 0) / 100,
        },
      );
    } catch {
      return null;
    }
  }, [product, purchasePrice, actualPurchaseCents, purchaseInvalid, feeRate, fixedFee, shipping, includeTax, taxRate]);

  const recommendation = estimate
    ? getRecommendation({ profitCents: estimate.profitCents, roiPercent: estimate.roiPercent })
    : null;
  const presentation = getRecommendationPresentation(recommendation);
  const profitabilityClass = `profitability--${presentation.tone}`;
  const retailComparison = calculateRetailComparison(
    product.marketPrice?.amountCents ?? null,
    product.msrpCents,
  );

  return (
    <main className="detail-main">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {/* Native navigation avoids the production adapter swallowing client-side route clicks. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Catalog</a>
        <span aria-hidden="true">/</span>
        <span>{product.setName ?? "Mixed set"}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.shortName ?? product.name}</span>
      </nav>

      <section className="detail-hero">
        <div className="detail-visual">
          <ProductImage
            src={product.imageUrl}
            alt={`${product.name} sealed product packaging`}
            category={product.category}
            setName={product.setName}
            productName={product.name}
            priority
          />
        </div>

        <div className="detail-summary">
          <span className="eyebrow">
            {product.series ?? "Pokémon TCG"} · {product.setName ?? "Mixed set"}
          </span>
          <h1>{product.name}</h1>
          <div className="detail-tags">
            <span>{product.category}</span>
            {product.releaseDate && (
              <span>Released {formatCompactDate(product.releaseDate)}</span>
            )}
          </div>

          <dl className="detail-reference-grid" aria-label="Reference prices">
            <div>
              <dt>Retail / MSRP</dt>
              <dd>{formatMoney(product.msrpCents, product.currency)}</dd>
            </div>
            <div>
              <dt>Market snapshot</dt>
              <dd>{formatMoney(product.marketPrice?.amountCents, product.currency)}</dd>
            </div>
          </dl>

          <div className={`detail-signal ${signalClass(recommendation)} ${profitabilityClass}`}>
            <span>
              <small>Buy check</small>
              <strong>{presentation.label}</strong>
            </span>
            <p>
              {recommendation
                ? "Based on both estimated dollar profit and ROI after your active selling costs."
                : "Add the missing purchase or market price to calculate a signal."}
            </p>
          </div>

          <div className="detail-price-input">
            <label>
              <span>Price you are paying</span>
              <span className="purchase-input__field">
                <span aria-hidden="true">$</span>
                <input
                  value={purchasePrice}
                  onChange={(event) => setPurchasePrice(event.target.value)}
                  placeholder={product.msrpCents ? (product.msrpCents / 100).toFixed(2) : "Enter shelf price"}
                  inputMode="decimal"
                  aria-invalid={purchaseInvalid}
                  aria-describedby="detail-purchase-help"
                />
              </span>
            </label>
            <p id="detail-purchase-help" className={purchaseInvalid ? "form-error" : ""}>
              {purchaseInvalid
                ? "Enter a valid positive amount."
                : product.msrpCents
                  ? `Leave blank to use ${formatMoney(product.msrpCents)} retail / MSRP.`
                  : "A purchase price is required because retail / MSRP is unavailable."}
            </p>
          </div>

          <div className="detail-metrics" aria-live="polite" aria-atomic="true">
            <div className="detail-metric detail-metric--profit">
              <span>Estimated profit</span>
              <strong className={profitabilityClass}>
                {formatMoney(estimate?.profitCents, product.currency)}
              </strong>
            </div>
            <div className="detail-metric">
              <span>ROI</span>
              <strong className={profitabilityClass}>{formatPercent(estimate?.roiPercent)}</strong>
            </div>
            <div className="detail-metric">
              <span>Net proceeds</span>
              <strong>{formatMoney(estimate?.netProceedsCents, product.currency)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-grid">
        <section className="detail-panel" aria-labelledby="breakdown-title">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Buy-check math</span>
              <h2 id="breakdown-title">Resale estimate</h2>
            </div>
            <span className="estimate-chip">ESTIMATE</span>
          </div>
          <dl className="calculation-list">
            <div><dt>Market estimate</dt><dd>{formatMoney(product.marketPrice?.amountCents, product.currency)}</dd></div>
            <div><dt>Gross market spread</dt><dd>{formatMoney(retailComparison?.grossSpreadCents, product.currency)}</dd></div>
            <div><dt>Premium / discount vs retail</dt><dd>{formatPercent(retailComparison?.premiumPercent)}</dd></div>
            <div><dt>Percentage selling fee</dt><dd>−{formatMoney(estimate?.percentageSellingFeeCents, product.currency)}</dd></div>
            <div><dt>Fixed selling fee</dt><dd>−{formatMoney(estimate?.fixedSellingFeeCents, product.currency)}</dd></div>
            <div><dt>Seller-paid shipping</dt><dd>−{formatMoney(estimate?.sellerShippingCostCents, product.currency)}</dd></div>
            <div className="calculation-list__subtotal"><dt>Estimated net proceeds</dt><dd>{formatMoney(estimate?.netProceedsCents, product.currency)}</dd></div>
            <div><dt>Purchase price</dt><dd>−{formatMoney(estimate?.purchasePriceCents, product.currency)}</dd></div>
            {includeTax && <div><dt>Estimated purchase tax</dt><dd>−{formatMoney(estimate?.purchaseSalesTaxCents, product.currency)}</dd></div>}
            <div className="calculation-list__total"><dt>Estimated profit</dt><dd>{formatMoney(estimate?.profitCents, product.currency)}</dd></div>
          </dl>

          <details className="assumption-details">
            <summary>Adjust selling assumptions</summary>
            <div className="assumption-grid">
              <label><span>Platform fee</span><span><input value={feeRate} onChange={(event) => setFeeRate(event.target.value)} inputMode="decimal" />%</span></label>
              <label><span>Fixed fee</span><span>$<input value={fixedFee} onChange={(event) => setFixedFee(event.target.value)} inputMode="decimal" /></span></label>
              <label><span>Seller shipping</span><span>$<input value={shipping} onChange={(event) => setShipping(event.target.value)} inputMode="decimal" /></span></label>
              <label className="assumption-checkbox"><input type="checkbox" checked={includeTax} onChange={(event) => setIncludeTax(event.target.checked)} /><span>Add purchase tax</span></label>
              {includeTax && <label><span>Sales-tax rate</span><span><input value={taxRate} onChange={(event) => setTaxRate(event.target.value)} inputMode="decimal" />%</span></label>}
            </div>
          </details>
        </section>

        <aside className="detail-stack">
          <section className="detail-panel data-panel" aria-labelledby="data-title">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Snapshot notes</span>
                <h2 id="data-title">Price data</h2>
              </div>
              <span className="manual-tag">SNAPSHOT</span>
            </div>
            <dl>
              <div><dt>Retail / MSRP</dt><dd>{formatMoney(product.msrpCents, product.currency)}</dd></div>
              <div><dt>Market estimate</dt><dd>{formatMoney(product.marketPrice?.amountCents, product.currency)}</dd></div>
              <div>
                <dt>Market source</dt>
                <dd>
                  {product.marketPrice?.source.url ? (
                    <a href={product.marketPrice.source.url} target="_blank" rel="noreferrer">{product.marketPrice.source.label} ↗</a>
                  ) : product.marketPrice?.source.label ?? "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Retail source</dt>
                <dd>
                  {product.retailPriceSource?.url ? (
                    <a href={product.retailPriceSource.url} target="_blank" rel="noreferrer">{product.retailPriceSource.label} ↗</a>
                  ) : product.retailPriceSource?.label ?? "See product notes"}
                </dd>
              </div>
              <div><dt>Retrieved</dt><dd>{formatCompactDate(product.marketPrice?.updatedAt)}</dd></div>
              <div><dt>Source sample</dt><dd>{product.marketPrice?.sampleSize ? `${product.marketPrice.sampleSize} comparable observations` : "Not supplied"}</dd></div>
            </dl>
            <p>{product.marketPrice?.methodology ?? "Retrieved date records our manual observation; it does not claim the source data was live at that moment."}</p>
          </section>

          <section className="detail-panel product-facts" aria-labelledby="facts-title">
            <div className="panel-heading"><h2 id="facts-title">Product facts</h2></div>
            <dl>
              <div><dt>Set</dt><dd>{product.setName ?? "Mixed / unavailable"}</dd></div>
              <div><dt>Series</dt><dd>{product.series ?? "Unavailable"}</dd></div>
              <div><dt>Category</dt><dd>{product.category}</dd></div>
              <div><dt>Release</dt><dd>{product.releaseDate ? formatCompactDate(product.releaseDate) : "Unavailable"}</dd></div>
            </dl>
            {product.notes && <p>{product.notes}</p>}
          </section>
        </aside>
      </div>

      <section className="future-panel" aria-label="Market-data availability">
        <div>
          <span className="eyebrow">Source honesty</span>
          <h2>Sold-data context without pretend charts</h2>
          <p>Recent-sales-based marketplace estimates are shown when a dependable product match exists. Exact eBay sold comps remain unavailable until a completed-sales source is connected.</p>
        </div>
        <div className="future-slots">
          <span>Price history</span>
          <span>Recent sold listings</span>
          <span>Retail availability</span>
          <span>30 / 90 day averages</span>
        </div>
      </section>
    </main>
  );
}
