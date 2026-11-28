"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { WORDBOOK } from "@/config/game";
import { langText, type PromptKind } from "@/game/types";
import { fill, strings, UI_LANG } from "@/i18n/strings";
import { useChosenPack } from "@/lib/packChoice";
import { dateText, daysSince } from "@/lib/dates";
import { useAccount } from "@/lib/useAccount";
import { findItem } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import {
  loadWordbook,
  loadWordbookItem,
  type Wordbook,
  type WordbookDetail,
  type WordbookEntry,
} from "@/server/wordbook";
import { BookIcon } from "./BookIcon";
import styles from "./game.module.css";
import { LangSpan } from "./LangSpan";
import { PackFonts, packVars } from "./PackFonts";
import { PracticeMissed } from "./PracticeMissed";
import { SignInDialog } from "./SignInDialog";
import { Button } from "./ui/Button";
import { PortalRoot } from "./ui/PortalRoot";
import { Tab, TabList, TabPanel, Tabs } from "./ui/Tabs";
import { ToggleGroup } from "./ui/ToggleGroup";
import w from "./wordbook.module.css";

const TABS = ["missed", "best"] as const;
const ORDERS = ["newest", "most"] as const;
type BookTab = (typeof TABS)[number];
type Order = (typeof ORDERS)[number];

const s = strings.wordbook;
const METER_SQUARES = 5;

/**
 * The wordbook: an account's word history one item at a time, in MISSED and
 * BEST tabs. Each row opens to show its stats; the round log behind them is
 * only read when a row opens. A guest is asked to sign in.
 */
export function WordbookScreen() {
  const pack = useChosenPack();
  const packId = pack.meta.id;
  const account = useAccount(packId);
  const userId = account.user?.id ?? null;
  const [signInOpen, setSignInOpen] = useState(false);

  // Kept with the user and attempt they belong to, so a new sign-in or a
  // retry shows LOADING without resetting state inside the effect.
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; book: Wordbook | null; failed: boolean } | null>(null);
  const key = `${userId}:${packId}:${attempt}`;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    const done = (book: Wordbook | null, failed: boolean) => {
      if (live) setLoaded({ key: `${userId}:${packId}:${attempt}`, book, failed });
    };
    loadWordbook(packId).then(
      (book) => done(book, book == null),
      () => done(null, true),
    );
    return () => {
      live = false;
    };
  }, [userId, attempt, packId]);

  const current = loaded?.key === key ? loaded : null;

  let body;
  if (account.pending || (userId && !current)) body = <p className={w.loading}>{s.loading}</p>;
  else if (!userId) body = <GuestPrompt onSignIn={() => setSignInOpen(true)} />;
  else if (current?.failed || !current?.book) body = <LoadFailed onRetry={() => setAttempt((n) => n + 1)} />;
  else if (current.book.seen === 0) body = <Empty />;
  else body = <Book pack={pack} book={current.book} userId={userId} />;

  return (
    <PortalRoot className={styles.page} style={packVars(pack)}>
      <PackFonts pack={pack} />
      <main className={w.screen}>
        <div className={w.top}>
          <Link href="/" className={w.back} aria-label={strings.menuAria}>
            &lt; {strings.menu}
          </Link>
          <h1 className={w.title}>
            <BookIcon className={w.titleIcon} />
            {s.title}
          </h1>
          <span className={w.language} lang={UI_LANG}>
            {pack.meta.target.name}
          </span>
        </div>
        <div className={w.panel}>{body}</div>
      </main>
      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} onSignIn={account.signIn} />}
    </PortalRoot>
  );
}

function Message({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className={w.message}>
      <BookIcon className={w.messageIcon} />
      <h2 className={w.messageTitle}>{title}</h2>
      <p className={w.messageText}>{text}</p>
      {children && <div className={w.messageActions}>{children}</div>}
    </div>
  );
}

function GuestPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Message title={s.guestTitle} text={s.guestBody}>
      <Button className={w.gold} onClick={onSignIn}>
        {strings.account.signIn}
      </Button>
      <Link href="/" className={w.plain}>
        {s.backToMenu}
      </Link>
    </Message>
  );
}

