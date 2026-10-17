import { describe, expect, it } from "vitest";
import { defaultResearchLayout, moveResearchItem, parseResearchLayout, researchLayoutKey, serializeResearchLayout } from "@/features/retro-office/core/researchLayout";

describe("research layout persistence", () => {
  it("round trips edits, rotations, additions and an intentionally empty room", () => {
    const items = defaultResearchLayout();
    items[0].rotation = Math.PI;
    const moved = moveResearchItem(items, items[0].id, 1.47, -0.33);
    moved.push({ id: "added", type: "plant", x: 2, z: 1, rotation: 0 });
    expect(parseResearchLayout(serializeResearchLayout(moved))).toEqual(moved);
    expect(moved[0]).toMatchObject({ x: 1.5, z: -0.3, rotation: Math.PI });
    expect(parseResearchLayout(serializeResearchLayout([]))).toEqual([]);
  });
  it("isolates floors and never uses the legacy office layout key", () => {
    expect(researchLayoutKey("default")).toBe("hermes3d:research-layout:v1:default");
    expect(researchLayoutKey("floor2")).not.toBe(researchLayoutKey("default"));
  });
  it("does not mutate the saved snapshot when editing a draft", () => {
    const saved = defaultResearchLayout();
    const before = serializeResearchLayout(saved);
    moveResearchItem(saved, saved[0].id, 100, -100);
    expect(serializeResearchLayout(saved)).toBe(before);
  });
  it.each([null, "broken", "{}", '{"version":2,"items":[]}', '{"version":1,"items":[null]}', '{"version":1,"items":[{"id":"x","type":"__proto__","x":0,"z":0,"rotation":0}]}'])('rejects malformed or incompatible storage: %s', raw => {
    expect(parseResearchLayout(raw)).toBeNull();
  });
  it("rejects duplicate ids, excessive coordinates, and non-numeric transforms", () => {
    const items = defaultResearchLayout();
    expect(parseResearchLayout(serializeResearchLayout([items[0], items[0]]))).toBeNull();
    expect(parseResearchLayout(serializeResearchLayout([{ ...items[0], x: 1000 }]))).toBeNull();
    expect(parseResearchLayout(JSON.stringify({ version: 1, items: [{ ...items[0], x: "2" }] }))).toBeNull();
  });
});
