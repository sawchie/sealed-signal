"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ProfitAssumptions,
  ProductProfitEstimate,
  ProductWithMarketPrice,
  Recommendation,
} from "@/lib/domain";
import {
  DEFAULT_PROFIT_ASSUMPTIONS,
  estimateProductProfit,
  getRecommendation,
} from "@/lib/domain";
import {
  centsFromInput,
  formatMoney,
  formatPercent,
  formatRelativeDate,
} from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type ViewMode = "grid" | "table";
type QuickFilter =
  | "all"
  | "strong"
  | "double"
  | "etb"
  | "bundle"
  | "tin"
  | "collection";
type SortKey =
  | "opportunity"
  | "profit-desc"
  | "roi-desc"
  | "market-desc"
  | "msrp-asc"
  | "msrp-desc"
  | "release-desc"
  | "updated-desc"
  | "alpha";

type NumericFilters = {
  msrpMin: string;
  msrpMax: string;
  marketMin: string;
  marketMax: string;
  profitMin: string;
  profitMax: string;
  roiMin: string;
  roiMax: string;
};

type EvaluatedProduct = {
  product: ProductWithMarketPrice;
  estimate: ProductProfitEstimate | null;
  recommendation: Recommendation | null;
  customPriceInvalid: boolean;
  searchScore: number;
};

const initialNumericFilters: NumericFilters = {
  msrpMin: "",
  msrpMax: "",
  marketMin: "",
  marketMax: "",
  profitMin: "",
  profitMax: "",
  roiMin: "",
  roiMax: "",
};

const quickFilters: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "All products" },
  { id: "strong", label: "Strong buys" },
  { id: "double", label: "2×+ MSRP" },
  { id: "etb", label: "ETBs" },
  { id: "bundle", label: "Booster bundles" },
  { id: "tin", label: "Tins" },
  { id: "collection", label: "Collection boxes" },
];

const recommendationRank: Record<Recommendation, number> = {
  "STRONG BUY": 4,
  BUY: 3,
  MARGINAL: 2,
  SKIP: 1,
};

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

