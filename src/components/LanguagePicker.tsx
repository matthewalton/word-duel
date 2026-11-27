"use client";

import { fill, strings } from "@/i18n/strings";
import { setRememberPack, useRememberPack } from "@/lib/packChoice";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { CheckMark } from "./CheckMark";
import n from "./nav.module.css";
import { PackFonts, packVars } from "./PackFonts";
import { Button } from "./ui/Button";
import { Menu, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem } from "./ui/Menu";

const s = strings.languagePicker;

/**
 * The language picker, the top bar's language chip: a button naming the
 * pack's target language in its own words, opening a menu of every pack and
 * the REMEMBER ON THIS DEVICE switch (whether `/` skips the language step).
 * Shows nothing with one pack.
 */
export function LanguagePicker({ pack, onChoose }: { pack: LanguagePack; onChoose: (id: string) => void }) {
  const packs = listPacks();
  const remember = useRememberPack();
  const { target } = pack.meta;

  if (packs.length < 2) return null;

  return (
    <Menu
      label={s.menuLabel}
      align="end"
      className={n.langMenu}
      trigger={
        <Button variant="outlined" className={n.langButton} aria-label={fill(s.buttonAria, { language: target.name })}>
          <span lang={target.code} dir={target.dir} className={n.langButtonName}>
            {target.nativeName}
          </span>
          <svg viewBox="0 0 5 3" className={n.langCaret} shapeRendering="crispEdges" aria-hidden="true">
            <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
          </svg>
        </Button>
      }
    >
      <span className={n.langMenuLabel} aria-hidden="true">
        {strings.nav.learning}
      </span>
      <MenuRadioGroup
        className={n.langList}
        value={pack.meta.id}
        onValueChange={(id) => {
          if (id !== pack.meta.id) onChoose(id);
        }}
      >
        {packs.map((meta) => {
          const other = getPack(meta.id);
          return (
            <MenuRadioItem key={meta.id} value={meta.id} className={n.langOption} style={packVars(other)}>
              <PackFonts pack={other} />
              <span lang={meta.target.code} dir={meta.target.dir} className={n.langOptionNative}>
                {meta.target.nativeName}
              </span>
              <span className={n.langOptionName}>{meta.target.name.toUpperCase()}</span>
            </MenuRadioItem>
          );
        })}
      </MenuRadioGroup>
      <MenuCheckboxItem
        className={n.langRemember}
        checked={remember}
        onCheckedChange={setRememberPack}
        // Keep the menu open so the box can be seen changing.
        onSelect={(e) => e.preventDefault()}
      >
        <span className={n.checkBox} aria-hidden="true">
          {remember && <CheckMark />}
        </span>
        {strings.nav.rememberDevice}
      </MenuCheckboxItem>
    </Menu>
  );
}
