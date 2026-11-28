"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VERSUS } from "@/config/game";
import { cleanCode } from "@/game/versus";
import { fill, padScore, strings } from "@/i18n/strings";
import { useRoomActions } from "@/lib/useRoomActions";
import { BookIcon } from "./BookIcon";
import { Brand, HEART_PATH } from "./Brand";
import { DirectionLabel } from "./DirectionLabel";
import n from "./nav.module.css";
import type { SoloMenuProps } from "./SoloScreen";
import { TopBar } from "./TopBar";
import { Button } from "./ui/Button";
import { Panel } from "./ui/Panel";

const s = strings.nav;

/**
 * The hub (board NavSplitHub): SINGLE PLAYER with a quick PLAY per minigame,
 * VERSUS with CREATE ROOM and a code box, and STUDY. Each panel's heading is
 * its door to that area's screen.
 */
export function Hub({ pack, minigames, best, account, settings, play, openSignIn }: SoloMenuProps) {
  const router = useRouter();
  const { direction, difficulty } = settings;
  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];

  // V opens the Versus area, unless typing or a dialog or a menu is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "v" || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, [role="dialog"], [role="menu"]')) return;
      e.preventDefault();
      router.push("/versus");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className={n.screen}>
      <TopBar lead={<Brand />} pack={pack} account={account} onOpenSignIn={openSignIn} />
      <div className={n.hub}>
        <Panel className={n.single} aria-label={s.single}>
          <h2 className={n.singleHead}>
            <Link href="/play" className={n.singleDoor} aria-label={s.singleAria}>
              {s.single}
              <span className={n.allOptions} aria-hidden="true">
                {s.allOptions} &gt;
              </span>
            </Link>
          </h2>
          <div className={n.games}>
            {minigames.map((m) => {
              const name = strings.modes[m.id] ?? m.id;
              const Preview = m.Preview;
              return (
                <div key={m.id} className={n.game}>
                  <span className={n.gamePreview} aria-hidden="true">
                    <Preview pack={pack} opts={settings} />
                  </span>
                  <span className={n.gameInfo}>
                    <span className={n.gameName}>{name.toUpperCase()}</span>
                    <span className={n.gameMeta}>
                      {best && <span>{fill(strings.best, { score: padScore(best[m.id] ?? 0) })}</span>}
                      {m.usesDirection && (
                        <span>
                          <DirectionLabel from={from} to={to} />
                        </span>
                      )}
                      {m.usesDifficulty && <span>{strings.difficulty.names[difficulty]}</span>}
                    </span>
                    <Button
                      variant="primary"
                      className={n.gamePlay}
                      aria-label={fill(strings.title.playName, { name })}
                      onClick={() => play(m.id)}
                    >
                      {strings.title.play}
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <QuickVersus settings={settings} pack={pack} guest={!account.pending && !account.user} />

        <section className={`${n.side} ${n.study}`} aria-label={s.study}>
          <h2 className={n.sideHead}>
            <Link href="/study" className={n.sideDoor} aria-label={s.studyAria}>
              <BookIcon className={n.sideIcon} />
              {s.study}
              <span className={n.sideArrow} aria-hidden="true">
                &gt;
              </span>
            </Link>
          </h2>
          <p className={n.sideLine}>
            <span className={n.long}>{account.user ? s.studyLine : s.studyLineGuest}</span>
            <span className={n.short}>{s.studyLineShort}</span>
          </p>
          {!account.pending &&
            (account.user ? (
              <>
                <Link href="/study" className={`${n.sideAction} ${n.sideActionPrimary}`}>
                  {s.practise}
                </Link>
                <span className={n.sideMeta}>{s.wordbookShort}</span>
              </>
            ) : (
              <>
                <Button variant="outlined" className={n.sideAction} onClick={openSignIn}>
                  {s.signInToKeep}
                </Button>
                <span className={n.sideMeta}>{s.signInToKeepShort}</span>
              </>
            ))}
        </section>
      </div>
    </div>
  );
}

/** The hub's VERSUS panel: its door opens the Versus area; CREATE ROOM and JOIN work from here. */
function QuickVersus({ pack, settings, guest }: Pick<SoloMenuProps, "pack" | "settings"> & { guest: boolean }) {
  const [code, setCode] = useState("");
  const { busy, error, clearError, create, join } = useRoomActions({
    pack,
    // The hub makes a Word Strike room; the Versus area offers the other minigames.
    minigame: "word-strike",
    direction: settings.direction,
    difficulty: settings.difficulty,
  });

  return (
    <section className={`${n.side} ${n.versus}`} aria-label={s.versus}>
      <h2 className={n.sideHead}>
        <Link href="/versus" className={n.sideDoor} aria-label={s.versusAria}>
          <svg viewBox="0 0 7 6" className={n.sideIcon} shapeRendering="crispEdges" aria-hidden="true">
            <path fill="var(--rival)" d={HEART_PATH} />
          </svg>
          {s.versus}
          <span className={n.sideArrow} aria-hidden="true">
            &gt;
          </span>
        </Link>
      </h2>
      <p className={n.sideLine}>
        <span className={n.long}>{s.versusLine}</span>
        <span className={n.short}>{s.versusLineShort}</span>
      </p>
      <form
        className={n.versusRow}
        onSubmit={(e) => {
          e.preventDefault();
          void join(code);
        }}
      >
        <Button
          variant="primary"
          className={n.createRoom}
          disabled={busy != null}
          aria-busy={busy === "create" || undefined}
          onClick={create}
        >
          {busy === "create" ? strings.versus.working : strings.versus.createButton}
        </Button>
        <label htmlFor="hub-code" className={n.srOnly}>
          {strings.versus.codeLabel}
        </label>
        <input
          id="hub-code"
          className={n.codeInput}
          value={code}
          onChange={(e) => {
            setCode(cleanCode(e.target.value));
            clearError();
          }}
          placeholder={s.codePlaceholder}
          maxLength={VERSUS.codeLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          onKeyDown={(e) => {
            // Never submit while an IME composition is in progress.
            if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
          }}
        />
        <Button
          type="submit"
          className={n.joinButton}
          disabled={busy != null || code.length === 0}
          aria-busy={busy === "join" || undefined}
        >
          {busy === "join" ? strings.versus.working : strings.versus.joinButton}
        </Button>
      </form>
      {guest && <span className={n.sideMeta}>{s.guestsWelcome}</span>}
      {error && (
        <p className={n.versusError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
