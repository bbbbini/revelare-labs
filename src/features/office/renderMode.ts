// Office renderer preference: research laboratory, legacy 3D or pixel office.
// Persisted in localStorage so the choice survives reloads.

export type OfficeRenderMode = "lab" | "3d" | "2d";

export const OFFICE_RENDER_MODE_STORAGE_KEY = "hermes-office-render-mode-v1";

export const OFFICE_RENDER_MODE_OPTIONS: Array<{
  id: OfficeRenderMode;
  label: string;
  description: string;
}> = [
  { id: "lab", label: "2.5D 연구실", description: "연구원 상태를 확인하고 대화와 작업을 이어가는 연구실입니다." },
  {
    id: "3d",
    label: "3D 연구실",
    description: "입체 공간에서 연구원을 살펴보는 기존 화면입니다.",
  },
  {
    id: "2d",
    label: "픽셀 연구실",
    description: "가벼운 픽셀 화면입니다. 전용 이미지 없이도 사용할 수 있습니다.",
  },
];

export const isOfficeRenderMode = (value: unknown): value is OfficeRenderMode =>
  value === "lab" || value === "3d" || value === "2d";

/** The explicit user choice, or null when the user never picked one. */
export const loadStoredOfficeRenderMode = (): OfficeRenderMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(OFFICE_RENDER_MODE_STORAGE_KEY);
    if (isOfficeRenderMode(stored)) return stored;
  } catch {
    // Storage unavailable (private mode, etc.) — fall through to default.
  }
  return null;
};

/** A direct view link wins, otherwise retain the user's renderer preference. */
export const resolveInitialOfficeRenderMode = (defaultMode: OfficeRenderMode = "lab"): OfficeRenderMode => {
  if (typeof window !== "undefined") {
    const requested = new URLSearchParams(window.location.search).get("renderer");
    if (isOfficeRenderMode(requested)) return requested;
  }
  return loadStoredOfficeRenderMode() ?? defaultMode;
};

export const saveOfficeRenderMode = (mode: OfficeRenderMode) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFICE_RENDER_MODE_STORAGE_KEY, mode);
  } catch {
    // Best effort only.
  }
};
