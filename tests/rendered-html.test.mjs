import assert from "node:assert/strict";
import test from "node:test";
import catalogImport from "../data/catalog-import.json" with { type: "json" };
import guides from "../data/guides.json" with { type: "json" };
import productFacts from "../data/product-facts.json" with { type: "json" };

test("all guides and tools render complete crawlable public content", async () => {
  for (const guide of guides) {
    const response = await render(`/guides/${guide.slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /September 12, 2026/);
    assert.match(html, /href="\/tools\/price-per-pack"/);
    assert.ok(guide.paragraphs.length >= 5);
    assert.ok(html.includes(guide.title.replaceAll("&", "&amp;")));
  }
  for (const path of ["/guides", "/tools", "/tools/price-per-pack"]) assert.equal((await render(path)).status, 200);
  assert.equal((await render("/guides/not-a-real-guide")).status, 404);
  const tool = await (await render("/tools/price-per-pack")).text();
  assert.match(tool, /Item price|Booster packs|Reset comparison/);
  const product = await (await render("/products/destined-rivals-elite-trainer-box")).text();
  assert.doesNotMatch(product, /Enlarge packaging|Reduce image|image-size-toggle/);
  assert.match(product, /Copy product link|Report a correction|More from/);
  assert.match(product, /mailto:hello@pokescratch.com/);
});

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

test("details show paired per-pack references only for verified pack counts", async () => {
  const html = await (await render("/products/destined-rivals-elite-trainer-box")).text();
  assert.match(html, /\$5\.55 \/ pack/);
  assert.equal((html.match(/class="detail-per-pack"/g) ?? []).length, 2);
  assert.match(html, /no value deducted for promos or extras/);
  assert.match(html, /Not a loose-pack quote/);
  const unknown = catalogImport.items.find(p => !productFacts[p.id]?.packCount);
  assert.ok(unknown);
  const unknownHtml = await (await render(`/products/${unknown.slug}`)).text();
  assert.match(unknownHtml, /pack count not verified/);
  assert.doesNotMatch(unknownHtml, /class="detail-per-pack"/);
});

test("buy checks describe informational pages, not incomplete Product rich results", async () => {
  const upcoming = catalogImport.items.find(p => p.sourceProductId === 712099);
  const missingImage = catalogImport.items.find(p => p.sourceProductId === 712109);
  for (const slug of ["destined-rivals-elite-trainer-box", upcoming.slug, missingImage.slug]) {
    const response = await render(`/products/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => JSON.parse(match[1]));
    const page = blocks.find(block => block["@type"] === "WebPage");
    assert.ok(page, "Informational page metadata remains available to crawlers");
    assert.equal(page.url, `https://pokescratch.com/products/${slug}`);
    assert.match(page.name, /Buy Check$/);
    assert.match(page.description, /Not an in-stock offer/);
    assert.doesNotMatch(JSON.stringify(blocks), /"@type":"(?:Product|Offer|AggregateOffer|Review|AggregateRating)"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /Price you are paying/);
  }
});

test("upcoming products render presale context, exact provenance, and missing-price TBD", async () => {
  const product = catalogImport.items.find(p => p.sourceProductId === 712099);
  const html = await (await render(`/products/${product.slug}`)).text();
  assert.match(html, /PREORDER/);
  assert.match(html, /Presale market estimate/);
  assert.match(html, /TBD/);
  assert.match(html, /Not released yet/);
  assert.match(html, /2026-11-06/);
  assert.match(html, /Product announcement and expected shipping date/);
  const fallback = catalogImport.items.find(p => p.sourceProductId === 712109);
  const fallbackHtml = await (await render(`/products/${fallback.slug}`)).text();
  assert.match(fallbackHtml, /product-image__fallback/);
  assert.doesNotMatch(fallbackHtml, /src="null"/);
});

