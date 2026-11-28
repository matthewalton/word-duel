"use client";

import { useEffect, useState } from "react";
import { VERSUS } from "@/config/game";
import { MINIGAME_IDS, type MinigameId } from "@/game/minigames/ids";
import { cleanCode } from "@/game/versus";
import { canDeal } from "@/game/versusRounds";
import { fill, strings } from "@/i18n/strings";
import { dateText } from "@/lib/dates";
import { useSoloSettings } from "@/lib/soloSettings";
import { useRoomActions } from "@/lib/useRoomActions";
import type { VersusRecord } from "@/lib/versusRecord";
import { loadVersusRecord } from "@/server/versusRecord";
import ar from "./area.module.css";
import { AreaScreen, type AreaProps } from "./AreaScreen";
import { DirectionLabel } from "./DirectionLabel";
import { Button } from "./ui/Button";
import { Panel } from "./ui/Panel";
import { ToggleGroup } from "./ui/ToggleGroup";
import { VersusRecordDialog } from "./VersusRecordDialog";

const s = strings.versusArea;

/** `/versus`: the Versus area. */
export function VersusAreaScreen() {
  return <AreaScreen area="versus">{(props) => <VersusArea {...props} />}</AreaScreen>;
}

/**
 * The Versus area (boards NavDoorsVersus and NavKitVersus): make a room
 * running the minigame picked here, with the saved difficulty and direction,
 * or join one by code; and the account's versus record. A minigame with
 * nothing to deal at that difficulty can't be picked.
 */
