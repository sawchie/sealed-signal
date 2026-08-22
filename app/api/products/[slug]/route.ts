import { requireAdmin } from "../../../../db/admin-auth";
import {
  deactivateProductBySlug,
  getProductBySlug,
  updateProductBySlug,
} from "../../../../db/repository";
import { apiError, parseProductUpdate, RequestValidationError } from "../_http";

interface RouteContext {
  params: Promise<{ slug: string }> | { slug: string };
}

const PUBLIC_CACHE = "public, max-age=30, s-maxage=60, stale-while-revalidate=120";

async function slugFrom(context: RouteContext): Promise<string> {
  const { slug } = await context.params;
  if (!slug) throw new RequestValidationError("A product slug is required.");
  return slug;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
    if (includeInactive) {
      const denied = await requireAdmin(request);
      if (denied) return denied;
    }
    const product = await getProductBySlug(await slugFrom(context), { includeInactive });
    if (!product) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }
    return Response.json(
      { product },
      {
        headers: {
          "Cache-Control": includeInactive ? "no-store" : PUBLIC_CACHE,
          ...(includeInactive ? { Vary: "Authorization" } : {}),
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const patch = await parseProductUpdate(request);
    const product = await updateProductBySlug(await slugFrom(context), patch);
    return Response.json(
      { product },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

/** DELETE is deliberately a soft delete so historical aliases/prices remain auditable. */
export async function DELETE(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const product = await deactivateProductBySlug(await slugFrom(context));
    return Response.json(
      { product },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
