"use client";

import { useState } from "react";
import { VERSUS } from "@/config/game";
import { MINIGAME_IDS, type MinigameId } from "@/game/minigames/ids";
import type { Difficulty, Direction } from "@/game/types";
import { cleanCode } from "@/game/versus";
import { canDeal } from "@/game/versusRounds";
import { fill, strings } from "@/i18n/strings";
import { useRoomActions } from "@/lib/useRoomActions";
import type { LanguagePack } from "@/packs/types";
import { DirectionLabel } from "./DirectionLabel";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { ToggleGroup } from "./ui/ToggleGroup";
import v from "./versus.module.css";

/**
 * The versus dialog, opened from the hub's VERSUS door until the Versus area
 * screen replaces it: create a room running the minigame picked here (see
 * useRoomActions for the rest of its settings), or join one by code. A
 * minigame with nothing to deal at that difficulty can't be picked.
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
  const [picked, setPicked] = useState<MinigameId>("word-strike");
  const [code, setCode] = useState("");

  const dealable = (m: MinigameId) => canDeal(pack, { minigame: m, direction, difficulty });
  const minigame = dealable(picked) ? picked : "word-strike";
  // Word Strike always has words at every difficulty; a pack may lack gap sentences.
  const noGaps = !dealable("gap-guard");

  // Close the modal before moving: the screen behind stays mounted (hidden)
  // after the move, and an open modal would leave the room page inert, so
  // the answer box couldn't take typing.
  const { busy, error, clearError, create, join } = useRoomActions({
    pack,
    minigame,
    direction,
    difficulty,
    beforeLeave: onClose,
  });

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
          <ToggleGroup
            label={strings.modesLabel}
            options={MINIGAME_IDS}
            value={minigame}
            onValueChange={setPicked}
            isDisabled={(m) => !dealable(m)}
            optionClassName={() => v.minigameOption}
            renderOption={(m) => strings.modes[m].toUpperCase()}
          />
          {noGaps && (
            <p className={v.minigameNote}>{fill(strings.versus.noGaps, { difficulty: strings.difficulty.names[difficulty] })}</p>
          )}
          <span className={v.chips}>
            <span className={v.chip}>{strings.modes[minigame].toUpperCase()}</span>
            {minigame === "word-strike" && (
              <span className={v.chip}>
                <DirectionLabel from={from} to={to} />
              </span>
            )}
            <span className={v.chip}>{strings.difficulty.names[difficulty]}</span>
          </span>
          <Button variant="primary" className={v.createButton} disabled={busy != null} aria-busy={busy === "create" || undefined} onClick={create}>
            {busy === "create" ? strings.versus.working : strings.versus.createButton}
          </Button>
        </section>
        <form
          className={`${v.option} ${v.joinForm}`}
          aria-labelledby="versus-join"
          onSubmit={(e) => {
            e.preventDefault();
            void join(code);
          }}
        >
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
