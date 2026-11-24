import { afterEach, describe, expect, it } from "vitest";
import { OFFICE_RENDER_MODE_STORAGE_KEY, isOfficeRenderMode, resolveInitialOfficeRenderMode } from "@/features/office/renderMode";
afterEach(() => { localStorage.removeItem(OFFICE_RENDER_MODE_STORAGE_KEY); history.replaceState(null, "", "/"); });
describe("laboratory renderer preference", () => {
  it("defaults to the 2.5D lab while preserving existing choices", () => {
    localStorage.removeItem(OFFICE_RENDER_MODE_STORAGE_KEY);
    expect(resolveInitialOfficeRenderMode()).toBe("lab");
    expect(resolveInitialOfficeRenderMode("2d")).toBe("2d");
    for (const mode of ["2d", "3d"]) { localStorage.setItem(OFFICE_RENDER_MODE_STORAGE_KEY, mode); expect(resolveInitialOfficeRenderMode()).toBe(mode); }
  });
  it("opens a direct lab link without overwriting a saved legacy preference", () => {
    localStorage.setItem(OFFICE_RENDER_MODE_STORAGE_KEY, "3d");
    history.replaceState(null, "", "/office?renderer=lab");
    expect(resolveInitialOfficeRenderMode()).toBe("lab");
    expect(localStorage.getItem(OFFICE_RENDER_MODE_STORAGE_KEY)).toBe("3d");
    expect(isOfficeRenderMode("unexpected")).toBe(false);
  });
});
