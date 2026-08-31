import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

async function render(path = "/") {
  const importUrl = new URL(workerUrl);
  importUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(importUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: undefined,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the resale catalog with honest price labeling", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Compare Pokémon TCG MSRP &amp; Resale \| Sealed Signal<\/title>/i);
  assert.match(html, /Compare MSRP to resale values/i);
  assert.match(html, /spot the best buys quickly/i);
  assert.doesNotMatch(html, /Collector-built estimate desk|Check the shelf\. Know the signal/i);
  assert.match(html, /Destined Rivals Elite Trainer Box/i);
  assert.match(html, /product-images\/destined-rivals-etb\.jpg/i);
  assert.match(html, /Retail \/ MSRP/i);
  assert.match(html, /Market estimate/i);
  assert.match(html, /Filter by Pokémon set/i);
  assert.match(html, /Est\. profit after default fees/i);
  assert.match(html, /Black Bolt Elite Trainer Box/i);
  assert.match(html, /Shrouded Fable Greninja ex Special Illustration Collection/i);
  assert.match(html, /href="\/products\/destined-rivals-elite-trainer-box"[^>]*aria-label="Open details/i);
  assert.match(html, /hero-mascot-scene/i);
  assert.doesNotMatch(html, /2× MSRP/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|live price feed/i);
});

test("server-renders public product SEO pages and structured data", async () => {
  const response = await render("/products/destined-rivals-elite-trainer-box");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Destined Rivals Elite Trainer Box Buy Check/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /Resale estimate/i);
  assert.match(html, /Price data/i);
  assert.match(html, /TCGIndex manual snapshot/i);
  assert.match(html, /Released\s*(?:<!-- -->)?\s*May 30, 2025/i);
  assert.match(html, /Gross market spread/i);
  assert.match(html, /Premium \/ discount vs retail/i);
  assert.doesNotMatch(html, /Released\s*(?:<!-- -->)?\s*May 29, 2025/i);
});

test("robots metadata keeps admin and APIs out of public indexing", async () => {
  const response = await render("/robots.txt");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Disallow: \/admin/i);
  assert.match(body, /Disallow: \/api\//i);
});
