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
