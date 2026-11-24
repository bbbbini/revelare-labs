"use client";

import type { StudioGatewayAdapterType } from "@/lib/studio/settings";
import { OFFICE_RENDER_MODE_OPTIONS, type OfficeRenderMode } from "@/features/office/renderMode";

type Props = {
  title: string; titleLoaded: boolean; onTitleChange: (value: string) => void;
  connected: boolean; connecting: boolean; url: string; token: string; adapter: StudioGatewayAdapterType;
  error: string | null; onUrlChange: (value: string) => void; onTokenChange: (value: string) => void;
  onAdapterChange: (value: StudioGatewayAdapterType) => void; onConnect: () => void; onDisconnect: () => void;
  renderMode: OfficeRenderMode; onRenderModeChange: (value: OfficeRenderMode) => void;
  onOpenDiagnostics?: () => void; onOpenTools?: () => void; onManageResearchers?: () => void;
};

export function ResearchSettings(props: Props) {
  return <div className="research-settings">
    <section><h2>연구실</h2><label>연구실 이름<input className="ui-input" aria-label="연구실 이름" value={props.title} maxLength={48} disabled={!props.titleLoaded} onChange={event=>props.onTitleChange(event.target.value)} /></label><p>이름과 연결 정보는 기존 연구실 설정에 저장됩니다.</p></section>
    <section><h2>작업 런타임</h2><p>연구 작업은 이 주소에 연결된 연구원에게 전달됩니다.</p>
      <label>런타임 종류<select className="ui-input" value={props.adapter} onChange={event=>props.onAdapterChange(event.target.value as StudioGatewayAdapterType)}><option value="custom">Labs Runtime · 커스텀</option><option value="hermes">Hermes 게이트웨이</option><option value="hermes-agent">Hermes Agent · 직접 연결</option><option value="local">로컬 런타임</option><option value="hermes3d">Hermes3D 런타임</option><option value="demo">데모</option></select></label>
      <label>런타임 주소<input className="ui-input" value={props.url} onChange={event=>props.onUrlChange(event.target.value)} spellCheck={false} autoCapitalize="none" /></label>
      <label>연결 토큰<input className="ui-input" type="password" value={props.token} onChange={event=>props.onTokenChange(event.target.value)} autoComplete="off" placeholder="서버에 설정한 토큰이 있으면 생략" /></label>
      {props.error ? <p role="alert" className="research-task-error">{props.error}</p> : null}
      <div className="research-settings-actions"><span className="workspace-connection" data-connected={props.connected}><i />{props.connected ? "연결됨" : props.connecting ? "연결 중" : "연결 끊김"}</span><button type="button" className="ui-btn-primary" disabled={!props.url.trim()||props.connecting} onClick={props.onConnect}>{props.connected ? "이 설정으로 다시 연결" : "런타임 연결"}</button><button type="button" className="ui-btn-secondary" disabled={!props.connected} onClick={props.onDisconnect}>연결 해제</button></div>
    </section>
    <details><summary>화면·고급 관리</summary><label>연구실 화면<select className="ui-input" value={props.renderMode} onChange={event=>props.onRenderModeChange(event.target.value as OfficeRenderMode)}>{OFFICE_RENDER_MODE_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label><div className="research-settings-actions">{props.onManageResearchers ? <button className="ui-btn-secondary" type="button" onClick={props.onManageResearchers}>연구원 추가</button> : null}{props.onOpenTools ? <button className="ui-btn-secondary" type="button" onClick={props.onOpenTools}>런타임 도구 관리</button> : null}{props.onOpenDiagnostics ? <button className="ui-btn-secondary" type="button" onClick={props.onOpenDiagnostics}>연결 진단·이벤트</button> : null}</div></details>
  </div>;
}