function scoreSearch(product: ProductWithMarketPrice, rawQuery: string) {
  const query = normalized(rawQuery);
  if (!query) return 1;

  const aliases = product.aliases.join(" ");
  const haystack = normalized(
    [
      product.name,
      product.shortName,
      product.setName,
      product.series,
      product.category,
      aliases,
      product.notes,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (haystack.includes(query)) return 100 - haystack.indexOf(query) / 1000;

  const queryTokens = query.split(" ");
  const haystackTokens = haystack.split(" ");
  let score = 0;
  for (const token of queryTokens) {
    if (haystackTokens.some((candidate) => candidate.startsWith(token))) {
      score += 12;
      continue;
    }
    if (
      token.length >= 4 &&
      haystackTokens.some((candidate) => editDistance(token, candidate) <= 1)
    ) {
      score += 5;
      continue;
    }
    return 0;
  }

  return score;
}

function parseFilter(value: string, multiplier = 100) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

function inRange(
  value: number | null | undefined,
  min: number | null,
  max: number | null,
) {
  if (min === null && max === null) return true;
  if (value === null || value === undefined) return false;
  return (min === null || value >= min) && (max === null || value <= max);
}

function signalClass(recommendation: Recommendation | null) {
  if (!recommendation) return "signal--unpriced";
  return `signal--${recommendation.toLowerCase().replace(" ", "-")}`;
}

function signalLabel(recommendation: Recommendation | null) {
  return recommendation ?? "NEEDS PRICE";
}

function profitClass(value: number | null | undefined) {
  if (value === null || value === undefined) return "metric--muted";
  if (value > 0) return "metric--positive";
  if (value < 0) return "metric--negative";
  return "metric--muted";
}

function CustomPurchaseInput({
  product,
  value,
  invalid,
  onChange,
  compact = false,
}: {
  product: ProductWithMarketPrice;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const helpId = `purchase-help-${product.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <label className={`purchase-input${compact ? " purchase-input--compact" : ""}`}>
      <span>{compact ? "Buy at" : "Shelf price"}</span>
      <span className="purchase-input__field">
        <span aria-hidden="true">$</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            product.msrpCents === null ? "Enter price" : (product.msrpCents / 100).toFixed(2)
          }
          inputMode="decimal"
          aria-label={`Actual purchase price for ${product.name}`}
          aria-invalid={invalid}
          aria-describedby={compact ? undefined : helpId}
        />
      </span>
      {!compact && (
        <small id={helpId} className={invalid ? "form-error" : ""}>
          {invalid ? "Enter a valid positive price" : "Blank uses MSRP"}
        </small>
      )}
    </label>
  );
}

function ProductCard({
  item,
  customPrice,
  onCustomPrice,
  relativeDateReference,
  priority,
}: {
  item: EvaluatedProduct;
  customPrice: string;
  onCustomPrice: (value: string) => void;
  relativeDateReference: string;
  priority?: boolean;
}) {
  const { product, estimate, recommendation, customPriceInvalid } = item;
  const isDouble = estimate?.isAtLeastDoubleMsrp ?? false;

  return (
    <article className="product-card">
      <div className="product-card__visual">
        <ProductImage
          src={product.imageUrl}
          alt={`${product.name} sealed product packaging`}
          category={product.category}
          setName={product.setName}
          productName={product.name}
          priority={priority}
        />
        <span className={`signal ${signalClass(recommendation)}`}>
          <span className="signal__dot" aria-hidden="true" />
          {signalLabel(recommendation)}
        </span>
        {isDouble && <span className="double-badge">2× MSRP</span>}
      </div>

      <div className="product-card__body">
        <div className="product-card__identity">
          <div>
            <span className="eyebrow">
              {product.setName ?? "Mixed set"} · {product.category}
            </span>
            <h2>
              <Link href={`/products/${product.slug}`}>{product.name}</Link>
            </h2>
          </div>
          <Link
            className="detail-arrow"
            href={`/products/${product.slug}`}
            aria-label={`View details for ${product.name}`}
          >
            ↗
          </Link>
        </div>

        <div className="price-pair">
          <div>
            <span>Retail / MSRP</span>
            <strong>{formatMoney(product.msrpCents, product.currency)}</strong>
          </div>
          <div>
            <span>Market estimate</span>
            <strong>{formatMoney(product.marketPrice?.amountCents, product.currency)}</strong>
          </div>
        </div>

        <CustomPurchaseInput
          product={product}
          value={customPrice}
          invalid={customPriceInvalid}
          onChange={onCustomPrice}
        />

        <div className="profit-strip" aria-live="polite" aria-atomic="true">
          <div className="profit-strip__primary">
            <span>Est. profit</span>
            <strong className={profitClass(estimate?.profitCents)}>
              {formatMoney(estimate?.profitCents, product.currency)}
            </strong>
          </div>
          <div>
            <span>ROI</span>
            <strong className={profitClass(estimate?.profitCents)}>
              {formatPercent(estimate?.roiPercent)}
            </strong>
          </div>
          <div>
            <span>Net</span>
            <strong>{formatMoney(estimate?.netProceedsCents, product.currency)}</strong>
          </div>
        </div>

        <div className="product-card__source">
          {product.marketPrice ? (
            <>
              <span className="manual-tag">SNAPSHOT</span>
              {product.marketPrice.source.url ? (
                <a
                  href={product.marketPrice.source.url}
                  target="_blank"
                  rel="noreferrer"
                  title={product.marketPrice.source.label}
                >
                  {product.marketPrice.source.label}
                </a>
              ) : (
                <span>{product.marketPrice.source.label}</span>
              )}
              <span aria-hidden="true">·</span>
              <time dateTime={product.marketPrice.updatedAt}>
                {formatRelativeDate(
                  product.marketPrice.updatedAt,
                  relativeDateReference,
                )}
              </time>
            </>
          ) : (
            <span>No verified market quote on file</span>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductTable({
  items,
  customPrices,
  onCustomPrice,
}: {
  items: EvaluatedProduct[];
  customPrices: Record<string, string>;
  onCustomPrice: (id: string, value: string) => void;
}) {
  return (
    <div className="product-table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">MSRP</th>
            <th scope="col">Market</th>
            <th scope="col">Buy at</th>
            <th scope="col">Net</th>
            <th scope="col">Profit</th>
            <th scope="col">ROI</th>
            <th scope="col">Signal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { product, estimate, recommendation } = item;
            return (
              <tr key={product.id}>
                <td>
                  <div className="table-product">
                    <ProductImage
                      src={product.imageUrl}
                      alt={`${product.name} product packaging`}
                      category={product.category}
                      setName={product.setName}
                      productName={product.name}
                    />
                    <span>
                      <Link href={`/products/${product.slug}`}>{product.name}</Link>
                      <small>
                        {product.setName ?? "Mixed set"} · {product.category}
                      </small>
                    </span>
                  </div>
                </td>
                <td>{formatMoney(product.msrpCents, product.currency)}</td>
                <td>{formatMoney(product.marketPrice?.amountCents, product.currency)}</td>
                <td>
                  <CustomPurchaseInput
                    compact
                    product={product}
                    value={customPrices[product.id] ?? ""}
                    invalid={item.customPriceInvalid}
                    onChange={(value) => onCustomPrice(product.id, value)}
                  />
                </td>
                <td>{formatMoney(estimate?.netProceedsCents, product.currency)}</td>
                <td className={profitClass(estimate?.profitCents)}>
                  {formatMoney(estimate?.profitCents, product.currency)}
                </td>
                <td className={profitClass(estimate?.profitCents)}>
                  {formatPercent(estimate?.roiPercent)}
                </td>
                <td>
                  <span className={`signal signal--small ${signalClass(recommendation)}`}>
                    <span className="signal__dot" aria-hidden="true" />
                    {signalLabel(recommendation)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RangeFields({
  label,
  minKey,
  maxKey,
  filters,
  onChange,
  suffix,
}: {
  label: string;
  minKey: keyof NumericFilters;
  maxKey: keyof NumericFilters;
  filters: NumericFilters;
  onChange: (key: keyof NumericFilters, value: string) => void;
  suffix: "$" | "%";
}) {
  return (
    <fieldset className="range-filter">
      <legend>{label}</legend>
      <label>
        <span className="sr-only">Minimum {label}</span>
        <span>{suffix === "$" ? "$" : ""}</span>
        <input
          value={filters[minKey]}
          onChange={(event) => onChange(minKey, event.target.value)}
          inputMode="decimal"
          placeholder="Min"
        />
        {suffix === "%" && <span>%</span>}
      </label>
      <span aria-hidden="true">–</span>
      <label>
        <span className="sr-only">Maximum {label}</span>
        <span>{suffix === "$" ? "$" : ""}</span>
        <input
          value={filters[maxKey]}
          onChange={(event) => onChange(maxKey, event.target.value)}
          inputMode="decimal"
          placeholder="Max"
        />
        {suffix === "%" && <span>%</span>}
      </label>
    </fieldset>
  );
}

export function CatalogApp({
  initialProducts,
  relativeDateReference,
}: {
  initialProducts: ProductWithMarketPrice[];
  relativeDateReference: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [category, setCategory] = useState("all");
  const [setName, setSetName] = useState("all");
  const [recommendation, setRecommendation] = useState("all");
  const [numericFilters, setNumericFilters] = useState(initialNumericFilters);
  const [sort, setSort] = useState<SortKey>("opportunity");
  const [view, setView] = useState<ViewMode>("grid");
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [assumptions] = useState<ProfitAssumptions>({
    ...DEFAULT_PROFIT_ASSUMPTIONS,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dataMode, setDataMode] = useState<"bundled" | "database">("bundled");
  const filtersRef = useRef<HTMLElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?limit=200", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          products?: ProductWithMarketPrice[];
          data?: ProductWithMarketPrice[];
        };
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const rows = payload.products ?? payload.data ?? [];
        if (rows.length) {
          setProducts(rows.filter((product) => product.active));
          setDataMode("database");
        }
      })
      .catch(() => {
        // The bundled, attributed data remains the deliberate offline fallback.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const keepMobileGrid = () => {
      if (media.matches) setView("grid");
    };
    keepMobileGrid();
    media.addEventListener("change", keepMobileGrid);
    return () => media.removeEventListener("change", keepMobileGrid);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const trigger = filterTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filterCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !filtersRef.current) return;

      const focusable = Array.from(
        filtersRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [filtersOpen]);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );
  const sets = useMemo(
    () =>
      [...new Set(products.map((product) => product.setName).filter(Boolean) as string[])].sort(),
    [products],
  );

  const evaluated = useMemo(() => {
    return products.map<EvaluatedProduct>((product) => {
      const rawCustomPrice = customPrices[product.id] ?? "";
      const parsedCustomPrice = centsFromInput(rawCustomPrice);
      const customPriceInvalid = rawCustomPrice.trim() !== "" && parsedCustomPrice === null;
      let estimate: ProductProfitEstimate | null = null;

      if (!customPriceInvalid) {
        try {
          estimate = estimateProductProfit(
            {
              msrpCents: product.msrpCents,
              marketPriceCents: product.marketPrice?.amountCents ?? null,
              customPurchasePriceCents:
                rawCustomPrice.trim() === "" ? null : parsedCustomPrice,
            },
            assumptions,
          );
        } catch {
          estimate = null;
        }
      }

      return {
        product,
        estimate,
        recommendation: estimate
          ? getRecommendation({ profitCents: estimate.profitCents, roiPercent: estimate.roiPercent })
          : null,
        customPriceInvalid,
        searchScore: scoreSearch(product, query),
      };
    });
  }, [products, customPrices, assumptions, query]);

  const visibleProducts = useMemo(() => {
    const msrpMin = parseFilter(numericFilters.msrpMin);
    const msrpMax = parseFilter(numericFilters.msrpMax);
    const marketMin = parseFilter(numericFilters.marketMin);
    const marketMax = parseFilter(numericFilters.marketMax);
    const profitMin = parseFilter(numericFilters.profitMin);
    const profitMax = parseFilter(numericFilters.profitMax);
    const roiMin = parseFilter(numericFilters.roiMin, 1);
    const roiMax = parseFilter(numericFilters.roiMax, 1);

    const filtered = evaluated.filter((item) => {
      const { product, estimate } = item;
      if (item.searchScore <= 0) return false;
      if (category !== "all" && product.category !== category) return false;
      if (setName !== "all" && product.setName !== setName) return false;
      if (recommendation !== "all" && item.recommendation !== recommendation) return false;

      if (quickFilter === "strong" && item.recommendation !== "STRONG BUY") return false;
      if (quickFilter === "double" && !estimate?.isAtLeastDoubleMsrp) return false;
      if (
        quickFilter === "etb" &&
        product.category !== "Elite Trainer Box" &&
        product.category !== "Pokémon Center Elite Trainer Box"
      )
        return false;
      if (quickFilter === "bundle" && product.category !== "Booster Bundle") return false;
      if (quickFilter === "tin" && !product.category.includes("Tin")) return false;
      if (quickFilter === "collection" && !product.category.includes("Collection")) return false;

      return (
        inRange(product.msrpCents, msrpMin, msrpMax) &&
        inRange(product.marketPrice?.amountCents, marketMin, marketMax) &&
        inRange(estimate?.profitCents, profitMin, profitMax) &&
        inRange(estimate?.roiPercent, roiMin, roiMax)
      );
    });

    return filtered.sort((a, b) => {
      const aEstimate = a.estimate;
      const bEstimate = b.estimate;
      const nullLast = (aValue: number | null | undefined, bValue: number | null | undefined) => {
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return bValue - aValue;
      };

      switch (sort) {
        case "profit-desc":
          return nullLast(aEstimate?.profitCents, bEstimate?.profitCents);
        case "roi-desc":
          return nullLast(aEstimate?.roiPercent, bEstimate?.roiPercent);
        case "market-desc":
          return nullLast(a.product.marketPrice?.amountCents, b.product.marketPrice?.amountCents);
        case "msrp-asc":
          return -nullLast(a.product.msrpCents, b.product.msrpCents);
        case "msrp-desc":
          return nullLast(a.product.msrpCents, b.product.msrpCents);
        case "release-desc":
          return (b.product.releaseDate ?? "").localeCompare(a.product.releaseDate ?? "");
        case "updated-desc":
          return (b.product.marketPrice?.updatedAt ?? "").localeCompare(
            a.product.marketPrice?.updatedAt ?? "",
          );
        case "alpha":
          return a.product.name.localeCompare(b.product.name);
        case "opportunity":
        default: {
          const signalDelta =
            (b.recommendation ? recommendationRank[b.recommendation] : 0) -
            (a.recommendation ? recommendationRank[a.recommendation] : 0);
          if (signalDelta) return signalDelta;
          const profitDelta = nullLast(aEstimate?.profitCents, bEstimate?.profitCents);
          if (profitDelta) return profitDelta;
          return b.searchScore - a.searchScore;
        }
      }
    });
  }, [evaluated, category, setName, recommendation, numericFilters, quickFilter, sort]);

  const clearFilters = () => {
    setQuickFilter("all");
    setCategory("all");
    setSetName("all");
    setRecommendation("all");
    setNumericFilters(initialNumericFilters);
  };

  const hasAdvancedFilters =
    category !== "all" ||
    setName !== "all" ||
    recommendation !== "all" ||
    Object.values(numericFilters).some(Boolean);

  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        <section className="catalog-hero" aria-labelledby="catalog-title">
          <div className="catalog-hero__intro">
            <h1 id="catalog-title">Compare MSRP to resale values.</h1>
            <p>
              Scan sealed Pokémon TCG products, enter your shelf price, and spot the best buys quickly.
            </p>
          </div>
        </section>

        <section className="catalog-tools" aria-label="Catalog controls">
          <label className="catalog-search">
            <span aria-hidden="true" className="catalog-search__icon">⌕</span>
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search “destined etb”, “charizard box”, “151”…'
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
          </label>

          <div className="quick-filter-row" aria-label="Quick filters">
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={quickFilter === filter.id ? "is-active" : ""}
                aria-pressed={quickFilter === filter.id}
                onClick={() => setQuickFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <div className="catalog-layout">
          <aside
            id="catalog-filters"
            ref={filtersRef}
            className={`catalog-sidebar${filtersOpen ? " is-open" : ""}`}
            aria-labelledby="catalog-filters-title"
            role={filtersOpen ? "dialog" : undefined}
            aria-modal={filtersOpen ? true : undefined}
          >
            <div className="sidebar-heading">
              <div>
                <span className="eyebrow">Refine</span>
                <h2 id="catalog-filters-title">Filters</h2>
              </div>
              <button ref={filterCloseRef} className="mobile-only icon-button" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                ×
              </button>
            </div>

            <label className="select-field">
              <span>Product type</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All types</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Pokémon set</span>
              <select value={setName} onChange={(event) => setSetName(event.target.value)}>
                <option value="all">All sets</option>
                {sets.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Recommendation</span>
              <select value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
                <option value="all">All signals</option>
                <option value="STRONG BUY">Strong buy</option>
                <option value="BUY">Buy</option>
                <option value="MARGINAL">Marginal</option>
                <option value="SKIP">Skip</option>
              </select>
            </label>

            <RangeFields
              label="Retail / MSRP"
              minKey="msrpMin"
              maxKey="msrpMax"
              filters={numericFilters}
              onChange={(key, value) => setNumericFilters((current) => ({ ...current, [key]: value }))}
              suffix="$"
            />
            <RangeFields
              label="Market price"
              minKey="marketMin"
              maxKey="marketMax"
              filters={numericFilters}
              onChange={(key, value) => setNumericFilters((current) => ({ ...current, [key]: value }))}
              suffix="$"
            />
            <RangeFields
              label="Estimated profit"
              minKey="profitMin"
              maxKey="profitMax"
              filters={numericFilters}
              onChange={(key, value) => setNumericFilters((current) => ({ ...current, [key]: value }))}
              suffix="$"
            />
            <RangeFields
              label="ROI"
              minKey="roiMin"
              maxKey="roiMax"
              filters={numericFilters}
              onChange={(key, value) => setNumericFilters((current) => ({ ...current, [key]: value }))}
              suffix="%"
            />

            <button className="clear-filters" type="button" onClick={clearFilters} disabled={!hasAdvancedFilters}>
              Reset filters
            </button>
          </aside>

          <section className="catalog-results" aria-labelledby="results-title">
            <div className="results-toolbar">
              <div>
                <h2 id="results-title">
                  {query ? `Results for “${query}”` : "Best resale opportunities"}
                </h2>
                <p aria-live="polite">
                  {visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"} ·{" "}
                  {dataMode === "database" ? "editable catalog" : "manual starter catalog"}
                </p>
              </div>
              <div className="toolbar-actions">
                <button
                  ref={filterTriggerRef}
                  className={`filter-button${hasAdvancedFilters ? " has-filters" : ""}`}
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  aria-expanded={filtersOpen}
                  aria-controls="catalog-filters"
                >
                  Filters {hasAdvancedFilters ? "•" : ""}
                </button>
                <label className="sort-field">
                  <span className="sr-only">Sort products</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                    <option value="opportunity">Best opportunity</option>
                    <option value="profit-desc">Highest estimated profit</option>
                    <option value="roi-desc">Highest ROI</option>
                    <option value="market-desc">Highest market value</option>
                    <option value="msrp-asc">Lowest MSRP</option>
                    <option value="msrp-desc">Highest MSRP</option>
                    <option value="release-desc">Newest release</option>
                    <option value="updated-desc">Recently updated</option>
                    <option value="alpha">Alphabetical</option>
                  </select>
                </label>
                <div className="view-toggle" aria-label="View style">
                  <button
                    type="button"
                    className={view === "grid" ? "is-active" : ""}
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    className={view === "table" ? "is-active" : ""}
                    aria-label="Table view"
                    aria-pressed={view === "table"}
                    onClick={() => setView("table")}
                  >
                    ≡
                  </button>
                </div>
              </div>
            </div>

            {visibleProducts.length ? (
              view === "grid" ? (
                <div className="product-grid">
                  {visibleProducts.map((item, index) => (
                    <ProductCard
                      key={item.product.id}
                      item={item}
                      customPrice={customPrices[item.product.id] ?? ""}
                      onCustomPrice={(value) =>
                        setCustomPrices((current) => ({ ...current, [item.product.id]: value }))
                      }
                      relativeDateReference={relativeDateReference}
                      priority={index < 3}
                    />
                  ))}
                </div>
              ) : (
                <ProductTable
                  items={visibleProducts}
                  customPrices={customPrices}
                  onCustomPrice={(id, value) =>
                    setCustomPrices((current) => ({ ...current, [id]: value }))
                  }
                />
              )
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">⌕</span>
                <h3>No matching sealed products</h3>
                <p>Try a set name, shorthand like “ETB,” or reset your filters.</p>
                <button type="button" className="button button--quiet" onClick={() => { setQuery(""); clearFilters(); }}>
                  Show all products
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="estimate-note" aria-label="Estimate disclaimer">
          <span aria-hidden="true">i</span>
          <p>
            <strong>Decision support, not a promise.</strong> Market values are dated manual snapshots. Net and profit use your active fee profile and exclude income tax.
          </p>
          <Link href="/methodology">View methodology →</Link>
        </section>
      </main>

      <SiteFooter />

      {filtersOpen && <button className="sidebar-backdrop" type="button" tabIndex={-1} aria-hidden="true" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
    </div>
  );
}
