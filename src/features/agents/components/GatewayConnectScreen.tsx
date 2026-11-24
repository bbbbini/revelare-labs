import { useState } from "react";
import { Check, Eye, EyeOff, FlaskConical, Link2 } from "lucide-react";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";
import { inspectUpstreamGatewayUrl } from "@/lib/gateway/upstreamUrlDiagnostics";
import type { StudioGatewayAdapterType, StudioGatewaySettings } from "@/lib/studio/settings";
import { OFFICE_RENDER_MODE_OPTIONS, type OfficeRenderMode } from "@/features/office/renderMode";

type GatewayConnectScreenProps = {
  gatewayUrl: string; token: string;
  selectedAdapterType: StudioGatewayAdapterType; activeAdapterType: StudioGatewayAdapterType;
  localGatewayDefaults: StudioGatewaySettings | null;
  status: GatewayStatus; error: string | null;
  onGatewayUrlChange: (value: string) => void; onTokenChange: (value: string) => void;
  onAdapterTypeChange: (value: StudioGatewayAdapterType) => void;
  onUseLocalDefaults: () => void; onConnect: () => void;
  renderMode?: OfficeRenderMode; onRenderModeChange?: (mode: OfficeRenderMode) => void;
};

export const GatewayConnectScreen = (props: GatewayConnectScreenProps) => {
  const [showToken, setShowToken] = useState(false);
  const findings = inspectUpstreamGatewayUrl(props.gatewayUrl, props.selectedAdapterType);
  const isLabs = props.selectedAdapterType === "custom";
  const connecting = props.status === "connecting";
  return <div className="workspace-connect">
    <div className="workspace-connect-intro"><span className="workspace-brand-symbol"><FlaskConical size={25} /></span><p className="workspace-eyebrow">REVELARE SECURITY LABS</p><h1>연구실에 연결하기</h1><p>연구원이 실행 중인 런타임에 연결하면<br />작업을 요청하고 결과를 확인할 수 있습니다.</p></div>
    <form className="workspace-connect-form" onSubmit={event => { event.preventDefault(); if (!connecting && props.gatewayUrl.trim()) props.onConnect(); }}>
      <label>런타임 종류<select className="ui-input" value={props.selectedAdapterType} onChange={event => props.onAdapterTypeChange(event.target.value as StudioGatewayAdapterType)}>
        <option value="custom">Labs Runtime · 커스텀</option><option value="hermes">Hermes 게이트웨이</option><option value="hermes-agent">Hermes Agent · 직접 연결</option><option value="local">로컬 런타임</option><option value="hermes3d">Hermes3D 런타임</option><option value="demo">데모 · 둘러보기</option>
      </select></label>
      <label>런타임 주소<input className="ui-input" value={props.gatewayUrl} onChange={event => props.onGatewayUrlChange(event.target.value)} placeholder={isLabs ? "http://127.0.0.1:7770" : "ws://localhost:18789"} spellCheck={false} autoCapitalize="none" /></label>
      {findings.length > 0 ? <ul aria-label="Gateway URL warnings" className="space-y-2">{findings.map(finding => <li key={finding.code} data-testid={`gateway-url-finding-${finding.code}`} className={finding.severity === "error" ? "ui-alert-danger p-3" : "ui-alert-caution p-3"}><p>{finding.message}</p><p>{finding.fix}</p></li>)}</ul> : null}
      <label>연결 토큰 {isLabs ? "(서버 설정 시 생략)" : "(필요한 경우)"}<span className="workspace-token-field"><input className="ui-input" type={showToken ? "text" : "password"} value={props.token} onChange={event => props.onTokenChange(event.target.value)} placeholder={isLabs ? "서버에 설정한 토큰을 사용합니다" : "런타임 연결 토큰"} autoComplete="off" /><button type="button" className="workspace-icon-button" onClick={() => setShowToken(value => !value)} aria-label={showToken ? "토큰 숨기기" : "토큰 표시"}>{showToken ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      {props.error ? <div role="alert" className="ui-alert-danger p-3">{props.error}</div> : null}
      <button type="submit" className="ui-btn-primary workspace-connect-submit" disabled={connecting || !props.gatewayUrl.trim()}><Link2 size={17} />{connecting ? "연결하는 중…" : "연결"}</button>
      <p className="workspace-form-note">연결 정보는 선택한 런타임별로 저장됩니다.</p>
    </form>
    <details className="workspace-connect-help"><summary>실행 방법·다른 연결 옵션</summary><p>{isLabs ? "Labs Runtime을 먼저 실행한 뒤 설정한 주소로 연결하세요. 토큰은 서버 설정에서 가져옵니다." : "사용할 게이트웨이를 실행한 뒤 해당 주소와 토큰으로 연결하세요."}</p><code>{isLabs ? "npm run labs-runtime" : props.selectedAdapterType === "demo" ? "npm run demo-gateway" : "npm run hermes-adapter"}</code>{props.localGatewayDefaults ? <button className="ui-btn-secondary" type="button" onClick={props.onUseLocalDefaults}>로컬 기본값 사용</button> : null}<p>원격 연결은 해당 런타임에서 제공한 주소를 사용하세요. Labs Runtime의 기본 로컬 주소는 http://127.0.0.1:7770입니다.</p></details>
    {props.renderMode && props.onRenderModeChange ? <details className="workspace-connect-help"><summary>연구실 화면 선택</summary><div className="workspace-render-options">{OFFICE_RENDER_MODE_OPTIONS.map(option => <button key={option.id} type="button" aria-pressed={props.renderMode === option.id} data-testid={`connect-render-mode-${option.id}`} onClick={() => props.onRenderModeChange?.(option.id)}><strong>{option.label}{props.renderMode === option.id ? <Check size={15} /> : null}</strong><span>{option.description}</span></button>)}</div></details> : null}
  </div>;
};
