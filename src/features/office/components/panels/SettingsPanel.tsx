"use client";

import { useState } from "react";
import { CURATED_ELEVENLABS_VOICES } from "@/lib/voiceReply/catalog";
import type { StudioGatewayAdapterType } from "@/lib/studio/settings";
import {
  GRAPHICS_QUALITY_OPTIONS,
  type GraphicsQuality,
} from "@/features/retro-office/core/graphicsQuality";
import {
  OFFICE_RENDER_MODE_OPTIONS,
  type OfficeRenderMode,
} from "@/features/office/renderMode";
import { GATEWAY_STATUS_LABELS } from "@/features/office/statusLabels";

type SettingsPanelProps = {
  gatewayStatus?: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  selectedAdapterType?: StudioGatewayAdapterType;
  activeAdapterType?: StudioGatewayAdapterType;
  onGatewayDisconnect?: () => void;
  onGatewayConnect?: () => void;
  onGatewayUrlChange?: (value: string) => void;
  onGatewayTokenChange?: (value: string) => void;
  onGatewayAdapterTypeChange?: (value: StudioGatewayAdapterType) => void;
  onOpenOnboarding?: () => void;
  officeTitle: string;
  officeTitleLoaded: boolean;
  onOfficeTitleChange: (title: string) => void;
  remoteOfficeEnabled: boolean;
  remoteOfficeSourceKind: "presence_endpoint" | "hermes_gateway";
  remoteOfficeLabel: string;
  remoteOfficePresenceUrl: string;
  remoteOfficeGatewayUrl: string;
  remoteOfficeTokenConfigured: boolean;
  onRemoteOfficeEnabledChange: (enabled: boolean) => void;
  onRemoteOfficeSourceKindChange: (kind: "presence_endpoint" | "hermes_gateway") => void;
  onRemoteOfficeLabelChange: (label: string) => void;
  onRemoteOfficePresenceUrlChange: (url: string) => void;
  onRemoteOfficeGatewayUrlChange: (url: string) => void;
  onRemoteOfficeTokenChange: (token: string) => void;
  voiceRepliesEnabled: boolean;
  voiceRepliesVoiceId: string | null;
  voiceRepliesSpeed: number;
  voiceRepliesLoaded: boolean;
  onVoiceRepliesToggle: (enabled: boolean) => void;
  onVoiceRepliesVoiceChange: (voiceId: string | null) => void;
  onVoiceRepliesSpeedChange: (speed: number) => void;
  onVoiceRepliesPreview: (voiceId: string | null, voiceName: string) => void;
  graphicsQuality?: GraphicsQuality;
  onGraphicsQualityChange?: (quality: GraphicsQuality) => void;
  renderMode?: OfficeRenderMode;
  onRenderModeChange?: (mode: OfficeRenderMode) => void;
};

