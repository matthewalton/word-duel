"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Direction, Minigame, MinigameOptions } from "@/game/types";
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
  onPlay,
  gameName,
  footer,
}: {
  pack: LanguagePack;
  minigames: Minigame[];
  best: Record<string, number>;
  initialId: string;
  direction: Direction;
  onDirection: (d: Direction) => void;
  onPlay: (id: string) => void;
  gameName: string;
  footer?: ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      minigames.findIndex((m) => m.id === initialId),
    ),
  );
  const [helpFor, setHelpFor] = useState<Minigame | null>(null);
  const opts: MinigameOptions = { direction };
  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];
  const active = minigames[activeIndex];

  const step = (delta: number) =>
    setActiveIndex((i) => (i + delta + minigames.length) % minigames.length);

  // Arrow keys move between cards; Enter plays (unless a button has focus,
  // which handles Enter itself). Number keys pick a card directly.
  useEffect(() => {
    if (helpFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const onControl =
        e.target instanceof Element &&
        e.target.closest("button, input, a, dialog");
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Enter" && !onControl) onPlay(active.id);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= minigames.length)
        setActiveIndex(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={t.titleScreen}>
      <div className={t.brand}>
        <Heart color="var(--player)" />
        <h1 className={t.brandName}>{gameName.toUpperCase()}</h1>
        <Heart color="var(--rival)" />
      </div>

      <div
        className={t.cards}
        style={{ "--cards": minigames.length } as CSSProperties}
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
                      <span className={t.best}>
                        {fill(strings.best, { score: pad(best[m.id] ?? 0) })}
                      </span>
                    </div>
                    {info && (
                      <p className={t.description}>
                        {fill(info.description, { language: target.name })}
                      </p>
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

      <p className={t.navHint}>{strings.title.navHint}</p>

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
