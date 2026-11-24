"use client";

import { useState, type ReactNode } from "react";
import { Activity, BookOpen, Boxes, FlaskConical, History, Inbox, ListTodo, MessageSquare, MoreHorizontal, Settings2, Users, Wrench, X } from "lucide-react";

export type HQSidebarTab = "inbox" | "history" | "kanban" | "playbooks" | "analytics" | "researchers" | "settings";

type HQSidebarProps = {
  open: boolean;
  activeTab: HQSidebarTab;
  inboxCount: number;
  onToggle: () => void;
  onTabChange: (tab: HQSidebarTab) => void;
  onOpenMarketplace: () => void;
  onAddAgent?: () => void;
  onOpenCompanyBuilder?: () => void;
  officeTitle: string;
  connected: boolean;
  researcherCount: number;
  workingCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  onOpenDiagnostics?: () => void;
  inboxPanel: ReactNode;
  historyPanel: ReactNode;
  kanbanPanel: ReactNode;
  playbooksPanel: ReactNode;
  analyticsPanel: ReactNode;
  researchersPanel: ReactNode;
  settingsPanel: ReactNode;
};

const SECTIONS = [
  { id: "researchers", label: "연구원", icon: Users, description: "연구원을 선택하고 작업을 이어가세요." },
  { id: "kanban", label: "작업 보드", icon: ListTodo, description: "요청한 작업의 진행 상황을 한곳에서 확인하세요." },
  { id: "inbox", label: "연구 결과", icon: Inbox, description: "연구원별 최근 응답과 확인하지 않은 결과입니다." },
  { id: "history", label: "실행 기록", icon: History, description: "현재 세션에서 실행한 작업과 완료 상태를 확인하세요." },
  { id: "playbooks", label: "일정·절차", icon: BookOpen, description: "반복 작업과 연구 절차를 관리하세요." },
  { id: "analytics", label: "사용 현황", icon: Activity, description: "연구원 활동과 사용량을 살펴보세요." },
  { id: "settings", label: "설정", icon: Settings2, description: "연구실 화면, 런타임 연결과 선택적 연동을 관리하세요." },
] as const;

export function HQSidebar(props: HQSidebarProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const customTitle = props.officeTitle.trim() && !/^REVELARE(?: Security Labs)?$/i.test(props.officeTitle.trim()) ? props.officeTitle.trim() : null;
  const section = SECTIONS.find(item => item.id === props.activeTab)!;
  const panels: Record<HQSidebarTab, ReactNode> = {
    inbox: props.inboxPanel, history: props.historyPanel, kanban: props.kanbanPanel,
    playbooks: props.playbooksPanel, analytics: props.analyticsPanel,
    researchers: props.researchersPanel, settings: props.settingsPanel,
  };
  const select = (tab: HQSidebarTab) => {
    setMobileMoreOpen(false);
    props.onTabChange(tab);
    if (!props.open) props.onToggle();
  };
  return (
    <>
      <header className="workspace-header">
        <button type="button" className="workspace-brand" onClick={() => { setMobileMoreOpen(false); if (props.open) props.onToggle(); }} aria-label="REVELARE 연구실 홈"><span className="workspace-brand-symbol"><FlaskConical size={21} /></span><span>REVELARE<small>SECURITY LABS</small></span></button>
        <div className="workspace-location">{customTitle ? <span>{customTitle}</span> : null}<strong>{props.open ? section.label : "연구실"}</strong></div>
        <div className="workspace-header-actions">
          <span className="workspace-connection" data-connected={props.connected}><i />{props.connected ? "연결됨" : "연결 끊김"}</span>
          <span className="workspace-count">연구원 {props.researcherCount} · 작업 중 {props.workingCount}</span>
          <button type="button" className="workspace-chat-button" aria-label={props.chatOpen ? "대화 닫기" : "대화 열기"} aria-pressed={props.chatOpen} onClick={props.onToggleChat}><MessageSquare size={16} /><span>{props.chatOpen ? "대화 닫기" : "대화 열기"}</span></button>
        </div>
      </header>
      <nav className="workspace-navigation" aria-label="연구실 메뉴">
        <button type="button" aria-current={!props.open ? "page" : undefined} onClick={() => { setMobileMoreOpen(false); if (props.open) props.onToggle(); }}><FlaskConical size={20} /><span>연구실</span></button>
        {SECTIONS.filter(item => item.id !== "settings").map(({id, label, icon: Icon}) => <button type="button" key={id} className={["history", "playbooks", "analytics"].includes(id) ? "workspace-secondary-nav" : undefined} aria-current={props.open && props.activeTab === id ? "page" : undefined} onClick={() => select(id)}><Icon size={20} /><span>{label}</span>{id === "inbox" && props.inboxCount > 0 ? <b className="workspace-unread">{props.inboxCount}</b> : null}</button>)}
        <div className="workspace-nav-spacer" />
        <button type="button" className="workspace-secondary-nav" onClick={props.onOpenMarketplace}><Wrench size={20} /><span>연구 도구</span></button>
        <button type="button" className="workspace-secondary-nav" aria-current={props.open && props.activeTab === "settings" ? "page" : undefined} onClick={() => select("settings")}><Settings2 size={20} /><span>설정</span></button>
        <button type="button" className="workspace-mobile-more" aria-expanded={mobileMoreOpen} aria-controls="workspace-mobile-menu" onClick={() => setMobileMoreOpen(value => !value)}><MoreHorizontal size={20} /><span>더보기</span></button>
      </nav>
      {mobileMoreOpen ? <><button className="workspace-mobile-menu-dismiss" type="button" aria-label="추가 메뉴 닫기" onClick={() => setMobileMoreOpen(false)} /><div className="workspace-mobile-menu" id="workspace-mobile-menu" role="group" aria-label="추가 메뉴">{SECTIONS.filter(item => ["history", "playbooks", "analytics", "settings"].includes(item.id)).map(({id,label,icon: Icon}) => <button type="button" key={id} onClick={() => select(id)}><Icon size={18} />{label}</button>)}<button type="button" onClick={() => { setMobileMoreOpen(false); props.onOpenMarketplace(); }}><Wrench size={18} />연구 도구</button></div></> : null}
      {props.open ? <section className="workspace-content" aria-label={section.label}>
        <div className="workspace-content-heading"><div><h1>{section.label}</h1><span>{section.description}</span></div><button className="workspace-icon-button" type="button" onClick={props.onToggle} aria-label="연구실로 돌아가기"><X size={20} /></button></div>
        {props.activeTab === "researchers" ? <div className="workspace-section-actions"><button type="button" className="ui-btn-primary" onClick={props.onAddAgent}><Users size={16} />연구원 추가</button><button type="button" className="ui-btn-secondary" onClick={props.onOpenCompanyBuilder}><Boxes size={16} />연구팀 구성</button></div> : null}
        <div className="workspace-content-body">{panels[props.activeTab]}</div>
        {props.activeTab === "settings" && props.onOpenDiagnostics ? <button type="button" className="workspace-diagnostics" onClick={props.onOpenDiagnostics}>연결 진단·이벤트 보기</button> : null}
      </section> : null}
    </>
  );
}
