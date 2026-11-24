"use client";

import { ArrowUpRight, FlaskConical, MessageSquare } from "lucide-react";
import type { OfficeAgent } from "@/features/retro-office/core/types";

const STATUS = { working: "작업 중", idle: "대기", error: "확인 필요" };

export function ResearchersPanel({ agents, connected, onSelect }: {
  agents: OfficeAgent[];
  connected: boolean;
  onSelect: (id: string) => void;
}) {
  if (agents.length === 0) {
    return <div className="workspace-empty"><FlaskConical size={28} /><h2>연결된 연구원이 없습니다</h2><p>설정에서 런타임 연결을 확인해 주세요.</p></div>;
  }

  return (
    <div className="workspace-researchers">
      {agents.map(agent => (
        <button type="button" key={agent.id} className="workspace-researcher" onClick={() => onSelect(agent.id)}>
          <span className="workspace-researcher-avatar"><FlaskConical size={22} /></span>
          <span className="workspace-researcher-identity">
            <strong>{agent.name}</strong>
            <small>{agent.subtitle === "researcher" ? "보안 연구" : agent.subtitle || "연구원"}</small>
          </span>
          <span className="workspace-status" data-status={connected ? agent.status : "disconnected"}>
            <i />{connected ? STATUS[agent.status] : "연결 끊김"}
          </span>
          <span className="workspace-researcher-action"><MessageSquare size={15} /><span>작업 요청·대화</span><ArrowUpRight size={16} /></span>
        </button>
      ))}
    </div>
  );
}
