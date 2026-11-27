"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DIFFICULTY, GAME_NAME, PRACTICE_MIN_MISSED } from "@/config/game";
import { getMinigame, MINIGAMES, minigamesFor, practiceCount } from "@/game/minigames";
import type { Difficulty, Direction, Minigame, MinigameOptions } from "@/game/types";
import { useDuel } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import { useAccount } from "@/lib/useAccount";
import { choosePack, useChosenPack } from "@/lib/packChoice";
import { useBestScores } from "@/lib/useBestScores";
import { useLastMissed } from "@/lib/useLastMissed";
import type { LanguagePack } from "@/packs/types";
import a from "./account.module.css";
import { AccountCorner } from "./AccountCorner";
import { BookIcon } from "./BookIcon";
import styles from "./game.module.css";
import { Hud } from "./Hud";
import { LanguagePicker } from "./LanguagePicker";
import { PackFonts, packVars } from "./PackFonts";
import { PromptBoard } from "./PromptBoard";
import { SignInDialog } from "./SignInDialog";
import t from "./title.module.css";
import { TitleScreen } from "./TitleScreen";

type View = { name: "title" } | { name: "duel"; run: number; practice: boolean };

/** Top level: loads the chosen pack, switches between the title screen and a duel. */
export function GameScreen() {
  const pack = useChosenPack();
  const minigames = minigamesFor(pack);
  const [view, setView] = useState<View>({ name: "title" });
  const [minigameId, setMinigameId] = useState<string>(MINIGAMES[0].id);
  const [direction, setDirection] = useState<Direction>("toTarget");
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const account = useAccount(pack.meta.id);
  // Open with an optional line on why signing in helps.
  const [signIn, setSignIn] = useState<{ note?: string } | null>(null);
  const openSignIn = () => setSignIn({});
  // MISSED ONLY per card; off by default and not remembered between visits.
  const missed = useLastMissed(pack.meta.id, account.user?.id ?? null, view.name === "title");
  const [practiceOn, setPracticeOn] = useState<Record<string, boolean>>({});
  const togglePractice = (id: string) => {
    if (account.pending) return;
    if (!account.user) setSignIn({ note: strings.practice.signIn });
    else setPracticeOn((on) => ({ ...on, [id]: !on[id] }));
  };
  const best = useBestScores(
    pack.meta.id,
    minigames.map((m) => m.id),
  );

  const play = (id: string) => {
    const m = getMinigame(id);
    const practice =
      !!account.user && !!practiceOn[id] && (practiceCount(m, pack, missed, direction) ?? 0) >= PRACTICE_MIN_MISSED;
    setMinigameId(id);
    setView((v) => ({ name: "duel", run: (v.name === "duel" ? v.run : 0) + 1, practice }));
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
    <div className={styles.page} style={packVars(pack)}>
      <PackFonts pack={pack} />
      {view.name === "title" ? (
        <TitleScreen
          key={pack.meta.id}
          pack={pack}
          minigames={minigames}
          best={best}
          initialId={minigameId}
          direction={direction}
          onDirection={setDirection}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          practice={{ missed, on: practiceOn, onToggle: togglePractice }}
          onPlay={play}
          gameName={GAME_NAME}
          lead={
            <>
              <Link href="/wordbook" className={t.wordbookLink}>
                <BookIcon className={t.wordbookIcon} />
                <span className={t.wordbookLabel}>{strings.wordbook.title}</span>
              </Link>
              <LanguagePicker pack={pack} onChoose={choosePack} />
            </>
          }
          corner={<AccountCorner account={account} packId={pack.meta.id} onOpenSignIn={openSignIn} />}
          footer={credits}
        />
      ) : (
        <Duel
          key={view.run}
          pack={pack}
          minigame={getMinigame(minigameId)}
          direction={direction}
          difficulty={difficulty}
          practice={view.practice}
          onMenu={() => setView({ name: "title" })}
          gameOverExtra={
            account.pending ? null : account.user ? (
              <div className={a.wordbookNudge}>
                <Link href="/wordbook" className={a.wordbookButton}>
                  <BookIcon className={a.wordbookIcon} />
                  {strings.wordbook.gameOverLink}
                </Link>
                <p className={a.nudgeText}>{strings.wordbook.gameOverNote}</p>
              </div>
            ) : (
              <div className={a.nudge}>
                <p className={a.nudgeText}>{strings.account.gameOverNudge}</p>
                <button type="button" className={a.nudgeButton} onClick={openSignIn}>
                  {strings.account.signIn}
                </button>
              </div>
            )
          }
        />
      )}
      {signIn && <SignInDialog note={signIn.note} onClose={() => setSignIn(null)} onSignIn={account.signIn} />}
    </div>
  );
}

function Duel({
  pack,
  minigame,
  direction,
  difficulty,
  practice,
  onMenu,
  gameOverExtra,
}: {
  pack: LanguagePack;
  minigame: Minigame;
  direction: Direction;
  difficulty: Difficulty;
  /** A practice duel: only missed items, no best score. */
  practice: boolean;
  onMenu: () => void;
  gameOverExtra?: ReactNode;
}) {
  const opts: MinigameOptions = useMemo(() => ({ direction, difficulty }), [direction, difficulty]);
  const { state, fuseLit, start, submit } = useDuel(pack, minigame, opts, practice);
  const lost = state.outcome != null && state.outcome.reason !== "correct";
  const Controls = minigame.Controls;

  return (
    <main className={styles.screen}>
      {lost && <div key={state.fxKey} className={styles.hurtFlash} aria-hidden="true" />}
      <div className={styles.modeBar}>
        <button type="button" className={styles.modeButton} aria-label={strings.menuAria} onClick={onMenu}>
          &lt; {strings.menu}
        </button>
        <span className={styles.duelName}>{(strings.modes[minigame.id] ?? minigame.id).toUpperCase()}</span>
      </div>
      <div className={`${styles.board} ${lost ? styles.boardJolt : ""}`}>
        <Hud state={state} />
        <PromptBoard state={state} pack={pack} fuseLit={fuseLit} onStart={start} gameOverExtra={gameOverExtra} />
        <div className={styles.controlStrip}>
          <Controls
            pack={pack}
            round={state.round}
            phase={state.phase}
            outcome={state.outcome}
            onSubmit={submit}
            onStart={start}
          />
        </div>
      </div>
    </main>
  );
}
