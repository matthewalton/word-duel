"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { VERSUS } from "@/config/game";
import type { Difficulty, Direction } from "@/game/types";
import { cleanCode, isRoomCode } from "@/game/versus";
import { strings } from "@/i18n/strings";
import { keepSeat } from "@/lib/versusSeat";
import type { LanguagePack } from "@/packs/types";
import { createRoom, joinRoom } from "@/server/versus";
import { DirectionLabel } from "./DirectionLabel";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import v from "./versus.module.css";

const HEART = "M1 0h2v1h-2zM4 0h2v1h-2zM0 1h7v2h-7zM1 3h5v1h-5zM2 4h3v1h-3zM3 5h1v1h-1z";

/** The red VERSUS button in the title bar (VS on a phone). */
export function VersusButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button className={v.versusButton} aria-label={strings.versus.buttonAria} onClick={onOpen}>
      <svg viewBox="0 0 7 6" className={v.versusHeart} shapeRendering="crispEdges" aria-hidden="true">
        <path fill="currentColor" d={HEART} />
      </svg>
      <span className={v.long}>{strings.versus.button}</span>
      <span className={v.short}>{strings.versus.buttonShort}</span>
    </Button>
  );
}

type Busy = "create" | "join" | null;

/**
 * Create or join a versus room. A room takes Word Strike's direction and
 * difficulty from its card and the language picker's pack; joining by code
 * shows "no room" and "full" here, before leaving the title screen.
 */
export function VersusPanel({
  pack,
  direction,
  difficulty,
  onClose,
}: {
  pack: LanguagePack;
  direction: Direction;
  difficulty: Difficulty;
  onClose: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const go = (roomCode: string, token: string) => {
    keepSeat(roomCode, token);
    // Close the modal first: the title page stays mounted (hidden) after the
    // move, and an open modal would leave the room page inert, so the answer
    // box couldn't take typing.
    onClose();
    router.push(`/versus/${roomCode}`);
  };

  const create = async () => {
    setBusy("create");
    setError(null);
    const made = await createRoom({ packId: pack.meta.id, minigame: "word-strike", direction, difficulty }).catch(() => null);
    if (made) return go(made.code, made.token);
    setBusy(null);
    setError(strings.versus.createFailed);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!isRoomCode(code)) {
      setError(strings.versus.missing);
      return;
    }
    setBusy("join");
    setError(null);
    const joined = await joinRoom(code).catch(() => null);
    if (joined?.ok) return go(code, joined.token);
    setBusy(null);
    setError(!joined ? strings.versus.joinFailed : joined.error === "full" ? strings.versus.full : strings.versus.missing);
  };

  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];

  return (
    <Dialog
      title={strings.versus.panelTitle}
      lead={<p className={v.panelLead}>{strings.versus.panelBody}</p>}
      closeLabel={strings.title.close}
      onClose={onClose}
      className={v.panel}
    >
      <div className={v.options}>
        <section className={v.option} aria-labelledby="versus-create">
          <h3 id="versus-create" className={v.optionTitle}>
            {strings.versus.createTitle}
          </h3>
          <p className={v.optionBody}>{strings.versus.createBody}</p>
          <span className={v.chips}>
            <span className={v.chip}>
              <DirectionLabel from={from} to={to} />
            </span>
            <span className={v.chip}>{strings.difficulty.names[difficulty]}</span>
          </span>
          <Button variant="primary" className={v.createButton} disabled={busy != null} aria-busy={busy === "create" || undefined} onClick={create}>
            {busy === "create" ? strings.versus.working : strings.versus.createButton}
          </Button>
        </section>
        <form className={`${v.option} ${v.joinForm}`} aria-labelledby="versus-join" onSubmit={join}>
          <h3 id="versus-join" className={v.optionTitle}>
            {strings.versus.joinTitle}
          </h3>
          <p className={v.optionBody}>{strings.versus.joinBody}</p>
          <label htmlFor="versus-code" className={v.srOnly}>
            {strings.versus.codeLabel}
          </label>
          <input
            id="versus-code"
            className={v.codeInput}
            value={code}
            onChange={(e) => {
              setCode(cleanCode(e.target.value));
              setError(null);
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
            variant="primary"
            type="submit"
            className={v.joinButton}
            disabled={busy != null || code.length === 0}
            aria-busy={busy === "join" || undefined}
          >
            {busy === "join" ? strings.versus.working : strings.versus.joinButton}
          </Button>
        </form>
      </div>
      {error && (
        <p className={v.panelError} role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
