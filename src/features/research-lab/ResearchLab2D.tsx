"use client";

import { useEffect, useRef, useState } from "react";
import type { PixelOffice2DProps } from "@/features/pixel-office/PixelOffice2D";
import { assignResearchLabSlots, isResearchLabMessage, type ResearchLabAgent } from "./bridge";

type Props = PixelOffice2DProps & { selectedAgentId?: string | null };
const STATUS = { working: "작업 중", idle: "대기", error: "오류" } as const;

export function ResearchLab2D(props: Props) {
  const { agents, selectedAgentId, gatewayStatus, onAgentChatSelect, onRenderModeChange } = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const slots = useRef<ResearchLabAgent[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [retry, setRetry] = useState(0);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/office/research-lab", { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? response.json() : { available: false })
      .then(result => { if (!controller.signal.aborted) setAvailable(result.available === true); })
      .catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || !isResearchLabMessage(event.data)) return;
      if (event.data.type === "research-lab:ready") setEpoch(value => value + 1);
      else if (agents.some(agent => agent.id === event.data.agentId)) onAgentChatSelect?.(event.data.agentId);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [agents, onAgentChatSelect]);

  useEffect(() => {
    if (!epoch) return;
    slots.current = assignResearchLabSlots(agents, slots.current);
    frame.current?.contentWindow?.postMessage({
      version: 1, type: "research-lab:state", agents: slots.current,
      connected: gatewayStatus === "connected", selectedId: selectedAgentId ?? null,
    }, window.location.origin);
  }, [agents, epoch, gatewayStatus, selectedAgentId]);

  return (
    <div className="lab-scene relative flex h-full min-h-0 flex-col" data-testid="research-lab">
      <h1 className="sr-only">연구실</h1>
      <div className="relative min-h-0 flex-1">
        {available === true ? <iframe key={retry} ref={frame} src="/research-lab/index.html" title="2.5D 연구실" className="h-full w-full border-0" /> : (
          <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <p>{available === null ? "연구실을 준비하는 중…" : "연구실 화면을 불러올 수 없습니다."}</p>
            {available === false ? <div className="flex gap-3"><button type="button" onClick={() => { setAvailable(null); setRetry(value => value + 1); }}>다시 시도</button><button type="button" onClick={() => onRenderModeChange("2d")}>픽셀 오피스 열기</button></div> : null}
          </div>
        )}
        {available && agents.length === 0 ? <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm">연결된 연구원이 없습니다. 연결 설정을 확인하거나 연구원을 추가해 주세요.</p> : null}
      </div>
      <nav aria-label="연구원 대화" className="lab-scene-roster">
        <span className="lab-roster-label">연구원</span>
        {agents.map(agent => <button key={agent.id} type="button" aria-label={`${agent.name} · ${STATUS[agent.status]} · 대화 열기`} aria-pressed={selectedAgentId === agent.id} onClick={() => onAgentChatSelect?.(agent.id)} className="lab-roster-person"><strong>{agent.name}</strong><span className="ml-2">{STATUS[agent.status]}</span></button>)}
        {props.onAddAgent ? <button type="button" onClick={props.onAddAgent} className="lab-roster-add">+ 연구원 추가</button> : null}
      </nav>
      {agents.length > 7 ? <p className="bg-background px-3 pb-2 text-xs">장면에는 최대 7명을 표시합니다. 모든 연구원은 위 목록에서 대화할 수 있습니다.</p> : null}

    </div>
  );
}
