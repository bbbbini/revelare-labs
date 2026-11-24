import type { OfficeAgent } from "@/features/retro-office/core/types";

export const RESEARCH_LAB_SLOTS = ["finn", "aria", "luna", "noah", "leo", "zoey", "max"] as const;
export type ResearchLabSlot = (typeof RESEARCH_LAB_SLOTS)[number];
export type ResearchLabAgent = {
  slot: ResearchLabSlot;
  id: string;
  name: string;
  status: OfficeAgent["status"];
};

/** Keep researchers in their seats when the roster or a status changes. */
export function assignResearchLabSlots(
  agents: OfficeAgent[],
  previous: ResearchLabAgent[],
): ResearchLabAgent[] {
  const ids = new Set(agents.map((agent) => agent.id));
  const assignments = new Map(previous.filter((agent) => ids.has(agent.id)).map((agent) => [agent.id, agent.slot]));
  const used = new Set(assignments.values());
  for (const agent of agents) {
    if (assignments.has(agent.id)) continue;
    const slot = RESEARCH_LAB_SLOTS.find((candidate) => !used.has(candidate));
    if (!slot) break;
    assignments.set(agent.id, slot);
    used.add(slot);
  }
  return agents.flatMap((agent) => {
    const slot = assignments.get(agent.id);
    return slot ? [{ slot, id: agent.id, name: agent.name.slice(0, 80), status: agent.status }] : [];
  });
}

export function isResearchLabMessage(value: unknown): value is
  | { type: "research-lab:ready"; version: 1 }
  | { type: "research-lab:select"; version: 1; agentId: string } {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.version === 1 && (
    message.type === "research-lab:ready" ||
    (message.type === "research-lab:select" && typeof message.agentId === "string")
  );
}