function VersusArea({ pack, account, openSignIn }: AreaProps) {
  const { direction, difficulty } = useSoloSettings();
  const [picked, setPicked] = useState<MinigameId>("word-strike");
  const [code, setCode] = useState("");

  const dealable = (m: MinigameId) => canDeal(pack, { minigame: m, direction, difficulty });
  const minigame = dealable(picked) ? picked : "word-strike";
  // Word Strike always has words at every difficulty; a pack may lack gap sentences.
  const noGaps = !dealable("gap-guard");
  const { busy, error, clearError, create, join } = useRoomActions({ pack, minigame, direction, difficulty });

  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];

  return (
    <main className={ar.body}>
      <p className={ar.lead}>{s.lead}</p>
      <div className={ar.pair}>
        <Panel className={ar.create} aria-labelledby="versus-create">
          <span className={ar.createHead}>
            <h2 id="versus-create" className={ar.panelTitle}>
              {strings.versus.createTitle}
            </h2>
            <span className={ar.chips}>
              {minigame === "word-strike" && (
                <span className={ar.chip}>
                  <DirectionLabel from={from} to={to} />
                </span>
              )}
              <span className={ar.chip}>{strings.difficulty.names[difficulty]}</span>
            </span>
          </span>
          <p className={ar.panelBody}>{strings.versus.createBody}</p>
          <ToggleGroup
            label={strings.modesLabel}
            options={MINIGAME_IDS}
            className={ar.toggle}
            value={minigame}
            onValueChange={setPicked}
            isDisabled={(m) => !dealable(m)}
            optionClassName={() => ar.minigameOption}
            renderOption={(m) => strings.modes[m].toUpperCase()}
          />
          {noGaps && (
            <p className={ar.note}>{fill(strings.versus.noGaps, { difficulty: strings.difficulty.names[difficulty] })}</p>
          )}
          <Button
            variant="primary"
            className={ar.createButton}
            disabled={busy != null}
            aria-busy={busy === "create" || undefined}
            onClick={create}
          >
            {busy === "create" ? strings.versus.working : strings.versus.createButton}
          </Button>
        </Panel>

        <Panel className={ar.join} aria-labelledby="versus-join">
          <h2 id="versus-join" className={ar.panelTitle}>
            <span className={ar.long}>{strings.versus.joinTitle}</span>
            <span className={ar.short}>{strings.versus.joinTitleShort}</span>
          </h2>
          <form
            className={ar.joinForm}
            onSubmit={(e) => {
              e.preventDefault();
              void join(code);
            }}
          >
            <label htmlFor="versus-code" className={`${ar.panelBody} ${ar.joinLabel}`}>
              {strings.versus.joinBody}
            </label>
            <span className={ar.joinRow}>
              <input
                id="versus-code"
                className={ar.codeInput}
                value={code}
                onChange={(e) => {
                  setCode(cleanCode(e.target.value));
                  clearError();
                }}
                placeholder={strings.versus.codePlaceholder}
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
                className={ar.joinButton}
                disabled={busy != null || code.length === 0}
                aria-busy={busy === "join" || undefined}
              >
                {busy === "join" ? strings.versus.working : strings.versus.joinButton}
              </Button>
            </span>
          </form>
        </Panel>
      </div>
      {error && (
        <p className={ar.error} role="alert">
          {error}
        </p>
      )}

      <section className={ar.dark} aria-labelledby="versus-record">
        {account.pending ? (
          <h2 id="versus-record" className={ar.darkTitle}>
            {strings.versusRecord.title}
          </h2>
        ) : account.user ? (
          <RecordSlot key={account.user.id} />
        ) : (
          <>
            <h2 id="versus-record" className={ar.darkTitle}>
              {strings.versusRecord.title}
            </h2>
            <div className={ar.guestRow}>
              <p className={ar.darkBody}>
                <span className={ar.long}>{s.recordGuest}</span>
                <span className={ar.short}>{s.recordGuestShort}</span>
              </p>
              <Button variant="outlined" className={ar.signIn} onClick={openSignIn}>
                {strings.account.signIn}
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/** A ready record is null for a guest; the slot only loads for an account, so it reads as no matches. */
type Load = { status: "loading" } | { status: "failed" } | { status: "ready"; record: VersusRecord | null };

/**
 * The account's versus record in short: won and lost, and the latest
 * matches (three, or two on a phone). FULL RECORD opens the account menu's
 * record dialog.
 */
function RecordSlot() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    loadVersusRecord()
      .then((record) => {
        if (live) setLoad({ status: "ready", record });
      })
      .catch(() => {
        if (live) setLoad({ status: "failed" });
      });
    return () => {
      live = false;
    };
  }, []);

  const record = load.status === "ready" && load.record && load.record.played > 0 ? load.record : null;
  return (
    <>
      <div className={ar.darkHead}>
        <h2 id="versus-record" className={ar.darkTitle}>
          {strings.versusRecord.title}
        </h2>
        {record && (
          <span className={ar.tally}>
            <span className={ar.won}>{fill(s.wins, { n: record.won })}</span>
            {" · "}
            <span className={ar.lost}>{fill(s.losses, { n: record.lost })}</span>
          </span>
        )}
      </div>
      {load.status === "loading" && <p className={ar.status}>{strings.versusRecord.loading}</p>}
      {load.status === "failed" && (
        <p className={ar.darkBody} role="alert">
          {s.recordFailed}
        </p>
      )}
      {load.status === "ready" && !record && <p className={ar.darkBody}>{strings.versusRecord.empty}</p>}
      {record && (
        <ol className={ar.recent} aria-label={strings.versusRecord.recent}>
          {record.recent.slice(0, 3).map((m, i) => (
            // Fixed while shown, so the index is a stable key.
            <li key={i} className={ar.match}>
              <span className={m.won ? ar.won : ar.lost}>{m.won ? strings.versusRecord.won : strings.versusRecord.lost}</span>
              <span className={ar.rival}>
                {fill(s.versusRival, { name: (m.rival ?? strings.versus.guest).toUpperCase() })}
              </span>
              <span className={ar.when}>{dateText(m.endedAt)}</span>
            </li>
          ))}
        </ol>
      )}
      {record && (
        <Button variant="outlined" className={ar.fullRecord} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {s.fullRecord}
        </Button>
      )}
      {open && <VersusRecordDialog onClose={() => setOpen(false)} />}
    </>
  );
}
