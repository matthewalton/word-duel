"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { COUNTDOWN_MS, DEFAULT_PACK_ID, GAME_NAME, PACK_PENDING_ATTR, RULES } from "@/config/game";
import type { DuelState } from "@/game/duel";
import { wordStrike } from "@/game/minigames/WordStrike";
import { useVersusDuel } from "@/game/useVersusDuel";
import { useVersusRoom } from "@/game/useVersusRoom";
import { otherSeat, roundsWon, type RoomSnapshot, type Seat, type VersusRound } from "@/game/versus";
import { fill, strings } from "@/i18n/strings";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import styles from "./game.module.css";
import { LangSpan } from "./LangSpan";
import { PackFonts, packVars } from "./PackFonts";
import { HeartRow } from "./PixelHeart";
import { PromptBoard } from "./PromptBoard";
import v from "./versus.module.css";

const minigameName = () => (strings.modes[wordStrike.id] ?? wordStrike.id).toUpperCase();
const nameOf = (s: RoomSnapshot, seat: Seat) => (s.players[seat]?.name ?? strings.versus.guest).toUpperCase();

/** A versus room at /versus/<code>: the waiting screen, then the race, then game over (ADR 0012). */
export function VersusScreen({ code }: { code: string }) {
  const room = useVersusRoom(code);
  const { state, now } = room;
  const pack = getPack(
    state.status === "ready" && listPacks().some((p) => p.id === state.snapshot.packId)
      ? state.snapshot.packId
      : DEFAULT_PACK_ID,
  );

  // The room's pack is shown, not the one stored by the language picker, so the page needn't wait for it.
  useLayoutEffect(() => {
    document.documentElement.removeAttribute(PACK_PENDING_ATTR);
  }, []);

  // The waiting screen holds until the countdown is due.
  const countdownAt = state.status === "ready" && state.snapshot.rounds[0] ? state.snapshot.rounds[0].startsAt - COUNTDOWN_MS : null;
  const [inDuel, setInDuel] = useState(false);
  useEffect(() => {
    if (countdownAt == null || inDuel) return;
    const check = () => {
      if (now() >= countdownAt) setInDuel(true);
    };
    check();
    const id = window.setInterval(check, 50);
    return () => window.clearInterval(id);
  }, [countdownAt, inDuel, now]);

  let body: ReactNode;
  if (state.status === "error") {
    body = <RoomMessage title={state.error === "full" ? strings.versus.full : state.error === "missing" ? strings.versus.missing : strings.versus.joinFailed} />;
  } else if (state.status === "loading") {
    body = <RoomMessage title={strings.versus.connecting} quiet />;
  } else if (!inDuel) {
    body = <Waiting snapshot={state.snapshot} seat={state.seat} pack={pack} />;
  } else {
    body = (
      <VersusDuel snapshot={state.snapshot} seat={state.seat} pack={pack} now={room.now} submit={room.submit} nudge={room.nudge} />
    );
  }

  return (
    <div className={styles.page} style={packVars(pack)}>
      <PackFonts pack={pack} />
      {body}
    </div>
  );
}

function MenuLink({ label = strings.menu }: { label?: string }) {
  return (
    <Link href="/" className={`${styles.modeButton} ${v.menuLink}`} aria-label={strings.menuAria}>
      &lt; {label}
    </Link>
  );
}

