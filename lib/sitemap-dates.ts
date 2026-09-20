/** Only actual, already-observed content changes belong in sitemap lastmod. */
export function latestSitemapDate(values: Array<string | null | undefined>, now = Date.now()): string | undefined {
  let latest: { value: string; time: number } | undefined;
  for (const value of values) {
    if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) continue;
    const time = Date.parse(value);
    const day = Date.parse(value.slice(0, 10));
    if (!Number.isFinite(time) || !Number.isFinite(day) || time > now
      || new Date(day).toISOString().slice(0, 10) !== value.slice(0, 10)) continue;
    if (!latest || time > latest.time) latest = { value, time };
  }
  return latest?.value;
}
