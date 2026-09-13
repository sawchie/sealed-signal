import { seedProducts } from "@/data/products";
import type { ProductWithMarketPrice } from "@/lib/domain";
import { resolvePublicProduct } from "@/lib/catalog-resolution";
import { ProductActions } from "./ProductActions";
import { ProductImage } from "./ProductImage";
import styles from "./CollectorContent.module.css";

export async function ProductExtras({ product }: { product: ProductWithMarketPrice }) {
  let related = product.setName ? seedProducts.filter(p => p.setName === product.setName && p.id !== product.id && p.active) : [];
  if (product.setName) {
    try {
      const { listProducts } = await import("@/db/repository");
      const saved = new Map<string, ProductWithMarketPrice>();
      let offset = 0;
      for (;;) { const page = await listProducts({ setName: product.setName, activeOnly: false, limit: 200, offset }); for (const p of page.products) saved.set(p.slug, p); offset += page.products.length; if (!page.products.length || offset >= page.total) break; }
      related = related.flatMap(p => { const resolved = resolvePublicProduct(saved.get(p.slug) ?? null, p); saved.delete(p.slug); return resolved ? [resolved] : []; });
      related.push(...[...saved.values()].filter(p => p.active && p.id !== product.id));
    } catch { /* At first run, use actual bundled records. */ }
  }
  const etb = product.category.includes("Elite Trainer Box");
  const guide = etb ? "pokemon-center-etb-vs-regular" : "compare-price-per-pack";
  return (
    <section className={styles.productExtras} aria-labelledby="next-title">
      <h2 id="next-title">More for this pickup</h2>
      <ProductActions name={product.name} slug={product.slug} />
      <p className={styles.related}><a href={`/guides/${guide}`}>{etb ? "Related guide: Pokémon Center ETBs and regular ETBs" : "Related guide: comparing price per pack"}</a></p>
      {related.length > 0 && <>
        <h3>More from {product.setName}</h3>
        <div className={styles.relatedProducts}>
          {related.slice(0, 3).map(p => (
            <a key={p.id} href={`/products/${p.slug}`} aria-label={p.name}>
              <ProductImage className={styles.relatedImage} src={p.imageUrl} alt="" category={p.category} setName={p.setName} productName={p.name} />
              <span>{p.name}</span>
            </a>
          ))}
        </div>
      </>}
    </section>
  );
}
