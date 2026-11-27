"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DIFFICULTY, GAME_NAME } from "@/config/game";
import { getMinigame, MINIGAMES, minigamesFor } from "@/game/minigames";
import { gapGuard } from "@/game/minigames/GapGuard";
import { wordStrike } from "@/game/minigames/WordStrike";
import type { Difficulty, Direction, Minigame, MinigameOptions } from "@/game/types";
import { useDuel } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import { useAccount } from "@/lib/useAccount";
import { choosePack, useChosenPack } from "@/lib/packChoice";
import { readPracticeWay, stripPracticeWay } from "@/lib/practiceLink";
import { useBestScores } from "@/lib/useBestScores";
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
import { VersusButton, VersusPanel } from "./VersusPanel";
import v from "./versus.module.css";

/** A practice duel (from the Wordbook) asks only the account's missed items and keeps no best. */
type View = { name: "title" } | { name: "duel"; run: number; practice?: boolean };

/** Top level: loads the chosen pack, switches between the title screen and a duel. */
export function GameScreen() {
  const pack = useChosenPack();
  const minigames = minigamesFor(pack);
  const [view, setView] = useState<View>({ name: "title" });
  const [minigameId, setMinigameId] = useState<string>(MINIGAMES[0].id);
  const [direction, setDirection] = useState<Direction>("toTarget");
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const account = useAccount(pack.meta.id);
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = () => setSignInOpen(true);
  const [versusOpen, setVersusOpen] = useState(false);
  const versusAvailable = minigames.some((m) => m.id === "word-strike");

  // V opens versus from the title screen, unless typing or another panel is open.
  useEffect(() => {
    if (view.name !== "title" || !versusAvailable || versusOpen || signInOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "v" || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, dialog")) return;
      e.preventDefault();
      setVersusOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.name, versusAvailable, versusOpen, signInOpen]);
  const best = useBestScores(
    pack.meta.id,
    minigames.map((m) => m.id),
  );

  // Arriving from the Wordbook's PRACTISE MISSED WORDS: that way's ready
  // screen, set to practise. Read once the session is known (accounts only;
  // a guest just sees the title screen), then taken out of the address bar.
  const [arrived, setArrived] = useState(false);
  if (!account.pending && !arrived) {
    setArrived(true);
    const way = readPracticeWay();
    const minigame = way === "gap" ? gapGuard : wordStrike;
    if (way && account.user && minigame.hasContent(pack)) {
      if (way !== "gap") setDirection(way);
      setMinigameId(minigame.id);
      setView({ name: "duel", run: 1, practice: true });
    }
  }
  useEffect(() => {
    if (arrived) stripPracticeWay();
  }, [arrived]);

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
          corner={
            <div className={v.cornerRow}>
              {versusAvailable && <VersusButton onOpen={() => setVersusOpen(true)} />}
              <AccountCorner account={account} packId={pack.meta.id} onOpenSignIn={openSignIn} />
            </div>
          }
          footer={credits}
        />
      ) : (
        <Duel
          key={view.run}
          pack={pack}
          minigame={getMinigame(minigameId)}
          direction={direction}
          difficulty={difficulty}
          practice={view.practice ?? false}
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
      {versusOpen && (
        <VersusPanel pack={pack} direction={direction} difficulty={difficulty} onClose={() => setVersusOpen(false)} />
      )}
      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} onSignIn={account.signIn} />}
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
