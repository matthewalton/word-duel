"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { getMinigame, MINIGAMES, minigamesFor } from "@/game/minigames";
import { gapGuard } from "@/game/minigames/GapGuard";
import { wordStrike } from "@/game/minigames/WordStrike";
import type { Difficulty, Direction, Minigame, MinigameOptions } from "@/game/types";
import { useDuel } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import { useAccount, type Account } from "@/lib/useAccount";
import { useChosenPack } from "@/lib/packChoice";
import { takePracticeWay } from "@/lib/practiceLink";
import { useSoloSettings, type SoloSettings } from "@/lib/soloSettings";
import { useBestScores } from "@/lib/useBestScores";
import { useDuelSounds } from "@/lib/useDuelSounds";
import { useViewportHeight, viewportHeightVar } from "@/lib/useViewportHeight";
import type { LanguagePack } from "@/packs/types";
import a from "./account.module.css";
import { BookIcon } from "./BookIcon";
import styles from "./game.module.css";
import { Hud } from "./Hud";
import { PackFonts, packVars } from "./PackFonts";
import { PromptBoard } from "./PromptBoard";
import { SignInDialog } from "./SignInDialog";
import { SoundButton } from "./SoundButton";
import { Button } from "./ui/Button";
import { PortalRoot } from "./ui/PortalRoot";

/** What a menu screen (the hub, the Single player area) gets from the solo screen around it. */
export interface SoloMenuProps {
  pack: LanguagePack;
  /** The minigames the pack has content for. */
  minigames: Minigame[];
  /** Null for a guest: no best scores are shown. */
  best: Record<string, number> | null;
  account: Account;
  settings: SoloSettings;
  /** The minigame played last this visit, so its card is the active one. */
  lastId: string;
  play: (id: string) => void;
  openSignIn: () => void;
}

/**
 * A practice duel (from the Wordbook) asks only the account's missed items
 * and keeps no best; it is asked in the way the Wordbook picked, without
 * changing the saved direction.
 */
type View = { name: "menu" } | { name: "duel"; run: number; practice?: { direction: Direction } };

/**
 * A screen that starts solo duels: loads the chosen pack and the session,
 * shows its menu (the hub or the Single player area), and swaps it for the
 * duel until MENU brings the menu back. `practice` is set on the Single
 * player area, the only screen the Wordbook's practice links go to.
 */
export function SoloScreen({
  menu,
  practice = false,
}: {
  menu: (props: SoloMenuProps) => ReactNode;
  practice?: boolean;
}) {
  const pack = useChosenPack();
  const minigames = minigamesFor(pack);
  const [view, setView] = useState<View>({ name: "menu" });
  const [minigameId, setMinigameId] = useState<string>(MINIGAMES[0].id);
  const settings = useSoloSettings();
  const account = useAccount(pack.meta.id);
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = () => setSignInOpen(true);
  // The duel fits the visible height, so a phone keyboard doesn't push it off screen.
  const viewportHeight = useViewportHeight();
  const best = useBestScores(
    pack.meta.id,
    minigames.map((m) => m.id),
  );

  // The page is kept (hidden) between visits. Coming back by a link (not
  // back or forward) never shows a practice duel from an earlier visit.
  const { bfcacheId } = useRouter();
  const [visit, setVisit] = useState(bfcacheId);
  if (visit !== bfcacheId) {
    setVisit(bfcacheId);
    if (view.name === "duel" && view.practice) setView({ name: "menu" });
  }

  // Arriving from a Wordbook practice link: that way's duel, set to practise,
  // before the first paint. A layout effect rather than state set up on mount,
  // because it must run each time the kept page is shown; the state it sets
  // renders before the browser paints, so the menu never shows. Only accounts
  // see practice links.
  const { direction } = settings;
  useLayoutEffect(() => {
    if (!practice) return;
    const way = takePracticeWay();
    const minigame = way === "gap" ? gapGuard : wordStrike;
    if (!way || !minigame.hasContent(pack)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- taken once on show, see above.
    setMinigameId(minigame.id);
    setView((v) => ({
      name: "duel",
      run: (v.name === "duel" ? v.run : 0) + 1,
      practice: { direction: way === "gap" ? direction : way },
    }));
  }, [practice, pack, direction]);

  const play = (id: string) => {
    setMinigameId(id);
    setView((v) => ({ name: "duel", run: (v.name === "duel" ? v.run : 0) + 1 }));
  };

  return (
    <PortalRoot
      className={styles.page}
      style={{ ...packVars(pack), ...(view.name === "duel" ? viewportHeightVar(viewportHeight) : {}) }}
    >
      <PackFonts pack={pack} />
      {view.name === "menu" ? (
        menu({ pack, minigames, best, account, settings, lastId: minigameId, play, openSignIn })
      ) : (
        <Duel
          key={view.run}
          pack={pack}
          minigame={getMinigame(minigameId)}
          direction={view.practice?.direction ?? settings.direction}
          difficulty={settings.difficulty}
          practice={view.practice != null}
          onMenu={() => setView({ name: "menu" })}
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
                <Button variant="outlined" className={a.nudgeButton} onClick={openSignIn}>
                  {strings.account.signIn}
                </Button>
              </div>
            )
          }
        />
      )}
      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} onSignIn={account.signIn} />}
    </PortalRoot>
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
  useDuelSounds({
    versus: false,
    phase: state.phase,
    count: state.count,
    fxKey: state.fxKey,
    outcome: state.outcome,
    fuseLit,
    lockedOut: false,
    // A guest or practice duel never has a new best, so it always ends on lose.
    result: state.phase === "gameOver" ? (state.newBest ? "win" : "lose") : null,
  });
  const lost = state.outcome != null && state.outcome.reason !== "correct";
  const Controls = minigame.Controls;

  return (
    <main className={styles.screen}>
      {lost && <div key={state.fxKey} className={styles.hurtFlash} aria-hidden="true" />}
      <div className={styles.modeBar}>
        <Button className={styles.modeButton} aria-label={strings.menuAria} onClick={onMenu}>
          &lt; {strings.menu}
        </Button>
        <span className={styles.duelName}>{(strings.modes[minigame.id] ?? minigame.id).toUpperCase()}</span>
        <SoundButton className={styles.modeSound} />
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
