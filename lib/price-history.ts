export type PriceObservation = { amountCents: number | null; currency: string; observedAt: string; source: string; sourceUrl: string | null; provider: string };
/** Keep the newest observation for each provider/day; never synthesize a missing day. */
export function historyByDay(rows: PriceObservation[], currency: string): PriceObservation[] {
  const days = new Map<string, PriceObservation>();
  for (const row of [...rows].sort((a, b) => a.observedAt.localeCompare(b.observedAt))) {
    if (row.currency !== currency || !Number.isFinite(Date.parse(row.observedAt)) || (row.amountCents !== null && (!Number.isSafeInteger(row.amountCents) || row.amountCents <= 0))) continue;
    days.set(`${row.observedAt.slice(0, 10)}:${row.provider}`, row);
  }
  return [...days.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).slice(-90);
}
