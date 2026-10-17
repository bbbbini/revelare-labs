import { expect, it } from "vitest";
import { createAgentAvatarProfileFromSeed } from "@/lib/avatars/profile";
import { supportsResearchCharacter } from "@/features/retro-office/core/researchAvatar";

it("uses the authored asset only for the silhouette it actually supports", () => {
  const profile = createAgentAvatarProfileFromSeed("researcher-1");
  expect(supportsResearchCharacter(profile)).toBe(true);
  for (const field of ["glasses", "headset", "backpack"] as const) {
    expect(supportsResearchCharacter({ ...profile, accessories: { ...profile.accessories, [field]: true } })).toBe(false);
  }
  expect(supportsResearchCharacter({ ...profile, accessories: { ...profile.accessories, hatStyle: "cap" } })).toBe(false);
  expect(supportsResearchCharacter({ ...profile, hair: { ...profile.hair, style: "bun" } })).toBe(false);
  expect(supportsResearchCharacter({ ...profile, clothing: { ...profile.clothing, bottomStyle: "shorts" } })).toBe(false);
  expect(supportsResearchCharacter({ ...profile, clothing: { ...profile.clothing, topStyle: "hoodie" } })).toBe(false);
});
