import { readResearchLabAsset } from "@/lib/office/researchLabAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  const data = await readResearchLabAsset(asset);
  if (!data) return new Response(null, { status: 404 });
  return new Response(data as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
