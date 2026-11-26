"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { fill, strings } from "@/i18n/strings";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { PackFonts, packVars } from "./PackFonts";
import t from "./title.module.css";

const s = strings.languagePicker;

/**
 * The language picker: a top-bar button naming the pack's target language in
 * its own words, opening a menu of every pack. Shows nothing with one pack.
 */
export function LanguagePicker({ pack, onChoose }: { pack: LanguagePack; onChoose: (id: string) => void }) {
  const packs = listPacks();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const { target } = pack.meta;

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  // Open on the current language; close on a click outside.
  useEffect(() => {
    if (!open) return;
    options.current[packs.findIndex((p) => p.id === pack.meta.id)]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
    // Only on opening: focus stays where the player moves it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (packs.length < 2) return null;

  // Keys stay inside the picker so the title screen's card and difficulty keys don't fire too.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      close(true);
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && open) {
      e.preventDefault();
      e.stopPropagation();
      const i = options.current.findIndex((el) => el === document.activeElement);
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + packs.length) % packs.length;
      options.current[next]?.focus();
    } else if (e.key.startsWith("Arrow") || /^[1-9]$/.test(e.key)) {
      if (open) e.stopPropagation();
    }
  };

  return (
    <div ref={root} className={t.langPicker} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className={`${t.langButton} ${open ? t.langButtonOpen : ""}`}
        aria-label={fill(s.buttonAria, { language: target.name })}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <span lang={target.code} dir={target.dir} className={t.langButtonName}>
          {target.nativeName}
        </span>
        <svg viewBox="0 0 5 3" className={t.langCaret} shapeRendering="crispEdges" aria-hidden="true">
          <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
        </svg>
      </button>
      {open && (
        <div className={t.langMenu} role="group" aria-label={s.menuLabel}>
          <span className={t.langMenuLabel}>{s.menuLabel.toUpperCase()}</span>
          <ul className={t.langList}>
            {packs.map((meta, i) => {
              const other = getPack(meta.id);
              const current = meta.id === pack.meta.id;
              return (
                <li key={meta.id}>
                  <PackFonts pack={other} />
                  <button
                    ref={(el) => {
                      options.current[i] = el;
                    }}
                    type="button"
                    className={`${t.langOption} ${current ? t.langOptionOn : ""}`}
                    style={packVars(other) as CSSProperties}
                    aria-current={current ? "true" : undefined}
                    onClick={() => {
                      close(true);
                      if (!current) onChoose(meta.id);
                    }}
                  >
                    <span lang={meta.target.code} dir={meta.target.dir} className={t.langOptionNative}>
                      {meta.target.nativeName}
                    </span>
                    <span className={t.langOptionName}>{meta.target.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
