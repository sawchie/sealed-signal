import { requireAdmin } from "../../../../../db/admin-auth";
import { updateProductBySlug } from "../../../../../db/repository";
import {
  apiError,
  parseMarketPriceRequest,
  RequestValidationError,
} from "../../_http";

interface RouteContext {
  params: Promise<{ slug: string }> | { slug: string };
}

async function slugFrom(context: RouteContext): Promise<string> {
  const { slug } = await context.params;
  if (!slug) throw new RequestValidationError("A product slug is required.");
  return slug;
}

/** Append a provenance-bearing observation; existing observations are retained. */
export async function POST(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const marketPrice = await parseMarketPriceRequest(request);
    const product = await updateProductBySlug(await slugFrom(context), {
      marketPrice,
    });
    return Response.json(
      { product },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

/** Append an explicit unavailable marker instead of destroying price history. */
export async function DELETE(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const product = await updateProductBySlug(await slugFrom(context), {
      marketPrice: null,
    });
    return Response.json(
      { product },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
