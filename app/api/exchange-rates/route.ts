import { getExchangeRates } from "@/db/exchange-rates";
export async function GET() {
  return Response.json(await getExchangeRates(), { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
