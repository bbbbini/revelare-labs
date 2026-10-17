/** The research room has its own layout; opening it never migrates the user's original office. */
export const RESEARCH_LAYOUT_VERSION = 1;
export const RESEARCH_FURNITURE = {
  workstation: "연구 책상과 의자",
  cabinet: "낮은 수납장",
  shelf: "책장",
  plant: "화분",
  divider: "패브릭 파티션",
  workbench: "책 수납 작업대",
} as const;
export type ResearchFurnitureType = keyof typeof RESEARCH_FURNITURE;
export type ResearchLayoutItem = { id: string; type: ResearchFurnitureType; x: number; z: number; rotation: number };
export const researchLayoutKey = (namespace: string) => `hermes3d:research-layout:v1:${namespace}`;

export function defaultResearchLayout(): ResearchLayoutItem[] {
  return [
    { id: "research-desk", type: "workstation", x: 0, z: 0, rotation: -Math.PI / 2 },
    { id: "foreground-desk", type: "workstation", x: 0, z: 2.65, rotation: Math.PI },
    { id: "right-workbench", type: "workbench", x: 2.2, z: -0.15, rotation: Math.PI / 2 },
    { id: "foreground-divider", type: "divider", x: 1.8, z: 1.7, rotation: 0 },
    { id: "left-cabinet", type: "cabinet", x: -3.22, z: 0.35, rotation: Math.PI / 2 },
    { id: "back-cabinet", type: "cabinet", x: -1.2, z: -1.98, rotation: 0 },
    { id: "corner-shelf", type: "shelf", x: -3.15, z: -1.5, rotation: Math.PI / 2 },
    { id: "left-plant", type: "plant", x: -3, z: 2.25, rotation: 0 },
    { id: "door-plant", type: "plant", x: 1.05, z: -1.6, rotation: 0 },
  ];
}

export function parseResearchLayout(raw: string | null): ResearchLayoutItem[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== RESEARCH_LAYOUT_VERSION || !("items" in value) || !Array.isArray(value.items) || value.items.length > 80) return null;
    const ids = new Set<string>();
    for (const item of value.items) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || ids.has(item.id) || !Object.hasOwn(RESEARCH_FURNITURE, item.type) || ![item.x, item.z, item.rotation].every(v => typeof v === "number" && Number.isFinite(v)) || Math.abs(item.x) > 6 || Math.abs(item.z) > 6) return null;
      ids.add(item.id);
    }
    return value.items;
  } catch { return null; }
}

export function serializeResearchLayout(items: ResearchLayoutItem[]) {
  return JSON.stringify({ version: RESEARCH_LAYOUT_VERSION, items });
}

export function moveResearchItem(items: ResearchLayoutItem[], id: string, x: number, z: number) {
  const snap = (v: number) => Math.max(-3.4, Math.min(5, Math.round(v * 10) / 10));
  return items.map(item => item.id === id ? { ...item, x: snap(x), z: snap(z) } : item);
}
