import type { ComponentProps } from "react";
import { Text } from "@react-three/drei";

/** Bundled OFL font with Hangul, Latin and digits; covered glyphs never fetch a font. */
export const LOCAL_TEXT_FONT = "/office-assets/fonts/IBMPlexSansKR-Regular.ttf";

/** drei Text with the local font as its default; a defined `font` prop still overrides it. */
export function LocalText(props: ComponentProps<typeof Text>) {
  return <Text {...props} font={props.font ?? LOCAL_TEXT_FONT} />;
}
