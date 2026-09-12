import assert from "node:assert/strict";
import test from "node:test";

import { resolvePublicProduct } from "../lib/catalog-resolution.ts";

const bundled = { id: "seed", active: true };

test("an active persisted product overrides the bundled record", () => {
  const persisted = { id: "database", active: true };
  assert.equal(resolvePublicProduct(persisted, bundled), persisted);
});

test("an inactive persisted product is a tombstone", () => {
  const persisted = { id: "database", active: false };
  assert.equal(resolvePublicProduct(persisted, bundled), null);
});

test("the bundled record is used only when no persisted row exists", () => {
  assert.equal(resolvePublicProduct(null, bundled), bundled);
  assert.equal(resolvePublicProduct(null, null), null);
});

test("fresh catalog quotes update old prices without overwriting admin metadata", () => {
  const saved = { id: "same", active: true, name: "Admin title", msrpCents: 1234, marketPrice: { updatedAt: "2026-08-01", amountCents: 2000 } };
  const fresh = { id: "same", active: true, name: "Provider title", msrpCents: 9999, marketPrice: { updatedAt: "2026-09-11", amountCents: 3000 } };
  const result = resolvePublicProduct(saved, fresh);
  assert.equal(result.name, "Admin title");
  assert.equal(result.msrpCents, 1234);
  assert.equal(result.marketPrice.amountCents, 3000);
  assert.equal(resolvePublicProduct({ ...saved, active: false }, fresh), null);
});

test("newer saved quote retains priority", () => {
  const saved = { active: true, marketPrice: { updatedAt: "2026-09-12", amountCents: 2500 } };
  const fresh = { active: true, marketPrice: { updatedAt: "2026-09-11", amountCents: 3000 } };
  assert.equal(resolvePublicProduct(saved, fresh), saved);
});
