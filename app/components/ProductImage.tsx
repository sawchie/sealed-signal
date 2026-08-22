"use client";

import { useState } from "react";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  category: string;
  setName?: string | null;
  productName?: string;
  priority?: boolean;
  className?: string;
};

const categoryCode: Record<string, string> = {
  "Elite Trainer Box": "ETB",
  "Pokémon Center Elite Trainer Box": "PC ETB",
  "Booster Box": "36 PK",
  "Booster Bundle": "6 PK",
  "Sleeved Booster Pack": "1 PK",
  "Blister Pack": "BLSTR",
  "Collection Box": "COLL",
  "Premium Collection Box": "PREM",
  "Ultra-Premium Collection": "UPC",
  Tin: "TIN",
  "Mini Tin": "MINI",
  "Booster Multipack": "MULTI",
  "Special Collection": "SPEC",
  "Warehouse Club Bundle": "CLUB",
  "Retail-Exclusive Bundle": "EXCL",
};

type PackageTheme = {
  key: string;
  label: string;
  marker: string;
};

function getPackageTheme(setName?: string | null): PackageTheme {
  const set = (setName ?? "").toLowerCase();
  if (set.includes("151")) return { key: "kanto", label: "Kanto archive", marker: "151" };
  if (set.includes("destined")) return { key: "rivals", label: "Rivals release", marker: "DR" };
  if (set.includes("journey")) return { key: "journey", label: "Journey release", marker: "JT" };
  if (set.includes("surging")) return { key: "surging", label: "Surging release", marker: "SS" };
  if (set.includes("prismatic")) return { key: "prismatic", label: "Prismatic release", marker: "PE" };
  if (set.includes("paldean")) return { key: "paldean", label: "Paldea release", marker: "PF" };
  if (set.includes("crown")) return { key: "crown", label: "Crown release", marker: "CZ" };
  if (set.includes("perfect")) return { key: "perfect", label: "Perfect Order release", marker: "PO" };
  if (set.includes("ascended")) return { key: "ascended", label: "Ascended release", marker: "AH" };
  return { key: "archive", label: "Sealed archive", marker: "TCG" };
}

export function ProductImage({
  src,
  alt,
  category,
  setName,
  productName,
  priority = false,
  className = "",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  const theme = getPackageTheme(setName);
  const referenceName = setName ?? productName ?? "Sealed product";

  return (
    <div className={`product-image product-image--${theme.key} ${className}`}>
      {showFallback ? (
        <div
          className="product-image__fallback"
          role="img"
          aria-label={`${alt}; illustrated collector reference, official product photography not supplied`}
        >
          <span className="product-image__archive" aria-hidden="true">SEALED ARCHIVE</span>
          <span className="product-image__package" aria-hidden="true">
            <span className="product-image__marker">{theme.marker}</span>
            <span className="product-image__category">{categoryCode[category] ?? "SEALED"}</span>
          </span>
          <span className="product-image__set">{referenceName}</span>
          <span className="product-image__pending">
            <span>Illustrated reference</span>
            <strong>No official photo</strong>
          </span>
        </div>
      ) : (
        // Product assets are stored locally to avoid third-party hotlinking.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
