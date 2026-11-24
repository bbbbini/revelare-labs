"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ClipboardCheck, Square, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AgentState } from "@/features/agents/state/store";
import type { GatewayModelChoice } from "@/lib/gateway/models";
import { buildFinalAgentChatItems } from "@/features/agents/components/chatItems";
import { normalizeAssistantDisplayText } from "@/lib/text/assistantText";

export type ResearcherTaskPanelProps = {
  agent: AgentState;
  connected: boolean;
  models: GatewayModelChoice[];
  stopBusy: boolean;
  onDraftChange: (value: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  onModelChange: (value: string | null) => void;
  onNewSession: () => Promise<void> | void;
  onRemoveQueued: (index: number) => void;
  onClose: () => void;
};

export function ResearcherTaskPanel(props: ResearcherTaskPanelProps) {
  const { agent, connected } = props;
  const running = agent.status === "running";
  const [draft, setDraft] = useState(agent.draft);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const items = useMemo(() => buildFinalAgentChatItems({outputLines: agent.outputLines, showThinkingTraces: false, toolCallingEnabled: false}).filter(item => item.kind === "user" || item.kind === "assistant"), [agent.outputLines]);
  const live = running ? normalizeAssistantDisplayText(agent.streamText ?? "") : "";
  const status = !connected ? "연결 끊김" : running ? "작업 중" : agent.status === "error" ? "확인 필요" : "요청 가능";
  useEffect(() => { if (!agent.draft) setDraft(""); }, [agent.draft]);
  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [items, live, running]);
  useEffect(() => {
    const el = input.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 180)}px`; }
  }, [draft]);
  const send = () => {
    const text = draft.trim();
    if (!text || !connected || resetBusy) return;
    follow.current = true;
    setDraft("");
    props.onDraftChange("");
    props.onSend(text);
  };
  const models = props.models.map(model => ({value: `${model.provider}/${model.id}`, label: model.name || `${model.provider}/${model.id}`}));
  if (agent.model && !models.some(model => model.value === agent.model)) models.unshift({value: agent.model, label: agent.model});
  return <section className="research-task-panel" aria-label={`${agent.name} 작업 대화`}>
    <header><div><p>연구원에게 작업 요청</p><h2>{agent.name}</h2></div><span className="workspace-status" data-status={connected && running ? "working" : agent.status === "error" ? "error" : "idle"}><i />{status}</span><button type="button" className="workspace-icon-button" aria-label="작업 대화 닫기" onClick={props.onClose}><X size={18} /></button></header>
    <div className="research-task-transcript" ref={scroll} onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} aria-label="작업 요청과 응답">
      {items.length === 0 ? <div className="research-task-intro"><ClipboardCheck size={25} /><h3>어떤 연구 작업을 맡길까요?</h3><p>목표와 확인할 자료, 원하는 결과 형식을 적어 주세요. 같은 대화에서 후속 요청을 이어갈 수 있습니다.</p></div> : items.map((item, index) => <article className={`research-task-message research-task-message-${item.kind}`} key={index}><p>{item.kind === "user" ? "작업 요청" : "연구원 응답"}{item.timestampMs ? <time>{new Date(item.timestampMs).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</time> : null}</p>{item.kind === "user" ? <div>{item.text}</div> : <div className="research-response"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown></div>}</article>)}
      {live ? <article className="research-task-message"><p>응답 작성 중</p><div className="research-response"><ReactMarkdown remarkPlugins={[remarkGfm]}>{live}</ReactMarkdown></div></article> : null}
      {running && !live ? <p className="research-task-progress" role="status">연구원이 요청을 처리하고 있습니다.</p> : null}
      {agent.status === "error" ? <p className="research-task-error" role="alert">마지막 요청을 완료하지 못했습니다. 위 응답과 연결 상태를 확인한 뒤 다시 요청해 주세요.</p> : null}
      {agent.historyMaybeTruncated ? <p className="research-record-note">이전 대화 일부는 현재 화면에 불러오지 않았습니다.</p> : null}
    </div>
    {agent.queuedMessages?.length ? <div className="research-task-queue" aria-label="대기 중인 요청"><strong>다음 요청 {agent.queuedMessages.length}건</strong>{agent.queuedMessages.map((message,index)=><div key={index}><span>{message}</span><button type="button" aria-label={`${index+1}번째 대기 요청 취소`} onClick={()=>props.onRemoveQueued(index)}><X size={14} /></button></div>)}</div> : null}
    <form className="research-task-composer" onSubmit={event=>{event.preventDefault();send();}}>
      {!connected ? <p className="research-task-error">연결이 끊겼습니다. 설정에서 런타임에 다시 연결해 주세요.</p> : null}
      <label htmlFor={`research-request-${agent.agentId}`}>작업 지시</label>
      <textarea id={`research-request-${agent.agentId}`} ref={input} rows={3} value={draft} disabled={!connected || resetBusy} placeholder="목표, 확인할 자료, 원하는 결과를 적어 주세요" onChange={event=>{setDraft(event.target.value);props.onDraftChange(event.target.value);}} onKeyDown={event=>{if(event.key==="Enter"&&(event.metaKey||event.ctrlKey)&&!event.nativeEvent.isComposing){event.preventDefault();send();}}} />
      <div className="research-task-send-row"><span>⌘ / Ctrl + Enter로 요청</span>{running ? <button type="button" className="ui-btn-secondary" disabled={props.stopBusy || !connected} onClick={props.onStop}><Square size={12} />{props.stopBusy ? "중단 중…" : "작업 중단"}</button> : null}<button type="submit" className="ui-btn-primary" disabled={!connected||!draft.trim()||resetBusy}><ArrowUp size={15} />{running ? "대기열에 추가" : "작업 요청"}</button></div>
      <details className="research-task-options"><summary>실행 설정</summary>{models.length ? <label>모델<select className="ui-input" value={agent.model??""} disabled={running} onChange={event=>props.onModelChange(event.target.value||null)}><option value="">런타임 기본값</option>{models.map(model=><option key={model.value} value={model.value}>{model.label}</option>)}</select></label> : <p>현재 연결한 런타임의 기본 모델을 사용합니다.</p>}<p>대화를 초기화하면 현재 맥락을 이어서 요청할 수 없습니다.</p><button type="button" className="ui-btn-secondary" disabled={running||resetBusy||!connected} onClick={async()=>{setResetBusy(true);setResetError("");try{await props.onNewSession();}catch{setResetError("대화를 초기화하지 못했습니다.");}finally{setResetBusy(false);}}}>대화 초기화</button>{resetError?<p role="alert">{resetError}</p>:null}</details>
    </form>
  </section>;
}
