export const REFRESH_AUDIENCE = "https://pokescratch.com/api/prices/refresh";
export function validRefreshClaims(claims: Record<string, unknown>, now = Date.now() / 1000) {
  return claims.iss === "https://token.actions.githubusercontent.com" && claims.aud === REFRESH_AUDIENCE
    && claims.repository_id === "1342934486" && claims.repository_owner_id === "319643758"
    && claims.repository === "sawchie/sealed-signal" && claims.ref === "refs/heads/main"
    && claims.workflow_ref === "sawchie/sealed-signal/.github/workflows/refresh-prices.yml@refs/heads/main"
    && ["schedule", "workflow_dispatch"].includes(String(claims.event_name))
    && typeof claims.exp === "number" && claims.exp > now
    && typeof claims.nbf === "number" && claims.nbf <= now + 30
    && typeof claims.iat === "number" && claims.iat <= now + 30 && claims.iat > now - 600;
}

export function validateProviderTimestamp(value: string, now = Date.now()) {
  const time = Date.parse(value.trim());
  if (!Number.isFinite(time) || time > now + 300_000 || time < now - 72 * 3600_000) throw new Error("Provider timestamp is invalid or older than 72 hours");
  return new Date(time).toISOString();
}

export function selectMarketCents(rows: unknown, productId: number): number | null {
  if (!Array.isArray(rows)) throw new Error("Invalid provider price list");
  const matches = rows.filter(row => row?.productId === productId && row?.subTypeName === "Normal");
  if (matches.length !== 1) return null;
  const amount = matches[0].marketPrice;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 100_000) return null;
  return Math.round(amount * 100) || null;
}
