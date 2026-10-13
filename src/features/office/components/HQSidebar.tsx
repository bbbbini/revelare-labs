"use client";

import type { ReactNode } from "react";

export type HQSidebarTab =
  | "inbox"
  | "history"
  | "kanban"
  | "playbooks"
  | "analytics";

type HQSidebarProps = {
  open: boolean;
  activeTab: HQSidebarTab;
  inboxCount: number;
  onToggle: () => void;
  onTabChange: (tab: HQSidebarTab) => void;
  onOpenMarketplace: () => void;
  onAddAgent?: () => void;
  onOpenCompanyBuilder?: () => void;
  inboxPanel: ReactNode;
  historyPanel: ReactNode;
  kanbanPanel: ReactNode;
  playbooksPanel: ReactNode;
  analyticsPanel: ReactNode;
};

const TAB_LABELS: Record<HQSidebarTab, string> = {
  inbox: "받은 항목",
  history: "기록",
  kanban: "칸반",
  playbooks: "플레이북",
  analytics: "분석",
};

const PRIMARY_TABS: HQSidebarTab[] = ["inbox", "history", "kanban", "playbooks"];

export function HQSidebar({
  open,
  activeTab,
  inboxCount,
  onToggle,
  onTabChange,
  onOpenMarketplace,
  onAddAgent,
  onOpenCompanyBuilder,
  inboxPanel,
  historyPanel,
  kanbanPanel,
  playbooksPanel,
  analyticsPanel,
}: HQSidebarProps) {
  const analyticsOnly = activeTab === "analytics";
  const railOnly = analyticsOnly;
  const activePanel =
    activeTab === "inbox"
      ? inboxPanel
      : activeTab === "history"
        ? historyPanel
        : activeTab === "kanban"
          ? kanbanPanel
        : activeTab === "playbooks"
          ? playbooksPanel
          : analyticsPanel;
  const boardLikeWidth = activeTab === "kanban";

  return (
    <aside className="pointer-events-none fixed inset-y-0 right-0 z-20 flex justify-end">
      <div className="pointer-events-auto mt-14 flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-l-md border border-r-0 border-[#e2dccf] bg-[#fbf8f2]/95 px-1.5 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-[#2f3133] shadow-sm backdrop-blur transition-colors hover:border-[#b8c6ab] hover:text-[#4f6545]"
          aria-expanded={open}
          aria-label={open ? "본부 사이드바 접기" : "본부 사이드바 열기"}
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            {open ? "본부 접기" : "본부 열기"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenMarketplace();
          }}
          className="rounded-l-md border border-r-0 border-[#e2dccf] bg-[#fbf8f2]/95 px-1.5 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-[#2f3133] shadow-sm backdrop-blur transition-colors hover:border-[#b8c6ab] hover:text-[#4f6545]"
          aria-label="마켓플레이스 열기"
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            마켓플레이스
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onTabChange("analytics");
            if (!open) {
              onToggle();
            }
          }}
          className={`rounded-l-md border border-r-0 px-1.5 py-2.5 text-[11px] font-semibold tracking-[0.12em] shadow-sm backdrop-blur transition-colors ${
            analyticsOnly
              ? "border-[#b8c6ab] bg-[#e3e9dc] text-[#4f6545]"
              : "border-[#e2dccf] bg-[#fbf8f2]/95 text-[#2f3133] hover:border-[#b8c6ab] hover:text-[#4f6545]"
          }`}
          aria-pressed={analyticsOnly}
          aria-label="분석 사이드바 열기"
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            분석
          </span>
        </button>
      </div>

      {open ? (
        <div
          className={`pointer-events-auto flex h-full flex-col border-l border-cyan-500/20 bg-black/85 shadow-2xl backdrop-blur ${
            boardLikeWidth ? "w-[min(94vw,1180px)]" : "w-56"
          }`}
        >
          <div className="border-b border-cyan-500/15 px-4 py-3">
            <div className="font-mono text-[10px] font-semibold tracking-[0.32em] text-cyan-300/80">
              {analyticsOnly ? "분석" : "본부"}
            </div>
            <div className="mt-1 font-mono text-[11px] text-white/45">
              {analyticsOnly
                ? "Cost, budgets, and performance intelligence."
                : "Monitor outputs, runs, and schedules."}
            </div>
            {!railOnly && onAddAgent ? (
              <button
                type="button"
                onClick={onAddAgent}
                className="mt-3 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
              >
                에이전트 추가
              </button>
            ) : null}
            {!railOnly && onOpenCompanyBuilder ? (
              <button
                type="button"
                onClick={onOpenCompanyBuilder}
                className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-100"
              >
                회사 구성
              </button>
            ) : null}
            {railOnly ? (
              <button
                type="button"
                onClick={() => onTabChange("inbox")}
                className="mt-3 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
              >
                본부로 돌아가기
              </button>
            ) : null}
          </div>

          {!railOnly ? (
            <div
              role="tablist"
              aria-label="본부 패널"
              className="grid grid-cols-4 border-b border-cyan-500/15"
            >
              {PRIMARY_TABS.map((tab) => {
                const isActive = tab === activeTab;
                const showBadge = tab === "inbox" && inboxCount > 0;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`hq-panel-${tab}`}
                    id={`hq-tab-${tab}`}
                    onClick={() => onTabChange(tab)}
                    className={`flex items-center justify-center gap-1 border-r border-cyan-500/10 px-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors last:border-r-0 ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-100"
                        : "text-white/45 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <span>{TAB_LABELS[tab]}</span>
                    {showBadge ? (
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300" aria-label={`${inboxCount} unread`}>
                        {inboxCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            role="tabpanel"
            id={`hq-panel-${activeTab}`}
            aria-labelledby={`hq-tab-${activeTab}`}
            className="min-h-0 flex-1 overflow-hidden"
          >
            {activePanel}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