/** A room that can't be opened, or is still loading. */
function RoomMessage({ title, quiet }: { title: string; quiet?: boolean }) {
  return (
    <main className={v.wait}>
      <div className={styles.modeBar}>
        <MenuLink />
        <span className={styles.duelName}>{strings.versus.title}</span>
      </div>
      <div className={v.message} role={quiet ? "status" : "alert"}>
        <h1 className={quiet ? v.messageQuiet : v.messageTitle}>{title}</h1>
        {!quiet && (
          <>
            <p className={v.messageBody}>{strings.versus.errorBody}</p>
            <Link href="/" className={styles.goldButton}>
              {strings.versus.backToMenu}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function Hearts({ n, color, label }: { n: number; color: string; label: string }) {
  return <HeartRow count={n} max={RULES.startHearts} color={color} breakingIndex={null} fxKey={0} label={label} />;
}

/** Two player cards face off; the code and its link wait under them until the friend joins. */
function Waiting({ snapshot, seat, pack }: { snapshot: RoomSnapshot; seat: Seat; pack: LanguagePack }) {
  const rival = otherSeat(seat);
  const joined = snapshot.players[rival] != null;
  const seatNumber = (s: Seat) => fill(strings.versus.player, { n: s === "p1" ? 1 : 2 });
  const { base, target } = pack.meta;
  const [from, to] = snapshot.direction === "toTarget" ? [base, target] : [target, base];

  return (
    <main className={v.wait}>
      <div className={styles.modeBar}>
        <MenuLink />
        <span className={styles.duelName}>{strings.versus.title}</span>
      </div>

      <div className={v.faceOff}>
        <section className={`${v.card} ${v.cardYou}`} aria-label={seatNumber(seat)}>
          <span className={v.cardSeat}>{seatNumber(seat)}</span>
          <span className={v.cardName}>{strings.you}</span>
          <Hearts n={RULES.startHearts} color="var(--player)" label={fill(strings.heartsAria, { who: strings.you, n: RULES.startHearts, max: RULES.startHearts })} />
          <span className={v.cardState}>{strings.versus.ready}</span>
        </section>

        <span className={v.vs} aria-hidden="true">
          {strings.versus.vs}
        </span>

        {joined ? (
          <section className={`${v.card} ${v.cardRival}`} aria-label={seatNumber(rival)}>
            <span className={v.cardSeat}>{seatNumber(rival)}</span>
            <span className={v.cardName}>{nameOf(snapshot, rival)}</span>
            <Hearts n={RULES.startHearts} color="var(--rival)" label={fill(strings.heartsAria, { who: nameOf(snapshot, rival), n: RULES.startHearts, max: RULES.startHearts })} />
            <span className={v.cardState}>{strings.versus.joined}</span>
          </section>
        ) : (
          <section className={`${v.card} ${v.cardEmpty}`} aria-label={seatNumber(rival)}>
            <span className={v.cardSeat}>{seatNumber(rival)}</span>
            <span className={`${v.cardName} ${v.blink}`}>{strings.versus.waiting}</span>
            <span className={v.emptyHearts}>
              <Hearts n={0} color="var(--rival)" label={strings.versus.emptySlot} />
            </span>
            <span className={v.cardNote}>{strings.versus.waitingBody}</span>
          </section>
        )}
      </div>

      {joined ? (
        <span className={v.getReady} role="status">
          {strings.versus.getReady}
        </span>
      ) : (
        <CodeRow code={snapshot.code} />
      )}

      <span className={v.settings}>
        {strings.modes[wordStrike.id]} · <DirectionLabel from={from} to={to} /> · {strings.difficulty.names[snapshot.difficulty]}
      </span>
    </main>
  );
}

const noSubscribe = () => () => {};
/** A phone shares through its share sheet where it has one; elsewhere the link is copied. */
const canShare = () => window.matchMedia("(max-width: 640px)").matches && typeof navigator.share === "function";

/** The room code in four tiles and the button that copies (or, on a phone, shares) its link. */
function CodeRow({ code }: { code: string }) {
  const share = useSyncExternalStore(noSubscribe, canShare, () => false);
  const [copied, setCopied] = useState(false);

  const send = async () => {
    const url = `${window.location.origin}/versus/${code}`;
    if (share) {
      try {
        await navigator.share({ title: fill(strings.versus.shareTitle, { game: GAME_NAME }), url });
        return;
      } catch {
        // Dismissed or refused: copy instead.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      // No clipboard: the code is on screen to read out.
    }
  };

  return (
    <div className={v.codeRow}>
      <span className={v.codeHeading}>{strings.versus.codeHeading}</span>
      <span className={v.codeTiles} role="img" aria-label={fill(strings.versus.codeAria, { letters: [...code].join(" ") })}>
        {[...code].map((c, i) => (
          <span key={i} className={v.codeTile} aria-hidden="true">
            {c}
          </span>
        ))}
      </span>
      <button type="button" className={v.linkButton} onClick={send} aria-live="polite">
        {copied ? strings.versus.copied : share ? strings.versus.shareLink : strings.versus.copyLink}
      </button>
    </div>
  );
}

/** The race: the solo duel board with the other player's hearts on the right. */
function VersusDuel({
  snapshot,
  seat,
  pack,
  now,
  submit,
  nudge,
}: {
  snapshot: RoomSnapshot;
  seat: Seat;
  pack: LanguagePack;
  now: () => number;
  submit: (n: number, given: string) => Promise<void>;
  nudge: () => void;
}) {
  const { state, fuseLit, current, locked, onSubmit } = useVersusDuel({ snapshot, seat, now, submit, nudge });
  const rivalName = nameOf(snapshot, otherSeat(seat));
  const lost = state.phase === "resolving" && state.outcome?.loser === "you";
  const Controls = wordStrike.Controls;

  return (
    <main className={styles.screen}>
      {lost && <div key={state.fxKey} className={styles.hurtFlash} aria-hidden="true" />}
      <div className={styles.modeBar}>
        <MenuLink />
        <span className={styles.duelName}>{fill(strings.versus.titleMinigame, { minigame: minigameName() })}</span>
        <span className={v.roomTag}>{fill(strings.versus.roomCode, { code: snapshot.code })}</span>
      </div>
      <div className={`${styles.board} ${lost ? styles.boardJolt : ""}`}>
        <VersusHud state={state} rivalName={rivalName} />
        <PromptBoard
          state={state}
          pack={pack}
          fuseLit={fuseLit}
          onStart={() => {}}
          band={<VersusBand state={state} pack={pack} current={current} locked={locked} rivalName={rivalName} />}
          gameOverPanel={<VersusOver snapshot={snapshot} seat={seat} pack={pack} />}
        />
        <div className={styles.controlStrip}>
          {state.phase === "gameOver" ? (
            <OverBar />
          ) : (
            <Controls
              pack={pack}
              round={state.round}
              phase={state.phase}
              outcome={state.outcome}
              onSubmit={onSubmit}
              onStart={() => {}}
              locked={locked}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/** Your hearts on the left, the other player's on the right (ADR 0005: solo draws stage progress there instead). */
function VersusHud({ state, rivalName }: { state: DuelState; rivalName: string }) {
  const { hearts, maxHearts, outcome, fxKey, phase } = state;
  const breaking = (side: "you" | "rival") => (phase === "resolving" && outcome?.loser === side ? hearts[side] : null);
  return (
    <div className={`${styles.hud} ${v.hud}`}>
      <div className={styles.hudSide}>
        <span className={styles.hudLabel}>{strings.you}</span>
        <HeartRow
          count={hearts.you}
          max={maxHearts}
          color="var(--player)"
          breakingIndex={breaking("you")}
          fxKey={fxKey}
          label={fill(strings.heartsAria, { who: strings.you, n: hearts.you, max: maxHearts })}
        />
      </div>
      <div className={`${styles.hudSide} ${v.rivalSide}`}>
        <HeartRow
          count={hearts.rival}
          max={maxHearts}
          color="var(--rival)"
          breakingIndex={breaking("rival")}
          fxKey={fxKey}
          label={fill(strings.heartsAria, { who: rivalName, n: hearts.rival, max: maxHearts })}
        />
        <span className={v.rivalName}>{rivalName}</span>
      </div>
    </div>
  );
}

/** The band over the prompt: who got it first, or that nobody did, or that you're out of this round. */
function VersusBand({
  state,
  pack,
  current,
  locked,
  rivalName,
}: {
  state: DuelState;
  pack: LanguagePack;
  current: VersusRound | null;
  locked: boolean;
  rivalName: string;
}) {
  const target = pack.meta.target;
  let band: { tone: string; label: string; word: ReactNode } | null = null;
  const result = current?.result;
  if (state.phase === "resolving" && result && state.outcome) {
    const reveal = <LangSpan t={result.reveal} />;
    if (state.outcome.loser === "rival") {
      band = {
        tone: styles.bandRight,
        label: fill(strings.versus.youFirst, { rival: rivalName }),
        word: (
          <span lang={target.code} dir={target.dir}>
            {pack.feedback.correct}
          </span>
        ),
      };
    } else if (state.outcome.loser === "you") {
      band = { tone: styles.bandWrong, label: fill(strings.versus.rivalFirst, { rival: rivalName }), word: reveal };
    } else {
      band = {
        tone: styles.bandStage,
        label: result.reason === "wrong" ? strings.versus.bothWrong : strings.versus.bothSlow,
        word: reveal,
      };
    }
  } else if (state.phase === "playing" && locked && current?.answered.length) {
    band = { tone: v.bandOut, label: strings.versus.lockedOut, word: null };
  }

  return (
    <div className={styles.bandSlot} role="status" aria-live="polite">
      {band && (
        <div key={`${state.phase}-${state.fxKey}-${band.label}`} className={`${styles.band} ${band.tone}`}>
          <span className={styles.bandLabel}>{band.label}</span>
          {band.word && <span className={styles.bandWord}>{band.word}</span>}
        </div>
      )}
    </div>
  );
}

/** Versus game over, in the duel frame: who won, with the hearts left, and rounds won by each player. */
function VersusOver({ snapshot, seat, pack }: { snapshot: RoomSnapshot; seat: Seat; pack: LanguagePack }) {
  const rival = otherSeat(seat);
  const won = snapshot.winner === seat;
  const left = snapshot.hearts[seat];
  const rounds = roundsWon(snapshot);
  const target = pack.meta.target;
  const phrase = won ? (pack.feedback.stageClear ?? pack.feedback.correct) : pack.feedback.gameOver;

  return (
    <div className={`${styles.gameOver} ${v.over}`} role="status">
      <div className={v.overSummary}>
        <span className={`${v.overTag} ${won ? v.overTagWin : v.overTagLose}`}>
          {won
            ? left === 1
              ? strings.versus.oneHeartLeft
              : fill(strings.versus.heartsLeft, { n: left })
            : fill(strings.versus.rivalWins, { rival: nameOf(snapshot, rival) })}
        </span>
        <span className={v.overTitle}>{won ? strings.versus.youWin : strings.versus.youLose}</span>
        {phrase && (
          <span className={styles.bannerPhrase} lang={target.code} dir={target.dir}>
            {phrase}
          </span>
        )}
      </div>
      <div className={v.roundsWon}>
        <span className={v.roundsHeading}>{strings.versus.roundsWon}</span>
        <span className={v.roundsRow}>
          <span className={v.roundsYou}>{strings.you}</span>
          <span className={v.roundsCount}>{rounds[seat]}</span>
        </span>
        <span className={v.roundsRow}>
          <span className={v.roundsRival}>{nameOf(snapshot, rival)}</span>
          <span className={v.roundsCount}>{rounds[rival]}</span>
        </span>
      </div>
    </div>
  );
}

/** The answer bar at game over: only the way back, until rematch comes (#36). */
function OverBar() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className={v.overBar}>
      <Link ref={ref} href="/" className={styles.goldButton}>
        {strings.versus.backToMenu}
      </Link>
    </div>
  );
}
