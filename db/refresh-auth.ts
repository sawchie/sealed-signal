import { validRefreshClaims } from "../lib/refresh-validation";

function bytes(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
}
let cachedKeys: { until: number; keys: (JsonWebKey & { kid: string })[] } | null = null;

/** Trust only the signed, short-lived identity of our main-branch refresh workflow. */
export async function isRefreshRequest(request: Request): Promise<boolean> {
  let stage = "token";
  const deny = (reason: string) => { console.warn("Daily refresh identity rejected", { reason }); return false; };
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer ([\w.-]+)$/)?.[1];
    if (!token || token.length > 16000) return request.headers.has("authorization") ? deny("Bearer format or size") : false;
    const parts = token.split(".");
    if (parts.length !== 3) return deny("Token segment count");
    stage = "decode";
    const decode = (value: string) => JSON.parse(new TextDecoder().decode(bytes(value)));
    const header = decode(parts[0]), claims = decode(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return deny("Signing algorithm or key ID");
    if (!validRefreshClaims(claims)) return deny("Repository, workflow, audience or time policy");
    stage = "public keys";
    if (!cachedKeys || cachedKeys.until < Date.now() || !cachedKeys.keys.some(key => key.kid === header.kid)) {
      const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", { signal: AbortSignal.timeout(10000), redirect: "manual" });
      if (!response.ok) return deny(`Public key endpoint HTTP ${response.status}`);
      const body = await response.json() as { keys: (JsonWebKey & { kid: string })[] };
      if (!Array.isArray(body.keys)) return deny("Public key response shape");
      cachedKeys = { until: Date.now() + 3600_000, keys: body.keys };
    }
    const jwk = cachedKeys.keys.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return deny("No matching RSA key");
    stage = "signature";
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)) || deny("Signature mismatch");
  } catch (error) { console.warn("Daily refresh identity verification failed", { stage, error: error instanceof Error ? error.message : "Unknown error" }); return false; }
}
