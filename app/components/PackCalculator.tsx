"use client";
import { useEffect, useState } from "react";
import { calculatePackCost, comparePackCosts, emptyPackInput, type PackInput } from "@/lib/pack-comparison";
import styles from "./CollectorContent.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const fields = [{ key: "price", label: "Item price", required: true }, { key: "packs", label: "Booster packs", required: true }, { key: "shipping", label: "Shipping" }, { key: "tax", label: "Tax amount" }, { key: "discount", label: "Discount" }] as const;

export type PackCatalogChoice = { slug: string; name: string; priceCents: number | null; packs: number | null; setName: string | null; sourceUrl: string | null };
export function PackCalculator({ products = [] }: { products?: PackCatalogChoice[] }) {
  const [inputs, setInputs] = useState([emptyPackInput(), emptyPackInput()]);
  const [selected, setSelected] = useState(["", ""]);
  const [shareMessage, setShareMessage] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fromProduct = (product: PackCatalogChoice): PackInput => ({ ...emptyPackInput(), label: product.name, price: product.priceCents === null ? "" : (product.priceCents / 100).toFixed(2), packs: product.packs ? String(product.packs) : "" });
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slugs = [params.get("a") ?? params.get("product") ?? "", params.get("b") ?? ""];
    // Restore the browser URL after hydration, independently of SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(slugs.map(slug => products.some(product => product.slug === slug) ? slug : ""));
    setInputs(slugs.map((slug, index) => {
      const product = products.find(product => product.slug === slug);
      const input = product ? fromProduct(product) : emptyPackInput();
      for (const key of ["price", "packs", "shipping", "tax", "discount"] as const) { const value = params.get(`${index}-${key}`); if (value !== null && value.length <= 12) input[key] = value; }
      const label = params.get(`${index}-label`); if (!product && label !== null) input.label = label.slice(0, 160);
      return input;
    }));
  }, [products]);
  function choose(index: number, slug: string) {
    const product = products.find(product => product.slug === slug);
    setSelected(current => current.map((value, i) => i === index ? slug : value));
    setInputs(current => current.map((value, i) => i === index ? product ? fromProduct(product) : emptyPackInput() : value));
    setTouched({}); setShareMessage("");
  }
  const results = inputs.map(calculatePackCost);
  const comparison = comparePackCosts(results[0], results[1]);
  function update(index: number, key: keyof PackInput, value: string) { setInputs(current => current.map((input, i) => i === index ? { ...input, [key]: value } : input)); }
  return <>
    <p className={styles.intro}>Compare the cost of opening packs. Enter the exact pack count and checkout costs for each product. All amounts are USD.</p>
    <div className={styles.comparison}>
      {inputs.map((input, index) => <fieldset key={index} className={styles.purchase}>
        <legend>Product {index === 0 ? "A" : "B"}</legend>
        {!!products.length && <label className={styles.label}>Choose from the catalog<select value={selected[index]} onChange={e => choose(index, e.target.value)}><option value="">Custom product</option>{products.map(product => <option key={product.slug} value={product.slug}>{product.name}</option>)}</select></label>}
        {selected[index] && <p className="comparison-source">Prefilled reference retail, not a current offer. {products.find(p => p.slug === selected[index])?.packs ? "Pack count is source-backed." : "Pack count is not verified; enter the count on your box."} <a href={`/products/${selected[index]}`}>View product and source</a></p>}
        <label className={styles.label}>Product name <span>(optional)</span><input value={input.label} maxLength={160} onChange={e => update(index, "label", e.target.value)} placeholder={index === 0 ? "e.g. Booster bundle" : "e.g. Elite Trainer Box"} /></label>
        <div className={styles.fields}>{fields.map(field => {
          const id = `purchase-${index}-${field.key}`;
          const error = touched[id] ? results[index].errors[field.key] : undefined;
          return <label key={field.key} className={styles.label} htmlFor={id}>{field.label}{!("required" in field) && <span> (optional)</span>}
            <input id={id} value={input[field.key]} inputMode={field.key === "packs" ? "numeric" : "decimal"} maxLength={12} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onBlur={() => setTouched(current => ({ ...current, [id]: true }))} onChange={e => update(index, field.key, e.target.value)} />
            {error && <span id={`${id}-error`} className={styles.error}>{error}</span>}
          </label>;
        })}</div>
        <div className={styles.result} aria-live="polite" aria-atomic="true"><span>Cost per pack</span><strong>{results[index].perPackCents === null ? "—" : money(results[index].perPackCents!)}</strong><span>{results[index].totalCents === null ? "Enter a valid price and pack count." : `${money(results[index].totalCents!)} total · ${results[index].packs} packs`}</span></div>
      </fieldset>)}
    </div>
    <p className={styles.verdict} role="status">{comparison ? comparison.winner ? `Product ${comparison.winner} costs ${money(comparison.differenceCents)} less per pack.` : "Same cost per pack at displayed cents." : "Complete both products to compare their cost per pack."}</p>
    {selected.every(Boolean) && products.find(p => p.slug === selected[0])?.setName !== products.find(p => p.slug === selected[1])?.setName && <p className="comparison-warning">Different sets selected. A lower pack cost does not mean equivalent contents or collectibility.</p>}
    <p>Pack content, set, edition, language, and condition still matter. This comparison does not predict pulls or assign a resale value to promos and accessories.</p>
    <div className="inline-actions"><button className="button button--secondary" onClick={() => { setInputs([emptyPackInput(), emptyPackInput()]); setSelected(["", ""]); setTouched({}); setShareMessage(""); history.replaceState(history.state, "", "/tools/price-per-pack"); }}>Reset comparison</button>
    <button className="button button--quiet" type="button" disabled={results.some(result => result.perPackCents === null)} onClick={async () => {
      const params = new URLSearchParams();
      selected.forEach((slug, index) => { if (slug) params.set(index === 0 ? "a" : "b", slug); });
      inputs.forEach((input, index) => { for (const key of Object.keys(input) as (keyof PackInput)[]) params.set(`${index}-${key}`, input[key]); });
      const url = `${location.origin}/tools/price-per-pack?${params}`;
      history.replaceState(history.state, "", url);
      try { await navigator.clipboard.writeText(url); setShareMessage("Comparison link copied, including the prices you entered."); } catch { setShareMessage("Your comparison is now in the address bar. Copy that link to share it."); }
    }}>Copy comparison link</button></div><p role="status">{shareMessage}</p>
  </>;
}
