import type { AgentState } from "@/features/agents/state/store";
import { buildFinalAgentChatItems } from "@/features/agents/components/chatItems";

export type ResearchWork = {
  id: string;
  agentId: string;
  agentName: string;
  request: string;
  result: string;
  timestampMs: number | null;
  status: "working" | "completed" | "error" | "unanswered";
};

/** Derive work from the same restored conversation used to send follow-up requests. */
export function buildResearchWork(agents: AgentState[]): ResearchWork[] {
  const work: ResearchWork[] = [];
  for (const agent of agents) {
    const items = buildFinalAgentChatItems({ outputLines: agent.outputLines, showThinkingTraces: false, toolCallingEnabled: false });
    const agentWork: ResearchWork[] = [];
    for (const [index, item] of items.entries()) {
      if (item.kind === "user") {
        agentWork.push({ id: `${agent.agentId}:${agent.sessionKey}:${index}`, agentId: agent.agentId, agentName: agent.name,
          request: item.text, result: "", timestampMs: item.timestampMs ?? null, status: "unanswered" });
      } else if (item.kind === "assistant" && agentWork.length) {
        const task = agentWork[agentWork.length - 1];
        task.result = [task.result, item.text].filter(Boolean).join("\n\n");
        task.status = "completed";
      }
    }
    const latest = agentWork.at(-1);
    if (latest && agent.status === "error") latest.status = "error";
    else if (latest && agent.status === "running") latest.status = "working";
    work.push(...agentWork.reverse());
  }
  return work.sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0));
}
