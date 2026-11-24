"use client";

import type { ReactNode } from "react";
import { ClipboardList, FileCheck2, FlaskConical, MessageSquare, Settings2, Users, X } from "lucide-react";

export type ResearchWorkspaceSection = "work" | "results" | "researchers" | "settings";
const SECTIONS = [
  { id: "work", label: "연구 작업", icon: ClipboardList, description: "실제로 요청한 작업과 현재 처리 상태를 확인합니다." },
  { id: "results", label: "연구 결과", icon: FileCheck2, description: "연구원에게 받은 응답을 확인하고 후속 작업으로 이어갑니다." },
  { id: "researchers", label: "연구원", icon: Users, description: "연결된 연구원을 선택해 작업을 요청합니다." },
  { id: "settings", label: "설정", icon: Settings2, description: "현재 연구실의 이름과 실행 환경, 런타임 연결을 관리합니다." },
] as const;

type Props = {
  open: boolean; section: ResearchWorkspaceSection; onSectionChange: (section: ResearchWorkspaceSection) => void;
  onCloseSection: () => void; title: string; connected: boolean; researcherCount: number; workingCount: number;
  taskOpen: boolean; onToggleTask: () => void; panels: Record<ResearchWorkspaceSection, ReactNode>;
};

export function ResearchWorkspaceNavigation(props: Props) {
  const current = SECTIONS.find(section => section.id === props.section)!;
  const select = (section: ResearchWorkspaceSection) => { props.onSectionChange(section); };
  const home = () => { props.onCloseSection(); };
  return <>
    <header className="workspace-header">
      <button className="workspace-brand" type="button" onClick={home} aria-label="REVELARE 연구실 홈"><span className="workspace-brand-symbol"><FlaskConical size={21} /></span><span>REVELARE<small>SECURITY LABS</small></span></button>
      <div className="workspace-location"><strong>{props.open ? current.label : props.title || "연구실"}</strong></div>
      <div className="workspace-header-actions"><span className="workspace-connection" data-connected={props.connected}><i />{props.connected ? "연결됨" : "연결 끊김"}</span><span className="workspace-count">연구원 {props.researcherCount} · 작업 중 {props.workingCount}</span><button type="button" className="workspace-chat-button" aria-label={props.taskOpen ? "작업 대화 닫기" : "작업 대화 열기"} aria-pressed={props.taskOpen} onClick={props.onToggleTask}><MessageSquare size={16} /><span>{props.taskOpen ? "작업 대화 닫기" : "작업 대화 열기"}</span></button></div>
    </header>
    <nav className="workspace-navigation research-navigation" aria-label="연구실 메뉴">
      <button type="button" aria-current={!props.open ? "page" : undefined} onClick={home}><FlaskConical size={19} /><span>연구실</span></button>
      {SECTIONS.filter(section => section.id !== "settings").map(({id,label,icon: Icon})=><button type="button" key={id} aria-current={props.open&&props.section===id?"page":undefined} onClick={()=>select(id)}><Icon size={19} /><span>{label}</span></button>)}
      <div className="workspace-nav-spacer" />
      <button type="button" className="research-settings-desktop" aria-current={props.open&&props.section==="settings"?"page":undefined} onClick={()=>select("settings")}><Settings2 size={19} /><span>설정</span></button>
    </nav>
    {props.open ? <section className="workspace-content" aria-label={current.label}><div className="workspace-content-heading"><div><h1>{current.label}</h1><span>{current.description}</span></div><button type="button" className="workspace-icon-button" onClick={home} aria-label="연구실로 돌아가기"><X size={20} /></button></div><div className="workspace-content-body">{props.panels[props.section]}</div></section> : null}
  </>;
}
