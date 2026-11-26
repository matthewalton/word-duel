"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DIFFICULTIES } from "@/config/game";
import type { Difficulty, Direction, Minigame, MinigameOptions } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import { HowToDialog } from "./HowToDialog";
import t from "./title.module.css";

const pad = (n: number) => String(n).padStart(4, "0");

function Heart({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 7 6"
      className={t.brandHeart}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path
        fill={color}
        d="M1 0h2v1h-2zM4 0h2v1h-2zM0 1h7v2h-7zM1 3h5v1h-5zM2 4h3v1h-3zM3 5h1v1h-1z"
      />
      <rect x={1} y={1} width={1} height={1} fill="#fff" />
    </svg>
  );
}

/**
 * Title screen: one card per minigame, one of them active. The active card
 * grows and shows details; the others keep their preview with the lights off.
 * On a phone only the active card shows, as a carousel.
 */
export function TitleScreen({
  pack,
  minigames,
  best,
  initialId,
  direction,
  onDirection,
  difficulty,
  onDifficulty,
  onPlay,
  gameName,
  lead,
  corner,
  footer,
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
  gameName: string;
  /** Top-left slot: the wordbook link. */
  lead?: ReactNode;
  /** Top-right slot: sign-in or the account chip. */
  corner?: ReactNode;
  footer?: ReactNode;
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
  // itself). Number keys pick a card directly.
  useEffect(() => {
    if (helpFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const onControl =
        e.target instanceof Element &&
        e.target.closest("button, input, a, dialog");
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
    <div className={t.titleScreen}>
      <div className={t.top}>
        <div className={t.lead}>{lead}</div>
        <div className={t.brand}>
          <Heart color="var(--player)" />
          <h1 className={t.brandName}>{gameName.toUpperCase()}</h1>
          <Heart color="var(--rival)" />
        </div>
        <div className={t.corner}>{corner}</div>
      </div>

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
            <section
              key={m.id}
              className={`${t.card} ${on ? t.cardOn : t.cardOff}`}
              aria-label={name}
            >
              <div className={t.cardBody}>
                <button
                  ref={(el) => {
                    previews.current[i] = el;
                  }}
                  type="button"
                  className={t.previewButton}
                  aria-label={fill(
                    on ? strings.title.playName : strings.title.choose,
                    { name },
                  )}
                  aria-current={on ? "true" : undefined}
                  onClick={() => (on ? onPlay(m.id) : setActiveIndex(i))}
                >
                  <Preview pack={pack} opts={opts} />
                </button>

                {on && (
                  <div className={t.info}>
                    <div className={t.infoHead}>
                      <h2 className={t.infoName}>{name.toUpperCase()}</h2>
                      {best && (
                        <span className={t.best}>{fill(strings.best, { score: pad(best[m.id] ?? 0) })}</span>
                      )}
                    </div>
                    {info && (
                      <p className={t.description}>
                        {fill(info.description, { language: target.name })}
                      </p>
                    )}
                    {m.usesDifficulty && (
                      <>
                        <div className={t.difficulty} role="group" aria-label={strings.difficulty.label}>
                          {DIFFICULTIES.map((d, level) => (
                            <button
                              key={d}
                              type="button"
                              aria-pressed={d === difficulty}
                              className={`${t.difficultyOption} ${t[`difficulty_${d}`]}`}
                              onClick={() => onDifficulty(d)}
                            >
                              <span className={t.difficultyBars} aria-hidden="true">
                                {DIFFICULTIES.map((b, n) => (
                                  <span key={b} className={`${t.difficultyBar} ${n <= level ? t.difficultyBarOn : ""}`} />
                                ))}
                              </span>
                              {strings.difficulty.names[d]}
                            </button>
                          ))}
                        </div>
                        <p className={t.difficultyBlurb}>{strings.difficulty.blurbs[difficulty]}</p>
                      </>
                    )}
                    <div className={t.langRow}>
                      {m.usesDirection && (
                        <button
                          type="button"
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
                        </button>
                      )}
                      <button
                        type="button"
                        className={t.help}
                        aria-label={fill(strings.title.help, { name })}
                        onClick={() => setHelpFor(m)}
                      >
                        ?
                      </button>
                      <button
                        type="button"
                        className={t.play}
                        onClick={() => onPlay(m.id)}
                      >
                        {strings.title.play}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
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
          <button
            type="button"
            className={t.navButton}
            aria-label={strings.title.previous}
            onClick={() => step(-1)}
          >
            &lt;
          </button>
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
          <button
            type="button"
            className={t.navButton}
            aria-label={strings.title.next}
            onClick={() => step(1)}
          >
            &gt;
          </button>
        </div>
      )}

      {footer}

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
