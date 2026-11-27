"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRACTICE_MIN_MISSED } from "@/config/game";
import { minigamesFor, practiceCount, promptKindOf } from "@/game/minigames";
import type { Direction, Minigame, PromptKind } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import { practiceHref } from "@/lib/practiceLink";
import { useLastMissed } from "@/lib/useLastMissed";
import type { LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import t from "./title.module.css";
import w from "./wordbook.module.css";

type Way = { kind: PromptKind; label: ReactNode; name: string; count: number };

/**
 * The ways the account can practise in this pack, each with its missed count:
 * Word Strike both ways, and Gap Guard when the pack has gap sentences.
 * Null until every count has loaded.
 */
function useWays(pack: LanguagePack, userId: string): Way[] | null {
  const missed = useLastMissed(pack.meta.id, userId);
  const { base, target } = pack.meta;
  const ways: Way[] = [];
  for (const m of minigamesFor(pack)) {
    const add = (kind: PromptKind, label: ReactNode, name: string, direction: Direction = "toTarget") => {
      const count = practiceCount(m, pack, missed, direction);
      if (count != null) ways.push({ kind, label, name, count });
    };
    if (m.usesDirection) {
      for (const [direction, from, to] of [
        ["toTarget", base, target],
        ["toBase", target, base],
      ] as const)
        add(
          direction,
          <DirectionLabel from={from} to={to} />,
          fill(strings.practice.directionWay, { from: from.name, to: to.name }),
          direction,
        );
    } else {
      add(promptKindOf(m, "toTarget"), minigameName(m).toUpperCase(), minigameName(m));
    }
  }
  const expected = minigamesFor(pack).reduce((n, m) => n + (m.usesDirection ? 2 : 1), 0);
  return ways.length === expected ? ways : null;
}

const minigameName = (m: Minigame) => strings.modes[m.id] ?? m.id;

/**
 * PRACTISE MISSED WORDS, at the top of the Wordbook's MISSED tab: opens a
 * chooser of the ways the account missed words, each with its count. A way
 * with enough missed items opens that duel's ready screen set to practise.
 * Shown only when at least one way has enough.
 */
export function PracticeMissed({ pack, userId }: { pack: LanguagePack; userId: string }) {
  const ways = useWays(pack, userId);
  const [open, setOpen] = useState(false);
  if (!ways?.some((way) => way.count >= PRACTICE_MIN_MISSED)) return null;
  return (
    <div className={w.practice}>
      <button type="button" className={w.gold} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {strings.practice.button}
      </button>
      {open && <Chooser ways={ways} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Chooser({ ways, onClose }: { ways: Way[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open as a modal on mount; see HowToDialog for why there is no cleanup.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${t.dialog} ${w.chooser}`}
      aria-labelledby="practice-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={t.dialogBody}>
        <div className={t.dialogHead}>
          <h2 id="practice-title" className={t.dialogTitle}>
            {strings.practice.chooserTitle}
          </h2>
          <button type="button" className={t.close} aria-label={strings.title.close} onClick={onClose}>
            ×
          </button>
        </div>
        <p className={w.chooserBody}>{strings.practice.chooserBody}</p>
        <ul className={w.ways} aria-label={strings.practice.waysLabel}>
          {ways.map((way) => {
            const aria = fill(strings.practice.wayAria, { way: way.name, n: way.count });
            const inner = (
              <>
                <span className={w.wayName}>{way.label}</span>
                {way.count < PRACTICE_MIN_MISSED && (
                  <span className={w.wayHint}>{fill(strings.practice.tooFew, { n: PRACTICE_MIN_MISSED })}</span>
                )}
                <span className={w.wayCount}>{way.count}</span>
              </>
            );
            return (
              <li key={way.kind}>
                {way.count >= PRACTICE_MIN_MISSED ? (
                  // A full page load, so the title page reads the way on arrival.
                  <a href={practiceHref(way.kind)} className={w.way} aria-label={aria}>
                    {inner}
                  </a>
                ) : (
                  <span className={`${w.way} ${w.wayOff}`} aria-label={aria} aria-disabled="true" role="link">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
