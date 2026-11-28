/**
 * Which sound effects a duel plays (ADR 0016): a change in what the duel
 * shows becomes the sounds for it. Pure, so the duel's rules and timing stay
 * in the reducer and controllers and this can be tested in Node.
 */
import { FUSE_TICK_FROM } from "../config/game.ts";
import type { SoundName } from "../lib/soundBank.ts";
import type { Outcome, Phase } from "./types.ts";

/** The slice of a solo or versus duel that sounds follow. */
export interface SoundView {
  versus: boolean;
  phase: Phase;
  count: number;
  fxKey: number;
  outcome: Outcome | null;
  fuseLit: number;
  /** Versus: this player answered wrong and is out of the round. Always false in solo. */
  lockedOut: boolean;
  /**
   * How the duel ended, set only at game over: solo wins on a NEW BEST!,
   * versus when this player won. Null while the duel is on.
   */
  result: "win" | "lose" | null;
}

/** The sound for an outcome as the band shows it: STAGE over COMEBACK over CORRECT in solo. */
function outcomeSound(versus: boolean, outcome: Outcome): SoundName | null {
  if (versus) {
    switch (outcome.loser) {
      case "rival":
        return "right";
      case "you":
        return "rivalHit";
      case null:
        // Nobody right in time: no heart broke, so nothing plays.
        return null;
    }
  }
  switch (outcome.reason) {
    case "correct":
      return outcome.stageCleared ? "stageClear" : outcome.comeback ? "comeback" : "right";
    case "wrong":
    case "timeout":
      return "heartBreak";
  }
}

/**
 * The sounds to play now that the duel shows `next` instead of `prev`, each
 * once per event. A first view (`prev` null) plays nothing, so opening a
 * screen mid-duel is silent.
 */
export function duelSounds(prev: SoundView | null, next: SoundView): SoundName[] {
  if (!prev) return [];
  const sounds: SoundName[] = [];

  if (next.phase === "countdown" && (prev.phase !== "countdown" || prev.count !== next.count)) {
    sounds.push(next.count > 0 ? "count" : "go");
  }

  if (next.phase === "resolving" && next.outcome && next.fxKey !== prev.fxKey) {
    const sound = outcomeSound(next.versus, next.outcome);
    if (sound) sounds.push(sound);
  }

  if (next.versus && next.lockedOut && !prev.lockedOut) sounds.push("wrong");

  // A refill for the next round goes up, so it never ticks.
  if (next.phase === "playing" && next.fuseLit < prev.fuseLit && next.fuseLit >= 1 && next.fuseLit <= FUSE_TICK_FROM) {
    sounds.push("tick");
  }

  if (next.phase === "gameOver" && prev.phase !== "gameOver" && next.result) sounds.push(next.result);

  return sounds;
}
