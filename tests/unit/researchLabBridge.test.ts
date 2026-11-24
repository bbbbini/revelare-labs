import { describe, expect, it } from "vitest";
import { assignResearchLabSlots, isResearchLabMessage } from "@/features/research-lab/bridge";
import type { OfficeAgent } from "@/features/retro-office/core/types";
const agent = (id: string): OfficeAgent => ({ id, name: id, status: "idle", color: "#637958", item: "books" });

describe("research laboratory roster", () => {
  it("keeps actual identities in their slots across reorder, status and membership changes", () => {
    const first = assignResearchLabSlots([agent("one"), agent("two")], []);
    const next = assignResearchLabSlots([{ ...agent("two"), status: "working" }, agent("one"), agent("three")], first);
    expect(next.find(a => a.id === "two")).toMatchObject({ slot: "aria", status: "working" });
    expect(next.find(a => a.id === "one")?.slot).toBe("finn");
    const removed = assignResearchLabSlots([agent("two"), agent("three"), agent("four")], next);
    expect(removed.some(a => a.id === "one")).toBe(false);
    expect(removed.find(a => a.id === "four")?.slot).toBe("finn");
  });
  it("does not fabricate agents and bounds the scene capacity", () => {
    expect(assignResearchLabSlots([], [])).toEqual([]);
    const slots = assignResearchLabSlots(Array.from({ length: 10 }, (_, i) => agent(String(i))), []);
    expect(slots).toHaveLength(7);
    expect(new Set(slots.map(a => a.slot)).size).toBe(7);
  });
  it("accepts only versioned child messages", () => {
    expect(isResearchLabMessage({ version: 1, type: "research-lab:select", agentId: "one" })).toBe(true);
    for (const invalid of [null, {}, { type: "research-lab:select", agentId: "one" }, { version: 1, type: "research-lab:select", agentId: {} }, { version: 1, type: "chat.send" }]) expect(isResearchLabMessage(invalid)).toBe(false);
  });
});
