"use client";
import { useState } from "react";
import styles from "./CollectorContent.module.css";
export function ProductActions({ name, slug }: { name: string; slug: string }) {
  const url = `https://pokescratch.com/products/${slug}`;
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(url); setStatus("Product link copied."); setFallback(false); } catch { setFallback(true); setStatus("Select and copy the product link below."); } }
  return <><div className={styles.actions}><button className="button button--secondary" onClick={copy}>Copy product link</button><a href={`mailto:hello@pokescratch.com?subject=${encodeURIComponent(`Catalog correction: ${name}`)}&body=${encodeURIComponent(`Product: ${name}\n${url}\n\nDetail to correct:\nSource and date:\n`)}`}>Report a correction</a><span role="status">{status}</span></div>{fallback && <label>Product link<input className={styles.copyFallback} readOnly value={url} onFocus={e => e.currentTarget.select()} /></label>}</>;
}
