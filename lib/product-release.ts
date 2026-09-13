import announced from "../data/announced-products.json" with { type: "json" };

type ReleaseProduct = { id: string; releaseDate: string | null };
type Announcement = { sourceUrl: string; expectedReleaseDate: string | null; providerPresale: boolean; dateContext: string };
const announcements: Record<string, Announcement> = announced;

/** Dates are compared to the server-provided UTC day, avoiding hydration drift. */
export function productRelease(product: ReleaseProduct, now: string) {
  const announcement = announcements[product.id];
  const date = product.releaseDate ?? announcement?.expectedReleaseDate ?? null;
  const upcoming = date ? date > now.slice(0, 10) : !!announcement;
  return { upcoming, date, label: upcoming ? announcement?.providerPresale ? "PREORDER" : "ANNOUNCED" : null, announcement };
}

export function releaseMatches(upcoming: boolean, filter: string) {
  return filter === "upcoming" ? upcoming : filter === "released" ? !upcoming : true;
}
