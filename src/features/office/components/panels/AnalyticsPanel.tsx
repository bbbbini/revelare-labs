"use client";

import { useMemo, useRef } from "react";

import { CalendarDays } from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import { useApprovalMetrics } from "@/features/office/hooks/useApprovalMetrics";
import { useOfficeUsageAnalyticsViewModel } from "@/features/office/hooks/useOfficeUsageAnalyticsViewModel";
import { usePerformanceAnalytics } from "@/features/office/hooks/usePerformanceAnalytics";
import type { RunRecord } from "@/features/office/hooks/useRunLog";
import type { GatewayClient, GatewayStatus } from "@/lib/gateway/GatewayClient";
import {
  formatCurrency,
  formatNumber,
} from "@/lib/office/usageAnalyticsPresentation";
import type { StudioSettingsCoordinator } from "@/lib/studio/coordinator";

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value * 100)}%`;
};

const formatDuration = (valueMs: number | null | undefined) => {
  if (!valueMs) return "n/a";
  const seconds = Math.round(valueMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const formatBudgetInput = (value: number | null) => (value === null ? "" : String(value));

const parseBudgetInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded border border-border bg-surface-2 px-3 py-3">
    <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    <div className="mt-2 font-mono text-[18px] font-semibold text-foreground">{value}</div>
    <div className="mt-1 font-mono text-[12px] text-muted-foreground">{hint}</div>
  </div>
);

const openNativeDatePicker = (input: HTMLInputElement | null) => {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.focus();
};

const DatePickerField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => openNativeDatePicker(inputRef.current)}
          className="w-full rounded border border-border bg-surface-1 px-2 py-2 pr-9 font-mono text-[12px] text-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => openNativeDatePicker(inputRef.current)}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
          aria-label={`Open ${label.toLowerCase()} calendar`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
      </div>
    </label>
  );
};

export function AnalyticsPanel({
  client,
  status,
  approvalsEnabled = true,
  agents,
  runLog,
  gatewayUrl,
  settingsCoordinator,
  onSelectAgent,
}: {
  client: GatewayClient;
  status: GatewayStatus;
  approvalsEnabled?: boolean;
  agents: AgentState[];
  runLog: RunRecord[];
  gatewayUrl: string;
  settingsCoordinator: StudioSettingsCoordinator;
  onSelectAgent: (agentId: string) => void;
}) {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    budgets,
    settingsLoaded,
    usage,
    updateBudget,
  } = useOfficeUsageAnalyticsViewModel({
    client,
    status,
    agents,
    gatewayUrl,
    settingsCoordinator,
  });

  const approvalMetrics = useApprovalMetrics({
    client,
    status,
    enabled: approvalsEnabled,
    agents,
  });
  const performance = usePerformanceAnalytics({
    agents,
    runLog,
    approvalByAgent: approvalMetrics.byAgent,
  });

  const dailyChartMax = useMemo(() => {
    return usage.costDaily.reduce((max, entry) => Math.max(max, entry.totalCost), 0);
  }, [usage.costDaily]);

  const alertBannerClass =
    usage.budgetAlerts.some((alert) => alert.severity === "danger")
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700";

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground">
          연구실 사용 현황
        </div>
        <div className="mt-1 font-mono text-[12px] text-muted-foreground">
          런타임에서 제공하는 사용량과 연구원 활동을 확인합니다.
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <DatePickerField label="시작일" value={startDate} onChange={setStartDate} />
          <DatePickerField label="종료일" value={endDate} onChange={setEndDate} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="font-mono text-[12px] text-muted-foreground">
            {usage.lastRefreshedAt
              ? `Last refresh ${new Date(usage.lastRefreshedAt).toLocaleTimeString()}`
              : "No analytics snapshot yet"}
          </div>
          <button
            type="button"
            onClick={() => void usage.refresh()}
            className="rounded border border-border bg-accent px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-primary transition-colors hover:border-border hover:text-primary"
          >
            새로고침
          </button>
        </div>

        {usage.error ? (
          <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-[12px] text-rose-700">
            {usage.error}
          </div>
        ) : null}

        {usage.budgetAlerts.length > 0 ? (
          <div className={`mt-3 rounded border px-3 py-2 font-mono text-[12px] ${alertBannerClass}`}>
            {usage.budgetAlerts.map((alert) => (
              <div key={alert.key}>
                {alert.label}: {formatCurrency(alert.currentUsd)} / {formatCurrency(alert.limitUsd)}.
              </div>
            ))}
          </div>
        ) : settingsLoaded ? (
          <div className="mt-3 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-mono text-[12px] text-emerald-700">
            설정한 예산 범위 안입니다.
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatCard
            label="총 사용 금액"
            value={formatCurrency(usage.totals.totalCost)}
            hint="Selected range."
          />
          <StatCard
            label="사용 토큰"
            value={formatNumber(usage.totals.totalTokens)}
            hint="Input + output + cache."
          />
          <StatCard
            label="완료율"
            value={formatPercent(performance.fleet.successRate)}
            hint="Completed runs only."
          />
          <StatCard
            label="평균 실행 시간"
            value={formatDuration(performance.fleet.avgRuntimeMs)}
            hint="Session-local run history."
          />
        </div>

        <div className="mt-5 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            예산 알림 기준
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[12px] text-muted-foreground">일일 예산 (USD)</span>
              <input
                value={formatBudgetInput(budgets.dailySpendLimitUsd)}
                onChange={(event) =>
                  updateBudget("dailySpendLimitUsd", parseBudgetInput(event.target.value))
                }
                placeholder="No limit"
                inputMode="decimal"
                className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[12px] text-muted-foreground">월간 예산 (USD)</span>
              <input
                value={formatBudgetInput(budgets.monthlySpendLimitUsd)}
                onChange={(event) =>
                  updateBudget("monthlySpendLimitUsd", parseBudgetInput(event.target.value))
                }
                placeholder="No limit"
                inputMode="decimal"
                className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[12px] text-muted-foreground">연구원별 예산 (USD)</span>
              <input
                value={formatBudgetInput(budgets.perAgentSoftLimitUsd)}
                onChange={(event) =>
                  updateBudget("perAgentSoftLimitUsd", parseBudgetInput(event.target.value))
                }
                placeholder="Soft limit"
                inputMode="decimal"
                className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[12px] text-muted-foreground">알림 기준 (%)</span>
              <input
                value={String(budgets.alertThresholdPct)}
                onChange={(event) =>
                  updateBudget(
                    "alertThresholdPct",
                    Math.min(100, Math.max(1, parseBudgetInput(event.target.value) ?? 80))
                  )
                }
                inputMode="numeric"
                className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            일별 사용 금액
          </div>
          {usage.loading ? (
            <div className="mt-3 font-mono text-[12px] text-muted-foreground">사용량을 불러오는 중…</div>
          ) : usage.costDaily.length === 0 ? (
            <div className="mt-3 font-mono text-[12px] text-muted-foreground">
              선택한 기간에 사용 금액 자료가 없습니다.
            </div>
          ) : (
            <div className="mt-3 flex items-end gap-1">
              {usage.costDaily.map((entry) => {
                const heightPct = dailyChartMax > 0 ? (entry.totalCost / dailyChartMax) * 100 : 0;
                return (
                  <div key={entry.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="font-mono text-[12px] text-muted-foreground">
                      {formatCurrency(entry.totalCost)}
                    </div>
                    <div className="flex h-28 w-full items-end rounded bg-surface-1 px-1">
                      <div
                        className="w-full rounded-t bg-rose-400/80"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                        title={`${entry.date} · ${formatCurrency(entry.totalCost)}`}
                      />
                    </div>
                    <div className="font-mono text-[12px] text-muted-foreground">
                      {entry.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded border border-border bg-surface-1 px-3 py-3">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              사용 금액 상세
            </div>
            <div className="mt-2 space-y-1 font-mono text-[12px] text-foreground">
              <div>입력: {formatCurrency(usage.totals.inputCost)}.</div>
              <div>출력: {formatCurrency(usage.totals.outputCost)}.</div>
              <div>캐시 읽기: {formatCurrency(usage.totals.cacheReadCost)}.</div>
              <div>캐시 쓰기: {formatCurrency(usage.totals.cacheWriteCost)}.</div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            연구원별 사용 금액
          </div>
          <div className="mt-3 space-y-2">
            {usage.aggregates.byAgent.slice(0, 6).map((entry) => (
              <button
                key={entry.agentId}
                type="button"
                onClick={() => onSelectAgent(entry.agentId)}
                className="flex w-full items-center justify-between rounded border border-border bg-surface-1 px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <span className="font-mono text-[12px] text-foreground">{entry.agentName}</span>
                <span className="font-mono text-[12px] text-muted-foreground">
                  {formatCurrency(entry.totals.totalCost)}
                </span>
              </button>
            ))}
            {usage.aggregates.byAgent.length === 0 ? (
              <div className="font-mono text-[12px] text-muted-foreground">연구원별 사용 금액 자료가 없습니다.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            모델별 사용량
          </div>
          <div className="mt-3 space-y-2">
            {usage.aggregates.byModel.slice(0, 6).map((entry) => (
              <div
                key={`${entry.provider ?? "unknown"}:${entry.model ?? "unknown"}`}
                className="flex items-center justify-between rounded border border-border bg-surface-1 px-3 py-2"
              >
                <span className="font-mono text-[12px] text-foreground">
                  {entry.provider ?? "unknown"} / {entry.model ?? "unknown"}
                </span>
                <span className="font-mono text-[12px] text-muted-foreground">
                  {formatCurrency(entry.totals.totalCost)}
                </span>
              </div>
            ))}
            {usage.aggregates.byModel.length === 0 ? (
              <div className="font-mono text-[12px] text-muted-foreground">모델별 사용량 자료가 없습니다.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            작업 실행 현황
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatCard
              label="승인 요청"
              value={formatNumber(approvalMetrics.totals.requestedCount)}
              hint="Session-local approval requests."
            />
            <StatCard
              label="개입 비율"
              value={formatPercent(performance.fleet.interventionRate)}
              hint="Approvals per observed run."
            />
            <StatCard
              label="도구 호출"
              value={formatNumber(performance.fleet.totalToolCalls)}
              hint="Current transcript state."
            />
            <StatCard
              label="완료한 실행"
              value={formatNumber(performance.fleet.completedRuns)}
              hint="In-memory office run log."
            />
          </div>

          <div className="mt-4 space-y-2">
            {performance.rows.map((row) => (
              <button
                key={row.agentId}
                type="button"
                onClick={() => onSelectAgent(row.agentId)}
                className="w-full rounded border border-border bg-surface-1 px-3 py-3 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground">
                    {row.agentName}
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {row.totalRuns} 회 실행
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[12px] text-muted-foreground">
                  <div>완료율: {formatPercent(row.successRate)}.</div>
                  <div>평균 실행 시간: {formatDuration(row.avgRuntimeMs)}.</div>
                  <div>도구 호출: {formatNumber(row.toolCalls)}.</div>
                  <div>승인: {formatNumber(row.approvalRequestedCount)}.</div>
                </div>
              </button>
            ))}
            {performance.rows.length === 0 ? (
              <div className="font-mono text-[12px] text-muted-foreground">
                아직 실행 현황 자료가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
