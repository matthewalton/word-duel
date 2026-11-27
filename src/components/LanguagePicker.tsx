"use client";

import { fill, strings } from "@/i18n/strings";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { PackFonts, packVars } from "./PackFonts";
import t from "./title.module.css";
import { Button } from "./ui/Button";
import { Menu, MenuRadioGroup, MenuRadioItem } from "./ui/Menu";

const s = strings.languagePicker;

/**
 * The language picker: a top-bar button naming the pack's target language in
 * its own words, opening a menu of every pack. Shows nothing with one pack.
 */
export function LanguagePicker({ pack, onChoose }: { pack: LanguagePack; onChoose: (id: string) => void }) {
  const packs = listPacks();
  const { target } = pack.meta;

  if (packs.length < 2) return null;

  return (
    <Menu
      label={s.menuLabel}
      align="start"
      className={t.langMenu}
      trigger={
        <Button variant="outlined" className={t.langButton} aria-label={fill(s.buttonAria, { language: target.name })}>
          <span lang={target.code} dir={target.dir} className={t.langButtonName}>
            {target.nativeName}
          </span>
          <svg viewBox="0 0 5 3" className={t.langCaret} shapeRendering="crispEdges" aria-hidden="true">
            <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
          </svg>
        </Button>
      }
    >
      <span className={t.langMenuLabel} aria-hidden="true">
        {s.menuLabel.toUpperCase()}
      </span>
      <MenuRadioGroup
        className={t.langList}
        value={pack.meta.id}
        onValueChange={(id) => {
          if (id !== pack.meta.id) onChoose(id);
        }}
      >
        {packs.map((meta) => {
          const other = getPack(meta.id);
          return (
            <MenuRadioItem
              key={meta.id}
              value={meta.id}
              className={t.langOption}
              style={packVars(other)}
            >
              <PackFonts pack={other} />
              <span lang={meta.target.code} dir={meta.target.dir} className={t.langOptionNative}>
                {meta.target.nativeName}
              </span>
              <span className={t.langOptionName}>{meta.target.name}</span>
            </MenuRadioItem>
          );
        })}
      </MenuRadioGroup>
    </Menu>
  );
}
