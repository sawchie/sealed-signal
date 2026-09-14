"use client";

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
  getRecommendationPresentation,
  RECOMMENDATIONS,
} from "@/lib/domain";
import {
  formatMoney,
} from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SaveHeart, HeartIcon } from "./SaveHeart";
import { SAVED_PRODUCTS_KEY, emptySavedProducts, parseSavedProducts, type SavedProducts } from "@/lib/saved-products";
import { BROWSE_SESSION_KEY, categoryMatches, readCatalogState, writeCatalogState } from "@/lib/catalog-state";
import { priceFreshness } from "@/lib/buy-check";
import { WatchAlerts } from "./WatchAlerts";
import { productRelease, releaseMatches } from "@/lib/product-release";
import { AddToCollection } from "./AddToCollection";
import { collectionProduct } from "@/lib/collection-product";

type ViewMode = "grid" | "table";
type QuickFilter =
  | "all"
  | "box"
  | "etb"
  | "bundle"
  | "tin"
  | "collection";
type SortKey =
  | "relevance"
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
  searchScore: number;
  release: ReturnType<typeof productRelease>;
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
  { id: "all", label: "All types" },
  { id: "box", label: "Booster boxes" },
  { id: "etb", label: "ETBs" },
  { id: "bundle", label: "Booster bundles" },
  { id: "tin", label: "Tins" },
  { id: "collection", label: "Collection boxes" },
];
const quickCategories: Record<QuickFilter, string> = { all: "all", box: "Booster Box", etb: "group:etb", bundle: "Booster Bundle", tin: "group:tin", collection: "group:collection" };

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
  return getRecommendationPresentation(recommendation).label;
}

function recommendationToneClass(recommendation: Recommendation | null) {
  return `profitability--${getRecommendationPresentation(recommendation).tone}`;
}

function ProductCard({
  item,
  priority,
  saved,
  onToggle,
  returnTo,
  packCount,
}: {
  item: EvaluatedProduct;
  priority?: boolean;
  saved: boolean;
  onToggle: () => void;
  returnTo: string;
  packCount: number | null;
}) {
  const { product, recommendation } = item;

  return (
    <article className={`product-card ${recommendationToneClass(recommendation)}${item.release.upcoming ? " product-card--upcoming" : ""}`}>
    <SaveHeart name={product.name} saved={saved} onToggle={onToggle} />
    <AddToCollection compact product={collectionProduct(product, packCount)} />
    <a className="product-card__link"
      href={`/products/${product.slug}?return=${encodeURIComponent(returnTo)}`}
      aria-label={`Open details for ${product.name}`}
    >
      <div className="product-card__visual">
        <ProductImage
          src={product.imageUrl}
          alt={`${product.name} sealed product packaging`}
          category={product.category}
          setName={product.setName}
          productName={product.name}
          priority={priority}
        />
      </div>

      <div className="product-card__body">
        <span className={`signal product-card__signal ${signalClass(recommendation)}`}>
          <span className="signal__dot" aria-hidden="true" />
          {item.release.label ?? signalLabel(recommendation)}
        </span>
        <div className="product-card__identity">
          <div>
            <h2>{product.name}</h2>
            {product.setName && !product.name.toLowerCase().includes(product.setName.toLowerCase()) && <p className="product-card__metadata">{product.setName}</p>}
          </div>
          <span className="detail-arrow" aria-hidden="true">
            ↗
          </span>
        </div>

        <div className="price-pair">
          <div>
            <span>Reference retail</span>
            <strong>{product.msrpCents === null && item.release.upcoming ? "TBD" : formatMoney(product.msrpCents, product.currency)}</strong>
          </div>
          <div className="price-pair__market">
            <span>{item.release.upcoming ? "Presale market" : "Market estimate"}</span>
            <strong>
              {product.marketPrice
                ? formatMoney(product.marketPrice.amountCents, product.currency)
                : item.release.upcoming ? "TBD" : "Unavailable"}
            </strong>
          </div>
        </div>
      </div>
    </a>
    </article>
  );
}

