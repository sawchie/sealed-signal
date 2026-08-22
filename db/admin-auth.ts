import { env } from "cloudflare:workers";

const encoder = new TextEncoder();

function configuredAdminKey(): string | null {
  const value = (env as unknown as Record<string, unknown>).ADMIN_API_KEY;
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function secureEquals(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);

  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let different = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < leftBytes.length; index += 1) {
    different |= leftBytes[index] ^ rightBytes[index];
  }

  return different === 0;
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const expected = configuredAdminKey();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match ? secureEquals(match[1], expected) : false;
}

/**
 * All mutations fail closed. There is deliberately no development bypass: a
 * missing secret can never turn a production deployment into an open admin API.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
  if (!configuredAdminKey()) {
    return Response.json(
      { error: "Product administration is not configured." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (!(await isAdminRequest(request))) {
    return Response.json(
      { error: "A valid administrator credential is required." },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": 'Bearer realm="product-admin"',
        },
      },
    );
  }

  return null;
}
