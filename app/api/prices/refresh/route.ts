import { isRefreshRequest } from "@/db/refresh-auth";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!(await isRefreshRequest(request))) return Response.json({ error: "Authorized daily refresh workflow required." }, { status: 401, headers });
  if (new URL(request.url).searchParams.get("exchange") === "1") {
    try {
      const { refreshExchangeRates } = await import("@/db/exchange-rates");
      return Response.json(await refreshExchangeRates(), { headers });
    } catch (error) {
      console.error("Daily exchange-rate refresh failed", error instanceof Error ? error.message : "Unknown error");
      return Response.json({ error: "Exchange-rate refresh failed; previous rates retained." }, { status: 502, headers });
    }
  }
  const { refreshGroups, refreshPriceGroup } = await import("@/db/refresh-prices");
  const groupId = Number(new URL(request.url).searchParams.get("group"));
  const offset = Number(new URL(request.url).searchParams.get("offset") ?? 0);
  if (!Number.isInteger(groupId) || !refreshGroups.includes(groupId)) return Response.json({ error: "Unknown group." }, { status: 400, headers });
  if (!Number.isInteger(offset) || offset < 0 || offset > 2000 || offset % 10 !== 0) return Response.json({ error: "Invalid offset." }, { status: 400, headers });
  try { return Response.json(await refreshPriceGroup(groupId, offset), { headers }); }
  catch (error) {
    console.error("Daily market refresh failed", { groupId, error: error instanceof Error ? error.message : "Unknown error" });
    return Response.json({ error: "Refresh failed; previous quotes retained.", groupId }, { status: 502, headers });
  }
}
