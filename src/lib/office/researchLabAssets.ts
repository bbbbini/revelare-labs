import fs from "node:fs/promises";
import path from "node:path";
import { resolveUserPath } from "@/lib/hermes/paths";

// Only display assets are served. The source directory can contain private
// drafts, prompts and verification evidence; those are never requestable.
export const RESEARCH_LAB_ASSETS = {
  walk: "assets/finn-walk-diagonal-v2.png",
  seated: "assets/finn-seated-work-v1.png",
  floor: "assets/floor/floor-v1.png",
  rugs: "assets/scene/rugs-v1.png",
  idle: "../movement-13/assets/finn-walk-atlas-v1.png",
  sit2: "motion-assets/finn-sit-v2.png",
  legsFL: "motion-assets/finn-fl-legs-v2.png",
  furniture: "assets/scene/furniture-atlas-v1.png",
  furniture2: "assets/scene/furniture-atlas-v2.png",
  furniture3: "assets/scene/furniture-atlas-v3.png",
  aria: "assets/people/aria-v1.png",
  luna: "assets/people/luna-v1.png",
  noah: "assets/people/noah-v1.png",
  leo: "assets/people/leo-v1.png",
  zoey: "assets/people/zoey-v2.png",
  max: "assets/people/max-v1.png",
} as const;

export async function researchLabAssetsAvailable() {
  const directory = process.env.RESEARCH_LAB_ASSET_DIR?.trim();
  if (!directory) return false;
  try {
    await Promise.all(Object.values(RESEARCH_LAB_ASSETS).map((file) => fs.access(path.resolve(resolveUserPath(directory), file))));
    return true;
  } catch {
    return false;
  }
}

export async function readResearchLabAsset(asset: string): Promise<Uint8Array | null> {
  if (!Object.hasOwn(RESEARCH_LAB_ASSETS, asset)) return null;
  const directory = process.env.RESEARCH_LAB_ASSET_DIR?.trim();
  if (!directory) return null;
  try {
    const file = path.resolve(resolveUserPath(directory), RESEARCH_LAB_ASSETS[asset as keyof typeof RESEARCH_LAB_ASSETS]);
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 20 * 1024 * 1024) return null;
    const data = await fs.readFile(file);
    if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null;
    return new Uint8Array(data);
  } catch {
    return null;
  }
}
