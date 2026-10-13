import { describe, expect, it } from "vitest";
import {
  LEGACY_DEFAULT_OFFICE_TITLE,
  defaultStudioOfficePreference,
  resolveOfficeDisplayTitle,
} from "@/lib/studio/settings";

describe("office display title", () => {
  it("defaults new offices to the REVELARE Security Labs title", () => {
    expect(defaultStudioOfficePreference().title).toBe("REVELARE Security Labs");
  });

  it("shows only the untouched upstream default as the current default", () => {
    expect(resolveOfficeDisplayTitle(LEGACY_DEFAULT_OFFICE_TITLE)).toBe("REVELARE Security Labs");
  });

  it("keeps any other saved title as is", () => {
    for (const title of ["Team Orbit", "luke headquarters", "Luke Headquarters 2", "연구실"]) {
      expect(resolveOfficeDisplayTitle(title)).toBe(title);
    }
  });
});
