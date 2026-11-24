"use client";

import { useMemo, useState } from "react";

import {
  Download,
  ExternalLink,
  RefreshCcw,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

import type { OfficeSkillsMarketplaceController } from "@/features/office/hooks/useOfficeSkillsMarketplace";
import type { SkillMarketplaceCollectionId, SkillMarketplaceEntry } from "@/lib/skills/marketplace";
import { buildSkillMarketplaceCollections } from "@/lib/skills/marketplace";
import { buildAgentSkillsAllowlistSet, deriveAgentSkillsAccessMode } from "@/lib/skills/presentation";

type MarketplaceFilter = "all" | SkillMarketplaceCollectionId;

const FILTER_LABELS: Record<MarketplaceFilter, string> = {
  hermes3d: "Hermes3D",
  all: "전체",
  featured: "추천",
  installed: "설치됨",
  "setup-required": "설정 필요",
  "built-in": "기본 제공",
  workspace: "연구 공간",
  extra: "커뮤니티",
  other: "기타",
};

const READINESS_LABELS = {
  ready: "사용 가능",
  "needs-setup": "설정 필요",
  unavailable: "사용 불가",
  "disabled-globally": "전체 비활성화",
} as const;

const READINESS_CLASSES = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  "needs-setup": "border-amber-500/30 bg-amber-500/10 text-amber-700",
  unavailable: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  "disabled-globally": "border-border bg-accent text-primary",
} as const;

const formatRating = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "4.7";
  }
  return value.toFixed(1);
};

