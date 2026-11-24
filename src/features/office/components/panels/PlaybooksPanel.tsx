"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AgentState } from "@/features/agents/state/store";
import type { OfficeStandupController } from "@/features/office/hooks/useOfficeStandupController";
import {
  createCronJob,
  formatCronSchedule,
  listCronJobs,
  removeCronJob,
  runCronJobNow,
  sortCronJobsByUpdatedAt,
  type CronJobCreateInput,
  type CronJobSummary,
} from "@/lib/cron/types";
import type { GatewayClient, GatewayStatus } from "@/lib/gateway/GatewayClient";
import { isGatewayDisconnectLikeError } from "@/lib/gateway/GatewayClient";

type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  buildInput: (agent: AgentState, customName: string) => CronJobCreateInput;
};

const PLAYBOOK_TEMPLATES: TemplateDefinition[] = [
  {
    id: "daily-briefing",
    name: "Daily Morning Briefing",
    description: "Every day at 9am. Summarize priorities, blockers, and what changed overnight.",
    buildInput: (agent, customName) => ({
      name: customName || "Daily Morning Briefing",
      agentId: agent.agentId,
      sessionKey: agent.sessionKey,
      enabled: true,
      schedule: { kind: "cron", expr: "0 9 * * *" },
      sessionTarget: "main",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message:
          "Create a concise morning briefing for headquarters. Summarize current priorities, blocked work, recent notable changes, and the next recommended actions.",
        thinking: "high",
      },
    }),
  },
  {
    id: "nightly-code-review",
    name: "Nightly Code Review Digest",
    description: "Every night at midnight. Review the day and summarize risky changes or regressions.",
    buildInput: (agent, customName) => ({
      name: customName || "Nightly Code Review Digest",
      agentId: agent.agentId,
      sessionKey: agent.sessionKey,
      enabled: true,
      schedule: { kind: "cron", expr: "0 0 * * *" },
      sessionTarget: "main",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message:
          "Review the latest work available to you and produce a digest of risky changes, unresolved questions, and follow-up recommendations for the team.",
        thinking: "high",
      },
    }),
  },
  {
    id: "hourly-health-check",
    name: "Hourly Health Check",
    description: "Every 60 minutes. Report runtime health, failures, and anything that needs intervention.",
    buildInput: (agent, customName) => ({
      name: customName || "Hourly Health Check",
      agentId: agent.agentId,
      sessionKey: agent.sessionKey,
      enabled: true,
      schedule: { kind: "every", everyMs: 60 * 60 * 1000 },
      sessionTarget: "main",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message:
          "Run a health check. Summarize your current status, errors, blocked tasks, pending approvals, and whether a human needs to step in.",
        thinking: "medium",
      },
    }),
  },
  {
    id: "weekly-progress-report",
    name: "Weekly Progress Report",
    description: "Every Monday at 8am. Roll up wins, unfinished work, and next steps.",
    buildInput: (agent, customName) => ({
      name: customName || "Weekly Progress Report",
      agentId: agent.agentId,
      sessionKey: agent.sessionKey,
      enabled: true,
      schedule: { kind: "cron", expr: "0 8 * * 1" },
      sessionTarget: "main",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message:
          "Write a weekly progress report for headquarters. Include completed work, unfinished work, risks, and the most important next steps.",
        thinking: "high",
      },
    }),
  },
  {
    id: "continuous-monitor",
    name: "Continuous Monitor",
    description: "Every 15 minutes. Watch for drift, silent failures, or anything unusual.",
    buildInput: (agent, customName) => ({
      name: customName || "Continuous Monitor",
      agentId: agent.agentId,
      sessionKey: agent.sessionKey,
      enabled: true,
      schedule: { kind: "every", everyMs: 15 * 60 * 1000 },
      sessionTarget: "main",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message:
          "Monitor your current context and report only if you detect unusual behavior, blocked progress, repeated failures, or opportunities that need attention.",
        thinking: "medium",
      },
    }),
  },
];

