"use client";

import { useState } from "react";
import { PRACTICE_MIN_MISSED } from "@/config/game";
import { minigamesFor, practiceCount, promptKindOf } from "@/game/minigames";
import type { Minigame, PromptKind } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import { practiceHref } from "@/lib/practiceLink";
import { useLastMissed, type MissedLists } from "@/lib/useLastMissed";
import type { LanguageInfo, LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import w from "./wordbook.module.css";

/** One way to practise: a minigame's prompt kind, with how many missed items it would ask. */
export type PracticeWay = {
  kind: PromptKind;
  minigame: Minigame;
  /** Word Strike's direction, as from and to languages; absent for a minigame without one. */
  languages?: readonly [LanguageInfo, LanguageInfo];
  /** Null for a guest, and while the account's missed list for this kind loads. */
  count: number | null;
};

/**
 * Every way to practise in this pack, in registry order: Word Strike both
 * ways, and Gap Guard when the pack has gap sentences. Counts come from the
 * account's missed lists (null for a guest).
 */
export function practiceWays(pack: LanguagePack, missed: MissedLists | null): PracticeWay[] {
  const { base, target } = pack.meta;
  return minigamesFor(pack).flatMap((minigame): PracticeWay[] => {
    if (!minigame.usesDirection)
      return [{ kind: promptKindOf(minigame, "toTarget"), minigame, count: practiceCount(minigame, pack, missed, "toTarget") }];
    return (
      [
        ["toTarget", base, target],
        ["toBase", target, base],
      ] as const
    ).map(([direction, from, to]) => ({
      kind: promptKindOf(minigame, direction),
      minigame,
      languages: [from, to] as const,
      count: practiceCount(minigame, pack, missed, direction),
    }));
  });
}

export const minigameName = (m: Minigame) => strings.modes[m.id] ?? m.id;

/** A way's name, read out: "English to Korean", or the minigame's name. */
export const wayName = (way: PracticeWay) =>
  way.languages
    ? fill(strings.practice.directionWay, { from: way.languages[0].name, to: way.languages[1].name })
    : minigameName(way.minigame);

/** Ways with their counts, or null until every count has loaded. */
function useWays(pack: LanguagePack, userId: string): (PracticeWay & { count: number })[] | null {
  const ways = practiceWays(pack, useLastMissed(pack.meta.id, userId));
  return ways.every((w): w is PracticeWay & { count: number } => w.count != null) ? ways : null;
}

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
      <Button className={w.gold} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {strings.practice.button}
      </Button>
      {open && <Chooser ways={ways} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Chooser({ ways, onClose }: { ways: (PracticeWay & { count: number })[]; onClose: () => void }) {
  return (
    <Dialog
      title={strings.practice.chooserTitle}
      closeLabel={strings.title.close}
      onClose={onClose}
      className={w.chooser}
    >
      <p className={w.chooserBody}>{strings.practice.chooserBody}</p>
      <ul className={w.ways} aria-label={strings.practice.waysLabel}>
        {ways.map((way) => {
          const aria = fill(strings.practice.wayAria, { way: wayName(way), n: way.count });
          const inner = (
            <>
              <span className={w.wayName}>
                {way.languages ? (
                  <DirectionLabel from={way.languages[0]} to={way.languages[1]} />
                ) : (
                  minigameName(way.minigame).toUpperCase()
                )}
              </span>
              {way.count < PRACTICE_MIN_MISSED && (
                <span className={w.wayHint}>{fill(strings.practice.tooFew, { n: PRACTICE_MIN_MISSED })}</span>
              )}
              <span className={w.wayCount}>{way.count}</span>
            </>
          );
          return (
            <li key={way.kind}>
              {way.count >= PRACTICE_MIN_MISSED ? (
                // A full page load, so the Single player area reads the way on arrival.
                <a href={practiceHref(way.kind)} className={w.way} aria-label={aria}>
                  {inner}
                </a>
              ) : (
                <Button className={`${w.way} ${w.wayOff}`} aria-label={aria} disabled>
                  {inner}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
