import type { CSSProperties } from "react";
import { fontStack, packFontsHref } from "@/packs";
import type { LanguagePack } from "@/packs/types";

/** The pack's word font stylesheet, if it comes from Google Fonts. */
export function PackFonts({ pack }: { pack: LanguagePack }) {
  const href = packFontsHref(pack);
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={href} precedence="default" />
    </>
  );
}

/** CSS variables a page sets from its pack: `--font-words`. */
export function packVars(pack: LanguagePack): CSSProperties {
  return { "--font-words": fontStack(pack.meta.fonts.words) } as CSSProperties;
}
