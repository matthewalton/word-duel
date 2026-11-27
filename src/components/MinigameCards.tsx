"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DIFFICULTIES } from "@/config/game";
import type { Difficulty, Direction, Minigame, MinigameOptions } from "@/game/types";
import { fill, padScore, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import { HowToDialog } from "./HowToDialog";
import t from "./title.module.css";
import { Button } from "./ui/Button";
import { Panel } from "./ui/Panel";
import { ToggleGroup } from "./ui/ToggleGroup";


/**
 * The minigame cards, the Single player area's contents (board NavKitCards):
 * one card per minigame, one of them active. The active card grows and shows
 * details; the others keep their preview with the lights off. On a phone only
 * the active card shows, as a carousel.
 */
export function MinigameCards({
  pack,
  minigames,
  best,
  initialId,
  direction,
  onDirection,
  difficulty,
  onDifficulty,
  onPlay,
}: {
  pack: LanguagePack;
  minigames: Minigame[];
  /** Null for a guest: no best scores are shown. */
  best: Record<string, number> | null;
  initialId: string;
  direction: Direction;
  onDirection: (d: Direction) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPlay: (id: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      minigames.findIndex((m) => m.id === initialId),
    ),
  );
  const [helpFor, setHelpFor] = useState<Minigame | null>(null);
  const opts: MinigameOptions = { direction, difficulty };
  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];
  const active = minigames[activeIndex];
  const previews = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus follows the active card. Without this, a preview that was clicked
  // keeps focus after the arrow keys move on, and the keyboard press makes
  // its focus ring show on the now-inactive card.
  useEffect(() => {
    const focused = document.activeElement;
    const target = previews.current[activeIndex];
    if (
      target &&
      focused !== target &&
      previews.current.includes(focused as HTMLButtonElement)
    )
      target.focus({ preventScroll: true });
  }, [activeIndex]);

  const step = (delta: number) =>
    setActiveIndex((i) => (i + delta + minigames.length) % minigames.length);

  // Up and down move along the switch and stop at its ends.
  const stepDifficulty = (delta: number) => {
    const i = DIFFICULTIES.indexOf(difficulty) + delta;
    if (i >= 0 && i < DIFFICULTIES.length) onDifficulty(DIFFICULTIES[i]);
  };

  // Arrow keys move between cards, and up and down change the active card's
  // difficulty; Enter plays (unless a button has focus, which handles Enter
  // itself). Number keys pick a card directly. Keys a control already used
  // (the difficulty switch's arrows, opening a menu) and keys inside an open
  // menu or dialog are left alone.
  useEffect(() => {
    if (helpFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('[role="menu"], [role="dialog"]')) return;
      const onControl = e.target instanceof Element && e.target.closest("button, input, a");
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && active.usesDifficulty) {
        e.preventDefault();
        stepDifficulty(e.key === "ArrowUp" ? 1 : -1);
      }
      else if (e.key === "Enter" && !onControl) onPlay(active.id);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= minigames.length)
        setActiveIndex(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={t.cardsArea}>
      <div
        className={`${t.cards} ${minigames.length === 1 ? t.cardsOne : ""}`}
        style={{ "--cards": Math.max(2, minigames.length) } as CSSProperties}
      >
        {minigames.map((m, i) => {
          const on = i === activeIndex;
          const name = strings.modes[m.id] ?? m.id;
          const info = strings.minigameInfo[m.id];
          const Preview = m.Preview;
          return (
            <Panel
              key={m.id}
              className={`${t.card} ${on ? t.cardOn : t.cardOff}`}
              aria-label={name}
            >
              <div className={t.cardBody}>
                <Button
                  ref={(el) => {
                    previews.current[i] = el;
                  }}
                  className={t.previewButton}
                  aria-label={fill(
                    on ? strings.title.playName : strings.title.choose,
                    { name },
                  )}
                  aria-current={on ? "true" : undefined}
                  onClick={() => (on ? onPlay(m.id) : setActiveIndex(i))}
                >
                  <Preview pack={pack} opts={opts} />
                </Button>

                {on && (
                  <div className={t.info}>
                    <div className={t.infoHead}>
                      <h2 className={t.infoName}>{name.toUpperCase()}</h2>
                      {best && (
                        <span className={t.best}>{fill(strings.best, { score: padScore(best[m.id] ?? 0) })}</span>
                      )}
                    </div>
                    {info && (
                      <p className={t.description}>
                        {fill(info.description, { language: target.name })}
                      </p>
                    )}
                    {m.usesDifficulty && (
                      <>
                        <ToggleGroup
                          label={strings.difficulty.label}
                          options={DIFFICULTIES}
                          value={difficulty}
                          onValueChange={onDifficulty}
                          optionClassName={(d) => `${t.difficultyOption} ${t[`difficulty_${d}`]}`}
                          renderOption={(d, level) => (
                            <>
                              <span className={t.difficultyBars} aria-hidden="true">
                                {DIFFICULTIES.map((b, n) => (
                                  <span key={b} className={`${t.difficultyBar} ${n <= level ? t.difficultyBarOn : ""}`} />
                                ))}
                              </span>
                              {strings.difficulty.names[d]}
                            </>
                          )}
                        />
                        <p className={t.difficultyBlurb}>{strings.difficulty.blurbs[m.id]?.[difficulty]}</p>
                      </>
                    )}
                    <div className={t.langRow}>
                      {m.usesDirection && (
                        <Button
                          variant="outlined"
                          className={t.dirToggle}
                          aria-label={fill(strings.directionAria, {
                            from: from.name,
                            to: to.name,
                          })}
                          onClick={() =>
                            onDirection(
                              direction === "toTarget" ? "toBase" : "toTarget",
                            )
                          }
                        >
                          <DirectionLabel from={from} to={to} />
                        </Button>
                      )}
                      <Button
                        variant="icon"
                        className={t.help}
                        aria-label={fill(strings.title.help, { name })}
                        onClick={() => setHelpFor(m)}
                      >
                        ?
                      </Button>
                      <Button variant="primary" className={t.play} onClick={() => onPlay(m.id)}>
                        {strings.title.play}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <p className={t.navHint}>
        {minigames.length > 1
          ? active.usesDifficulty
            ? strings.title.navHintDifficulty
            : strings.title.navHint
          : active.usesDifficulty
            ? strings.title.navHintOneDifficulty
            : strings.title.navHintOne}
      </p>

      {minigames.length > 1 && (
        <div className={t.carouselBar}>
          <Button variant="icon" className={t.navButton} aria-label={strings.title.previous} onClick={() => step(-1)}>
            &lt;
          </Button>
          <span
            className={t.dots}
            aria-label={fill(strings.title.pageOf, {
              n: activeIndex + 1,
              total: minigames.length,
            })}
          >
            {minigames.map((m, i) => (
              <span
                key={m.id}
                className={`${t.dot} ${i === activeIndex ? t.dotOn : ""}`}
              />
            ))}
          </span>
          <Button variant="icon" className={t.navButton} aria-label={strings.title.next} onClick={() => step(1)}>
            &gt;
          </Button>
        </div>
      )}

      {helpFor && (
        <HowToDialog
          pack={pack}
          minigame={helpFor}
          opts={opts}
          onClose={() => setHelpFor(null)}
          onPlay={() => onPlay(helpFor.id)}
        />
      )}
    </div>
  );
}
