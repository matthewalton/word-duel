"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ACTIVE_PACK_ID } from "@/config/game";
import { getMinigame, MINIGAMES } from "@/game/minigames";
import type { Direction, Minigame, MinigameOptions } from "@/game/types";
import { useDuel } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import { fontStack, getPack, packFontsHref } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { FeedbackLine } from "./FeedbackLine";
import styles from "./game.module.css";
import { Hud } from "./Hud";
import { ModeBar } from "./ModeBar";
import { PromptBoard } from "./PromptBoard";

/** Top level: picks the pack and minigame, loads the pack fonts. */
export function GameScreen() {
  const pack = getPack(ACTIVE_PACK_ID);
  const [minigameId, setMinigameId] = useState(MINIGAMES[0].id);
  const [direction, setDirection] = useState<Direction>("toTarget");
  const minigame = getMinigame(minigameId);
  const fontsHref = packFontsHref(pack);

  const vars = {
    "--font-prompt": fontStack(pack.meta.fonts.prompt),
    "--font-body": fontStack(pack.meta.fonts.body),
  } as CSSProperties;

  const modeBar = (
    <ModeBar
      pack={pack}
      minigames={MINIGAMES}
      activeId={minigameId}
      direction={direction}
      onSelect={setMinigameId}
      onToggleDirection={() => setDirection((d) => (d === "toTarget" ? "toBase" : "toTarget"))}
    />
  );

  return (
    <div className={styles.page} style={vars}>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} precedence="default" />
        </>
      )}
      {/* Remounting on mode/direction change resets the duel to idle. */}
      <Duel
        key={`${minigameId}:${minigame.usesDirection ? direction : "-"}`}
        pack={pack}
        minigame={minigame}
        direction={direction}
        modeBar={modeBar}
      />
      {pack.meta.credits && pack.meta.credits.length > 0 && (
        <footer className={styles.credits}>
          <span>{strings.creditsLabel} </span>
          {pack.meta.credits.map((c, i) => (
            <span key={c.url}>
              {i > 0 && " · "}
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.author}, {c.name}
              </a>{" "}
              ({c.licence})
            </span>
          ))}
        </footer>
      )}
    </div>
  );
}

function Duel({
  pack,
  minigame,
  direction,
  modeBar,
}: {
  pack: LanguagePack;
  minigame: Minigame;
  direction: Direction;
  modeBar: ReactNode;
}) {
  const opts: MinigameOptions = useMemo(() => ({ direction }), [direction]);
  const { state, fuseLit, start, submit } = useDuel(pack, minigame, opts);
  const lost = state.outcome != null && state.outcome.reason !== "correct";
  const Controls = minigame.Controls;

  return (
    <main className={`${styles.screen} ${lost ? styles.screenHurt : ""}`}>
      {modeBar}
      <Hud state={state} />
      <PromptBoard state={state} pack={pack} fuseLit={fuseLit} />
      <Controls
        pack={pack}
        round={state.round}
        phase={state.phase}
        outcome={state.outcome}
        onSubmit={submit}
        onStart={start}
      />
      <FeedbackLine state={state} pack={pack} />
    </main>
  );
}
