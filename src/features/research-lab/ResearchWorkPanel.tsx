"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ClipboardList } from "lucide-react";
import type { AgentState } from "@/features/agents/state/store";
import { buildResearchWork } from "./work";

const STATUS = { working: "작업 중", completed: "응답 받음", error: "확인 필요", unanswered: "응답 없음" };

export function ResearchWorkPanel({ agents, resultsOnly = false, connected, onOpen }: {
  agents: AgentState[]; resultsOnly?: boolean; connected: boolean; onOpen: (agentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const work = useMemo(() => buildResearchWork(agents), [agents]);
  const visible = work.filter(task => (!resultsOnly || task.status === "completed") && `${task.request} ${task.result} ${task.agentName}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="research-work-list">
    <div className="research-work-toolbar"><input className="ui-input" aria-label="연구 작업 검색" placeholder="요청·응답·연구원 검색" value={query} onChange={event => setQuery(event.target.value)} /><span>{visible.length}건</span></div>
    <p className="research-record-note">현재 불러온 대화의 요청·응답입니다. 연구원을 선택하면 이어서 작업할 수 있습니다.</p>
    {visible.length === 0 ? <div className="workspace-empty"><ClipboardList size={28} /><h2>{query ? "검색 결과가 없습니다" : resultsOnly ? "아직 받은 결과가 없습니다" : "아직 요청한 작업이 없습니다"}</h2><p>{query ? "검색어를 바꿔 보세요." : "연구실에서 연구원을 선택해 첫 작업을 요청해 주세요."}</p></div> : visible.map(task => <article key={task.id} className="research-work-entry">
      <div className="research-work-entry-meta"><span>{task.agentName}</span><span className="workspace-status" data-status={task.status === "working" && connected ? "working" : task.status === "error" ? "error" : "idle"}>{task.status === "working" && !connected ? "연결 끊김 · 마지막 상태" : STATUS[task.status]}</span>{task.timestampMs ? <time dateTime={new Date(task.timestampMs).toISOString()}>{new Date(task.timestampMs).toLocaleString("ko-KR")}</time> : null}</div>
      <h2>{task.request}</h2>
      {task.result ? <details><summary>응답 내용 확인</summary><div className="research-work-result">{task.result}</div></details> : null}
      <button type="button" onClick={() => onOpen(task.agentId)}>이 연구원과 이어서 작업<ArrowUpRight size={15} /></button>
    </article>)}
  </div>;
}
