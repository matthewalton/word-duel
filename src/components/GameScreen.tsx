"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ACTIVE_PACK_ID, GAME_NAME } from "@/config/game";
import { getMinigame, MINIGAMES } from "@/game/minigames";
import type { Direction, Minigame, MinigameOptions } from "@/game/types";
import { useDuel } from "@/game/useDuel";
import { fill, strings } from "@/i18n/strings";
import { useBestScores } from "@/lib/useBestScores";
import { DirectionLabel } from "./DirectionLabel";
import { fontStack, getPack, packFontsHref } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { FeedbackLine } from "./FeedbackLine";
import styles from "./game.module.css";
import { Hud } from "./Hud";
import { PromptBoard } from "./PromptBoard";
import t from "./title.module.css";
import { TitleScreen } from "./TitleScreen";

type View = { name: "title" } | { name: "duel"; run: number };

/** Top level: loads the pack, switches between the title screen and a duel. */
export function GameScreen() {
  const pack = getPack(ACTIVE_PACK_ID);
  const [view, setView] = useState<View>({ name: "title" });
  const [minigameId, setMinigameId] = useState(MINIGAMES[0].id);
  const [direction, setDirection] = useState<Direction>("toTarget");
  const best = useBestScores(
    pack.meta.id,
    MINIGAMES.map((m) => m.id),
  );
  const fontsHref = packFontsHref(pack);

  const vars = {
    "--font-words": fontStack(pack.meta.fonts.words),
  } as CSSProperties;

  const play = (id: string) => {
    setMinigameId(id);
    setView((v) => ({ name: "duel", run: (v.name === "duel" ? v.run : 0) + 1 }));
  };

  const credits = pack.meta.credits?.length ? (
    <footer className={t.credits}>
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
  ) : null;

  return (
    <div className={styles.page} style={vars}>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} precedence="default" />
        </>
      )}
      {view.name === "title" ? (
        <TitleScreen
          pack={pack}
          minigames={MINIGAMES}
          best={best}
          initialId={minigameId}
          direction={direction}
          onDirection={setDirection}
          onPlay={play}
          gameName={GAME_NAME}
          footer={credits}
        />
      ) : (
        <Duel
          key={view.run}
          pack={pack}
          minigame={getMinigame(minigameId)}
          direction={direction}
          onMenu={() => setView({ name: "title" })}
        />
      )}
    </div>
  );
}

function Duel({
  pack,
  minigame,
  direction,
  onMenu,
}: {
  pack: LanguagePack;
  minigame: Minigame;
  direction: Direction;
  onMenu: () => void;
}) {
  const opts: MinigameOptions = useMemo(() => ({ direction }), [direction]);
  const { state, fuseLit, start, submit } = useDuel(pack, minigame, opts, { autoStart: true });
  const lost = state.outcome != null && state.outcome.reason !== "correct";
  const Controls = minigame.Controls;
  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];

  return (
    <main className={styles.screen}>
      {lost && <div key={state.fxKey} className={styles.hurtFlash} aria-hidden="true" />}
      <div className={styles.modeBar}>
        <button type="button" className={styles.modeButton} aria-label={strings.menuAria} onClick={onMenu}>
          &lt; {strings.menu}
        </button>
        <span className={styles.duelName}>{(strings.modes[minigame.id] ?? minigame.id).toUpperCase()}</span>
        {minigame.usesDirection && (
          <span
            className={styles.duelDirection}
            aria-label={fill(strings.directionAria, { from: from.name, to: to.name }).split(".")[0]}
          >
            <DirectionLabel from={from} to={to} />
          </span>
        )}
      </div>
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
