"use client";

// The Hermes agent kanban board. Columns mirror the Hermes agent lifecycle
// (inbox -> scheduled -> working -> needs attention -> done) and cards carry
// the agent's fingerprints: source platform, model, skills used or learned,
// subagents spawned, and cron schedules.

import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  AlarmClock,
  BrainCircuit,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import type { CronJobSummary } from "@/lib/cron/types";
import type { TaskBoardCard, TaskBoardStatus } from "@/features/office/tasks/types";

const STATUS_ORDER: TaskBoardStatus[] = [
  "inbox",
  "scheduled",
  "working",
  "needs_attention",
  "done",
];

const STATUS_META: Record<
  TaskBoardStatus,
  {
    label: string;
    hint: string;
    icon: typeof Inbox;
    headerClass: string;
    countClass: string;
    cardSelectedClass: string;
    cardIdleClass: string;
  }
> = {
  inbox: {
    label: "요청됨",
    hint: "접수한 연구 작업",
    icon: Inbox,
    headerClass: "text-sky-700",
    countClass: "bg-sky-400/15 text-sky-700",
    cardSelectedClass: "border-sky-400/40 bg-sky-500/[0.10]",
    cardIdleClass: "hover:border-sky-400/25 hover:bg-sky-500/[0.05]",
  },
  scheduled: {
    label: "예약됨",
    hint: "일정과 반복 작업",
    icon: AlarmClock,
    headerClass: "text-violet-700",
    countClass: "bg-violet-400/15 text-violet-700",
    cardSelectedClass: "border-violet-400/40 bg-violet-500/[0.10]",
    cardIdleClass: "hover:border-violet-400/25 hover:bg-violet-500/[0.05]",
  },
  working: {
    label: "진행 중",
    hint: "연구원이 실행 중",
    icon: Loader2,
    headerClass: "text-amber-700",
    countClass: "bg-amber-400/15 text-amber-700",
    cardSelectedClass: "border-amber-400/40 bg-amber-500/[0.10]",
    cardIdleClass: "hover:border-amber-400/25 hover:bg-amber-500/[0.05]",
  },
  needs_attention: {
    label: "확인 필요",
    hint: "승인 대기와 오류",
    icon: ShieldAlert,
    headerClass: "text-rose-700",
    countClass: "bg-rose-400/15 text-rose-700",
    cardSelectedClass: "border-rose-400/40 bg-rose-500/[0.10]",
    cardIdleClass: "hover:border-rose-400/25 hover:bg-rose-500/[0.05]",
  },
  done: {
    label: "완료",
    hint: "완료한 연구 작업",
    icon: Sparkles,
    headerClass: "text-emerald-700",
    countClass: "bg-emerald-400/15 text-emerald-700",
    cardSelectedClass: "border-emerald-400/40 bg-emerald-500/[0.10]",
    cardIdleClass: "hover:border-emerald-400/25 hover:bg-emerald-500/[0.05]",
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  telegram: "Telegram",
  discord: "Discord",
  slack: "Slack",
  whatsapp: "WhatsApp",
  signal: "Signal",
  email: "Email",
  cli: "CLI",
  web: "Web",
};

const formatPlatform = (channel: string | null) => {
  if (!channel) return null;
  const key = channel.trim().toLowerCase();
  return PLATFORM_LABELS[key] ?? channel.trim();
};

const formatRelativeTime = (value: string | null) => {
  if (!value) return "활동 없음";
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return "활동 없음";
  const delta = Math.max(0, Date.now() - at);
  if (delta < 60_000) return "방금 전";
  if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}분 전`;
  if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}시간 전`;
  return `${Math.max(1, Math.floor(delta / 86_400_000))}일 전`;
};

