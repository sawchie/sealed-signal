"use client";
import { useEffect, useState } from "react";
import { calculateRetailComparison, DEFAULT_RECOMMENDATION_THRESHOLDS, estimateProductProfit, getRecommendation, getRecommendationPresentation, type ProductWithMarketPrice } from "@/lib/domain";
import { COST_PROFILE_KEY, defaultCostFields, maximumBuyPrice, parseAmount, parseCostProfile, priceFreshness, validateCostFields, type CostFields } from "@/lib/buy-check";
import { safeCatalogReturn } from "@/lib/catalog-state";
import type { ProductFacts } from "@/lib/product-facts";
import { formatCompactDate, formatMoney, formatPercent } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { ProductWatch } from "./ProductWatch";

export function ProductDetailClient({ initialProduct: product, facts, now }: { initialProduct: ProductWithMarketPrice; facts: ProductFacts | null; now: string }) {
  const [purchasePrice, setPurchasePrice] = useState("");
  const [costs, setCosts] = useState<CostFields>(defaultCostFields);
  const [remember, setRemember] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [returnTo, setReturnTo] = useState("/");
  const [targetProfit, setTargetProfit] = useState("10");
  const [targetRoi, setTargetRoi] = useState("20");
  const [salePrice, setSalePrice] = useState("");
  const [imageExpanded, setImageExpanded] = useState(false);
  useEffect(() => {
    // Restore browser-only preferences once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReturnTo(safeCatalogReturn(new URLSearchParams(location.search).get("return")));
    try { const profile = parseCostProfile(localStorage.getItem(COST_PROFILE_KEY)); if (profile) { setCosts(profile); setRemember(true); setProfileMessage("Using your saved selling costs."); } } catch { setProfileMessage("Browser storage is unavailable. Costs apply to this visit only."); }
  }, []);
  const validation = validateCostFields(costs);
  const updateCost = (key: keyof CostFields, value: string | boolean) => {
    const next = { ...costs, [key]: value }; setCosts(next);
    if (remember) {
      if (!validateCostFields(next).assumptions) { setProfileMessage("Correct the highlighted costs before your profile can be updated."); return; }
      try { localStorage.setItem(COST_PROFILE_KEY, JSON.stringify(next)); setProfileMessage("Selling costs updated on this browser."); } catch { setProfileMessage("Could not update saved costs. Your entries still apply to this visit."); }
    }
  };
  const toggleRemember = (checked: boolean) => {
    if (checked && !validation.assumptions) { setProfileMessage("Correct the highlighted costs before saving."); return; }
    try { if (checked) localStorage.setItem(COST_PROFILE_KEY, JSON.stringify(costs)); else localStorage.removeItem(COST_PROFILE_KEY); setRemember(checked); setProfileMessage(checked ? "Selling costs saved on this browser only." : "Saved cost profile removed. Current entries remain until you leave."); }
    catch { setProfileMessage("Browser storage is unavailable. Your entries still apply to this visit."); }
  };
  const purchaseCents = parseAmount(purchasePrice, { positive: true });
  const purchaseInvalid = !!purchasePrice.trim() && purchaseCents === null;
  const customSaleCents = parseAmount(salePrice, { positive: true });
  const saleInvalid = !!salePrice.trim() && customSaleCents === null;
  const expectedSale = salePrice.trim() ? customSaleCents : product.marketPrice?.amountCents ?? null;
  const invalid = purchaseInvalid || saleInvalid || !validation.assumptions;
  const estimate = invalid ? null : estimateProductProfit({ msrpCents: product.msrpCents, marketPriceCents: expectedSale, customPurchasePriceCents: purchasePrice.trim() ? purchaseCents : null }, validation.assumptions!);
  const recommendation = estimate ? getRecommendation({ profitCents: estimate.profitCents, roiPercent: estimate.roiPercent }) : null;
  const presentation = getRecommendationPresentation(recommendation);
  const tone = `profitability--${presentation.tone}`;
  const retailComparison = calculateRetailComparison(product.marketPrice?.amountCents ?? null, product.msrpCents);
  const targetProfitCents = parseAmount(targetProfit);
  const targetRoiRate = parseAmount(targetRoi, { rate: true });
  const buyLimit = validation.assumptions && targetProfitCents !== null && targetRoiRate !== null ? maximumBuyPrice(expectedSale, validation.assumptions, targetProfitCents, targetRoiRate * 100) : null;
  const breakEven = validation.assumptions ? maximumBuyPrice(expectedSale, validation.assumptions, 0, 0) : null;
  const errors = validation.errors;
  const costField = (key: "feeRate" | "fixedFee" | "shipping" | "taxRate", label: string, suffix: string) => <div className="cost-field"><label htmlFor={`cost-${key}`}>{label} ({suffix})</label><input id={`cost-${key}`} value={costs[key]} onChange={e => updateCost(key, e.target.value)} inputMode="decimal" maxLength={14} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} />{errors[key] && <p className="form-error" id={`error-${key}`}>{errors[key]}</p>}</div>;
  const subtract = (cents: number | undefined) => cents === undefined ? "—" : `−${formatMoney(cents, product.currency)}`;
  return <main className="detail-main">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={returnTo}>Back to your results</a><span aria-hidden="true">/</span><span>{product.setName ?? "Mixed set"}</span></nav>
    <section className="detail-hero detail-hero--buy-check">
      <div className={`detail-visual${imageExpanded ? " is-expanded" : ""}`}>
        <ProductImage src={product.imageUrl} alt={`${product.name} sealed product packaging`} category={product.category} setName={product.setName} productName={product.name} priority />
        <button type="button" className="image-size-toggle" aria-expanded={imageExpanded} onClick={() => setImageExpanded(value => !value)}>{imageExpanded ? "Reduce image" : "Enlarge packaging"}</button>
      </div>
      <div className="detail-summary">
        <h1>{product.name}</h1>
        <p className="detail-product-meta">{product.setName ?? "Mixed set"} · {product.category}{facts?.packCount ? ` · ${facts.packCount} packs` : ""}</p>
        <dl className="detail-reference-grid" aria-label="Reference prices"><div><dt>Reference retail</dt><dd>{formatMoney(product.msrpCents, product.currency)}</dd></div><div><dt>Market snapshot</dt><dd>{formatMoney(product.marketPrice?.amountCents, product.currency)}</dd></div></dl>
        <p className="reference-context">Historical MSRP or sourced retail reference—not an in-stock offer. <a href="#price-data">Source and date</a></p>
        <div className="detail-price-input">
          <label htmlFor="buy-price">Price you are paying ($)</label><input id="buy-price" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} inputMode="decimal" maxLength={14} placeholder={product.msrpCents ? (product.msrpCents / 100).toFixed(2) : "Enter shelf price"} aria-invalid={purchaseInvalid} aria-describedby="detail-purchase-help" />
          <p id="detail-purchase-help" className={purchaseInvalid ? "form-error" : ""}>{purchaseInvalid ? "Enter a positive USD amount, with up to two decimals." : purchasePrice.trim() ? "Using your entered purchase price, before purchase tax." : product.msrpCents ? `Reference-price scenario: using ${formatMoney(product.msrpCents)} until you enter your actual price.` : "Enter your actual price; a retail reference is not available."}</p>
        </div>
        <details className="assumption-details buy-costs">
          <summary>Adjust selling costs{invalid ? " — check your inputs" : ""}</summary>
          <div className="assumption-grid">{costField("feeRate", "Platform fee", "%")}{costField("fixedFee", "Fixed fee", "$")}{costField("shipping", "Seller shipping", "$")}<label className="saved-preference"><input type="checkbox" checked={costs.includeTax} onChange={e => updateCost("includeTax", e.target.checked)} />Add purchase tax</label>{costs.includeTax && costField("taxRate", "Sales-tax rate", "%")}</div>
          <label className="saved-preference"><input type="checkbox" checked={remember} onChange={e => toggleRemember(e.target.checked)} />Remember these costs on this browser</label>
          <button className="button button--quiet" type="button" onClick={() => { const defaults = defaultCostFields(); setCosts(defaults); if (remember) { try { localStorage.setItem(COST_PROFILE_KEY, JSON.stringify(defaults)); setProfileMessage("Saved profile reset to site defaults."); } catch { setProfileMessage("Reset for this visit; could not update browser storage."); } } }}>Reset costs to defaults</button>
          <p role="status" className="saved-help">{profileMessage}</p>
        </details>
        <p className="cost-summary">{validation.assumptions ? `${costs.feeRate}% + ${formatMoney(validation.assumptions.fixedSellingFeeCents)} fees · ${formatMoney(validation.assumptions.sellerShippingCostCents)} shipping · ${costs.includeTax ? `${costs.taxRate}% purchase tax` : "purchase tax excluded"}` : "Calculation paused. Correct the selling-cost errors above."}</p>
        <div className={`detail-signal signal--${recommendation?.toLowerCase().replace(" ", "-") ?? "unpriced"} ${tone}`} aria-live="polite">
          <span><small>{purchasePrice.trim() ? "Your price check" : "At reference retail"}{salePrice.trim() ? " · custom resale" : ""}</small><strong>{invalid ? "CHECK INPUTS" : presentation.label}</strong></span>
          <p>{invalid ? "Correct the highlighted input before relying on this estimate." : recommendation ? "Resale classification after the active costs—not a verdict on its value to your collection." : !expectedSale ? "Market estimate unavailable. You can enter your own resale scenario below." : "Enter a purchase price to complete the check."}</p>
        </div>
        <div className="detail-metrics" aria-live="polite" aria-atomic="true"><div className="detail-metric detail-metric--profit"><span>Estimated net profit</span><strong className={tone}>{formatMoney(estimate?.profitCents, product.currency)}</strong></div><div className="detail-metric"><span>ROI after costs</span><strong className={tone}>{formatPercent(estimate?.roiPercent)}</strong></div><div className="detail-metric"><span>Net proceeds</span><strong>{formatMoney(estimate?.netProceedsCents, product.currency)}</strong></div></div>
        <ProductWatch slug={product.slug} name={product.name} marketCents={product.marketPrice?.amountCents ?? null} updatedAt={product.marketPrice?.updatedAt ?? null} now={now} />
      </div>
    </section>
    <div className="detail-grid">
      <div className="detail-stack">
        <section className="detail-panel buy-limit" aria-labelledby="buy-limit-title"><h2 id="buy-limit-title">What’s the most you should pay?</h2><p>Set both your minimum dollar profit and ROI. This limit uses the selling costs above and the expected resale price below; it is not an available retail offer.</p>
          <div className="assumption-grid"><div className="cost-field"><label htmlFor="target-profit">Minimum net profit ($)</label><input id="target-profit" value={targetProfit} onChange={e => setTargetProfit(e.target.value)} inputMode="decimal" maxLength={14} aria-invalid={targetProfitCents === null} aria-describedby={targetProfitCents === null ? "target-profit-error" : undefined} />{targetProfitCents === null && <p id="target-profit-error" className="form-error">Enter a USD amount of zero or more.</p>}</div><div className="cost-field"><label htmlFor="target-roi">Minimum ROI (%)</label><input id="target-roi" value={targetRoi} onChange={e => setTargetRoi(e.target.value)} inputMode="decimal" maxLength={6} aria-invalid={targetRoiRate === null} aria-describedby={targetRoiRate === null ? "target-roi-error" : undefined} />{targetRoiRate === null && <p id="target-roi-error" className="form-error">Enter a percentage from 0 to 100.</p>}</div></div>
          <dl className="buy-limit__result" aria-live="polite"><div><dt>Maximum purchase price, before tax</dt><dd>{formatMoney(buyLimit)}</dd></div><div><dt>Break-even purchase price</dt><dd>{formatMoney(breakEven)}</dd></div></dl>
          {buyLimit === null && <p>No qualifying positive purchase price can be calculated. Check your targets, costs and resale estimate.</p>}
          <details><summary>Try a different resale price</summary><p>This changes your scenario only, never the catalog’s market snapshot. Try a lower resale price to test the downside.</p><label htmlFor="expected-sale">Expected resale price ($)</label><input id="expected-sale" inputMode="decimal" maxLength={14} value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder={product.marketPrice ? (product.marketPrice.amountCents / 100).toFixed(2) : "Your estimate"} aria-invalid={saleInvalid} aria-describedby="sale-help" /><p id="sale-help" className={saleInvalid ? "form-error" : ""}>{saleInvalid ? "Enter a positive USD amount, with up to two decimals." : "Leave blank to use the market snapshot."}</p></details>
        </section>
        <section className="detail-panel" aria-labelledby="breakdown-title"><h2 id="breakdown-title">Resale estimate</h2><dl className="calculation-list">
          <div><dt>{salePrice.trim() ? "Your expected resale price" : "Market estimate"}</dt><dd>{formatMoney(expectedSale)}</dd></div><div><dt>Gross market spread vs reference</dt><dd>{formatMoney(retailComparison?.grossSpreadCents)}</dd></div><div><dt>Premium / discount vs reference</dt><dd>{formatPercent(retailComparison?.premiumPercent)}</dd></div>
          <div><dt>Percentage selling fee</dt><dd>{subtract(estimate?.percentageSellingFeeCents)}</dd></div><div><dt>Fixed selling fee</dt><dd>{subtract(estimate?.fixedSellingFeeCents)}</dd></div><div><dt>Seller-paid shipping</dt><dd>{subtract(estimate?.sellerShippingCostCents)}</dd></div><div className="calculation-list__subtotal"><dt>Net proceeds</dt><dd>{formatMoney(estimate?.netProceedsCents)}</dd></div><div><dt>Purchase price</dt><dd>{subtract(estimate?.purchasePriceCents)}</dd></div>{costs.includeTax && <div><dt>Purchase tax</dt><dd>{subtract(estimate?.purchaseSalesTaxCents)}</dd></div>}<div className="calculation-list__total"><dt>Estimated net profit</dt><dd>{formatMoney(estimate?.profitCents)}</dd></div>
        </dl><details><summary>How buying labels work</summary><p>Both thresholds must be met: {([['Strong Buy', 'strongBuy'], ['Buy', 'buy'], ['Fair', 'marginal']] as const).map(([label, key]) => `${label} ≥ ${formatMoney(DEFAULT_RECOMMENDATION_THRESHOLDS[key].minProfitCents, product.currency)} net profit and ${DEFAULT_RECOMMENDATION_THRESHOLDS[key].minRoiPercent}% ROI`).join('; ')}. Bad Buy is below those thresholds and can still mean a small positive profit. ROI is net profit divided by purchase cost including tax when enabled. These are estimates, not guaranteed sale prices or returns.</p></details></section>
      </div>
      <aside className="detail-stack">
        <section id="price-data" className="detail-panel data-panel" aria-labelledby="data-title"><h2 id="data-title">Price data</h2><p>{priceFreshness(product.marketPrice?.updatedAt, now)} · USD · sealed product</p><dl>
          <div><dt>Reference retail</dt><dd>{formatMoney(product.msrpCents)}</dd></div><div><dt>Market snapshot</dt><dd>{formatMoney(product.marketPrice?.amountCents)}</dd></div>
          <div><dt>Market source</dt><dd>{product.marketPrice?.source.url ? <a href={product.marketPrice.source.url} target="_blank" rel="noreferrer">{product.marketPrice.source.label}</a> : product.marketPrice?.source.label ?? "Unavailable"}</dd></div>
          <div><dt>Retail source</dt><dd>{product.retailPriceSource?.url ? <a href={product.retailPriceSource.url} target="_blank" rel="noreferrer">{product.retailPriceSource.label}</a> : product.retailPriceSource?.label ?? "Original reference; direct source not recorded"}</dd></div>
          <div><dt>Snapshot updated</dt><dd>{formatCompactDate(product.marketPrice?.updatedAt)}</dd></div><div><dt>Comparable sales sample</dt><dd>{product.marketPrice?.sampleSize ? `${product.marketPrice.sampleSize} observations` : "Not supplied by this snapshot"}</dd></div>
        </dl><p>A provider refresh date is not the date of the last sale. Retail stock, sales volume and individual eBay sold listings are not verified here.</p>{product.marketPrice?.methodology && <p>{product.marketPrice.methodology}</p>}</section>
        <section className="detail-panel product-facts" aria-labelledby="facts-title"><h2 id="facts-title">Inside this product</h2><dl>
          <div><dt>Set</dt><dd>{product.setName ?? "Mixed / unknown"}</dd></div><div><dt>Series</dt><dd>{product.series ?? "Unknown"}</dd></div><div><dt>Category</dt><dd>{product.category}</dd></div><div><dt>Release</dt><dd>{formatCompactDate(product.releaseDate ?? facts?.releaseDate)}</dd></div>
          <div><dt>Booster packs</dt><dd>{facts?.packCount ?? "Not verified"}</dd></div><div><dt>Edition</dt><dd>{facts?.edition ?? "See exact product name"}</dd></div><div><dt>Language</dt><dd>{facts?.language ?? "Not independently verified"}</dd></div>{facts && <div><dt>TCGplayer product ID</dt><dd>{facts.sourceProductId}</dd></div>}
          {facts?.upc && <div><dt>UPC / barcode identifier</dt><dd>{facts.upc}</dd></div>}
        </dl>{!!facts?.promos.length && <><h3>Promo cards</h3><ul>{facts.promos.map((promo, index) => <li key={index}>{promo}</li>)}</ul></>}{facts && <p><a href={facts.sourceUrl} target="_blank" rel="noreferrer">{facts.sourceLabel}</a>. Contents are for this exact listing; assortment can vary. Unverified facts are not assumed.</p>}
          <a className="button button--secondary" href={`/tools/price-per-pack?product=${encodeURIComponent(product.slug)}`}>Compare this product’s pack cost</a>{product.notes && <p>{product.notes}</p>}
        </section>
      </aside>
    </div>
  </main>;
}
