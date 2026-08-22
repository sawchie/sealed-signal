"use client";

import { useState } from "react";
import { seedProducts } from "@/data/products";
import { PRODUCT_CATEGORIES, type ProductWithMarketPrice } from "@/lib/domain";
import {
  formatMoney,
  formatUtcDateTimeInput,
  utcDateTimeInputToIso,
} from "@/lib/format";

type EditorState = {
  originalSlug: string | null;
  name: string;
  shortName: string;
  slug: string;
  aliases: string;
  setName: string;
  series: string;
  category: string;
  releaseDate: string;
  imageUrl: string;
  msrp: string;
  currency: string;
  notes: string;
  active: boolean;
  marketPrice: string;
  marketSource: string;
  marketSourceUrl: string;
  marketObservedAt: string;
};

const emptyEditor: EditorState = {
  originalSlug: null,
  name: "",
  shortName: "",
  slug: "",
  aliases: "",
  setName: "",
  series: "",
  category: "Elite Trainer Box",
  releaseDate: "",
  imageUrl: "",
  msrp: "",
  currency: "USD",
  notes: "",
  active: true,
  marketPrice: "",
  marketSource: "Manual research",
  marketSourceUrl: "",
  marketObservedAt: "",
};

function editorFromProduct(product: ProductWithMarketPrice): EditorState {
  return {
    originalSlug: product.slug,
    name: product.name,
    shortName: product.shortName ?? "",
    slug: product.slug,
    aliases: product.aliases.join("\n"),
    setName: product.setName ?? "",
    series: product.series ?? "",
    category: product.category,
    releaseDate: product.releaseDate ?? "",
    imageUrl: product.imageUrl ?? "",
    msrp: product.msrpCents ? (product.msrpCents / 100).toFixed(2) : "",
    currency: product.currency,
    notes: product.notes ?? "",
    active: product.active,
    marketPrice: product.marketPrice ? (product.marketPrice.amountCents / 100).toFixed(2) : "",
    marketSource: product.marketPrice?.source.label ?? "Manual research",
    marketSourceUrl: product.marketPrice?.source.url ?? "",
    marketObservedAt: formatUtcDateTimeInput(product.marketPrice?.updatedAt),
  };
}

function optional(value: string) {
  return value.trim() || null;
}

