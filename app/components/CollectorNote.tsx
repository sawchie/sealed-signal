import { collectorNotes } from "@/data/collector-notes";
import { editorialProducts } from "@/lib/editorial-products";
import { editorialDate } from "@/lib/guides";
import { DetailDisclosure } from "./DetailDisclosure";
import styles from "./CollectorContent.module.css";

export async function CollectorNote({ productId }: { productId: string }) {
  const note = collectorNotes.find(n => n.productId === productId);
  if (!note) return null;
  const [alternative] = await editorialProducts([note.alternativeId]);
  return <div className={styles.productExtras}><DetailDisclosure title="Collector’s notes · fit & alternatives">
    <div className={styles.collectorNote}><p className={styles.meta}>PokeScratch Editorial · Researched comparison, not a hands-on review · Updated {editorialDate(note.reviewed)}</p>
      <h2>Where this box fits</h2><p>{note.fit}</p><h3>The distinction that matters</h3><p>{note.distinction}</p><h3>When to pass</h3><p>{note.skip}</p>
      <p>Specification source: <a href={note.sourceUrl}>{note.sourceLabel}</a>. Editorial notes do not imply a fresh market quote.</p>
      <p><a href={`/guides/${note.guide}`}>Read the full set comparison</a>{alternative && <> · <a href={`/products/${alternative.slug}`}>Compare {alternative.name}</a></>}</p>
    </div></DetailDisclosure></div>;
}
