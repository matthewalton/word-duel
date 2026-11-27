"use client";

import Link from "next/link";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { WORDBOOK } from "@/config/game";
import { langText, type PromptKind } from "@/game/types";
import { fill, strings, UI_LANG } from "@/i18n/strings";
import { useChosenPack } from "@/lib/packChoice";
import { useAccount } from "@/lib/useAccount";
import type { Item, LanguagePack } from "@/packs/types";
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
import w from "./wordbook.module.css";

type Tab = "missed" | "best";
type Order = "newest" | "most";

const s = strings.wordbook;
const METER_SQUARES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    <div className={styles.page} style={packVars(pack)}>
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
    </div>
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
      <button type="button" className={w.gold} onClick={onSignIn}>
        {strings.account.signIn}
      </button>
      <Link href="/" className={w.plain}>
        {s.backToMenu}
      </Link>
    </Message>
  );
}

function Empty() {
  return (
    <Message title={s.emptyTitle} text={s.emptyBody}>
      <Link href="/" className={w.gold}>
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
        <button type="button" className={w.plain} onClick={onRetry}>
          {s.retry}
        </button>
      </div>
    </div>
  );
}

function Book({ pack, book, userId }: { pack: LanguagePack; book: Wordbook; userId: string }) {
  const id = useId();
  const [tab, setTab] = useState<Tab>("missed");
  const [order, setOrder] = useState<Order>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, WordbookDetail | "failed">>({});
  const tabs: Tab[] = ["missed", "best"];

  const pick = (t: Tab) => {
    setTab(t);
    setOpenId(null);
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
    pick(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
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
    <>
      <div className={w.bar}>
        <div role="tablist" aria-label={s.tabsLabel} className={w.tabs} onKeyDown={onTabKey}>
          {tabs.map((t) => (
            <button
              key={t}
              id={`${id}-tab-${t}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t ? 0 : -1}
              className={`${w.tab} ${tab === t ? w.tabOn : ""}`}
              onClick={() => pick(t)}
            >
              {t === "missed" ? s.missed : s.best}
              <span className={w.tabCount}>{(t === "missed" ? book.missed : book.best).length}</span>
            </button>
          ))}
        </div>
        {tab === "missed" && book.missed.length > 1 && (
          <div role="group" aria-label={s.order} className={w.order}>
            <span className={w.orderLabel} aria-hidden="true">
              {s.order}
            </span>
            {(["newest", "most"] as const).map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={order === o}
                className={`${w.orderButton} ${order === o ? w.orderOn : ""}`}
                onClick={() => setOrder(o)}
              >
                {o === "newest" ? s.newest : s.mostMissed}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className={w.tabPanel}>
        {entries.length === 0 ? (
          tab === "missed" ? (
            <Message title={s.noMissesTitle} text={s.noMissesBody} />
          ) : (
            <Message title={s.noBestTitle} text={fill(s.noBestBody, { n: WORDBOOK.bestMinAnswers })} />
          )
        ) : (
          <>
            {tab === "missed" && <PracticeMissed pack={pack} userId={userId} />}
            <p className={w.intro}>
              {tab === "missed" ? s.missedIntro : fill(s.bestIntro, { n: WORDBOOK.bestMinAnswers })}
            </p>
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
      </div>
    </>
  );
}

const items = new WeakMap<LanguagePack, Map<string, Item>>();

function findItem(pack: LanguagePack, itemId: string): Item | undefined {
  let byId = items.get(pack);
  if (!byId) {
    byId = new Map<string, Item>([...pack.words, ...pack.grammar].map((i) => [i.id, i]));
    items.set(pack, byId);
  }
  return byId.get(itemId);
}

/** Whole days between two dates, by the player's local calendar. */
function daysSince(d: Date): number {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.max(0, Math.round((day(new Date()) - day(d)) / DAY_MS));
}

function whenText(d: Date | null): string {
  if (!d) return s.none;
  const n = daysSince(d);
  return n === 0 ? s.today : n === 1 ? s.yesterday : fill(s.daysAgo, { n });
}

function dateText(d: Date): string {
  if (daysSince(d) === 0) return s.today;
  return new Intl.DateTimeFormat(UI_LANG, { day: "numeric", month: "short" }).format(d).toUpperCase();
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
  tab: Tab;
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
      <button
        type="button"
        className={w.head}
        aria-expanded={open}
        aria-controls={`${id}-details`}
        onClick={onToggle}
      >
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
      </button>
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
