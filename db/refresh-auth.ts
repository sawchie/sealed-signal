import { validRefreshClaims } from "../lib/refresh-validation";

function bytes(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
}
let cachedKeys: { until: number; keys: (JsonWebKey & { kid: string })[] } | null = null;

/** Trust only the signed, short-lived identity of our main-branch refresh workflow. */
export async function isRefreshRequest(request: Request): Promise<boolean> {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer ([\w.-]+)$/)?.[1];
    if (!token || token.length > 16000) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const decode = (value: string) => JSON.parse(new TextDecoder().decode(bytes(value)));
    const header = decode(parts[0]), claims = decode(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" || !validRefreshClaims(claims)) return false;
    if (!cachedKeys || cachedKeys.until < Date.now() || !cachedKeys.keys.some(key => key.kid === header.kid)) {
      const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", { signal: AbortSignal.timeout(10000), redirect: "error" });
      if (!response.ok) return false;
      const body = await response.json() as { keys: (JsonWebKey & { kid: string })[] };
      if (!Array.isArray(body.keys)) return false;
      cachedKeys = { until: Date.now() + 3600_000, keys: body.keys };
    }
    const jwk = cachedKeys.keys.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch { return false; }
}
