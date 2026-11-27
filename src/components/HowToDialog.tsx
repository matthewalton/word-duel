"use client";

import { RULES } from "@/config/game";
import type { Minigame, MinigameOptions } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import t from "./title.module.css";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

/** Modal how-to panel for one minigame. */
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
  const name = strings.modes[minigame.id] ?? minigame.id;
  const info = strings.minigameInfo[minigame.id];
  const rules = [
    ...strings.sharedRules.map((r) =>
      fill(r, { cap: RULES.comboCap, hearts: RULES.startHearts, step: RULES.fuseStepMs / 1000 }),
    ),
    ...(info?.rules ?? []),
  ];
  const HowTo = minigame.HowTo;

  return (
    <Dialog title={name.toUpperCase()} closeLabel={strings.title.close} onClose={onClose}>
      <ol className={t.steps}>
        <HowTo pack={pack} opts={opts} />
      </ol>
      <ul className={t.rules}>
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <Button variant="primary" className={t.dialogPlay} onClick={onPlay}>
        {fill(strings.title.playName, { name }).toUpperCase()}
      </Button>
    </Dialog>
  );
}
