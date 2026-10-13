import { useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";
import { isLocalGatewayUrl } from "@/lib/gateway/local-gateway";
import { inspectUpstreamGatewayUrl } from "@/lib/gateway/upstreamUrlDiagnostics";
import type { StudioGatewayAdapterType, StudioGatewaySettings } from "@/lib/studio/settings";
import {
  OFFICE_RENDER_MODE_OPTIONS,
  type OfficeRenderMode,
} from "@/features/office/renderMode";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";

type GatewayConnectScreenProps = {
  gatewayUrl: string;
  token: string;
  selectedAdapterType: StudioGatewayAdapterType;
  activeAdapterType: StudioGatewayAdapterType;
  localGatewayDefaults: StudioGatewaySettings | null;
  status: GatewayStatus;
  error: string | null;
  onGatewayUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onAdapterTypeChange: (value: StudioGatewayAdapterType) => void;
  onUseLocalDefaults: () => void;
  onConnect: () => void;
  /** When provided, shows the 3D/2D office renderer choice before connecting. */
  renderMode?: OfficeRenderMode;
  onRenderModeChange?: (mode: OfficeRenderMode) => void;
};

const resolveLocalGatewayPort = (gatewayUrl: string): number => {
  try {
    const parsed = new URL(gatewayUrl);
    const port = Number(parsed.port);
    if (Number.isFinite(port) && port > 0) return port;
  } catch {}
  return 18789;
};

export const GatewayConnectScreen = ({
  gatewayUrl,
  token,
  selectedAdapterType,
  activeAdapterType,
  localGatewayDefaults,
  status,
  error,
  onGatewayUrlChange,
  onTokenChange,
  onAdapterTypeChange,
  onUseLocalDefaults,
  onConnect,
  renderMode,
  onRenderModeChange,
}: GatewayConnectScreenProps) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showToken, setShowToken] = useState(false);
  const tokenOptional =
    selectedAdapterType === "hermes" ||
    selectedAdapterType === "demo" ||
    selectedAdapterType === "local" ||
    selectedAdapterType === "hermes3d" ||
    selectedAdapterType === "custom";
  const isLocal = useMemo(() => isLocalGatewayUrl(gatewayUrl), [gatewayUrl]);
  const urlFindings = useMemo(
    () => inspectUpstreamGatewayUrl(gatewayUrl, selectedAdapterType),
    [gatewayUrl, selectedAdapterType]
  );
  const localPort = useMemo(() => resolveLocalGatewayPort(gatewayUrl), [gatewayUrl]);
  const localGatewayCommand = useMemo(
    () => `HERMES_ADAPTER_PORT=${localPort} npm run hermes-adapter`,
    [localPort]
  );
  const localGatewayCommandPnpm = useMemo(
    () => `HERMES_ADAPTER_PORT=${localPort} pnpm hermes-adapter`,
    [localPort]
  );
  const localDemoCommand = useMemo(
    () => `npm run demo-gateway`,
    []
  );
  const useDemoPreset = () => {
    onAdapterTypeChange("demo");
  };
  const useHermesPreset = () => {
    onAdapterTypeChange("hermes");
  };
  const useHermesAgentPreset = () => {
    onAdapterTypeChange("hermes-agent");
  };
  const useCustomPreset = () => {
    onAdapterTypeChange("custom");
  };
  const useLocalPreset = () => {
    onAdapterTypeChange("local");
  };
  const useHermes3dPreset = () => {
    onAdapterTypeChange("hermes3d");
  };
  const statusCopy = useMemo(() => {
    if (status === "connecting" && isLocal) {
      return `${localPort} 포트에서 로컬 게이트웨이를 찾았습니다. 연결 중…`;
    }
    if (status === "connecting") {
      return "원격 게이트웨이에 연결 중…";
    }
    if (isLocal) {
      return "로컬 게이트웨이를 찾지 못했습니다.";
    }
    return "게이트웨이에 연결되지 않았습니다.";
  }, [isLocal, localPort, status]);
  const selectedAdapterHint = useMemo(() => {
    switch (selectedAdapterType) {
      case "hermes":
        return "Hermes는 게이트웨이 뒤에서 자체 provider·계정 흐름을 쓰는 에이전트 런타임입니다.";
      case "hermes-agent":
        return "Hermes Agent는 어댑터 프로세스 없이 hermes-agent 백엔드의 JSON-RPC 게이트웨이에 직접 연결합니다. 서버 루트 주소를 입력하고(Studio가 /api/ws를 붙입니다) 대시보드 로그인이 아닌 세션 토큰을 사용하세요.";
      case "demo":
        return "데모는 로컬의 기본 main 에이전트로 동작하거나, 함께 제공되는 mock 게이트웨이에 연결해 스트리밍 답변을 받을 수 있습니다.";
      case "local":
        return "로컬 런타임은 provider 카탈로그가 아니라 HTTP로 직접 연결되는 런타임/오케스트레이터를 대상으로 합니다.";
      case "hermes3d":
        return "Hermes3D 런타임은 직접 런타임 연결에서 Hermes3D transcript 규칙을 그대로 사용합니다.";
      case "custom":
      default:
        return "커스텀은 범용 직접 런타임 연결입니다. 호환되는 오케스트레이터에 사용하고, provider 전용 인증 흐름에는 사용하지 마세요.";
    }
  }, [selectedAdapterType]);
  const connectDisabled = status === "connecting";
  const connectLabel = connectDisabled ? "연결 중…" : "연결";
  const statusDotClass =
    status === "connected"
      ? "ui-dot-status-connected"
      : status === "connecting"
        ? "ui-dot-status-connecting"
        : "ui-dot-status-disconnected";

  const copyLocalCommand = async () => {
    try {
      await navigator.clipboard.writeText(localGatewayCommand);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  const commandField = (
    <div className="space-y-1.5">
      <div className="ui-command-surface flex items-center gap-2 rounded-md px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-[var(--command-fg)]">
          {localGatewayCommand}
        </code>
        <button
          type="button"
          className="ui-btn-icon ui-command-copy h-7 w-7 shrink-0"
          onClick={copyLocalCommand}
          aria-label="로컬 게이트웨이 명령 복사"
          title="명령 복사"
        >
          {copyStatus === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {copyStatus === "copied" ? (
        <p className="text-xs text-muted-foreground">복사됨</p>
      ) : copyStatus === "failed" ? (
        <p className="ui-text-danger text-xs">명령을 복사하지 못했습니다.</p>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">
          소스 체크아웃에서는 <span className="font-mono text-foreground">{localGatewayCommandPnpm}</span>을 사용하세요.
        </p>
      )}
    </div>
  );

  const remoteForm = (
    <div className="mt-2.5 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[11px] font-medium text-foreground/90">
        업스트림 URL
        <input
          className="ui-input h-10 rounded-md px-4 font-sans text-sm text-foreground outline-none"
          type="text"
          value={gatewayUrl}
          onChange={(event) => onGatewayUrlChange(event.target.value)}
          placeholder="wss://your-gateway.example.com"
          spellCheck={false}
        />
      </label>

      {urlFindings.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Gateway URL warnings">
          {urlFindings.map((finding) => (
            <li
              key={finding.code}
              data-testid={`gateway-url-finding-${finding.code}`}
              className={`rounded-md px-3 py-2 text-xs leading-snug ${
                finding.severity === "error" ? "ui-alert-danger" : "ui-alert-caution"
              }`}
            >
              <p className="font-medium">{finding.message}</p>
              <p className="mt-1 opacity-80">{finding.fix}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Tailscale을 사용하나요?</p>
        <p>
          URL: <span className="font-mono">wss://&lt;your-tailnet-host&gt;</span>
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-foreground/90">
        {tokenOptional ? "업스트림 토큰 (선택)" : "업스트림 토큰"}
        <div className="relative">
          <input
            className="ui-input h-10 w-full rounded-md px-4 pr-10 font-sans text-sm text-foreground outline-none"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder={tokenOptional ? "토큰 (선택)" : "게이트웨이 토큰"}
            spellCheck={false}
          />
          <button
            type="button"
            className="ui-btn-icon absolute inset-y-0 right-1 my-auto h-8 w-8 border-transparent bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label={showToken ? "토큰 숨기기" : "토큰 보기"}
            onClick={() => setShowToken((prev) => !prev)}
          >
            {showToken ? (
              <EyeOff className="h-4 w-4 transition-transform duration-150" />
            ) : (
              <Eye className="h-4 w-4 transition-transform duration-150" />
            )}
          </button>
        </div>
      </label>

      <button
        type="button"
        className="ui-btn-primary mt-1 h-11 w-full px-4 text-xs font-semibold tracking-[0.05em] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onConnect}
        disabled={connectDisabled || !gatewayUrl.trim()}
      >
        {connectLabel}
      </button>

      {status === "connecting" ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RunningAvatarLoader size={16} trackWidth={32} inline />
          연결 중…
        </div>
      ) : null}
      {error ? <p className="ui-text-danger text-xs leading-snug">{error}</p> : null}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col gap-5">
      <div className="ui-card px-4 py-2">
        <div className="flex items-center gap-2">
          {status === "connecting" ? (
            <RunningAvatarLoader size={18} trackWidth={36} inline />
          ) : (
            <span
              className={`h-2.5 w-2.5 ${statusDotClass}`}
            />
          )}
          <p className="text-sm font-semibold text-foreground">{statusCopy}</p>
        </div>
      </div>

      {renderMode && onRenderModeChange ? (
        <div className="ui-card px-4 py-4 sm:px-6">
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-muted-foreground">
            오피스 렌더러
          </p>
          <p className="mt-2 text-sm text-foreground/90">
            연결 전에 고르세요. 고르기 전에는 무거운 리소스를 불러오지 않습니다.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {OFFICE_RENDER_MODE_OPTIONS.map((option) => {
              const selected = renderMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`connect-render-mode-${option.id}`}
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--surface-selected)]"
                      : "border-border bg-muted/30 hover:border-[color:var(--surface-selected-border)]"
                  }`}
                  onClick={() => onRenderModeChange(option.id)}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    {option.label}
                    {selected ? <Check className="h-3.5 w-3.5 text-[color:var(--primary)]" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="ui-card px-4 py-5 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-muted-foreground">
            원격 게이트웨이 (권장)
          </p>
          <p className="mt-2 text-sm text-foreground/90">
            백엔드를 고른 뒤 해당 게이트웨이 URL로 연결하세요.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            선택한 백엔드: {selectedAdapterType} | 사용 중인 백엔드: {activeAdapterType}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            백엔드마다 URL과 토큰이 따로 저장됩니다.
          </p>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            {selectedAdapterHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useDemoPreset}
            >
              데모 백엔드
            </button>
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useHermesPreset}
            >
              Hermes 백엔드
            </button>
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useHermesAgentPreset}
            >
              Hermes Agent (직접 연결)
            </button>
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useLocalPreset}
            >
              로컬 런타임
            </button>
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useHermes3dPreset}
            >
              Hermes3D 런타임
            </button>
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
              onClick={useCustomPreset}
            >
              커스텀 백엔드
            </button>
          </div>
        </div>
        {remoteForm}
      </div>

      <div className="ui-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground">
            로컬에서 실행 (선택)
          </p>
          <p className="text-sm text-foreground/90">
            이 컴퓨터에서 로컬 게이트웨이 프로세스를 시작한 뒤 연결하세요.
          </p>
        </div>
        <div className="mt-3 space-y-3">
          {selectedAdapterType === "custom" ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="text-xs font-medium text-foreground">Labs Runtime을 사용하나요?</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                <span className="font-mono text-foreground">npm run labs-runtime</span>을 실행한 뒤
                <span className="font-mono text-foreground"> 커스텀 백엔드</span>에서 URL
                <span className="font-mono text-foreground"> http://127.0.0.1:7770</span>에 연결하세요.
                토큰은 Studio 서버가 자동으로 붙이므로 비워 둡니다.
              </p>
            </div>
          ) : null}
          {selectedAdapterType === "hermes" ? commandField : null}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">오피스만 먼저 보고 싶나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">{localDemoCommand}</span>를 실행하면 데모 에이전트가 있는 내장 mock 게이트웨이가 시작됩니다.
              그다음 <span className="font-mono text-foreground">데모 백엔드</span>를 고르고 연결하세요.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">Hermes를 로컬에서 사용하나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">npm run hermes-adapter</span>를 실행한 뒤
              <span className="font-mono text-foreground"> Hermes 백엔드</span>를 고르세요. 기본 로컬 URL은
              <span className="font-mono text-foreground"> ws://localhost:18789</span>입니다.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">로컬 또는 커스텀 런타임을 사용하나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">로컬 런타임</span>,
              <span className="font-mono text-foreground"> Hermes3D 런타임</span>,
              <span className="font-mono text-foreground"> 커스텀 백엔드</span> 중 하나를 고르고 URL을
              오케스트레이터나 런타임 주소로 지정하세요. 이 프로필들은 URL과 토큰을 따로 저장합니다.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">다른 컴퓨터에서 접속하나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              localhost 밖으로 노출하기 전에 <span className="font-mono text-foreground">HOST=0.0.0.0</span>(또는
              특정 LAN/Tailscale 호스트)으로 Studio를 시작하고
              <span className="font-mono text-foreground"> STUDIO_ACCESS_TOKEN</span>을 설정하세요. 게이트웨이
              설정은 Studio 호스트에 저장되지만 기기 승인은 브라우저·기기마다 따로 합니다.
            </p>
          </div>
          {localGatewayDefaults ? (
            <div className="ui-input rounded-md px-3 py-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">~/.hermes/hermes.json</span>의 토큰을 사용합니다.
                </p>
                <p className="font-mono text-[11px] text-foreground">
                  {localGatewayDefaults.url}
                </p>
                <button
                  type="button"
                  className="ui-btn-secondary h-9 w-full px-3 text-xs font-semibold tracking-[0.05em]"
                  onClick={onUseLocalDefaults}
                >
                  로컬 기본값 사용
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