function ProductTable({
  items,
  savedSlugs,
  onToggle,
  returnTo,
  showMetrics,
  now,
  packCounts,
}: {
  items: EvaluatedProduct[];
  savedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  returnTo: string;
  showMetrics: boolean;
  now: string;
  packCounts: Record<string, number | null>;
}) {
  return (
    <div className="product-table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Reference retail</th>
            <th scope="col">Market</th>
            {showMetrics && <><th scope="col">Net profit at reference</th><th scope="col">ROI</th><th scope="col">Price age</th></>}
            <th scope="col">Signal</th>
            <th scope="col"><span className="sr-only">Save and details</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { product, recommendation } = item;
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
                      <a href={`/products/${product.slug}?return=${encodeURIComponent(returnTo)}`}>{product.name}</a>
                      <small>
                        {product.setName ?? "Mixed set"} · {product.category}
                      </small>
                    </span>
                  </div>
                </td>
                <td>{product.msrpCents === null && item.release.upcoming ? "TBD" : formatMoney(product.msrpCents, product.currency)}</td>
                <td>{product.marketPrice ? formatMoney(product.marketPrice.amountCents, product.currency) : item.release.upcoming ? "TBD" : "Unavailable"}{item.release.upcoming && <small className="presale-caption">Presale estimate</small>}</td>
                {showMetrics && <><td>{formatMoney(item.estimate?.profitCents, product.currency)}</td><td>{item.estimate ? `${item.estimate.roiPercent}%` : "Unavailable"}</td><td>{priceFreshness(product.marketPrice?.updatedAt, now)}</td></>}
                <td>
                  <span className={`signal signal--small ${signalClass(recommendation)}`}>
                    <span className="signal__dot" aria-hidden="true" />
                    {item.release.label ?? signalLabel(recommendation)}
                  </span>
                </td>
                <td><div className="table-save-actions"><SaveHeart name={product.name} saved={savedSlugs.has(product.slug)} onToggle={() => onToggle(product.slug)} /><AddToCollection compact product={collectionProduct(product, packCounts[product.id] ?? null)} /><a href={`/products/${product.slug}?return=${encodeURIComponent(returnTo)}`} aria-label={`Open details for ${product.name}`}>Open ↗</a></div></td>
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
  now,
  packCounts,
}: {
  initialProducts: ProductWithMarketPrice[];
  now: string;
  packCounts: Record<string, number | null>;
}) {
  const products = initialProducts;
  const [saved, setSaved] = useState<SavedProducts>(emptySavedProducts);
  const [savedOnly, setSavedOnly] = useState(false);
  const savedSwitchRef = useRef<HTMLButtonElement>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const savedSlugs = useMemo(() => new Set(saved.slugs), [saved.slugs]);
  const savedCount = products.filter(product => savedSlugs.has(product.slug)).length;
  const catalogPriceUpdatedAt = products.reduce((latest, product) => product.marketPrice && product.marketPrice.updatedAt > latest ? product.marketPrice.updatedAt : latest, "");
  useEffect(() => {
    try {
      const stored = parseSavedProducts(localStorage.getItem(SAVED_PRODUCTS_KEY));
      // Browser preferences are unavailable during SSR; restore once after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(stored);
      if (!new URLSearchParams(window.location.search).has("list") && !window.location.search) setSavedOnly(stored.openSaved && stored.slugs.some(slug => initialProducts.some(product => product.slug === slug)));
    } catch { setSaveMessage("Browser storage is unavailable. Your saved items will last only for this visit."); }
    const sync = (event: StorageEvent) => {
      if (event.key === SAVED_PRODUCTS_KEY || event.key === null) setSaved(parseSavedProducts(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [initialProducts]);
  const persistSaved = (next: SavedProducts, message: string) => {
    setSaved(next);
    try { localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify(next)); setSaveMessage(message); }
    catch { setSaveMessage("Saved for this visit only. Browser storage is unavailable."); }
  };
  const toggleSaved = (slug: string) => {
    let current = saved;
    try { const raw = localStorage.getItem(SAVED_PRODUCTS_KEY); if (raw !== null) current = parseSavedProducts(raw); } catch { /* In-memory fallback. */ }
    const removing = current.slugs.includes(slug);
    if (!removing) {
      try { if (!localStorage.getItem("pokescratch:saved-notice:v1")) { setShowSaveNotice(true); localStorage.setItem("pokescratch:saved-notice:v1", "shown"); } } catch { /* The existing storage-failure message explains visit-only saving. */ }
    }
    if (removing && savedOnly) savedSwitchRef.current?.focus();
    persistSaved({ ...current, slugs: removing ? current.slugs.filter(value => value !== slug) : [...current.slugs, slug] }, removing ? "Removed from saved items." : "Saved on this device.");
  };
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const quickFilter = quickFilters.find(filter => quickCategories[filter.id] === category)?.id;
  const [setName, setSetName] = useState("all");
  const [release, setRelease] = useState("all");
  const [recommendation, setRecommendation] = useState("all");
  const [numericFilters, setNumericFilters] = useState(initialNumericFilters);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [assumptions] = useState<ProfitAssumptions>({
    ...DEFAULT_PROFIT_ASSUMPTIONS,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState({ key: "", count: 48 });
  const [browseReady, setBrowseReady] = useState(false);
  const [showTableMetrics, setShowTableMetrics] = useState(false);
  const restoreScroll = useRef<number | null>(null);
  useEffect(() => {
    const restore = () => {
      const state = readCatalogState(window.location.search);
      setQuery(state.query); setCategory(state.category); setSetName(state.setName); setRecommendation(state.recommendation); setRelease(state.release ?? "all");
      setNumericFilters(state.numeric); setSort(state.sort as SortKey); setView(window.matchMedia("(max-width: 680px)").matches ? "grid" : state.view);
      if (window.location.search) setSavedOnly(state.savedOnly);
      setPageSize({ key: JSON.stringify([state.query, state.category, state.setName, state.recommendation, state.numeric, state.sort, state.savedOnly, state.release ?? "all"]), count: state.count });
      try { const previous = JSON.parse(sessionStorage.getItem(BROWSE_SESSION_KEY) ?? "null"); if (previous?.url === `${location.pathname}${location.search}` && Number.isFinite(previous.y)) restoreScroll.current = Math.max(0, previous.y); } catch { /* URL state still works without storage. */ }
      setBrowseReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const filtersRef = useRef<HTMLElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

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
      const release = productRelease(product, now);
      let estimate: ProductProfitEstimate | null = null;

      try {
        estimate = estimateProductProfit(
          {
            msrpCents: product.msrpCents,
            marketPriceCents: product.marketPrice?.amountCents ?? null,
          },
          assumptions,
        );
      } catch {
        estimate = null;
      }

      return {
        product,
        release,
        estimate,
        recommendation: estimate && !release.upcoming
          ? getRecommendation({ profitCents: estimate.profitCents, roiPercent: estimate.roiPercent })
          : null,
        searchScore: scoreSearch(product, query),
      };
    });
  }, [products, assumptions, query, now]);

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
      if (savedOnly && !savedSlugs.has(product.slug)) return false;
      if (item.searchScore <= 0) return false;
      if (!categoryMatches(product.category, category)) return false;
      if (setName !== "all" && product.setName !== setName) return false;
      if (!releaseMatches(item.release.upcoming, release)) return false;
      if (recommendation !== "all" && item.recommendation !== recommendation) return false;

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
        case "relevance":
          if (query.trim() && a.searchScore !== b.searchScore) return b.searchScore - a.searchScore;
          return nullLast(aEstimate?.profitCents, bEstimate?.profitCents);
        case "profit-desc":
          return nullLast(aEstimate?.profitCents, bEstimate?.profitCents);
        case "roi-desc":
          return nullLast(aEstimate?.roiPercent, bEstimate?.roiPercent);
        case "market-desc":
          return nullLast(a.product.marketPrice?.amountCents, b.product.marketPrice?.amountCents);
        case "msrp-asc":
          return nullLast(a.product.msrpCents == null ? null : -a.product.msrpCents, b.product.msrpCents == null ? null : -b.product.msrpCents);
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
  }, [evaluated, category, setName, recommendation, numericFilters, sort, savedOnly, savedSlugs, query, release]);

  const clearFilters = () => {
    setCategory("all");
    setSetName("all");
    setRelease("all");
    setRecommendation("all");
    setNumericFilters(initialNumericFilters);
  };

  const hasAdvancedFilters =
    category !== "all" ||
    setName !== "all" ||
    release !== "all" ||
    recommendation !== "all" ||
    Object.values(numericFilters).some(Boolean);

  const pageKey = JSON.stringify([query, category, setName, recommendation, numericFilters, sort, savedOnly, release]);
  const shownCount = pageSize.key === pageKey ? pageSize.count : 48;
  const displayedProducts = visibleProducts.slice(0, shownCount);
  const returnTo = writeCatalogState({ query, category, setName, release, recommendation, numeric: numericFilters, sort, view, savedOnly, count: shownCount });
  useEffect(() => {
    if (!browseReady) return;
    window.history.replaceState(window.history.state, "", returnTo);
    const savePosition = () => { try { sessionStorage.setItem(BROWSE_SESSION_KEY, JSON.stringify({ url: returnTo, y: window.scrollY })); } catch { /* Navigation remains available. */ } };
    const frame = requestAnimationFrame(() => { if (restoreScroll.current !== null) { window.scrollTo(0, restoreScroll.current); restoreScroll.current = null; } });
    window.addEventListener("pagehide", savePosition);
    document.addEventListener("click", savePosition, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pagehide", savePosition); document.removeEventListener("click", savePosition, true); };
  }, [returnTo, browseReady]);
  const activeFilters = [
    ...(release !== "all" ? [{ label: release === "upcoming" ? "Upcoming releases" : "Released products", clear: () => setRelease("all") }] : []),
    ...(category !== "all" ? [{ label: quickFilters.find(f => quickCategories[f.id] === category)?.label ?? category, clear: () => setCategory("all") }] : []),
    ...(setName !== "all" ? [{ label: setName, clear: () => setSetName("all") }] : []),
    ...(recommendation !== "all" ? [{ label: signalLabel(recommendation as Recommendation), clear: () => setRecommendation("all") }] : []),
    ...Object.entries(numericFilters).filter(([, value]) => value).map(([key, value]) => ({ label: `${key.replace("msrp", "Reference retail").replace("profit", "Net profit").replace("roi", "ROI").replace("market", "Market").replace(/Min$/, " ≥").replace(/Max$/, " ≤")}: ${value}`, clear: () => setNumericFilters(current => ({ ...current, [key]: "" })) })),
  ];

  return (
    <div className="app-shell app-shell--catalog">
      <SiteHeader />

      <main>
        <section className="catalog-hero" aria-labelledby="catalog-title">
          <div className="catalog-hero__intro">
            <h1 id="catalog-title">
              What’s that box<br /><span>going for?</span>
            </h1>
            <p>
              Retail vs. TCGplayer market prices for sealed Pokémon. Check the gap before you buy.
            </p>

            <section className="catalog-tools" aria-label="Catalog controls">
              <label className="catalog-search">
                <span aria-hidden="true" className="catalog-search__icon">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <circle cx="10.8" cy="10.8" r="6.4" />
                    <path d="m15.6 15.6 4 4" />
                  </svg>
                </span>
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
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m7 7 10 10M17 7 7 17" />
                    </svg>
                  </button>
                )}
              </label>

              <div className="quick-filter-row" role="group" aria-label="Product types">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={quickFilter === filter.id ? "is-active" : ""}
                    aria-pressed={quickFilter === filter.id}
                    onClick={() => setCategory(quickCategories[filter.id])}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="hero-mascot-scene" aria-hidden="true">
            <div className="hero-mascot-scene__figure">
              {/* Reuse the transparent Concept 04 cutout for both the subject and its reflection. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-mascot-scene__sprite" src="/mascots/pikachu-concept04-crop.png" width="203" height="188" alt="" />
              <div className="hero-mascot-scene__reflection">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mascots/pikachu-concept04-crop.png" width="203" height="188" alt="" />
              </div>
            </div>
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
              <h2 id="catalog-filters-title">Refine the shelf</h2>
              <button ref={filterCloseRef} className="mobile-only icon-button" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                ×
              </button>
            </div>

            <label className="select-field">
              <span>Product type</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All types</option>
                <option value="group:etb">All ETBs (standard + Pokémon Center)</option>
                <option value="group:tin">All tins</option>
                <option value="group:collection">All collections</option>
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
                {RECOMMENDATIONS.map(value => <option key={value} value={value}>{signalLabel(value)}</option>)}
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
            <label className="select-field mobile-refine-sort"><span>Sort products</span><select value={sort} onChange={e => setSort(e.target.value as SortKey)}><option value="relevance">Search relevance / reference spread</option><option value="opportunity">Strongest signal at reference</option><option value="profit-desc">Highest estimated profit</option><option value="roi-desc">Highest ROI</option><option value="msrp-asc">Lowest reference retail</option><option value="msrp-desc">Highest reference retail</option><option value="market-desc">Highest market value</option><option value="updated-desc">Latest price update</option><option value="release-desc">Newest release</option><option value="alpha">Alphabetical</option></select></label>
          </aside>

          <section className="catalog-results" aria-labelledby="results-title">
            <div className="catalog-command-bar">
            <div className="results-toolbar">
              <div>
                <h2 id="results-title">
                  {query ? `Results for “${query}”` : savedOnly ? "Your saved shelf" : "The sealed shelf"}
                </h2>
                <p aria-live="polite">
                  {visibleProducts.length} sealed {visibleProducts.length === 1 ? "product" : "products"}
                  {catalogPriceUpdatedAt && <span className="catalog-price-date"> · Latest market update <time dateTime={catalogPriceUpdatedAt}>{new Date(catalogPriceUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></span>}
                </p>
              </div>
              <div className="toolbar-actions">
                <label className="sort-field release-filter"><span className="sr-only">Filter by release status</span><select value={release} onChange={event => setRelease(event.target.value)}><option value="all">All releases</option><option value="upcoming">Upcoming / preorder</option><option value="released">Released products</option></select></label>
                <label className="sort-field catalog-set-select">
                  <span className="sr-only">Filter by Pokémon set</span>
                  <select value={setName} onChange={event => setSetName(event.target.value)}>
                    <option value="all">All sets</option>
                    {sets.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <button
                  ref={filterTriggerRef}
                  className={`filter-button${hasAdvancedFilters ? " has-filters" : ""}`}
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  aria-expanded={filtersOpen}
                  aria-controls="catalog-filters"
                >
                  Refine {activeFilters.length ? `(${activeFilters.length})` : ""}
                </button>
                <label className="sort-field desktop-sort">
                  <span className="sr-only">Sort products</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                    <option value="relevance">Relevance / profit</option>
                    <option value="opportunity">Strongest signal at reference</option>
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
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4" y="4" width="6" height="6" rx="1" />
                      <rect x="14" y="4" width="6" height="6" rx="1" />
                      <rect x="4" y="14" width="6" height="6" rx="1" />
                      <rect x="14" y="14" width="6" height="6" rx="1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={view === "table" ? "is-active" : ""}
                    aria-label="Table view"
                    aria-pressed={view === "table"}
                    onClick={() => setView("table")}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14M5 12h14M5 17h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="catalog-context">
              <p>Signals assume buying at reference retail, not an available offer.</p><details><summary>What’s included?</summary><p>Reference retail may be original MSRP or a sourced retail price, not current availability. Signals include {DEFAULT_PROFIT_ASSUMPTIONS.sellingPlatformFeeRate * 100}% + {formatMoney(DEFAULT_PROFIT_ASSUMPTIONS.fixedSellingFeeCents, "USD")} selling fees, {formatMoney(DEFAULT_PROFIT_ASSUMPTIONS.sellerShippingCostCents, "USD")} shipping and {DEFAULT_PROFIT_ASSUMPTIONS.purchaseSalesTaxTreatment === "excluded" ? "no purchase tax" : `${DEFAULT_PROFIT_ASSUMPTIONS.purchaseSalesTaxRate * 100}% purchase tax`}. Open a product to check your actual price. Bad Buy means below our resale thresholds, not a judgment on collecting it.</p></details>
              {!!activeFilters.length && <div className="active-filters" aria-label="Active filters">{activeFilters.map(filter => <button type="button" key={filter.label} onClick={filter.clear} aria-label={`Remove filter ${filter.label}`}>{filter.label}<span aria-hidden="true"> ×</span></button>)}<button type="button" onClick={clearFilters}>Clear filters</button></div>}
              {view === "table" && <label className="saved-preference"><input type="checkbox" checked={showTableMetrics} onChange={e => setShowTableMetrics(e.target.checked)} />Show net profit, ROI and price age</label>}
              <WatchAlerts products={products.map(product => ({ slug: product.slug, name: product.name, marketCents: product.marketPrice?.amountCents ?? null, updatedAt: product.marketPrice?.updatedAt ?? null }))} now={now} />
            </div>

              <div className="catalog-list-controls">
                <div className="saved-details">
                  {savedOnly && <label className="saved-preference"><input type="checkbox" checked={saved.openSaved} onChange={event => persistSaved({ ...saved, openSaved: event.target.checked }, "Opening preference saved.")} />Open to Saved next time</label>}
                  {saveMessage.includes("unavailable") && <p className="saved-help">{saveMessage}</p>}
                  {showSaveNotice && <p className="saved-help">Saved on this browser only. <button className="button button--quiet" type="button" onClick={() => setShowSaveNotice(false)}>Got it</button></p>}
                </div>
                <div className="saved-toolbar">
                  <div className="saved-switch" role="group" aria-label="Catalog list">
                    <button type="button" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>All products</button>
                    <button ref={savedSwitchRef} type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><HeartIcon /> Saved <span>{savedCount}</span></button>
                  </div>
                  <div className="buying-filter" role="group" aria-label="Buying signals">
                    <button type="button" aria-pressed={recommendation === "all"} onClick={() => setRecommendation("all")}>All signals</button>
                    {RECOMMENDATIONS.map(value => <button key={value} type="button" className={recommendationToneClass(value)} aria-pressed={recommendation === value} onClick={() => setRecommendation(value)}>{signalLabel(value)}</button>)}
                  </div>
                </div>
                <p className="sr-only" role="status">{saveMessage}</p>
              </div>
            </div>

            <div className="catalog-browse">
              <aside className="set-rail" aria-labelledby="set-rail-title">
                <h2 id="set-rail-title">Browse by set</h2>
                <div className="set-rail__list" role="group" aria-label="Filter products by set">
                  <button type="button" aria-pressed={setName === "all"} onClick={() => setSetName("all")}>All sets</button>
                  {sets.map(value => <button key={value} type="button" aria-pressed={setName === value} onClick={() => setSetName(value)}>{value}</button>)}
                </div>
              </aside>
              <div className="catalog-products">
            {visibleProducts.length ? (
              view === "grid" ? (
                <div className="product-grid">
                  {displayedProducts.map((item, index) => (
                    <ProductCard
                      key={item.product.id}
                      item={item}
                      priority={index < 3}
                      saved={savedSlugs.has(item.product.slug)}
                      onToggle={() => toggleSaved(item.product.slug)}
                      returnTo={returnTo}
                      packCount={packCounts[item.product.id] ?? null}
                    />
                  ))}
                </div>
              ) : (
                <ProductTable items={displayedProducts} savedSlugs={savedSlugs} onToggle={toggleSaved} returnTo={returnTo} showMetrics={showTableMetrics} now={now} packCounts={packCounts} />
              )
            ) : (
              <div className="empty-state">
                {savedOnly && !savedCount && <span aria-hidden="true"><HeartIcon /></span>}
                <h3>{savedOnly && !savedCount ? "Your saved shelf is waiting" : "No matching sealed products"}</h3>
                <p>{savedOnly && !savedCount ? "Tap the heart on a product to keep it here for your next visit." : "Try a set name, shorthand like “ETB,” or reset your filters."}</p>
                <button type="button" className="button button--quiet" onClick={() => { setSavedOnly(false); setQuery(""); clearFilters(); }}>
                  Show all products
                </button>
              </div>
            )}
            {visibleProducts.length > shownCount && <button className="button catalog-load-more" type="button" onClick={() => setPageSize({ key: pageKey, count: shownCount + 48 })}>Show more products <span>({Math.min(shownCount, visibleProducts.length)} of {visibleProducts.length})</span></button>}
              </div>
            </div>
          </section>
        </div>

        <p className="catalog-update">TCGplayer market snapshots via TCGCSV, not live pricing. Product pages show individual sources and dates.</p>
      </main>

      <SiteFooter />

      {filtersOpen && <button className="sidebar-backdrop" type="button" tabIndex={-1} aria-hidden="true" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
    </div>
  );
}
