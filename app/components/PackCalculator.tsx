"use client";
import { useState } from "react";
import { calculatePackCost, comparePackCosts, emptyPackInput, type PackInput } from "@/lib/pack-comparison";
import styles from "./CollectorContent.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const fields = [{ key: "price", label: "Item price", required: true }, { key: "packs", label: "Booster packs", required: true }, { key: "shipping", label: "Shipping" }, { key: "tax", label: "Tax amount" }, { key: "discount", label: "Discount" }] as const;

export function PackCalculator() {
  const [inputs, setInputs] = useState([emptyPackInput(), emptyPackInput()]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const results = inputs.map(calculatePackCost);
  const comparison = comparePackCosts(results[0], results[1]);
  function update(index: number, key: keyof PackInput, value: string) { setInputs(current => current.map((input, i) => i === index ? { ...input, [key]: value } : input)); }
  return <>
    <p className={styles.intro}>Compare the cost of opening packs. Enter the exact pack count and checkout costs for each product. All amounts are USD.</p>
    <div className={styles.comparison}>
      {inputs.map((input, index) => <fieldset key={index} className={styles.purchase}>
        <legend>Product {index === 0 ? "A" : "B"}</legend>
        <label className={styles.label}>Product name <span>(optional)</span><input value={input.label} maxLength={80} onChange={e => update(index, "label", e.target.value)} placeholder={index === 0 ? "e.g. Booster bundle" : "e.g. Elite Trainer Box"} /></label>
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
    <p>Pack content, set, edition, language, and condition still matter. This comparison does not predict pulls or assign a resale value to promos and accessories.</p>
    <button className="button button--secondary" onClick={() => { setInputs([emptyPackInput(), emptyPackInput()]); setTouched({}); }}>Reset comparison</button>
  </>;
}
