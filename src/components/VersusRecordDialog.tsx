"use client";

import { useEffect, useId, useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { dateText } from "@/lib/dates";
import type { VersusRecord } from "@/lib/versusRecord";
import { loadVersusRecord } from "@/server/versusRecord";
import styles from "./game.module.css";
import { Dialog } from "./ui/Dialog";
import r from "./versusRecord.module.css";

const s = strings.versusRecord;

type Load = { status: "loading" } | { status: "failed" } | { status: "ready"; record: VersusRecord };

const nameText = (name: string | null) => (name ?? strings.versus.guest).toUpperCase();

/**
 * The account's versus record, opened from the account menu: totals,
 * head-to-head against rival accounts and recent matches, read from the
 * server each time it opens.
 */
export function VersusRecordDialog({ onClose }: { onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let live = true;
    loadVersusRecord()
      .then((record) => {
        // Null is a guest, who can't open this menu; show it as no matches.
        if (live) setLoad({ status: "ready", record: record ?? emptyRecord });
      })
      .catch(() => {
        if (live) setLoad({ status: "failed" });
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Dialog title={s.title} closeLabel={strings.title.close} onClose={onClose} className={r.dialog}>
      {load.status === "loading" && <p className={r.status}>{s.loading}</p>}
      {load.status === "failed" && (
        <p className={r.sentence} role="alert">
          {s.failed}
        </p>
      )}
      {load.status === "ready" &&
        (load.record.played === 0 ? <p className={r.sentence}>{s.empty}</p> : <Record record={load.record} />)}
    </Dialog>
  );
}

const emptyRecord: VersusRecord = { played: 0, won: 0, lost: 0, winRate: null, headToHead: [], recent: [] };

function Record({ record }: { record: VersusRecord }) {
  const headToHeadId = useId();
  const recentId = useId();
  const totals = [
    { label: s.played, value: String(record.played) },
    { label: s.won, value: String(record.won) },
    { label: s.lost, value: String(record.lost) },
    ...(record.winRate == null ? [] : [{ label: s.winRate, value: fill(s.percent, { n: record.winRate }) }]),
  ];
  return (
    <>
      <dl className={r.totals}>
        {totals.map((t) => (
          <div key={t.label} className={r.total}>
            <dt className={r.totalLabel}>{t.label}</dt>
            <dd className={r.totalValue}>{t.value}</dd>
          </div>
        ))}
      </dl>

      <section className={r.section} aria-labelledby={headToHeadId}>
        <h3 id={headToHeadId} className={r.heading}>
          {s.headToHead}
        </h3>
        {record.headToHead.length === 0 ? (
          <p className={r.sentence}>{s.headToHeadNone}</p>
        ) : (
          <ol className={r.rows}>
            {record.headToHead.map((h, i) => (
              // Fixed while the dialog is open, so the index is a stable key.
              <li key={i} className={r.row}>
                <span className={r.name}>{nameText(h.name)}</span>
                <span className={r.wonLost}>{fill(s.wonLost, { won: h.won, lost: h.lost })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={r.section} aria-labelledby={recentId}>
        <h3 id={recentId} className={r.heading}>
          {s.recent}
        </h3>
        <ol className={r.rows}>
          {record.recent.map((m, i) => (
            <li key={i} className={r.row}>
              <span className={m.won ? r.won : r.lost}>{m.won ? s.won : s.lost}</span>
              <span className={r.match}>
                <span className={r.name}>{nameText(m.rival)}</span>
                <span className={r.detail}>
                  {(strings.modes[m.minigame] ?? m.minigame).toUpperCase()}
                  {m.reason === "left" && ` · ${m.won ? s.rivalLeft : s.youLeft}`}
                </span>
              </span>
              <span className={r.hearts}>
                <svg viewBox="0 0 7 6" className={r.heartIcon} shapeRendering="crispEdges" aria-hidden="true">
                  <path fill="currentColor" d="M1 0h2v1h-2zM4 0h2v1h-2zM0 1h7v2h-7zM1 3h5v1h-5zM2 4h3v1h-3zM3 5h1v1h-1z" />
                </svg>
                <span aria-hidden="true">{fill(s.hearts, { mine: m.hearts, theirs: m.rivalHearts })}</span>
                <span className={styles.srOnly}>{fill(s.heartsAria, { mine: m.hearts, theirs: m.rivalHearts })}</span>
              </span>
              <span className={r.date}>{dateText(m.endedAt)}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