const formatInstalls = (value: number | undefined) => {
  const installs = value ?? 0;
  if (installs >= 1000) {
    return `${(installs / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US").format(installs);
};

const buildSearchBlob = (entry: SkillMarketplaceEntry): string => {
  return [
    entry.skill.name,
    entry.skill.description,
    entry.skill.skillKey,
    entry.skill.source,
    entry.metadata.category,
    entry.metadata.tagline,
    entry.metadata.capabilities.join(" "),
  ]
    .join(" ")
    .toLowerCase();
};

const getAgentSkillEnabled = (
  skillName: string,
  accessMode: ReturnType<typeof deriveAgentSkillsAccessMode>,
  allowlistSet: Set<string>
) => {
  if (accessMode === "all") {
    return true;
  }
  if (accessMode === "none") {
    return false;
  }
  return allowlistSet.has(skillName.trim());
};

export function SkillsMarketplacePanel({
  marketplace,
  onSelectAgent,
  onOpenAgentSettings,
}: {
  marketplace: OfficeSkillsMarketplaceController;
  onSelectAgent: (agentId: string) => void;
  onOpenAgentSettings: (agentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MarketplaceFilter>("hermes3d");
  const [detailSkillKey, setDetailSkillKey] = useState<string | null>(null);

  const entries = useMemo(
    () => marketplace.marketplaceSkills ?? marketplace.skillsReport?.skills ?? [],
    [marketplace.marketplaceSkills, marketplace.skillsReport]
  );
  const collections = useMemo(() => buildSkillMarketplaceCollections(entries), [entries]);
  const accessMode = useMemo(
    () => deriveAgentSkillsAccessMode(marketplace.skillsAllowlist),
    [marketplace.skillsAllowlist]
  );
  const allowlistSet = useMemo(
    () => buildAgentSkillsAllowlistSet(marketplace.skillsAllowlist),
    [marketplace.skillsAllowlist]
  );

  const filteredCollections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleCollectionIds: SkillMarketplaceCollectionId[] =
      activeFilter === "all"
        ? ["hermes3d", "built-in", "installed", "workspace", "extra", "other"]
        : [activeFilter];
    return collections
      .filter((collection) => visibleCollectionIds.includes(collection.id))
      .map((collection) => ({
        ...collection,
        entries: collection.entries.filter((entry) => {
          if (!normalizedQuery) {
            return true;
          }
          return buildSearchBlob(entry).includes(normalizedQuery);
        }),
      }))
      .filter((collection) => collection.entries.length > 0);
  }, [activeFilter, collections, query]);

  const featuredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const featuredCollection = collections.find((collection) => collection.id === "featured");
    if (!featuredCollection) {
      return [];
    }
    return featuredCollection.entries
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }
        return buildSearchBlob(entry).includes(normalizedQuery);
      })
      .slice(0, 3);
  }, [collections, query]);

  const filterCounts = useMemo(() => {
    const counts: Record<MarketplaceFilter, number> = {
      hermes3d: 0,
      all: entries.length,
      featured: 0,
      installed: 0,
      "setup-required": 0,
      "built-in": 0,
      workspace: 0,
      extra: 0,
      other: 0,
    };
    for (const collection of collections) {
      counts[collection.id] = collection.entries.length;
    }
    return counts;
  }, [collections, entries.length]);

  const detailEntry =
    collections
      .flatMap((collection) => collection.entries)
      .find((entry) => entry.skill.skillKey === detailSkillKey) ?? null;

  return (
    <section className="relative flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground">
              연구 도구
            </div>
            <div className="mt-1 font-mono text-[12px] text-muted-foreground">
              연결한 런타임에서 사용할 도구를 살펴보고 관리합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void marketplace.refresh()}
            className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-primary transition-colors hover:border-border hover:text-primary"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            새로고침
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-[12px] text-amber-700">
          설치할 도구는 선택한 연구원에 적용합니다. 런타임 전체 설정과 연구원별 사용 권한을 확인해 주세요.
        </div>

        <div className="mt-3 rounded border border-border bg-surface-2 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                사용할 연구원
              </div>
              <div className="mt-1 font-mono text-[12px] text-foreground">
                {marketplace.selectedAgent?.name ?? "No agent selected"}
              </div>
            </div>
            <div className="font-mono text-[12px] text-muted-foreground">
              접근 범위: {accessMode === "selected" ? "Selected skills" : accessMode}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <select
              value={marketplace.selectedAgentId ?? ""}
              onChange={(event) => marketplace.setSelectedAgentId(event.target.value || null)}
              className="min-w-0 flex-1 rounded border border-border bg-surface-1 px-2 py-2 font-mono text-[12px] text-foreground outline-none"
            >
              {marketplace.agents.length === 0 ? <option value="">선택할 연구원이 없습니다.</option> : null}
              {marketplace.agents.map((agent) => (
                <option key={agent.agentId} value={agent.agentId}>
                  {agent.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!marketplace.selectedAgentId}
              onClick={() => {
                if (marketplace.selectedAgentId) {
                  onSelectAgent(marketplace.selectedAgentId);
                }
              }}
              className="rounded border border-border bg-surface-2 px-2 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              대화 열기
            </button>
            <button
              type="button"
              disabled={!marketplace.selectedAgentId}
              onClick={() => {
                if (marketplace.selectedAgentId) {
                  onOpenAgentSettings(marketplace.selectedAgentId);
                }
              }}
              className="rounded border border-border bg-surface-2 px-2 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              설정
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, categories, or sources"
            className="w-full rounded border border-border bg-surface-1 px-3 py-2 font-mono text-[12px] text-foreground outline-none transition focus:border-border"
            aria-label="Search marketplace skills"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(FILTER_LABELS) as MarketplaceFilter[]).map((filterId) => (
            <button
              key={filterId}
              type="button"
              onClick={() => setActiveFilter(filterId)}
              className={`rounded border px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors ${
                activeFilter === filterId
                  ? "border-border bg-accent text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {FILTER_LABELS[filterId]} ({filterCounts[filterId]})
            </button>
          ))}
        </div>

        {marketplace.message ? (
          <div
            className={`mt-3 rounded border px-3 py-2 font-mono text-[12px] ${
              marketplace.message.kind === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-rose-500/30 bg-rose-500/10 text-rose-700"
            }`}
          >
            {marketplace.message.text}
            {marketplace.message.kind === "success" ? (
              <div className="mt-1 font-mono text-[12px] text-emerald-700">
                Check the `HERMES3D` filter below to find the installed skill quickly.
              </div>
            ) : null}
          </div>
        ) : null}

        {marketplace.error && !marketplace.message ? (
          <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-[12px] text-rose-700">
            {marketplace.error}
          </div>
        ) : null}

        {marketplace.loading ? (
          <div className="mt-4 font-mono text-[12px] text-muted-foreground">도구 목록을 불러오는 중…</div>
        ) : null}

        {!marketplace.loading && activeFilter === "all" && featuredEntries.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              추천 도구
            </div>
            <div className="grid gap-2">
              {featuredEntries.map((entry) => (
                <button
                  key={`featured:${entry.skill.skillKey}`}
                  type="button"
                  onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                  className="rounded border border-border bg-gradient-to-br from-cyan-500/10 to-transparent px-3 py-3 text-left transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[12px] font-semibold text-foreground">{entry.skill.name}</div>
                      <div className="mt-1 font-mono text-[12px] text-primary">{entry.metadata.tagline}</div>
                    </div>
                    <div className="rounded border border-border px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-primary">
                      {entry.metadata.editorBadge ?? "추천"}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[12px] text-muted-foreground">
                    {!entry.metadata.hideStats ? (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-700" />
                          {formatRating(entry.metadata.rating)}
                        </span>
                        <span>{formatInstalls(entry.metadata.installs)} 회 설치</span>
                      </>
                    ) : null}
                    <span>{entry.metadata.category}</span>
                  </div>
                  {entry.metadata.poweredByName && entry.metadata.poweredByUrl ? (
                    <div className="mt-2 font-mono text-[12px] text-muted-foreground">
                      제공:{" "}
                      <a
                        href={entry.metadata.poweredByUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline decoration-cyan-500/40 underline-offset-2 transition-colors hover:text-primary"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {entry.metadata.poweredByName}
                      </a>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!marketplace.loading && filteredCollections.length === 0 ? (
          <div className="mt-4 rounded border border-border bg-surface-2 px-3 py-4 font-mono text-[12px] text-muted-foreground">
            조건에 맞는 도구가 없습니다.
          </div>
        ) : null}

        {!marketplace.loading &&
          filteredCollections.map((collection) => (
            <div key={collection.id} className="mt-4">
              <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                {collection.label}
              </div>
              <div className="flex flex-col gap-2">
                {collection.entries.map((entry) => {
                  const packagedSkill = marketplace.packagedSkillsByKey.get(entry.skill.skillKey);
                  const packageOnly = Boolean(packagedSkill && !entry.skill.baseDir.trim());
                  const isEnabledForAgent = getAgentSkillEnabled(entry.skill.name, accessMode, allowlistSet);
                  const primaryAction =
                    packageOnly
                      ? {
                          label: "도구 설치",
                          run: () => void marketplace.handleInstallPackagedSkill(entry.skill.skillKey),
                          icon: Download,
                        }
                      : entry.readiness === "needs-setup" && entry.installable
                      ? {
                          label: "Install deps",
                          run: () => void marketplace.handleInstallSkill(entry.skill),
                          icon: Download,
                        }
                      : entry.readiness === "disabled-globally"
                        ? {
                            label: "Enable gateway",
                            run: () => void marketplace.handleSetSkillGlobalEnabled(entry.skill.skillKey, true),
                            icon: Settings2,
                          }
                        : entry.readiness === "needs-setup"
                          ? {
                              label: "Open settings",
                              run: () => {
                                if (marketplace.selectedAgentId) {
                                  onOpenAgentSettings(marketplace.selectedAgentId);
                                }
                              },
                              icon: Settings2,
                            }
                          : null;
                  const PrimaryIcon = primaryAction?.icon ?? Settings2;
                  return (
                    <div
                      key={`${collection.id}:${entry.skill.skillKey}`}
                      className="rounded border border-border bg-surface-2 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                              className="truncate font-mono text-[12px] font-semibold text-foreground transition-colors hover:text-primary"
                            >
                              {entry.skill.name}
                            </button>
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
                              {entry.metadata.category}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] ${READINESS_CLASSES[entry.readiness]}`}
                            >
                              {READINESS_LABELS[entry.readiness]}
                            </span>
                          </div>
                          <div className="mt-2 font-mono text-[12px] text-muted-foreground">{entry.metadata.tagline}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[12px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3 w-3 text-primary" />
                              {entry.metadata.trustLabel}
                            </span>
                            {!entry.metadata.hideStats ? (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-700" />
                                  {formatRating(entry.metadata.rating)}
                                </span>
                                <span>{formatInstalls(entry.metadata.installs)} 회 설치</span>
                              </>
                            ) : null}
                            <span>{entry.skill.source}</span>
                          </div>
                          {entry.metadata.poweredByName && entry.metadata.poweredByUrl ? (
                            <div className="mt-2 font-mono text-[12px] text-muted-foreground">
                              제공:{" "}
                              <a
                                href={entry.metadata.poweredByUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline decoration-cyan-500/40 underline-offset-2 transition-colors hover:text-primary"
                              >
                                {entry.metadata.poweredByName}
                              </a>
                            </div>
                          ) : null}
                          {entry.missingDetails.length > 0 ? (
                            <div className="mt-2 font-mono text-[12px] text-amber-700">
                              {entry.missingDetails[0]}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => void marketplace.handleSetSkillEnabled(entry.skill.name, !isEnabledForAgent)}
                            disabled={
                              packageOnly ||
                              entry.readiness === "unavailable" ||
                              !marketplace.selectedAgentId ||
                              marketplace.busySkillKey === entry.skill.skillKey
                            }
                            className={`rounded border px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                              isEnabledForAgent
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                : "border-border bg-surface-2 text-foreground hover:bg-surface-2"
                            }`}
                          >
                            {isEnabledForAgent ? "Disable for agent" : "Enable for agent"}
                          </button>

                          <div className="flex flex-wrap justify-end gap-2">
                            {primaryAction ? (
                              <button
                                type="button"
                                onClick={primaryAction.run}
                                disabled={
                                  marketplace.busySkillKey === entry.skill.skillKey ||
                                  (packageOnly && !marketplace.selectedAgentId) ||
                                  (primaryAction.label === "Open settings" &&
                                    !marketplace.selectedAgentId)
                                }
                                className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-primary transition-colors hover:border-border disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <PrimaryIcon className="h-3.5 w-3.5" />
                                {primaryAction.label}
                              </button>
                            ) : null}

                            {entry.removable ? (
                              <button
                                type="button"
                                onClick={() => void marketplace.handleRemoveSkill(entry.skill)}
                                disabled={marketplace.busySkillKey === entry.skill.skillKey}
                                className="inline-flex items-center gap-1 rounded border border-rose-500/25 bg-rose-500/10 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-rose-700 transition-colors hover:border-rose-400/40 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                모든 연구원에서 제거
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                              className="rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-2"
                            >
                              상세 보기
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[12px] text-muted-foreground">
                        <div>
                          {isEnabledForAgent
                            ? "This skill is currently enabled for the selected agent."
                            : "This skill is currently disabled for the selected agent."}
                        </div>
                        {entry.removable ? (
                          <div>런타임에서 도구를 제거하면 모든 연구원이 사용할 수 없게 됩니다.</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {detailEntry ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-background">
          <div className="flex items-start justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                도구 상세
              </div>
              <div className="mt-1 font-mono text-[14px] font-semibold text-foreground">
                {detailEntry.skill.name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDetailSkillKey(null)}
              className="rounded border border-border bg-surface-2 p-1.5 text-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Close marketplace detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded border border-border bg-surface-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-primary">
                  {detailEntry.metadata.category}
                </span>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
                  {detailEntry.metadata.trustLabel}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.12em] ${READINESS_CLASSES[detailEntry.readiness]}`}
                >
                  {READINESS_LABELS[detailEntry.readiness]}
                </span>
              </div>
              <div className="mt-3 font-mono text-[12px] text-foreground">{detailEntry.metadata.tagline}</div>
              {detailEntry.metadata.poweredByName && detailEntry.metadata.poweredByUrl ? (
                <div className="mt-3 font-mono text-[12px] text-muted-foreground">
                  제공:{" "}
                  <a
                    href={detailEntry.metadata.poweredByUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline decoration-cyan-500/40 underline-offset-2 transition-colors hover:text-primary"
                  >
                    {detailEntry.metadata.poweredByName}
                  </a>
                </div>
              ) : null}
              <div
                className={`mt-3 grid gap-2 font-mono text-[12px] text-muted-foreground ${
                  detailEntry.metadata.hideStats ? "grid-cols-1" : "grid-cols-3"
                }`}
              >
                {!detailEntry.metadata.hideStats ? (
                  <>
                    <div className="rounded border border-border bg-surface-1 px-2 py-2">
                      <div className="text-muted-foreground">평점</div>
                      <div className="mt-1 text-foreground">{formatRating(detailEntry.metadata.rating)}</div>
                    </div>
                    <div className="rounded border border-border bg-surface-1 px-2 py-2">
                      <div className="text-muted-foreground">설치 수</div>
                      <div className="mt-1 text-foreground">{formatInstalls(detailEntry.metadata.installs)}</div>
                    </div>
                  </>
                ) : null}
                <div className="rounded border border-border bg-surface-1 px-2 py-2">
                  <div className="text-muted-foreground">출처</div>
                  <div className="mt-1 text-foreground">{detailEntry.skill.source}</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                사용 기능
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {detailEntry.metadata.capabilities.map((capability) => (
                  <div
                    key={capability}
                    className="rounded border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-foreground"
                  >
                    {capability}
                  </div>
                ))}
              </div>
            </div>

            {detailEntry.missingDetails.length > 0 ? (
              <div className="mt-4">
                <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                  설정 안내
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {detailEntry.missingDetails.map((line) => (
                    <div
                      key={line}
                      className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-[12px] text-amber-700"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded border border-border bg-accent px-3 py-3 font-mono text-[12px] text-primary">
              도구는 선택한 연구 공간에 설치됩니다. 런타임 전체 설정은 다른 연구원에게도 영향을 줄 수 있습니다.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {marketplace.packagedSkillsByKey.get(detailEntry.skill.skillKey) &&
              !detailEntry.skill.baseDir.trim() ? (
                <button
                  type="button"
                  onClick={() => void marketplace.handleInstallPackagedSkill(detailEntry.skill.skillKey)}
                  disabled={marketplace.busySkillKey === detailEntry.skill.skillKey}
                  className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-primary transition-colors hover:border-border disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5" />
                  도구 설치
                </button>
              ) : null}
              {detailEntry.readiness === "needs-setup" && detailEntry.installable ? (
                <button
                  type="button"
                  onClick={() => void marketplace.handleInstallSkill(detailEntry.skill)}
                  disabled={marketplace.busySkillKey === detailEntry.skill.skillKey}
                  className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-primary transition-colors hover:border-border disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5" />
                  필요 항목 설치
                </button>
              ) : null}
              {detailEntry.readiness === "disabled-globally" ? (
                <button
                  type="button"
                  onClick={() =>
                    void marketplace.handleSetSkillGlobalEnabled(detailEntry.skill.skillKey, true)
                  }
                  disabled={marketplace.busySkillKey === detailEntry.skill.skillKey}
                  className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-primary transition-colors hover:border-border disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  런타임에서 활성화
                </button>
              ) : null}
              <button
                type="button"
                disabled={!marketplace.selectedAgentId}
                onClick={() => {
                  if (marketplace.selectedAgentId) {
                    onOpenAgentSettings(marketplace.selectedAgentId);
                  }
                }}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Settings2 className="h-3.5 w-3.5" />
                설정에서 관리
              </button>
              {detailEntry.skill.homepage ? (
                <a
                  href={detailEntry.skill.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  도구 홈페이지
                </a>
              ) : null}
            </div>
            <div className="mt-4 rounded border border-border bg-surface-2 px-3 py-3 font-mono text-[12px] text-muted-foreground">
              연구원별 활성화는 선택한 연구원의 사용 권한만 바꿉니다. 전체 제거는 런타임에서 도구를 삭제합니다.
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