function dollarsToCents(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function productPayload(editor: EditorState) {
  const marketAmount = dollarsToCents(editor.marketPrice);
  return {
    name: editor.name.trim(),
    shortName: optional(editor.shortName),
    slug: editor.slug.trim(),
    aliases: editor.aliases
      .split(/[\n,]/)
      .map((alias) => alias.trim())
      .filter(Boolean),
    setName: optional(editor.setName),
    series: optional(editor.series),
    category: editor.category,
    releaseDate: optional(editor.releaseDate),
    imageUrl: optional(editor.imageUrl),
    msrpCents: dollarsToCents(editor.msrp),
    currency: editor.currency.toUpperCase(),
    notes: optional(editor.notes),
    active: editor.active,
    marketPrice:
      marketAmount === null
        ? null
        : {
            amountCents: marketAmount,
            currency: editor.currency.toUpperCase(),
            providerKey: "local-manual",
            sourceKind: "manual",
            sourceName: editor.marketSource.trim() || "Manual research",
            sourceUrl: optional(editor.marketSourceUrl),
            observedAt:
              utcDateTimeInputToIso(editor.marketObservedAt) ??
              new Date().toISOString(),
            priceType: "market-estimate",
            methodology: "Manually entered product-level market snapshot.",
          },
  };
}

export function AdminApp() {
  const [adminKey, setAdminKey] = useState("");
  const [products, setProducts] = useState<ProductWithMarketPrice[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Enter the local admin key to load the editable catalog.");
  const [query, setQuery] = useState("");

  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(path, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${adminKey}`,
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      product?: ProductWithMarketPrice;
      products?: ProductWithMarketPrice[];
    };
    if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
    return payload;
  };

  const loadProducts = async () => {
    setBusy(true);
    setStatus("Checking the protected catalog…");
    try {
      const payload = await request("/api/products?status=all&limit=200");
      setProducts(payload.products ?? []);
      setConnected(true);
      setStatus(`${payload.products?.length ?? 0} database records loaded. Your key remains only in this page.`);
    } catch (error) {
      setConnected(false);
      setStatus(error instanceof Error ? error.message : "Could not open product administration.");
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor.name.trim() || !editor.slug.trim() || !editor.category) {
      setStatus("Name, slug, and category are required.");
      return;
    }
    setBusy(true);
    try {
      const isEditing = Boolean(editor.originalSlug);
      const path = isEditing ? `/api/products/${editor.originalSlug}` : "/api/products";
      const payload = await request(path, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(productPayload(editor)),
      });
      setStatus(`${payload.product?.name ?? "Product"} saved.`);
      setEditor(payload.product ? editorFromProduct(payload.product) : emptyEditor);
      await loadProducts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!editor.originalSlug) return;
    setBusy(true);
    try {
      await request(`/api/products/${editor.originalSlug}`, { method: "DELETE" });
      setStatus(`${editor.name} was deactivated. Its price history was retained.`);
      setEditor(emptyEditor);
      await loadProducts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Product could not be deactivated.");
    } finally {
      setBusy(false);
    }
  };

  const importBundled = async () => {
    setBusy(true);
    setStatus(`Loading ${seedProducts.length} attributed starter records…`);
    let saved = 0;
    try {
      for (const product of seedProducts) {
        const payload = {
          slug: product.slug,
          name: product.name,
          shortName: product.shortName,
          aliases: [...product.aliases],
          setName: product.setName,
          series: product.series,
          category: product.category,
          releaseDate: product.releaseDate,
          imageUrl: product.imageUrl,
          msrpCents: product.msrpCents,
          currency: product.currency,
          notes: product.notes,
          active: product.active,
          marketPrice: product.marketPrice
            ? {
                amountCents: product.marketPrice.amountCents,
                currency: product.marketPrice.currency,
                providerKey: product.marketPrice.source.id,
                sourceKind: product.marketPrice.source.kind,
                sourceName: product.marketPrice.source.label,
                sourceUrl: product.marketPrice.source.url ?? null,
                observedAt: product.marketPrice.updatedAt,
                sampleSize: product.marketPrice.sampleSize ?? null,
                priceType: "market-estimate",
                methodology: "Bundled manual source snapshot; not live data.",
              }
            : null,
        };
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.status === 409) {
          const update = await fetch(`/api/products/${product.slug}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${adminKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (!update.ok) throw new Error(`Could not refresh ${product.name}.`);
        } else if (!response.ok) {
          const message = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(message.error ?? `Could not import ${product.name}.`);
        }
        saved += 1;
        setStatus(`Loaded ${saved} of ${seedProducts.length} records…`);
      }
      setStatus(`Bundled catalog loaded: ${saved} records. Review dates and sources before publishing.`);
      await loadProducts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Bundled data import stopped.");
    } finally {
      setBusy(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.setName} ${product.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="admin-main">
      <header className="admin-hero">
        <div>
          <span className="hero-kicker"><span className="status-pulse" /> Local-first administration</span>
          <h1>Product data desk</h1>
          <p>Add sealed products, update attributed prices, and deactivate records without changing application code.</p>
        </div>
        <div className={`admin-status${connected ? " is-connected" : ""}`}>
          <span>{connected ? "Connected" : "Locked"}</span>
          <p role="status">{status}</p>
        </div>
      </header>

      {!connected ? (
        <section className="admin-unlock" aria-labelledby="unlock-title">
          <span aria-hidden="true">⌁</span>
          <div>
            <h2 id="unlock-title">Unlock local data management</h2>
            <p>Set <code>ADMIN_API_KEY</code> in your local environment, then enter that value here. The key stays in memory and is never written to browser storage.</p>
            <label>
              <span>Admin key</span>
              <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} autoComplete="off" />
            </label>
            <button className="button button--primary" type="button" disabled={!adminKey || busy} onClick={loadProducts}>
              {busy ? "Checking…" : "Open data desk"}
            </button>
          </div>
        </section>
      ) : (
        <div className="admin-grid">
          <aside className="admin-list">
            <div className="admin-list__heading">
              <div><span className="eyebrow">Database</span><h2>Products</h2></div>
              <button className="button button--small" type="button" onClick={() => setEditor(emptyEditor)}>+ Add</button>
            </div>
            <input className="admin-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter products…" />
            {!products.length && (
              <div className="admin-empty">
                <p>The database is ready but empty.</p>
                <button className="button button--quiet" type="button" onClick={importBundled} disabled={busy}>Load bundled starter data</button>
              </div>
            )}
            <div className="admin-product-list">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={editor.originalSlug === product.slug ? "is-active" : ""}
                  onClick={() => setEditor(editorFromProduct(product))}
                >
                  <span><strong>{product.name}</strong><small>{product.setName ?? "Mixed set"} · {product.category}</small></span>
                  <span><b>{formatMoney(product.marketPrice?.amountCents, product.currency)}</b><small>{product.active ? "Active" : "Inactive"}</small></span>
                </button>
              ))}
            </div>
            {products.length > 0 && (
              <button className="import-link" type="button" onClick={importBundled} disabled={busy}>Refresh bundled starter records</button>
            )}
          </aside>

          <form className="admin-editor" onSubmit={saveProduct}>
            <div className="admin-editor__heading">
              <div><span className="eyebrow">{editor.originalSlug ? "Edit record" : "New record"}</span><h2>{editor.name || "Untitled product"}</h2></div>
              <span className="admin-key-note">Protected API</span>
            </div>

            <div className="admin-form-grid">
              <label className="field field--wide"><span>Exact product name *</span><input required value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
              <label className="field"><span>Short name</span><input value={editor.shortName} onChange={(event) => setEditor({ ...editor, shortName: event.target.value })} /></label>
              <label className="field"><span>URL slug *</span><input required value={editor.slug} onChange={(event) => setEditor({ ...editor, slug: event.target.value })} /></label>
              <label className="field"><span>Set</span><input value={editor.setName} onChange={(event) => setEditor({ ...editor, setName: event.target.value })} /></label>
              <label className="field"><span>Series</span><input value={editor.series} onChange={(event) => setEditor({ ...editor, series: event.target.value })} /></label>
              <label className="field"><span>Category *</span><select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })}>{PRODUCT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="field"><span>Release date</span><input type="date" value={editor.releaseDate} onChange={(event) => setEditor({ ...editor, releaseDate: event.target.value })} /></label>
              <label className="field"><span>Retail / MSRP (USD)</span><input inputMode="decimal" value={editor.msrp} onChange={(event) => setEditor({ ...editor, msrp: event.target.value })} placeholder="49.99" /></label>
              <label className="field"><span>Market estimate (USD)</span><input inputMode="decimal" value={editor.marketPrice} onChange={(event) => setEditor({ ...editor, marketPrice: event.target.value })} placeholder="Leave blank if unknown" /></label>
              <label className="field field--wide"><span>Aliases — one per line</span><textarea rows={3} value={editor.aliases} onChange={(event) => setEditor({ ...editor, aliases: event.target.value })} placeholder={"destined etb\nsv10 etb\nteam rocket box"} /></label>
              <label className="field field--wide"><span>Image URL or local /public path</span><input value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} placeholder="Use only an image you have rights to publish" /></label>
            </div>

            <fieldset className="admin-price-source">
              <legend>Market-price provenance</legend>
              <label className="field"><span>Source label</span><input value={editor.marketSource} onChange={(event) => setEditor({ ...editor, marketSource: event.target.value })} /></label>
              <label className="field"><span>Observed / retrieved (UTC)</span><input type="datetime-local" value={editor.marketObservedAt} onChange={(event) => setEditor({ ...editor, marketObservedAt: event.target.value })} /></label>
              <label className="field field--wide"><span>Source URL</span><input type="url" value={editor.marketSourceUrl} onChange={(event) => setEditor({ ...editor, marketSourceUrl: event.target.value })} placeholder="https://…" /></label>
            </fieldset>

            <label className="field"><span>Notes</span><textarea rows={4} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} /></label>
            <label className="check-field"><input type="checkbox" checked={editor.active} onChange={(event) => setEditor({ ...editor, active: event.target.checked })} /><span>Active in public catalog<small>Deactivate instead of deleting so historical prices stay auditable.</small></span></label>

            <div className="admin-actions">
              {editor.originalSlug && <button className="button button--danger" type="button" onClick={deactivate} disabled={busy}>Deactivate</button>}
              <span />
              <button className="button button--quiet" type="button" onClick={() => setEditor(emptyEditor)} disabled={busy}>Cancel</button>
              <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
