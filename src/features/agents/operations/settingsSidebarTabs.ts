import type { SettingsRouteTab } from "@/features/agents/operations/settingsRouteWorkflow";

export type SettingsSidebarEntry = {
  id: SettingsRouteTab;
  label: string;
};

const BASE_SETTINGS_SIDEBAR_ENTRIES: readonly SettingsSidebarEntry[] = [
  { id: "personality", label: "동작" },
  { id: "capabilities", label: "권한" },
  { id: "skills", label: "스킬" },
  { id: "system", label: "시스템 설정" },
  { id: "automations", label: "자동화" },
  { id: "advanced", label: "고급" },
];

export const resolveSettingsSidebarEntries = (runtimeSupportsCron: boolean) =>
  BASE_SETTINGS_SIDEBAR_ENTRIES.filter(
    (entry) => runtimeSupportsCron || entry.id !== "automations"
  );
