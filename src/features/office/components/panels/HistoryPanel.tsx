"use client";

import { useMemo, useState } from "react";

import type { AgentState } from "@/features/agents/state/store";
import type { RunRecord, RunTriggerKind } from "@/features/office/hooks/useRunLog";

const formatClockTime = (timestampMs: number) =>
  new Date(timestampMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (startedAt: number, endedAt: number | null) => {
  const deltaMs = Math.max(0, (endedAt ?? Date.now()) - startedAt);
  const seconds = Math.floor(deltaMs / 1000);
  if (!endedAt) return `${Math.max(1, seconds)}초 경과`;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const TRIGGER_LABELS: Record<RunTriggerKind, string> = {
  user: "USER",
  heartbeat: "HEARTBEAT",
  cron: "CRON",
};

export function HistoryPanel({
  runs,
  agents,
  onSelectAgent,
}: {
  runs: RunRecord[];
  agents: AgentState[];
  onSelectAgent: (agentId: string) => void;
}) {
  const [agentFilter, setAgentFilter] = useState("all");
  const [triggerFilter, setTriggerFilter] = useState<"all" | RunTriggerKind>("all");

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (agentFilter !== "all" && run.agentId !== agentFilter) return false;
      if (triggerFilter !== "all" && run.trigger !== triggerFilter) return false;
      return true;
    });
  }, [agentFilter, runs, triggerFilter]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground">
          Audit Log
        </div>
        <div className="mt-1 font-mono text-[12px] text-muted-foreground">
          This session only. Lifecycle events are captured live from HQ.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Agent
          </span>
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
            className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
          >
            <option value="all">모든 연구원</option>
            {agents.map((agent) => (
              <option key={agent.agentId} value={agent.agentId}>
                {agent.name || agent.agentId}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Trigger
          </span>
          <select
            value={triggerFilter}
            onChange={(event) => setTriggerFilter(event.target.value as "all" | RunTriggerKind)}
            className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
          >
            <option value="all">모든 실행 유형</option>
            <option value="user">직접 요청</option>
            <option value="heartbeat">주기 확인</option>
            <option value="cron">예약 실행</option>
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {filteredRuns.length === 0 ? (
          <div className="px-2 py-6 font-mono text-[12px] text-muted-foreground">
            No run records yet for this session.
          </div>
        ) : (
          filteredRuns.map((run) => {
            const isRunning = run.endedAt === null;
            return (
              <button
                key={run.runId}
                type="button"
                onClick={() => onSelectAgent(run.agentId)}
                className="mb-2 flex w-full flex-col rounded border border-border bg-surface-2 px-3 py-3 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isRunning
                        ? "bg-amber-400"
                        : run.outcome === "error"
                          ? "bg-rose-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground">
                    {run.agentName}
                  </span>
                  <span className="rounded border border-border bg-accent px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.16em] text-primary">
                    {TRIGGER_LABELS[run.trigger]}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  <div>
                    <div>시작 시각</div>
                    <div className="mt-1 text-[12px] text-foreground">{formatClockTime(run.startedAt)}</div>
                  </div>
                  <div>
                    <div>소요 시간</div>
                    <div className="mt-1 text-[12px] text-foreground">
                      {formatDuration(run.startedAt, run.endedAt)}
                    </div>
                  </div>
                  <div>
                    <div>실행 상태</div>
                    <div className="mt-1 text-[12px] text-foreground">
                      {isRunning ? "실행 중" : run.outcome === "error" ? "오류" : "완료"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
