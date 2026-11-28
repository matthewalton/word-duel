"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PRACTICE_MIN_MISSED } from "@/config/game";
import { langText } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import { practiceHref } from "@/lib/practiceLink";
import { useLastMissed } from "@/lib/useLastMissed";
import { findItem } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { loadWordbook, type Wordbook } from "@/server/wordbook";
import ar from "./area.module.css";
import { AreaScreen, type AreaProps } from "./AreaScreen";
import { BookIcon } from "./BookIcon";
import { HEART_PATH } from "./Brand";
import { DirectionLabel } from "./DirectionLabel";
import { LangSpan } from "./LangSpan";
import { minigameName, practiceWays, wayName, type PracticeWay } from "./PracticeMissed";
import { Button } from "./ui/Button";
import { Panel } from "./ui/Panel";

const s = strings.studyArea;

/** Missed items the Wordbook panel lists on a desktop. */
const MISSED_SHOWN = 3;

/** `/study`: the Study area. */
export function StudyAreaScreen() {
  return <AreaScreen area="study">{(props) => <StudyArea {...props} />}</AreaScreen>;
}

/**
 * The Study area (boards NavDoorsStudy and NavKitStudy): the Wordbook, with
 * the latest missed items and its counts, and PRACTISE MISSED for each way
 * to practise. A guest sees both dimmed under a SIGN IN banner.
 */
function StudyArea({ pack, account, openSignIn }: AreaProps) {
  const userId = account.user?.id ?? null;
  const guest = !account.pending && !userId;
  const book = useWordbook(pack.meta.id, userId);
  const ways = practiceWays(pack, useLastMissed(pack.meta.id, userId));

  return (
    <main className={ar.body}>
      {guest && (
        <Panel className={ar.banner} aria-labelledby="study-sign-in">
          <span className={ar.bannerText}>
            <h2 id="study-sign-in" className={ar.panelTitle}>
              {s.guestTitle}
            </h2>
            <p className={ar.panelBody}>{s.guestBody}</p>
          </span>
          <Button variant="primary" className={ar.bannerButton} onClick={openSignIn}>
            {strings.account.signIn}
          </Button>
        </Panel>
      )}

      <div className={`${ar.studyPanels} ${guest ? ar.locked : ""}`}>
        <section className={ar.dark} aria-labelledby="study-wordbook">
          <div className={ar.darkHead}>
            <BookIcon className={ar.darkIcon} />
            <h2 id="study-wordbook" className={ar.darkTitle}>
              {strings.wordbook.title}
            </h2>
          </div>
          <p className={ar.darkBody}>{s.wordbookBody}</p>
          {book && book.missed.length > 0 && <MissedList pack={pack} book={book} />}
          <div className={ar.wordbookFoot}>
            {book && <span className={ar.counts}>{fill(s.counts, { missed: book.missed.length, best: book.best.length })}</span>}
            {userId ? (
              <Link href="/wordbook" className={ar.openWordbook}>
                {s.openWordbook}
              </Link>
            ) : (
              <Button className={ar.openWordbook} disabled>
                {s.openWordbook}
              </Button>
            )}
          </div>
        </section>

        <section className={ar.dark} aria-labelledby="study-practise">
          <div className={ar.darkHead}>
            <svg viewBox="0 0 7 6" className={ar.darkIcon} shapeRendering="crispEdges" aria-hidden="true">
              <path fill="var(--player)" d={HEART_PATH} />
            </svg>
            <h2 id="study-practise" className={ar.darkTitle}>
              {s.practiseTitle}
            </h2>
          </div>
          <p className={ar.darkBody}>{s.practiseBody}</p>
          <ul className={ar.ways}>
            {ways.map((way) => (
              <Way key={way.kind} way={way} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

/** One way to practise: its name, how many missed items it has, and PRACTISE once it has enough. */
function Way({ way }: { way: PracticeWay }) {
  const ready = typeof way.count === "number" && way.count >= PRACTICE_MIN_MISSED;
  const note =
    way.count == null
      ? s.nothingKept
      : way.count === "loading"
        ? strings.wordbook.loading
        : ready
          ? fill(s.missed, { n: way.count })
          : fill(s.needs, { n: way.count, min: PRACTICE_MIN_MISSED });
  const name = minigameName(way.minigame);
  const aria = fill(s.practiseAria, { way: way.languages ? fill(s.minigameWay, { minigame: name, way: wayName(way) }) : name });
  return (
    <li className={ar.way}>
      <span className={ar.wayText}>
        <span className={ar.wayName}>
          {name.toUpperCase()}
          {way.languages && (
            <span className={ar.chipDark}>
              <DirectionLabel from={way.languages[0]} to={way.languages[1]} />
            </span>
          )}
        </span>
        <span className={ar.wayNote}>{note}</span>
      </span>
      {ready ? (
        // A full page load, so the Single player area reads the way on arrival.
        <a href={practiceHref(way.kind)} className={ar.practise} aria-label={aria}>
          {s.practise}
        </a>
      ) : (
        <Button className={ar.practise} aria-label={aria} disabled>
          {s.practise}
        </Button>
      )}
    </li>
  );
}

function MissedList({ pack, book }: { pack: LanguagePack; book: Wordbook }) {
  const { target, base } = pack.meta;
  return (
    <ul className={ar.missedList} aria-label={s.latestMissed}>
      {book.missed.slice(0, MISSED_SHOWN).map((entry) => {
        const item = findItem(pack, entry.itemId);
        if (!item) return null;
        const baseWord = item.kind === "word" ? item.base[0] : item.base;
        return (
          <li key={entry.itemId} className={ar.missedRow}>
            <LangSpan t={langText(target, item.target)} className={ar.missedTarget} />
            <LangSpan t={langText(base, baseWord)} className={ar.missedBase} />
            <span className={ar.missedCount}>{fill(s.missedTimes, { n: entry.misses })}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The account's wordbook for the Wordbook panel. Null for a guest, while it
 * loads, and when it didn't load (the panel then shows no list or counts;
 * OPEN WORDBOOK still works).
 */
function useWordbook(packId: string, userId: string | null): Wordbook | null {
  const key = `${userId}\u0000${packId}`;
  const [loaded, setLoaded] = useState<{ key: string; book: Wordbook | null } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadWordbook(packId)
      .then((book) => {
        if (live) setLoaded({ key, book });
      })
      .catch(() => {
        // Offline: the panel shows no list or counts, and the Wordbook page retries.
      });
    return () => {
      live = false;
    };
  }, [packId, userId, key]);

  return userId && loaded?.key === key ? loaded.book : null;
}