export function SettingsPanel({
  gatewayStatus,
  gatewayUrl,
  gatewayToken,
  selectedAdapterType = "hermes",
  activeAdapterType = "hermes",
  onGatewayDisconnect,
  onGatewayConnect,
  onGatewayUrlChange,
  onGatewayTokenChange,
  onGatewayAdapterTypeChange,
  onOpenOnboarding,
  officeTitle,
  officeTitleLoaded,
  onOfficeTitleChange,
  remoteOfficeEnabled,
  remoteOfficeSourceKind,
  remoteOfficeLabel,
  remoteOfficePresenceUrl,
  remoteOfficeGatewayUrl,
  remoteOfficeTokenConfigured,
  onRemoteOfficeEnabledChange,
  onRemoteOfficeSourceKindChange,
  onRemoteOfficeLabelChange,
  onRemoteOfficePresenceUrlChange,
  onRemoteOfficeGatewayUrlChange,
  onRemoteOfficeTokenChange,
  voiceRepliesEnabled,
  voiceRepliesVoiceId,
  voiceRepliesSpeed,
  voiceRepliesLoaded,
  onVoiceRepliesToggle,
  onVoiceRepliesVoiceChange,
  onVoiceRepliesSpeedChange,
  onVoiceRepliesPreview,
  graphicsQuality,
  onGraphicsQualityChange,
  renderMode,
  onRenderModeChange,
}: SettingsPanelProps) {
  const normalizedGatewayUrl = gatewayUrl?.trim() ?? "";
  const normalizedGatewayToken = gatewayToken ?? "";
  const gatewayStateLabel = gatewayStatus
    ? GATEWAY_STATUS_LABELS[gatewayStatus] ?? gatewayStatus
    : "알 수 없음";
  const isGatewayConnected = gatewayStatus === "connected";
  const gatewayDisconnectDisabled = !isGatewayConnected;
  const gatewayConnectDisabled = normalizedGatewayUrl.length === 0;
  const tokenOptional =
    selectedAdapterType === "hermes" ||
    selectedAdapterType === "demo" ||
    selectedAdapterType === "local" ||
    selectedAdapterType === "hermes3d" ||
    selectedAdapterType === "custom";
  const [settingsSection, setSettingsSection] = useState("general");
  const [remoteOfficeTokenDraft, setRemoteOfficeTokenDraft] = useState("");

  return (
    <div className="workspace-settings px-6 py-6" data-section={settingsSection}>
      <nav className="workspace-settings-tabs" aria-label="설정 분류">{[{id: "general", label: "연구실 화면"}, {id: "connection", label: "런타임 연결"}, {id: "integrations", label: "선택적 연동"}].map(tab => <button key={tab.id} type="button" aria-pressed={settingsSection === tab.id} onClick={() => setSettingsSection(tab.id)}>{tab.label}</button>)}</nav>
      <div data-setting-group="general" className="rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-foreground">연구실 이름</div>
            <div className="mt-1 text-[12px] text-foreground">
              화면 상단에 표시할 연구실 이름입니다.
            </div>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
            {officeTitleLoaded ? "준비됨" : "불러오는 중"}
          </span>
        </div>
        <input
          type="text"
          value={officeTitle}
          aria-label="연구실 이름"
          maxLength={48}
          disabled={!officeTitleLoaded}
          onChange={(event) => onOfficeTitleChange(event.target.value)}
          placeholder="REVELARE Security Labs"
          className="mt-3 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-primary outline-none transition-colors placeholder:text-primary focus:border-border disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 text-[12px] text-muted-foreground">
          최대 48자까지 입력할 수 있습니다.
        </div>
      </div>
      <div data-setting-group="connection" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-foreground">런타임 연결</div>
            <div className="mt-1 text-[12px] text-foreground">
              사용할 백엔드를 바꾸고 저장된 연결 정보를 수정합니다.
            </div>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
            {gatewayStateLabel}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["demo", "데모"],
              ["hermes", "Hermes"],
              ["local", "로컬"],
              ["hermes3d", "Hermes3D"],
              ["custom", "커스텀"],
            ] as const
          ).map(([adapterType, label]) => {
            const selected = selectedAdapterType === adapterType;
            return (
              <button
                key={adapterType}
                type="button"
                onClick={() => onGatewayAdapterTypeChange?.(adapterType)}
                className={`rounded-md border px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  selected
                    ? "border-border bg-accent text-primary"
                    : "border-border bg-surface-1 text-foreground hover:border-border hover:text-primary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
              업스트림 URL
            </div>
            <input
              type="text"
              value={gatewayUrl ?? ""}
              onChange={(event) => onGatewayUrlChange?.(event.target.value)}
              placeholder={
                selectedAdapterType === "custom" ||
                selectedAdapterType === "local"
                  ? "http://127.0.0.1:7770"
                  : selectedAdapterType === "hermes3d"
                    ? "http://localhost:3000/api/runtime/custom"
                  : "ws://localhost:18789"
              }
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 font-mono text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
            />
          </div>
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
              {tokenOptional ? "업스트림 토큰 (선택)" : "업스트림 토큰"}
            </div>
            <input
              type="password"
              value={normalizedGatewayToken}
              onChange={(event) => onGatewayTokenChange?.(event.target.value)}
              placeholder={tokenOptional ? "토큰 (선택)" : "게이트웨이 토큰"}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <span className="font-mono">
            선택한 백엔드: {selectedAdapterType}
          </span>
          <span className="font-mono">
            사용 중인 백엔드: {activeAdapterType}
          </span>
          <span>백엔드마다 URL과 토큰이 따로 저장됩니다.</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[12px] text-muted-foreground">
            연결하면 선택한 백엔드가 적용되고, 연결을 끊으면 연결 화면으로 돌아갑니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGatewayConnect?.()}
              disabled={gatewayConnectDisabled}
              className="rounded-md border border-border bg-accent px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-primary transition-colors hover:border-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {gatewayStatus === "connecting" ? "연결 중..." : "연결"}
            </button>
            <button
              type="button"
              onClick={() => onGatewayDisconnect?.()}
              disabled={gatewayDisconnectDisabled}
              className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-rose-700 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              게이트웨이 연결 끊기
            </button>
          </div>
        </div>
      </div>
      <div data-setting-group="integrations" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-foreground">외부 연구실</div>
            <div className="mt-1 text-[12px] text-foreground">
              다른 Hermes3D나 원격 Hermes 게이트웨이의 오피스를 읽기 전용으로 하나 더 붙입니다.
            </div>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
            {remoteOfficeEnabled ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <div className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-label="외부 연구실"
              aria-checked={remoteOfficeEnabled}
              className={`ui-switch self-center ${remoteOfficeEnabled ? "ui-switch--on" : ""}`}
              onClick={() => onRemoteOfficeEnabledChange(!remoteOfficeEnabled)}
            >
              <span className="ui-switch-thumb" />
            </button>
            <div className="flex flex-col">
              <span className="text-[12px] font-medium text-foreground">외부 연구원 표시</span>
              <span className="text-[12px] text-foreground">
                원격 에이전트는 보이지만 상호작용할 수 없습니다.
              </span>
            </div>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
            {remoteOfficeTokenConfigured ? "토큰 설정됨" : "토큰 없음"}
          </span>
        </div>
        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
              소스 유형
            </div>
            <select
              value={remoteOfficeSourceKind}
              onChange={(event) =>
                onRemoteOfficeSourceKindChange(
                  event.target.value as "presence_endpoint" | "hermes_gateway"
                )
              }
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors focus:border-border"
            >
              <option value="presence_endpoint">원격 Hermes3D presence endpoint</option>
              <option value="hermes_gateway">원격 Hermes 게이트웨이</option>
            </select>
            <div className="mt-1 text-[12px] text-muted-foreground">
              다른 컴퓨터가 Hermes3D를 실행하면 presence endpoint를, Hermes만 실행하면 게이트웨이 모드를 사용하세요.
            </div>
          </div>
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
              이름
            </div>
            <input
              type="text"
              value={remoteOfficeLabel}
              maxLength={48}
              onChange={(event) => onRemoteOfficeLabelChange(event.target.value)}
              placeholder="외부 연구실"
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] uppercase tracking-[0.14em] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
            />
          </div>
          {remoteOfficeSourceKind === "presence_endpoint" ? (
            <>
              <div>
                <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
                  Presence URL
                </div>
                <input
                  type="url"
                  value={remoteOfficePresenceUrl}
                  onChange={(event) => onRemoteOfficePresenceUrlChange(event.target.value)}
                  placeholder="https://other-office.example.com/api/office/presence"
                  className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
                />
                <div className="mt-1 text-[12px] text-muted-foreground">
                  다른 컴퓨터도 Hermes3D를 실행 중이면 Studio 서버가 이 endpoint를 주기적으로 조회합니다.
                </div>
              </div>
              <div>
                <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
                  토큰 (선택)
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={remoteOfficeTokenDraft}
                    onChange={(event) => setRemoteOfficeTokenDraft(event.target.value)}
                    placeholder={remoteOfficeTokenConfigured ? "토큰이 설정되어 있습니다. 바꾸려면 새 토큰을 입력하세요." : "토큰 입력"}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoteOfficeTokenChange(remoteOfficeTokenDraft);
                      setRemoteOfficeTokenDraft("");
                    }}
                    className="rounded-md border border-border bg-accent px-3 py-2 text-[12px] font-medium uppercase tracking-[0.14em] text-primary transition-colors hover:border-border hover:bg-accent"
                  >
                    저장
                  </button>
                  {remoteOfficeTokenConfigured ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRemoteOfficeTokenChange("");
                        setRemoteOfficeTokenDraft("");
                      }}
                      className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] font-medium uppercase tracking-[0.14em] text-rose-700 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15"
                    >
                      지우기
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
                  게이트웨이 URL
                </div>
                <input
                  type="text"
                  value={remoteOfficeGatewayUrl}
                  onChange={(event) => onRemoteOfficeGatewayUrlChange(event.target.value)}
                  placeholder="wss://remote-gateway.example.com"
                  className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
                />
                <div className="mt-1 text-[12px] text-muted-foreground">
                  브라우저가 원격 Hermes 게이트웨이에 직접 연결해 읽기 전용 상태를 가져옵니다.
                </div>
              </div>
              <div>
                <div className="mb-1 text-[12px] uppercase tracking-[0.14em] text-primary">
                  공유 게이트웨이 토큰
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={remoteOfficeTokenDraft}
                    onChange={(event) => setRemoteOfficeTokenDraft(event.target.value)}
                    placeholder={remoteOfficeTokenConfigured ? "토큰이 설정되어 있습니다. 바꾸려면 새 토큰을 입력하세요." : "토큰 입력"}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px] text-primary outline-none transition-colors placeholder:text-primary focus:border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoteOfficeTokenChange(remoteOfficeTokenDraft);
                      setRemoteOfficeTokenDraft("");
                    }}
                    className="rounded-md border border-border bg-accent px-3 py-2 text-[12px] font-medium uppercase tracking-[0.14em] text-primary transition-colors hover:border-border hover:bg-accent"
                  >
                    저장
                  </button>
                  {remoteOfficeTokenConfigured ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRemoteOfficeTokenChange("");
                        setRemoteOfficeTokenDraft("");
                      }}
                      className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] font-medium uppercase tracking-[0.14em] text-rose-700 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15"
                    >
                      지우기
                    </button>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  선택 사항입니다. 원격 게이트웨이가 이 Control UI origin을 이미 허용하면 토큰 없이도 동작합니다.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div data-setting-group="general" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-foreground">시작 안내</div>
            <div className="mt-1 text-[12px] text-foreground">
              온보딩 안내를 다시 열어 처음 사용자 흐름을 확인합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenOnboarding?.()}
            className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-emerald-700 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/15"
          >
            안내 시작
          </button>
        </div>
      </div>
      {renderMode && onRenderModeChange ? (
        <div data-setting-group="general" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="text-[12px] font-medium text-foreground">연구실 화면</div>
          <div className="mt-1 text-[12px] text-foreground">
            2.5D 연구실을 기본으로 사용하고 필요에 따라 다른 화면을 선택합니다.
          </div>
          <div className="mt-3 grid gap-2">
            {OFFICE_RENDER_MODE_OPTIONS.map((option) => {
              const selected = option.id === renderMode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onRenderModeChange(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-border bg-accent text-foreground"
                      : "border-border bg-surface-1 text-foreground hover:border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-medium">{option.label}</span>
                    {selected ? (
                      <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[12px] uppercase tracking-[0.14em] text-primary">
                        사용 중
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {graphicsQuality && onGraphicsQualityChange ? (
        <div data-setting-group="general" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div className="text-[12px] font-medium text-foreground">그래픽 품질</div>
          <div className="mt-1 text-[12px] text-foreground">
            3D 오피스의 화질과 성능 사이 균형을 정합니다.
          </div>
          <div className="mt-3 grid gap-2">
            {GRAPHICS_QUALITY_OPTIONS.map((option) => {
              const selected = option.id === graphicsQuality;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onGraphicsQualityChange(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-border bg-accent text-foreground"
                      : "border-border bg-surface-1 text-foreground hover:border-border hover:bg-accent"
                  }`}
                >
                  <div className="text-[12px] font-medium">{option.label}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div data-setting-group="integrations" className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-label="음성 답변"
            aria-checked={voiceRepliesEnabled}
            className={`ui-switch self-center ${voiceRepliesEnabled ? "ui-switch--on" : ""}`}
            onClick={() => onVoiceRepliesToggle(!voiceRepliesEnabled)}
            disabled={!voiceRepliesLoaded}
          >
            <span className="ui-switch-thumb" />
          </button>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-foreground">음성 답변</span>
            <span className="text-[12px] text-foreground">
              완성된 답변을 자연스러운 음성으로 읽어 줍니다.
            </span>
          </div>
        </div>
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
          {voiceRepliesLoaded ? (voiceRepliesEnabled ? "켜짐" : "꺼짐") : "불러오는 중"}
        </span>
      </div>
      <div data-setting-group="integrations" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="text-[12px] font-medium text-foreground">음성</div>
        <div className="mt-1 text-[12px] text-foreground">
          에이전트 답변을 읽을 음성을 고릅니다.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CURATED_ELEVENLABS_VOICES.map((voice) => {
            const selected = voice.id === voiceRepliesVoiceId;
            return (
              <button
                key={voice.id ?? "default"}
                type="button"
                onClick={() => {
                  onVoiceRepliesVoiceChange(voice.id);
                  onVoiceRepliesPreview(voice.id, voice.label);
                }}
                disabled={!voiceRepliesLoaded}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-surface-1 text-foreground hover:border-border hover:bg-accent"
                }`}
              >
                <div className="text-[12px] font-medium">{voice.label}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{voice.description}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div data-setting-group="integrations" className="mt-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-foreground">속도</div>
            <div className="mt-1 text-[12px] text-foreground">
              선택한 음성의 말하기 속도를 조절합니다.
            </div>
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">
            {voiceRepliesSpeed.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.7"
          max="1.2"
          step="0.05"
          value={voiceRepliesSpeed}
          disabled={!voiceRepliesLoaded}
          onChange={(event) =>
            onVoiceRepliesSpeedChange(Number.parseFloat(event.target.value))
          }
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-accent accent-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>느리게</span>
          <span>빠르게</span>
        </div>
      </div>
    </div>
  );
}
