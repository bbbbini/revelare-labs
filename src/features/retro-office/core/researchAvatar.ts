import type { AgentAvatarProfile } from "@/lib/avatars/profile";

/** The authored prototype only represents this silhouette. Other saved looks
 * must keep using the original configurable avatar renderer. */
export function supportsResearchCharacter(profile: AgentAvatarProfile) {
  return profile.hair.style === "parted" &&
    profile.clothing.topStyle === "overshirt" &&
    profile.clothing.bottomStyle === "pants" &&
    profile.accessories.hatStyle === "none" &&
    !profile.accessories.glasses && !profile.accessories.headset && !profile.accessories.backpack;
}
