import { researchLabAssetsAvailable } from "@/lib/office/researchLabAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ available: await researchLabAssetsAvailable() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