const formatScheduledFor = (value: string | null) => {
  if (!value) return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return value;
  const delta = at - Date.now();
  if (delta <= 0) return "실행 시각 도달";
  if (delta < 3_600_000) return `In ${Math.max(1, Math.round(delta / 60_000))}m`;
  if (delta < 86_400_000) return `In ${Math.round(delta / 3_600_000)}h`;
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const stopAndGetCardId = (event: DragEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
  return event.dataTransfer.getData("text/task-card-id").trim();
};

function CardChip({
  icon: Icon,
  children,
  className = "border-border text-muted-foreground",
}: {
  icon?: typeof Inbox;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] ${className}`}
    >
      {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
      {children}
    </span>
  );
}

export function TaskBoardView({
  title,
  subtitle,
  agents,
  cardsByStatus,
  selectedCard,
  activeRuns,
  cronJobs,
  cronLoading,
  cronError,
  taskCaptureDebug,
  onCreateCard,
  onMoveCard,
  onSelectCard,
  onUpdateCard,
  onDeleteCard,
  onRefreshCronJobs,
}: {
  title: string;
  subtitle: string;
  agents: AgentState[];
  cardsByStatus: Record<TaskBoardStatus, TaskBoardCard[]>;
  selectedCard: TaskBoardCard | null;
  activeRuns: Array<{ runId: string; agentId: string; label: string }>;
  cronJobs: CronJobSummary[];
  cronLoading: boolean;
  cronError: string | null;
  taskCaptureDebug?: {
    lastStatus: "idle" | "detected" | "persisted" | "failed" | "unsupported";
    lastUpdatedAt: string | null;
    lastTitle: string | null;
    lastTaskId: string | null;
    lastSessionKey: string | null;
    lastMessage: string | null;
    detectedCount: number;
    visibleCardCount: number;
    totalCardCount: number;
    sharedTasksSupported: boolean;
    sharedTasksLoading: boolean;
    sharedTasksError: string | null;
  };
  onCreateCard: () => void;
  onMoveCard: (cardId: string, status: TaskBoardStatus) => void;
  onSelectCard: (cardId: string | null) => void;
  onUpdateCard: (cardId: string, patch: Partial<TaskBoardCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onRefreshCronJobs: () => void;
}) {
  const workingCount = cardsByStatus.working.length;
  const attentionCount = cardsByStatus.needs_attention.length;
  const learnedCount = STATUS_ORDER.reduce(
    (total, status) =>
      total + cardsByStatus[status].filter((card) => card.learnedSkill).length,
    0,
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-transparent text-foreground">
      <div className="border-b border-emerald-500/10 bg-surface-1 px-4 py-3 backdrop-blur-[1px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.22em] text-emerald-700">
              <span aria-hidden className="text-[13px] leading-none">☤</span>
              {title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted-foreground">
              <span>{subtitle}</span>
              <span className="text-amber-700">{workingCount}개 진행 중</span>
              {attentionCount > 0 ? (
                <span className="text-rose-700">{attentionCount}개 확인 필요</span>
              ) : null}
              {learnedCount > 0 ? (
                <span className="text-emerald-700">{learnedCount}개 기술 습득</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshCronJobs}
              className="rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-border hover:text-foreground"
            >
              {cronLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "새로고침"}
            </button>
            <button
              type="button"
              onClick={onCreateCard}
              className="inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-700 transition-colors hover:border-emerald-400/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              작업 추가
            </button>
          </div>
        </div>
        {cronError ? (
          <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-[12px] text-rose-700">
            {cronError}
          </div>
        ) : null}
        {taskCaptureDebug ? (
          <details className="mt-2 rounded border border-amber-400/20 bg-amber-400/5 px-3 py-2 font-mono text-[12px] text-amber-50">
            <summary className="cursor-pointer list-none select-none">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] uppercase tracking-[0.14em] text-amber-700">
                <span>Capture debug</span>
                <span>Status: {taskCaptureDebug.lastStatus}</span>
                <span>Visible cards: {taskCaptureDebug.visibleCardCount}</span>
                <span>Tracked cards: {taskCaptureDebug.totalCardCount}</span>
                <span>Detected: {taskCaptureDebug.detectedCount}</span>
              </div>
            </summary>
            <div className="mt-2 grid gap-1 text-foreground">
              <div>Last request: {taskCaptureDebug.lastTitle ?? "None yet."}</div>
              <div>Last task id: {taskCaptureDebug.lastTaskId ?? "-"}</div>
              <div>Session/thread: {taskCaptureDebug.lastSessionKey ?? "-"}</div>
              <div>Last update: {formatRelativeTime(taskCaptureDebug.lastUpdatedAt)}</div>
              <div>
                Shared store:{" "}
                {taskCaptureDebug.sharedTasksSupported
                  ? taskCaptureDebug.sharedTasksLoading
                    ? "Syncing."
                    : "Available."
                  : "Unavailable."}
              </div>
              <div>
                Note: {taskCaptureDebug.lastMessage ?? "Waiting for inbound request detection."}
              </div>
              {taskCaptureDebug.sharedTasksError ? (
                <div className="text-rose-700">
                  Store error: {taskCaptureDebug.sharedTasksError}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>

      <div
        className={`workspace-task-layout grid min-h-0 flex-1 overflow-hidden ${selectedCard ? "grid-cols-[minmax(0,1fr)_300px]" : "grid-cols-1"}`}
      >
        <div className="min-h-0 overflow-auto px-4 py-4">
          <div className="grid min-w-[760px] grid-cols-5 gap-3">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              const cards = cardsByStatus[status];
              const ColumnIcon = meta.icon;
              return (
                <div
                  key={status}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    const cardId = stopAndGetCardId(event);
                    if (!cardId) return;
                    onMoveCard(cardId, status);
                  }}
                  className="flex min-h-[420px] flex-col rounded-xl border border-border bg-surface-1 backdrop-blur-[1px]"
                >
                  <div className="border-b border-border px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] ${meta.headerClass}`}
                      >
                        <ColumnIcon
                          className={`h-3 w-3 ${status === "working" && cards.length > 0 ? "animate-spin [animation-duration:3s]" : ""}`}
                        />
                        {meta.label}
                      </div>
                      <div
                        className={`rounded px-1.5 py-0.5 font-mono text-[12px] ${meta.countClass}`}
                      >
                        {cards.length}
                      </div>
                    </div>
                    <div className="mt-1 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                      {meta.hint}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {cards.length === 0 ? (
                      <div className="rounded border border-dashed border-border px-3 py-4 text-center font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                        Drop a card here.
                      </div>
                    ) : (
                      cards.map((card) => {
                        const platform = formatPlatform(card.channel);
                        const scheduled = formatScheduledFor(card.scheduledFor);
                        return (
                          <button
                            key={card.id}
                            type="button"
                            draggable
                            aria-label={`${card.title} — ${meta.label}. 방향키로 작업 상태 이동`}
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/task-card-id", card.id);
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={() =>
                              onSelectCard(selectedCard?.id === card.id ? null : card.id)
                            }
                            onKeyDown={(event: ReactKeyboardEvent) => {
                              const currentIdx = STATUS_ORDER.indexOf(card.status);
                              if (
                                event.key === "ArrowRight" &&
                                currentIdx < STATUS_ORDER.length - 1
                              ) {
                                event.preventDefault();
                                onMoveCard(card.id, STATUS_ORDER[currentIdx + 1]!);
                              } else if (event.key === "ArrowLeft" && currentIdx > 0) {
                                event.preventDefault();
                                onMoveCard(card.id, STATUS_ORDER[currentIdx - 1]!);
                              }
                            }}
                            className={`flex w-full flex-col rounded-lg border px-3 py-3 text-left transition-colors ${
                              selectedCard?.id === card.id
                                ? meta.cardSelectedClass
                                : `border-border bg-surface-1 ${meta.cardIdleClass}`
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="line-clamp-2 text-sm font-medium text-foreground">
                                {card.title}
                              </div>
                              {card.learnedSkill ? (
                                <span
                                  title="이 작업으로 연구원이 새 기술을 익혔습니다."
                                  className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-emerald-700"
                                >
                                  ☤ skill
                                </span>
                              ) : null}
                            </div>
                            {card.description ? (
                              <div className="mt-2 line-clamp-3 text-[12px] leading-5 text-muted-foreground">
                                {card.description}
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {platform ? <CardChip>{platform}</CardChip> : null}
                              {card.model ? (
                                <CardChip
                                  icon={BrainCircuit}
                                  className="border-sky-400/20 text-sky-700"
                                >
                                  {card.model}
                                </CardChip>
                              ) : null}
                              {card.skills.length > 0 ? (
                                <CardChip
                                  icon={Sparkles}
                                  className="border-emerald-400/20 text-emerald-700"
                                >
                                  {card.skills.length === 1
                                    ? card.skills[0]
                                    : `${card.skills.length} skills`}
                                </CardChip>
                              ) : null}
                              {card.subagentCount > 0 ? (
                                <CardChip
                                  icon={SplitSquareHorizontal}
                                  className="border-violet-400/20 text-violet-700"
                                >
                                  {card.subagentCount} subagents
                                </CardChip>
                              ) : null}
                              {scheduled ? (
                                <CardChip
                                  icon={AlarmClock}
                                  className="border-violet-400/20 text-violet-700"
                                >
                                  {scheduled}
                                </CardChip>
                              ) : null}
                              {card.runId ? <CardChip>실행 연결됨</CardChip> : null}
                              {card.playbookJobId ? <CardChip>반복 작업</CardChip> : null}
                            </div>
                            <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-muted-foreground">
                              <span>{card.assignedAgentId ?? "미지정"}</span>
                              <span>{formatRelativeTime(card.lastActivityAt ?? card.updatedAt)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedCard ? (
          <aside className="flex min-h-0 flex-col border-l border-border bg-surface-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                Task Details
              </div>
              <button
                type="button"
                onClick={() => onSelectCard(null)}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                닫기
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  작업 제목
                </span>
                <input
                  value={selectedCard.title}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { title: event.target.value })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  작업 내용
                </span>
                <textarea
                  rows={4}
                  value={selectedCard.description}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { description: event.target.value })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  상태
                </span>
                <select
                  value={selectedCard.status}
                  onChange={(event) =>
                    onMoveCard(selectedCard.id, event.target.value as TaskBoardStatus)
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                >
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  담당 연구원
                </span>
                <select
                  value={selectedCard.assignedAgentId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      assignedAgentId: event.target.value || null,
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="">미지정</option>
                  {agents.map((agent) => (
                    <option key={agent.agentId} value={agent.agentId}>
                      {agent.name || agent.agentId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  요청 채널
                </span>
                <input
                  value={selectedCard.channel ?? ""}
                  placeholder="telegram, discord, slack, cli…"
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      channel: event.target.value || null,
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  모델
                </span>
                <input
                  value={selectedCard.model ?? ""}
                  placeholder="hermes-4-405b"
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      model: event.target.value || null,
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  사용 기술 (쉼표로 구분)
                </span>
                <input
                  value={selectedCard.skills.join(", ")}
                  placeholder="github-review, deploy-checklist"
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      skills: event.target.value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-emerald-700">
                  새 기술 습득
                </span>
                <input
                  type="checkbox"
                  checked={selectedCard.learnedSkill}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { learnedSkill: event.target.checked })
                  }
                  className="h-4 w-4 accent-emerald-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  실행 연결
                </span>
                <select
                  value={selectedCard.runId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { runId: event.target.value || null })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="">연결된 실행 없음</option>
                  {activeRuns.map((run) => (
                    <option key={run.runId} value={run.runId}>
                      {run.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  반복 작업 연결
                </span>
                <select
                  value={selectedCard.playbookJobId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      playbookJobId: event.target.value || null,
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="">연결된 반복 작업 없음</option>
                  {cronJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  메모
                </span>
                <textarea
                  rows={3}
                  value={selectedCard.notes.join("\n")}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      notes: event.target.value
                        .split("\n")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <div className="space-y-2 rounded border border-border bg-surface-2 px-3 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>요청 출처: {selectedCard.source.replaceAll("_", " ")}.</div>
                {selectedCard.subagentCount > 0 ? (
                  <div>보조 연구원 수: {selectedCard.subagentCount}.</div>
                ) : null}
                {selectedCard.scheduledFor ? (
                  <div>예약 시각: {new Date(selectedCard.scheduledFor).toLocaleString()}.</div>
                ) : null}
                <div>생성 시각: {new Date(selectedCard.createdAt).toLocaleString()}.</div>
                <div>수정 시각: {new Date(selectedCard.updatedAt).toLocaleString()}.</div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCard(selectedCard.id)}
                className="inline-flex items-center gap-2 rounded border border-rose-500/25 bg-rose-500/10 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-rose-700 transition-colors hover:border-rose-400/50 hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                작업 삭제
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
