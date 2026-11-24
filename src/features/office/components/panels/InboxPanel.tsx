"use client";

import { useMemo } from "react";

import type { AgentState } from "@/features/agents/state/store";

const formatRelativeTime = (timestampMs: number | null) => {
  if (!timestampMs) return "아직 결과 없음";
  const deltaMs = Date.now() - timestampMs;
  if (deltaMs < 60_000) return "방금 전";
  if (deltaMs < 3_600_000) return `${Math.max(1, Math.floor(deltaMs / 60_000))}분 전`;
  if (deltaMs < 86_400_000) return `${Math.max(1, Math.floor(deltaMs / 3_600_000))}시간 전`;
  return `${Math.max(1, Math.floor(deltaMs / 86_400_000))}일 전`;
};

export function InboxPanel({
  agents,
  onSelectAgent,
}: {
  agents: AgentState[];
  onSelectAgent: (agentId: string) => void;
}) {
  const sortedAgents = useMemo(
    () =>
      [...agents].sort(
        (left, right) =>
          (right.lastAssistantMessageAt ?? 0) - (left.lastAssistantMessageAt ?? 0) ||
          left.name.localeCompare(right.name)
      ),
    [agents]
  );

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground">
          Results Center
        </div>
        <div className="mt-1 font-mono text-[12px] text-muted-foreground">
          Latest assistant output from every desk.
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {sortedAgents.length === 0 ? (
          <div className="px-2 py-6 font-mono text-[12px] text-muted-foreground">
            No agents are connected yet.
          </div>
        ) : (
          sortedAgents.map((agent) => {
            const preview = agent.latestPreview?.trim() || "아직 받은 결과가 없습니다. 작업을 요청해 보세요.";
            const isRunning = agent.status === "running";
            return (
              <button
                key={agent.agentId}
                type="button"
                onClick={() => onSelectAgent(agent.agentId)}
                className="mb-2 flex w-full flex-col rounded border border-border bg-surface-2 px-3 py-3 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isRunning ? "bg-emerald-400" : "bg-amber-400/80"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground">
                    {agent.name || agent.agentId}
                  </span>
                  {agent.hasUnseenActivity ? (
                    <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-primary">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 line-clamp-3 font-mono text-[12px] leading-5 text-foreground">
                  {preview}
                </div>
                <div className="mt-3 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  {formatRelativeTime(agent.lastAssistantMessageAt)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
