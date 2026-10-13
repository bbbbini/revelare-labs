import { describe, expect, it } from "vitest";

import { SCALE } from "@/features/retro-office/core/constants";
import { CHAIR_SEAT_ANCHOR, modelPointToCanvas } from "@/features/retro-office/core/geometry";
import { getDeskLocations } from "@/features/retro-office/core/navigation";
import type { FurnitureItem } from "@/features/retro-office/core/types";

const desk = (x: number, y: number, facing = 0) =>
  ({ type: "desk_cubicle", x, y, facing, _uid: `d${x}` }) as unknown as FurnitureItem;
const chair = (x: number, y: number, facing = 0) =>
  ({ type: "chair", x, y, facing, _uid: `c${x}-${y}` }) as unknown as FurnitureItem;
const chairSeat = (item: FurnitureItem) =>
  modelPointToCanvas(item, CHAIR_SEAT_ANCHOR.local, CHAIR_SEAT_ANCHOR.scale);

describe("model points in canvas units", () => {
  it("matches the scene transform for an unrotated item", () => {
    const point = modelPointToCanvas(chair(100, 200), { x: 0.1675, z: -0.157 }, 1.2);
    expect(point.x).toBeCloseTo(100 + (0.1675 * 1.2) / SCALE, 6);
    expect(point.y).toBeCloseTo(200 + (-0.157 * 1.2) / SCALE, 6);
  });

  it("rotates about the footprint centre", () => {
    const point = modelPointToCanvas(chair(100, 200, 180), { x: 0, z: 0 }, 1);
    // A 24x24 footprint rotated half a turn moves its corner to the far corner.
    expect(point.x).toBeCloseTo(124, 6);
    expect(point.y).toBeCloseTo(224, 6);
  });
});

describe("desk seat locations", () => {
  it("seats the agent on the drawn chair of the default desk", () => {
    const deskChair = chair(120, 290, 180);
    expect(getDeskLocations([desk(100, 300), deskChair])).toEqual([chairSeat(deskChair)]);
  });

  it("uses the authored seat when no chair is near", () => {
    expect(getDeskLocations([desk(100, 300), chair(600, 700)])).toEqual([{ x: 140, y: 295 }]);
  });

  it("follows a chair the user moved to the other side of the desk", () => {
    const moved = chair(140, 260, 0);
    expect(getDeskLocations([desk(100, 300), moved])).toEqual([chairSeat(moved)]);
  });
});