function Empty() {
  return (
    <Message title={s.emptyTitle} text={s.emptyBody}>
      <Link href="/play" className={w.gold}>
        {s.play}
      </Link>
    </Message>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={w.message} role="alert">
      <p className={w.messageText}>{s.loadFailed}</p>
      <div className={w.messageActions}>
        <Button className={w.plain} onClick={onRetry}>
          {s.retry}
        </Button>
      </div>
    </div>
  );
}

function Book({ pack, book, userId }: { pack: LanguagePack; book: Wordbook; userId: string }) {
  const id = useId();
  const [tab, setTab] = useState<BookTab>("missed");
  const [order, setOrder] = useState<Order>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, WordbookDetail | "failed">>({});
  const [exportFailed, setExportFailed] = useState(false);

  const pick = (t: BookTab) => {
    setTab(t);
    setOpenId(null);
    setExportFailed(false);
  };

  const toggle = (itemId: string) => {
    if (openId === itemId) {
      setOpenId(null);
      return;
    }
    setOpenId(itemId);
    if (details[itemId] && details[itemId] !== "failed") return;
    loadWordbookItem(pack.meta.id, itemId).then(
      (d) => setDetails((all) => ({ ...all, [itemId]: d ?? "failed" })),
      () => setDetails((all) => ({ ...all, [itemId]: "failed" })),
    );
  };

  const entries =
    tab === "best"
      ? book.best
      : order === "most"
        ? [...book.missed].sort(
            (a, b) => b.misses - a.misses || (b.lastMissedAt?.getTime() ?? 0) - (a.lastMissedAt?.getTime() ?? 0),
          )
        : book.missed;

  return (
    <Tabs tabs={TABS} value={tab} onValueChange={pick} className={w.book}>
      <div className={w.bar}>
        <TabList label={s.tabsLabel} className={w.tabs}>
          {TABS.map((t) => (
            <Tab key={t} value={t} className={w.tab}>
              {t === "missed" ? s.missed : s.best}
              <span className={w.tabCount}>{(t === "missed" ? book.missed : book.best).length}</span>
            </Tab>
          ))}
        </TabList>
        {tab === "missed" && book.missed.length > 1 && (
          <div className={w.order}>
            <span className={w.orderLabel} aria-hidden="true">
              {s.order}
            </span>
            <ToggleGroup
              label={s.order}
              options={ORDERS}
              value={order}
              onValueChange={setOrder}
              optionClassName={() => w.orderButton}
              renderOption={(o) => (o === "newest" ? s.newest : s.mostMissed)}
            />
          </div>
        )}
      </div>

      <TabPanel value={tab} className={w.tabPanel}>
        {entries.length === 0 ? (
          tab === "missed" ? (
            <Message title={s.noMissesTitle} text={s.noMissesBody} />
          ) : (
            <Message title={s.noBestTitle} text={fill(s.noBestBody, { n: WORDBOOK.bestMinAnswers })} />
          )
        ) : (
          <>
            {tab === "missed" && <PracticeMissed pack={pack} userId={userId} />}
            {tab === "missed" ? (
              <>
                <div className={w.introRow}>
                  <p className={w.intro}>{s.missedIntro}</p>
                  <AnkiExportButton pack={pack} entries={entries} onFail={setExportFailed} />
                </div>
                {exportFailed && (
                  <p className={`${w.intro} ${w.exportError}`} role="alert">
                    {s.ankiExportError}
                  </p>
                )}
              </>
            ) : (
              <p className={w.intro}>{fill(s.bestIntro, { n: WORDBOOK.bestMinAnswers })}</p>
            )}
            <ol className={w.list}>
              {entries.map((e) => (
                <Row
                  key={e.itemId}
                  id={`${id}-${e.itemId}`}
                  pack={pack}
                  entry={e}
                  tab={tab}
                  order={order}
                  open={openId === e.itemId}
                  detail={details[e.itemId]}
                  onToggle={() => toggle(e.itemId)}
                />
              ))}
            </ol>
          </>
        )}
      </TabPanel>
    </Tabs>
  );
}

