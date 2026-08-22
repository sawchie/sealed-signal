import { requireAdmin } from "../../../db/admin-auth";
import { createProduct, listProducts } from "../../../db/repository";
import { apiError, parseCatalogQuery, parseProductCreate } from "./_http";

const PUBLIC_CACHE = "public, max-age=30, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: Request) {
  try {
    const query = parseCatalogQuery(new URL(request.url));
    if (query.includeInactive) {
      const denied = await requireAdmin(request);
      if (denied) return denied;
    }
    const result = await listProducts(query);
    return Response.json(result, {
      headers: {
        "Cache-Control": query.includeInactive ? "no-store" : PUBLIC_CACHE,
        ...(query.includeInactive ? { Vary: "Authorization" } : {}),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const input = await parseProductCreate(request);
    const product = await createProduct(input);
    return Response.json(
      { product },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
          Location: `/products/${product.slug}`,
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
