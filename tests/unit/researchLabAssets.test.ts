// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readResearchLabAsset, researchLabAssetsAvailable } from "@/lib/office/researchLabAssets";
let directory: string | null = null;
afterEach(async () => { vi.unstubAllEnvs(); if (directory) await fs.rm(directory, { recursive: true, force: true }); directory = null; });
describe("private laboratory display assets", () => {
  it("serves only explicitly named PNG display files, never paths or evidence", async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "research-lab-"));
    vi.stubEnv("RESEARCH_LAB_ASSET_DIR", directory);
    await fs.mkdir(path.join(directory, "assets"));
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await fs.writeFile(path.join(directory, "assets/finn-walk-diagonal-v2.png"), png);
    expect(await readResearchLabAsset("walk")).toEqual(new Uint8Array(png));
    for (const name of ["../.env", "__proto__", "captures/report.json", "walk/../../secret", "README.md"]) expect(await readResearchLabAsset(name)).toBeNull();
    await fs.writeFile(path.join(directory, "assets/finn-walk-diagonal-v2.png"), "private text");
    expect(await readResearchLabAsset("walk")).toBeNull();
    expect(await researchLabAssetsAvailable()).toBe(false);
  });
  it("has no filesystem fallback when not configured", async () => {
    vi.stubEnv("RESEARCH_LAB_ASSET_DIR", "");
    expect(await researchLabAssetsAvailable()).toBe(false);
    expect(await readResearchLabAsset("walk")).toBeNull();
  });
});