/**
 * EXPORT TO ANKI: builds the MISSED tab's `.apkg` in the browser. The deck
 * writer loads only on tap; while it works the button reads EXPORTING… and
 * ignores taps, holding the idle label's width so the row doesn't jump. It is
 * aria-disabled rather than disabled so keyboard focus stays on it.
 */
function AnkiExportButton({
  pack,
  entries,
  onFail,
}: {
  pack: LanguagePack;
  entries: readonly WordbookEntry[];
  onFail: (failed: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const exportDeck = async () => {
    if (busy) return;
    setBusy(true);
    onFail(false);
    try {
      const { exportAnkiDeck } = await import("@/lib/ankiDownload");
      await exportAnkiDeck(pack, entries, new Date());
    } catch (error) {
      // warn, not error: the player already sees the error line, and Next's dev overlay counts console.error as an Issue.
      console.warn(error);
      onFail(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button className={`${w.plain} ${w.export}`} onClick={exportDeck} aria-disabled={busy} aria-busy={busy}>
      {/* Both labels share one grid cell, so the button keeps the wider one's width. */}
      <span className={busy ? w.exportHidden : undefined}>{s.ankiExport}</span>
      <span className={busy ? undefined : w.exportHidden}>{s.ankiExporting}</span>
    </Button>
  );
}

function whenText(d: Date | null): string {
  if (!d) return s.none;
  const n = daysSince(d);
  return n === 0 ? strings.dates.today : n === 1 ? strings.dates.yesterday : fill(strings.dates.daysAgo, { n });
}

const missesText = (n: number) => (n === 1 ? s.oneMiss : fill(s.misses, { n }));
const percent = (right: number, total: number) => Math.round((100 * right) / Math.max(total, 1));

function Row({
  id,
  pack,
  entry,
  tab,
  order,
  open,
  detail,
  onToggle,
}: {
  id: string;
  pack: LanguagePack;
  entry: WordbookEntry;
  tab: BookTab;
  order: Order;
  open: boolean;
  detail: WordbookDetail | "failed" | undefined;
  onToggle: () => void;
}) {
  const item = findItem(pack, entry.itemId);
  if (!item) return null;
  const { target, base } = pack.meta;
  const baseWord = item.kind === "word" ? item.base[0] : item.base;
  const total = entry.right + entry.misses;

  let main: string;
  let sub: string;
  let mainClass = "";
  if (tab === "best") {
    main = fill(s.percent, { n: percent(entry.right, total) });
    sub = fill(s.rightOf, { right: entry.right, total });
    mainClass = w.good;
  } else if (order === "most") {
    main = missesText(entry.misses);
    sub = fill(s.lastWhen, { when: whenText(entry.lastMissedAt) });
    mainClass = w.bad;
  } else {
    main = whenText(entry.lastMissedAt);
    sub = missesText(entry.misses);
  }

  return (
    <li className={`${w.row} ${open ? w.rowOpen : ""}`}>
      <Button className={w.head} aria-expanded={open} aria-controls={`${id}-details`} onClick={onToggle}>
        <span className={w.words}>
          <LangSpan t={langText(target, item.target)} className={w.target} />
          <LangSpan t={langText(base, baseWord)} className={w.base} />
        </span>
        <span className={w.meta}>
          <span className={`${w.metaMain} ${mainClass}`}>{main}</span>
          <span className={w.metaSub}>{sub}</span>
        </span>
        <span className={w.chevron} aria-hidden="true">
          <svg viewBox="0 0 7 4" shapeRendering="crispEdges">
            <path
              fill="currentColor"
              d="M0 0h1v1h-1zM6 0h1v1h-1zM1 1h1v1h-1zM5 1h1v1h-1zM2 2h1v1h-1zM4 2h1v1h-1zM3 3h1v1h-1z"
            />
          </svg>
        </span>
      </Button>
      {open && <Details id={`${id}-details`} pack={pack} entry={entry} detail={detail} />}
    </li>
  );
}

function Details({
  id,
  pack,
  entry,
  detail,
}: {
  id: string;
  pack: LanguagePack;
  entry: WordbookEntry;
  detail: WordbookDetail | "failed" | undefined;
}) {
  const { target, base } = pack.meta;
  const languageOf = (kind: PromptKind) => (kind === "toBase" ? base : target);
  const ready = detail && detail !== "failed" ? detail : null;
  const loading = detail === undefined;
  // Placeholder for a value the round log hasn't returned yet: the same height
  // as the real value, so nothing shifts when it lands.
  const pending: ReactNode = loading ? (
    <>
      <span className={w.skeleton} aria-hidden="true" />
      <span className={styles.srOnly}>{s.loading}</span>
    </>
  ) : (
    s.none
  );

  // Item stats already say whether wrong answers exist, so their section can
  // hold its place while loading instead of popping in afterwards.
  const wrongs = entry.kinds.reduce((n, k) => n + k.wrong, 0);
  const placeholderChips = loading ? Math.min(wrongs, 3) : 0;

  const stats: { label: string; value: ReactNode }[] = [
    { label: s.run, value: ready ? String(ready.run) : pending },
    { label: s.tooSlow, value: String(entry.timeouts) },
    {
      label: s.averageAnswer,
      value: ready ? (ready.averageMs == null ? s.none : fill(s.seconds, { n: (ready.averageMs / 1000).toFixed(1) })) : pending,
    },
    { label: s.firstSeen, value: dateText(entry.firstSeenAt) },
  ];

  return (
    <div className={w.drawer}>
      <div id={id} className={w.details} aria-busy={loading}>
        <section className={w.section}>
          <h3 className={w.sectionLabel}>{s.byPrompt}</h3>
          <ul className={w.kinds}>
            {entry.kinds.map((k) => {
              const total = k.right + k.wrong + k.timeouts;
              const pct = percent(k.right, total);
              const filled = Math.round((METER_SQUARES * k.right) / Math.max(total, 1));
              return (
                <li key={k.kind} className={w.kind}>
                  <span className={w.kindName}>
                    {fill(s.promptKinds[k.kind], { language: languageOf(k.kind).name })}
                  </span>
                  <span className={w.meter} role="img" aria-label={fill(s.meterAria, { n: pct })}>
                    {Array.from({ length: METER_SQUARES }, (_, i) => (
                      <span key={i} className={i < filled ? w.meterOn : w.meterOff} />
                    ))}
                  </span>
                  <span className={w.kindCount}>{fill(s.rightOf, { right: k.right, total })}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <dl className={w.stats}>
          {stats.map((st) => (
            <div key={st.label} className={w.stat}>
              <dt className={w.statLabel}>{st.label}</dt>
              <dd className={w.statValue}>{st.value}</dd>
            </div>
          ))}
        </dl>

        {ready && ready.wrongAnswers.length > 0 && (
          <section className={w.section}>
            <h3 className={w.sectionLabel}>{s.wrongAnswers}</h3>
            <ul className={w.givens}>
              {ready.wrongAnswers.map((g) => (
                <li key={`${g.kind}:${g.given}`} className={w.given}>
                  <del>
                    <LangSpan t={langText(languageOf(g.kind), g.given)} className={w.givenText} />
                  </del>
                  {g.count > 1 && (
                    <span className={w.givenCount} aria-label={fill(s.timesAria, { n: g.count })}>
                      {fill(s.times, { n: g.count })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {placeholderChips > 0 && (
          <section className={w.section} aria-hidden="true">
            <h3 className={w.sectionLabel}>{s.wrongAnswers}</h3>
            <ul className={w.givens}>
              {Array.from({ length: placeholderChips }, (_, i) => (
                <li key={i} className={w.given}>
                  <span className={`${w.givenText} ${w.skeletonChip}`} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
