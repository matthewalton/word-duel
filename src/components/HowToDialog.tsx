"use client";

import { useEffect, useRef } from "react";
import { RULES } from "@/config/game";
import type { Minigame, MinigameOptions } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import t from "./title.module.css";

/** Modal how-to panel for one minigame. Uses <dialog> for focus and Escape. */
export function HowToDialog({
  pack,
  minigame,
  opts,
  onClose,
  onPlay,
}: {
  pack: LanguagePack;
  minigame: Minigame;
  opts: MinigameOptions;
  onClose: () => void;
  onPlay: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const name = strings.modes[minigame.id] ?? minigame.id;
  const info = strings.minigameInfo[minigame.id];
  const rules = [
    ...strings.sharedRules.map((r) =>
      fill(r, { cap: RULES.comboCap, hearts: RULES.startHearts, step: RULES.fuseStepMs / 1000 }),
    ),
    ...(info?.rules ?? []),
  ];
  const HowTo = minigame.HowTo;

  // Open as a modal on mount. No close() in cleanup: removing the element ends
  // the modal, and closing here would fire onClose (twice-run effects in dev).
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={t.dialog}
      aria-labelledby="howto-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={t.dialogBody}>
        <div className={t.dialogHead}>
          <h2 id="howto-title" className={t.dialogTitle}>
            {name.toUpperCase()}
          </h2>
          <button type="button" className={t.close} aria-label={strings.title.close} onClick={onClose}>
            ×
          </button>
        </div>
        <ol className={t.steps}>
          <HowTo pack={pack} opts={opts} />
        </ol>
        <ul className={t.rules}>
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <button type="button" className={t.dialogPlay} onClick={onPlay}>
          {fill(strings.title.playName, { name }).toUpperCase()}
        </button>
      </div>
    </dialog>
  );
}