async function render(path = "/", options = {}) {
  const importUrl = new URL(workerUrl);
  importUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(importUrl.href);

  return worker.fetch(
    new Request(path.startsWith("https://") ? path : `http://localhost${path}`, { headers: { accept: "text/html" }, ...options }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: undefined,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("old public hostname permanently redirects and preserves path and query", async () => {
  const response = await render("https://sealed-signal.tylerjsawchyn.chatgpt.site/products/destined-rivals-elite-trainer-box?ref=search");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://pokescratch.com/products/destined-rivals-elite-trainer-box?ref=search");
  assert.equal((await render("https://pokescratch.com/")).status, 200);
});

test("server-renders the resale catalog with honest price labeling", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Compare Pokémon TCG MSRP &amp; Resale \| PokeScratch<\/title>/i);
  assert.match(html, /What’s that box/i);
  assert.match(html, /going for\?/i);
  const typeControls = html.match(/class="quick-filter-row"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(typeControls, /All types/);
  assert.doesNotMatch(typeControls, /Strong buy/i);
  assert.match(html, /aria-label="Buying signals"/);
  assert.match(html, /class="catalog-browse"/);
  assert.match(html, /Latest market update/i);
  assert.match(html, /name="google-site-verification" content="jdFlPWY8SbBX1yV3QyYEIdBePdE9PkerC7gzGrQR350"/);
  assert.match(html, new RegExp(catalogImport.providerUpdatedAt));
  assert.doesNotMatch(html, /Collector-built estimate desk|Check the shelf\. Know the signal/i);
  assert.match(html, /Destined Rivals Elite Trainer Box/i);
  assert.match(html, /product-images\/cutouts\/destined-rivals-etb\.webp/i);
  assert.match(html, /product-images\/cutouts\/temporal-forces-booster-box\.webp/i);
  assert.doesNotMatch(html, /product-image__fallback/i);
  assert.match(html, /Retail \/ MSRP/i);
  assert.match(html, /Market estimate/i);
  assert.match(html, /Filter by Pokémon set/i);
  assert.doesNotMatch(html, /Est\. profit after default fees/i);
  assert.match(html, /Black Bolt Elite Trainer Box/i);
  assert.match(html, /Greninja ex Special Illustration Collection/i);
  assert.match(html, /href="\/products\/[^"]+"[^>]*aria-label="Open details/i);
  assert.doesNotMatch(html, /href="\/methodology"/i);
  assert.equal((html.match(/class="product-card /g) ?? []).length, 48);
  assert.match(html, /Show more products/);
  assert.match(html, /hero-mascot-scene/i);
  assert.match(html, /mascots\/pikachu-concept04-crop\.png/);
  assert.match(html, /hero-mascot-scene__reflection/);
  assert.doesNotMatch(html, /hero-mascot-scene__spark/);
  assert.match(html, /Browse by set/);
  assert.match(html, /class="save-heart"/);
  assert.match(html, /Save .* to saved items/);
  assert.match(html, /aria-label="Catalog list"/);
  assert.match(html, /aria-label="Filter products by set"/);
  assert.doesNotMatch(html, /2× MSRP/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|live price feed/i);
});

test("daily refresh rejects unauthenticated callers", async () => {
  const response = await render("/api/prices/refresh?group=2374", { method: "POST" });
  assert.equal(response.status, 401);
});

test("server-renders public product SEO pages and structured data", async () => {
  const response = await render("/products/destined-rivals-elite-trainer-box");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Destined Rivals Elite Trainer Box Buy Check/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /Resale estimate/i);
  assert.match(html, /Price data/i);
  assert.match(html, /TCGplayer via TCGCSV/i);
  assert.match(html, /Release<\/dt><dd>May 30, 2025/i);
  assert.match(html, /Gross market spread/i);
  assert.match(html, /Premium \/ discount vs reference/i);
  assert.doesNotMatch(html, /Read the snapshot, then check the source|schema.org\/OutOfStock/i);
  assert.match(html, /Recorded market history/i);
  assert.match(html, /Maximum purchase price, before tax/i);
  assert.match(html, /Price you are paying/i);
  assert.doesNotMatch(html, /30 \/ 90 day averages/i);
  assert.doesNotMatch(html, /Released\s*(?:<!-- -->)?\s*May 29, 2025/i);
});

test("renders newly completed retail and market provenance", async () => {
  const response = await render("/products/destined-rivals-three-pack-blister-kangaskhan");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /\$14\.99/);
  const quote = catalogImport.items.find(item => item.id === "destined-rivals-kangaskhan-blister");
  assert.ok(html.includes(`$${(quote.marketCents / 100).toFixed(2)}`));
  assert.match(html, /Target first-party retail/);
  assert.match(html, /TCGplayer via TCGCSV/i);
});

test("removed methodology route redirects to the catalog", async () => {
  const response = await render("/methodology");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "/");
});

test("new catalog entries have working detail routes", async () => {
  const product = catalogImport.items.find(item => !item.existingId && item.releaseDate && item.marketCents);
  const response = await render(`/products/${product.slug}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(product.imageUrl));
  assert.match(html, /Released|Gross market spread|TCGplayer via TCGCSV/);
});

test("robots metadata keeps admin and APIs out of public indexing", async () => {
  const response = await render("/robots.txt");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Disallow: \/admin/i);
  assert.match(body, /Disallow: \/api\//i);
  assert.match(body, /https:\/\/pokescratch.com\/sitemap.xml/);
});

test("public branding and contact pages use PokeScratch", async () => {
  for (const path of ["/", "/admin", "/about", "/contact", "/privacy"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.doesNotMatch(html, /Sealed Signal/i, path);
    assert.match(html, /PokeScratch/i);
  }
});

test("sitemap lists the expanded catalog on the public domain", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.doesNotMatch(body, /localhost|\/methodology/);
  assert.equal((body.match(/<loc>/g) ?? []).length, catalogImport.items.length + 12);
});