const formatRelativeDateTime = (timestampMs?: number) => {
  if (!timestampMs || !Number.isFinite(timestampMs)) return "알 수 없음";
  return new Date(timestampMs).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function PlaybooksPanel({
  client,
  status,
  cronEnabled = true,
  agents,
  standup,
}: {
  client: GatewayClient;
  status: GatewayStatus;
  cronEnabled?: boolean;
  agents: AgentState[];
  standup: OfficeStandupController;
}) {
  const [jobs, setJobs] = useState<CronJobSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [runBusyJobId, setRunBusyJobId] = useState<string | null>(null);
  const [deleteBusyJobId, setDeleteBusyJobId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.agentId, agent])),
    [agents]
  );

  const activeTemplate = useMemo(
    () => PLAYBOOK_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId]
  );
  const [standupAgentId, setStandupAgentId] = useState("");
  const [standupCronExpr, setStandupCronExpr] = useState("0 9 * * 1-5");
  const [standupTimezone, setStandupTimezone] = useState("UTC");
  const [standupSpeakerSeconds, setStandupSpeakerSeconds] = useState("8");
  const [standupAutoOpenBoard, setStandupAutoOpenBoard] = useState(true);
  const [standupScheduleEnabled, setStandupScheduleEnabled] = useState(false);
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [jiraApiTokenConfigured, setJiraApiTokenConfigured] = useState(false);
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraJql, setJiraJql] = useState("");
  const [manualTask, setManualTask] = useState("");
  const [manualBlockers, setManualBlockers] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualJiraAssignee, setManualJiraAssignee] = useState("");

  useEffect(() => {
    if (!standup.config) return;
    setStandupScheduleEnabled(standup.config.schedule.enabled);
    setStandupCronExpr(standup.config.schedule.cronExpr);
    setStandupTimezone(standup.config.schedule.timezone);
    setStandupSpeakerSeconds(String(standup.config.schedule.speakerSeconds));
    setStandupAutoOpenBoard(standup.config.schedule.autoOpenBoard);
    setJiraEnabled(standup.config.jira.enabled);
    setJiraBaseUrl(standup.config.jira.baseUrl);
    setJiraEmail(standup.config.jira.email);
    setJiraApiToken(standup.config.jira.apiToken);
    setJiraApiTokenConfigured(standup.config.jira.apiTokenConfigured);
    setJiraProjectKey(standup.config.jira.projectKey);
    setJiraJql(standup.config.jira.jql);
  }, [standup.config]);

  useEffect(() => {
    if (standupAgentId || agents.length === 0) return;
    setStandupAgentId(agents[0]?.agentId ?? "");
  }, [agents, standupAgentId]);

  useEffect(() => {
    if (!standup.config || !standupAgentId) return;
    const manual = standup.config.manualByAgentId[standupAgentId];
    setManualTask(manual?.currentTask ?? "");
    setManualBlockers(manual?.blockers ?? "");
    setManualNote(manual?.note ?? "");
    setManualJiraAssignee(manual?.jiraAssignee ?? "");
  }, [standup.config, standupAgentId]);

  const loadJobs = useCallback(async () => {
    if (!cronEnabled || status !== "connected") {
      setJobs([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listCronJobs(client, { includeDisabled: true });
      setJobs(sortCronJobsByUpdatedAt(result.jobs));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load playbooks.";
      setError(message);
      if (!isGatewayDisconnectLikeError(err)) {
        console.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [client, cronEnabled, status]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleCreate = useCallback(async () => {
    if (!cronEnabled) {
      setError("현재 런타임은 예약 작업을 지원하지 않습니다.");
      return;
    }
    if (!activeTemplate) return;
    const agent = agentById.get(selectedAgentId);
    if (!agent) {
      setError("Pick an agent before launching a playbook.");
      return;
    }

    setCreateBusy(true);
    setError(null);
    setActionMessage(null);
    try {
      await createCronJob(client, activeTemplate.buildInput(agent, nameOverride.trim()));
      setActionMessage(`Created "${nameOverride.trim() || activeTemplate.name}".`);
      setSelectedTemplateId(null);
      setSelectedAgentId("");
      setNameOverride("");
      await loadJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create playbook.";
      setError(message);
    } finally {
      setCreateBusy(false);
    }
  }, [activeTemplate, agentById, client, cronEnabled, loadJobs, nameOverride, selectedAgentId]);

  const handleRunNow = useCallback(
    async (jobId: string) => {
      if (!cronEnabled) {
        setError("현재 런타임은 예약 작업을 지원하지 않습니다.");
        return;
      }
      setRunBusyJobId(jobId);
      setError(null);
      setActionMessage(null);
      try {
        const result = await runCronJobNow(client, jobId);
        setActionMessage(result.ok ? "반복 작업을 시작했습니다." : "반복 작업을 시작하지 못했습니다.");
        await loadJobs();
      } catch (err) {
        setError(err instanceof Error ? err.message : "반복 작업 실행에 실패했습니다.");
      } finally {
        setRunBusyJobId(null);
      }
    },
    [client, cronEnabled, loadJobs]
  );

  const handleDelete = useCallback(
    async (jobId: string) => {
      if (!cronEnabled) {
        setError("현재 런타임은 예약 작업을 지원하지 않습니다.");
        return;
      }
      setDeleteBusyJobId(jobId);
      setError(null);
      setActionMessage(null);
      try {
        const result = await removeCronJob(client, jobId);
        setActionMessage(result.ok && result.removed ? "반복 작업을 제거했습니다." : "반복 작업을 제거하지 못했습니다.");
        await loadJobs();
      } catch (err) {
        setError(err instanceof Error ? err.message : "반복 작업 제거에 실패했습니다.");
      } finally {
        setDeleteBusyJobId(null);
      }
    },
    [client, cronEnabled, loadJobs]
  );

  const handleSaveStandupConfig = useCallback(async () => {
    setError(null);
    setActionMessage(null);
    try {
      await standup.saveConfig({
        schedule: {
          enabled: standupScheduleEnabled,
          cronExpr: standupCronExpr.trim() || "0 9 * * 1-5",
          timezone: standupTimezone.trim() || "UTC",
          speakerSeconds: Number(standupSpeakerSeconds) || 8,
          autoOpenBoard: standupAutoOpenBoard,
        },
        jira: {
          enabled: jiraEnabled,
          baseUrl: jiraBaseUrl.trim(),
          email: jiraEmail.trim(),
          apiToken: jiraApiToken.trim(),
          projectKey: jiraProjectKey.trim().toUpperCase(),
          jql: jiraJql.trim(),
        },
      });
      setActionMessage("Standup settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save standup settings.");
    }
  }, [
    jiraApiToken,
    jiraBaseUrl,
    jiraEmail,
    jiraEnabled,
    jiraJql,
    jiraProjectKey,
    standup,
    standupAutoOpenBoard,
    standupCronExpr,
    standupScheduleEnabled,
    standupSpeakerSeconds,
    standupTimezone,
  ]);

  const handleSaveManualNotes = useCallback(async () => {
    if (!standupAgentId) {
      setError("Pick an agent before saving standup notes.");
      return;
    }
    setError(null);
    setActionMessage(null);
    try {
      await standup.updateManualEntry(standupAgentId, {
        jiraAssignee: manualJiraAssignee.trim() || null,
        currentTask: manualTask.trim(),
        blockers: manualBlockers.trim(),
        note: manualNote.trim(),
      });
      setActionMessage("Standup notes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save standup notes.");
    }
  }, [
    manualBlockers,
    manualJiraAssignee,
    manualNote,
    manualTask,
    standup,
    standupAgentId,
  ]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground">
              일정·연구 절차
            </div>
            <div className="mt-1 font-mono text-[12px] text-muted-foreground">
              반복할 연구 작업과 실행 일정을 관리합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={!cronEnabled}
            className="rounded border border-border bg-accent px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-primary transition-colors hover:border-border hover:text-primary"
          >
            새로고침
          </button>
        </div>
        {!cronEnabled ? (
          <div className="mt-2 font-mono text-[12px] text-muted-foreground">
            현재 런타임은 예약 작업을 지원하지 않습니다.
          </div>
        ) : null}
        {error ? <div className="mt-2 font-mono text-[12px] text-rose-700">{error}</div> : null}
        {actionMessage ? (
          <div className="mt-2 font-mono text-[12px] text-emerald-700">{actionMessage}</div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            등록된 일정
          </div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="font-mono text-[12px] text-muted-foreground">일정을 불러오는 중…</div>
            ) : jobs.length === 0 ? (
              <div className="font-mono text-[12px] text-muted-foreground">등록된 반복 작업이 없습니다.</div>
            ) : (
              jobs.map((job) => {
                const agentName = agentById.get(job.agentId ?? "")?.name || job.agentId || "알 수 없음";
                return (
                  <div
                    key={job.id}
                    className="rounded border border-border bg-surface-2 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground">
                          {job.name}
                        </div>
                        <div className="mt-1 font-mono text-[12px] text-muted-foreground">{agentName}</div>
                      </div>
                      <div className="shrink-0 rounded border border-border bg-accent px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-primary">
                        {job.state.lastStatus ?? "ready"}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 font-mono text-[12px] text-muted-foreground">
                      <div>{formatCronSchedule(job.schedule)}</div>
                      <div>다음 실행: {formatRelativeDateTime(job.state.nextRunAtMs)}</div>
                      <div>최근 실행: {formatRelativeDateTime(job.state.lastRunAtMs)}</div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRunNow(job.id)}
                        disabled={runBusyJobId === job.id || deleteBusyJobId === job.id}
                        className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-amber-700 transition-colors hover:border-amber-400/50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {runBusyJobId === job.id ? "실행 중" : "지금 실행"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(job.id)}
                        disabled={deleteBusyJobId === job.id || runBusyJobId === job.id}
                        className="rounded border border-rose-500/25 bg-rose-500/10 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-rose-700 transition-colors hover:border-rose-400/50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleteBusyJobId === job.id ? "제거 중" : "제거"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="rounded border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-emerald-700">
                  연구 진행 공유
                </div>
                <div className="mt-1 font-mono text-[12px] leading-5 text-muted-foreground">
                  정기 공유 시간과 자료 출처, 연구 메모를 설정합니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() => void standup.startMeeting("manual")}
                className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-emerald-700 transition-colors hover:border-emerald-400/50 hover:text-foreground"
              >
                지금 시작
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-2 font-mono text-[12px] text-foreground">
                <input
                  type="checkbox"
                  checked={standupScheduleEnabled}
                  onChange={(event) => setStandupScheduleEnabled(event.target.checked)}
                />
                정기 진행 공유 사용
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  예약 규칙 (Cron)
                </span>
                <input
                  value={standupCronExpr}
                  onChange={(event) => setStandupCronExpr(event.target.value)}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  시간대
                </span>
                <input
                  value={standupTimezone}
                  onChange={(event) => setStandupTimezone(event.target.value)}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  연구원별 공유 시간 (초)
                </span>
                <input
                  value={standupSpeakerSeconds}
                  onChange={(event) => setStandupSpeakerSeconds(event.target.value)}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <label className="flex items-center gap-2 font-mono text-[12px] text-foreground">
                <input
                  type="checkbox"
                  checked={standupAutoOpenBoard}
                  onChange={(event) => setStandupAutoOpenBoard(event.target.checked)}
                />
                공유를 시작하면 진행 보드 열기
              </label>

              <label className="flex items-center gap-2 font-mono text-[12px] text-foreground">
                <input
                  type="checkbox"
                  checked={jiraEnabled}
                  onChange={(event) => setJiraEnabled(event.target.checked)}
                />
                Jira 자료 연동
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  Jira 주소
                </span>
                <input
                  value={jiraBaseUrl}
                  onChange={(event) => setJiraBaseUrl(event.target.value)}
                  placeholder="https://company.atlassian.net"
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  Jira 이메일
                </span>
                <input
                  value={jiraEmail}
                  onChange={(event) => setJiraEmail(event.target.value)}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  Jira API 토큰
                </span>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(event) => {
                    setJiraApiToken(event.target.value);
                    setJiraApiTokenConfigured(event.target.value.trim().length > 0);
                  }}
                  placeholder={
                    jiraApiTokenConfigured ? "Stored on Studio host. Enter to replace." : ""
                  }
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
                {jiraApiTokenConfigured ? (
                  <span className="text-[12px] text-muted-foreground">
                    서버에 저장된 Jira API 토큰을 사용합니다.
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  Jira 프로젝트 키
                </span>
                <input
                  value={jiraProjectKey}
                  onChange={(event) => setJiraProjectKey(event.target.value)}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  사용자 JQL 쿼리
                </span>
                <textarea
                  value={jiraJql}
                  onChange={(event) => setJiraJql(event.target.value)}
                  rows={3}
                  className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleSaveStandupConfig()}
                disabled={standup.saving}
                className="rounded border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:border-emerald-400/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {standup.saving ? "설정 저장 중" : "진행 공유 설정 저장"}
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                연구 진행 메모
              </div>
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    연구원
                  </span>
                  <select
                    value={standupAgentId}
                    onChange={(event) => setStandupAgentId(event.target.value)}
                    className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                  >
                    <option value="">연구원 선택</option>
                    {agents.map((agent) => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.name || agent.agentId}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    Jira 담당자
                  </span>
                  <input
                    value={manualJiraAssignee}
                    onChange={(event) => setManualJiraAssignee(event.target.value)}
                    className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    현재 작업
                  </span>
                  <input
                    value={manualTask}
                    onChange={(event) => setManualTask(event.target.value)}
                    className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    진행을 막는 문제
                  </span>
                  <textarea
                    value={manualBlockers}
                    onChange={(event) => setManualBlockers(event.target.value)}
                    rows={3}
                    className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    메모
                  </span>
                  <textarea
                    value={manualNote}
                    onChange={(event) => setManualNote(event.target.value)}
                    rows={4}
                    className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleSaveManualNotes()}
                  className="rounded border border-border bg-accent px-3 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-border hover:text-foreground"
                >
                  메모 저장
                </button>
              </div>
            </div>

            {standup.meeting ? (
              <div className="mt-4 rounded border border-border bg-surface-2 px-3 py-3 font-mono text-[12px] text-muted-foreground">
                <div>진행 단계: {standup.meeting.phase}</div>
                <div>참여 연구원: {standup.meeting.participantOrder.length}</div>
                <div>
                  현재 공유 중: {standup.meeting.currentSpeakerAgentId ?? "대기 중"}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            작업 양식
          </div>
          <div className="mt-3 space-y-2">
            {PLAYBOOK_TEMPLATES.map((template) => {
              const isSelected = template.id === selectedTemplateId;
              return (
                <div
                  key={template.id}
                  className={`rounded border px-3 py-3 transition-colors ${
                    isSelected
                      ? "border-border bg-accent"
                      : "border-border bg-surface-2"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId((current) =>
                        current === template.id ? null : template.id
                      );
                      setError(null);
                      setActionMessage(null);
                    }}
                    className="w-full text-left"
                  >
                    <div className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground">
                      {template.name}
                    </div>
                    <div className="mt-1 font-mono text-[12px] leading-5 text-muted-foreground">
                      {template.description}
                    </div>
                  </button>

                  {isSelected ? (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                          연구원
                        </span>
                        <select
                          value={selectedAgentId}
                          onChange={(event) => setSelectedAgentId(event.target.value)}
                          className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
                        >
                          <option value="">연구원 선택</option>
                          {agents.map((agent) => (
                            <option key={agent.agentId} value={agent.agentId}>
                              {agent.name || agent.agentId}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                          작업 이름 (선택)
                        </span>
                        <input
                          value={nameOverride}
                          onChange={(event) => setNameOverride(event.target.value)}
                          placeholder={template.name}
                          className="rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleCreate()}
                        disabled={createBusy}
                        className="w-full rounded border border-border bg-accent px-3 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {createBusy ? "작업 등록 중" : "반복 작업 등록"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
