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
  const [remoteOfficeTokenDraft, setRemoteOfficeTokenDraft] = useState("");

  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">Studio 제목</div>
            <div className="mt-1 text-[10px] text-white/75">
              오피스 상단에 보이는 배너 문구를 정합니다.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {officeTitleLoaded ? "준비됨" : "불러오는 중"}
          </span>
        </div>
        <input
          type="text"
          value={officeTitle}
          maxLength={48}
          disabled={!officeTitleLoaded}
          onChange={(event) => onOfficeTitleChange(event.target.value)}
          placeholder="REVELARE Security Labs"
          className="mt-3 w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 text-[10px] text-white/50">
          오피스 화면 머리글에 쓰입니다.
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">게이트웨이</div>
            <div className="mt-1 text-[10px] text-white/75">
              사용할 백엔드를 바꾸고 저장된 연결 정보를 수정합니다.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
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
                className={`rounded-md border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  selected
                    ? "border-cyan-400/35 bg-cyan-500/12 text-cyan-50"
                    : "border-cyan-500/10 bg-black/20 text-white/75 hover:border-cyan-400/25 hover:text-cyan-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
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
              className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 font-mono text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
              {tokenOptional ? "업스트림 토큰 (선택)" : "업스트림 토큰"}
            </div>
            <input
              type="password"
              value={normalizedGatewayToken}
              onChange={(event) => onGatewayTokenChange?.(event.target.value)}
              placeholder={tokenOptional ? "토큰 (선택)" : "게이트웨이 토큰"}
              className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/60">
          <span className="font-mono">
            선택한 백엔드: {selectedAdapterType}
          </span>
          <span className="font-mono">
            사용 중인 백엔드: {activeAdapterType}
          </span>
          <span>백엔드마다 URL과 토큰이 따로 저장됩니다.</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[10px] text-white/60">
            연결하면 선택한 백엔드가 적용되고, 연결을 끊으면 연결 화면으로 돌아갑니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGatewayConnect?.()}
              disabled={gatewayConnectDisabled}
              className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-50 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {gatewayStatus === "connecting" ? "연결 중..." : "연결"}
            </button>
            <button
              type="button"
              onClick={() => onGatewayDisconnect?.()}
              disabled={gatewayDisconnectDisabled}
              className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-100 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              게이트웨이 연결 끊기
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">원격 오피스</div>
            <div className="mt-1 text-[10px] text-white/75">
              다른 Hermes3D나 원격 Hermes 게이트웨이의 오피스를 읽기 전용으로 하나 더 붙입니다.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {remoteOfficeEnabled ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <div className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-cyan-500/10 bg-black/15 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-label="원격 오피스"
              aria-checked={remoteOfficeEnabled}
              className={`ui-switch self-center ${remoteOfficeEnabled ? "ui-switch--on" : ""}`}
              onClick={() => onRemoteOfficeEnabledChange(!remoteOfficeEnabled)}
            >
              <span className="ui-switch-thumb" />
            </button>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-white">두 번째 오피스 표시</span>
              <span className="text-[10px] text-white/80">
                원격 에이전트는 보이지만 상호작용할 수 없습니다.
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {remoteOfficeTokenConfigured ? "토큰 설정됨" : "토큰 없음"}
          </span>
        </div>
        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
              소스 유형
            </div>
            <select
              value={remoteOfficeSourceKind}
              onChange={(event) =>
                onRemoteOfficeSourceKindChange(
                  event.target.value as "presence_endpoint" | "hermes_gateway"
                )
              }
              className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors focus:border-cyan-400/30"
            >
              <option value="presence_endpoint">원격 Hermes3D presence endpoint</option>
              <option value="hermes_gateway">원격 Hermes 게이트웨이</option>
            </select>
            <div className="mt-1 text-[10px] text-white/50">
              다른 컴퓨터가 Hermes3D를 실행하면 presence endpoint를, Hermes만 실행하면 게이트웨이 모드를 사용하세요.
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
              이름
            </div>
            <input
              type="text"
              value={remoteOfficeLabel}
              maxLength={48}
              onChange={(event) => onRemoteOfficeLabelChange(event.target.value)}
              placeholder="원격 오피스"
              className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
            />
          </div>
          {remoteOfficeSourceKind === "presence_endpoint" ? (
            <>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
                  Presence URL
                </div>
                <input
                  type="url"
                  value={remoteOfficePresenceUrl}
                  onChange={(event) => onRemoteOfficePresenceUrlChange(event.target.value)}
                  placeholder="https://other-office.example.com/api/office/presence"
                  className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
                />
                <div className="mt-1 text-[10px] text-white/50">
                  다른 컴퓨터도 Hermes3D를 실행 중이면 Studio 서버가 이 endpoint를 주기적으로 조회합니다.
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
                  토큰 (선택)
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={remoteOfficeTokenDraft}
                    onChange={(event) => setRemoteOfficeTokenDraft(event.target.value)}
                    placeholder={remoteOfficeTokenConfigured ? "토큰이 설정되어 있습니다. 바꾸려면 새 토큰을 입력하세요." : "토큰 입력"}
                    className="min-w-0 flex-1 rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoteOfficeTokenChange(remoteOfficeTokenDraft);
                      setRemoteOfficeTokenDraft("");
                    }}
                    className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15"
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
                      className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-100 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15"
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
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
                  게이트웨이 URL
                </div>
                <input
                  type="text"
                  value={remoteOfficeGatewayUrl}
                  onChange={(event) => onRemoteOfficeGatewayUrlChange(event.target.value)}
                  placeholder="wss://remote-gateway.example.com"
                  className="w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
                />
                <div className="mt-1 text-[10px] text-white/50">
                  브라우저가 원격 Hermes 게이트웨이에 직접 연결해 읽기 전용 상태를 가져옵니다.
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/65">
                  공유 게이트웨이 토큰
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={remoteOfficeTokenDraft}
                    onChange={(event) => setRemoteOfficeTokenDraft(event.target.value)}
                    placeholder={remoteOfficeTokenConfigured ? "토큰이 설정되어 있습니다. 바꾸려면 새 토큰을 입력하세요." : "토큰 입력"}
                    className="min-w-0 flex-1 rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoteOfficeTokenChange(remoteOfficeTokenDraft);
                      setRemoteOfficeTokenDraft("");
                    }}
                    className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15"
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
                      className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-100 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15"
                    >
                      지우기
                    </button>
                  ) : null}
                </div>
                <div className="mt-1 text-[10px] text-white/50">
                  선택 사항입니다. 원격 게이트웨이가 이 Control UI origin을 이미 허용하면 토큰 없이도 동작합니다.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">온보딩</div>
            <div className="mt-1 text-[10px] text-white/75">
              온보딩 안내를 다시 열어 처음 사용자 흐름을 확인합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenOnboarding?.()}
            className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/15"
          >
            안내 시작
          </button>
        </div>
      </div>
      {renderMode && onRenderModeChange ? (
        <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
          <div className="text-[11px] font-medium text-white">오피스 렌더러</div>
          <div className="mt-1 text-[10px] text-white/75">
            몰입형 3D 오피스와 가벼운 2D 픽셀 오피스 중에서 고릅니다.
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
                      ? "border-cyan-400/40 bg-cyan-500/12 text-white"
                      : "border-cyan-500/10 bg-black/15 text-white/80 hover:border-cyan-400/20 hover:bg-cyan-500/6"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium">{option.label}</span>
                    {selected ? (
                      <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-cyan-100">
                        사용 중
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] text-white/65">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {graphicsQuality && onGraphicsQualityChange ? (
        <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
          <div className="text-[11px] font-medium text-white">그래픽 품질</div>
          <div className="mt-1 text-[10px] text-white/75">
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
                      ? "border-cyan-400/40 bg-cyan-500/12 text-white"
                      : "border-cyan-500/10 bg-black/15 text-white/80 hover:border-cyan-400/20 hover:bg-cyan-500/6"
                  }`}
                >
                  <div className="text-[11px] font-medium">{option.label}</div>
                  <div className="mt-1 text-[10px] text-white/65">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
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
            <span className="text-[11px] font-medium text-white">음성 답변</span>
            <span className="text-[10px] text-white/80">
              완성된 답변을 자연스러운 음성으로 읽어 줍니다.
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
          {voiceRepliesLoaded ? (voiceRepliesEnabled ? "켜짐" : "꺼짐") : "불러오는 중"}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="text-[11px] font-medium text-white">음성</div>
        <div className="mt-1 text-[10px] text-white/75">
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
                    ? "border-cyan-400/40 bg-cyan-500/12 text-white"
                    : "border-cyan-500/10 bg-black/15 text-white/80 hover:border-cyan-400/20 hover:bg-cyan-500/6"
                }`}
              >
                <div className="text-[11px] font-medium">{voice.label}</div>
                <div className="mt-1 text-[10px] text-white/65">{voice.description}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">속도</div>
            <div className="mt-1 text-[10px] text-white/75">
              선택한 음성의 말하기 속도를 조절합니다.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
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
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-cyan-500/15 accent-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
          <span>느리게</span>
          <span>빠르게</span>
        </div>
      </div>
    </div>
  );
}
