import { describe, expect, it } from "vitest";
import { agentStoreReducer, initialAgentStoreState, type AgentState } from "@/features/agents/state/store";
import { formatMetaMarkdown } from "@/lib/text/message-extract";
import { buildResearchWork } from "@/features/research-lab/work";

function researcher(patch: Partial<AgentState> = {}): AgentState {
  const agent = agentStoreReducer(initialAgentStoreState, { type: "hydrateAgents", agents: [{agentId:"researcher-1",name:"연구원",sessionKey:"agent:researcher-1:main"}] }).agents[0];
  return {...agent, ...patch};
}

describe("research work from runtime conversation", () => {
  it("restores requests and results without depending on gateway lifecycle events", () => {
    const tasks = buildResearchWork([researcher({outputLines:[formatMetaMarkdown({role:"user",timestamp:1000}),"> 첫 요청",formatMetaMarkdown({role:"assistant",timestamp:2000}),"첫 결과","> 후속 요청","후속 결과"]})]);
    expect(tasks).toHaveLength(2);
    expect(tasks.find(task=>task.request==="첫 요청")).toMatchObject({result:"첫 결과",status:"completed",timestampMs:1000});
    expect(tasks.find(task=>task.request==="후속 요청")).toMatchObject({result:"후속 결과",status:"completed"});
  });
  it("keeps completed work distinct from the current failed or running request", () => {
    const agent=researcher({outputLines:["> 완료한 요청","완료한 결과","> 현재 요청"],status:"running"});
    expect(buildResearchWork([agent]).map(task=>task.status)).toEqual(["working","completed"]);
    expect(buildResearchWork([{...agent,status:"error"}]).map(task=>task.status)).toEqual(["error","completed"]);
    expect(buildResearchWork([{...agent,status:"idle"}])[0].status).toBe("unanswered");
  });
  it("does not invent work for empty conversations, queue entries or unpaired responses", () => {
    expect(buildResearchWork([researcher({outputLines:["이전 응답"],queuedMessages:["아직 전송하지 않은 요청"]})])).toEqual([]);
  });
});
