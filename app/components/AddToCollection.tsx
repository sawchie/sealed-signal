"use client";
import { useState } from "react";
import { addCollectionLot, localCalendarDay, ownedQuantity, type CollectionProduct } from "@/lib/collection";
import { changeCollection, useCollection } from "@/lib/collection-store";

export function AddToCollection({ product, compact = false }: { product: CollectionProduct; compact?: boolean }) {
  const { state, ready, blocked } = useCollection();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const count = state.lots.filter(lot => lot.slug === product.slug).reduce((sum, lot) => sum + ownedQuantity(state, lot), 0);
  async function add() {
    setBusy(true);
    const now = new Date().toISOString();
    const ok = await changeCollection(state => addCollectionLot(state, product, 1, null, localCalendarDay(), now, crypto.randomUUID()));
    setBusy(false);
    setMessage(ok ? `Added one ${product.name}. Set your paid price in My Collection.` : "Could not save. Open My Collection for storage details.");
  }
  return <div className={`collection-add${compact ? " collection-add--compact" : ""}`}>
    <button type="button" className="collection-plus" disabled={!ready || blocked || busy} onClick={add}
      aria-label={`Add one ${product.name} to My Collection${count ? `; ${count} owned` : ""}`} title={`Add one to My Collection${count ? ` · ${count} owned` : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      {compact && count > 0 && <span className="collection-plus__count" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
      {!compact && <span>Add to collection{count ? ` (${count} owned)` : ""}</span>}
    </button>
    <span className={compact ? "sr-only" : "collection-add__message"} role="status">{message}</span>
  </div>;
}
