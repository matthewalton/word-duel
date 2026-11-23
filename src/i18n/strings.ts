/**
 * All interface text lives here so the interface can be translated later.
 * Templates use {name} placeholders; see `fill` / `FillTemplate`.
 */
export const UI_LANG = "en";

export const strings = {
  modes: {
    "word-strike": "Word Strike",
    "gap-guard": "Gap Guard",
  } as Record<string, string>,
  modesLabel: "Minigame",
  direction: "{from} > {to}",
  directionAria: "Answer direction: {from} to {to}. Click to switch.",
  start: "START",
  hit: "HIT",
  you: "YOU",
  rival: "CPU {stage}",
  best: "BEST {score}",
  score: "Score",
  hintTypeIn: "Type it in {language}",
  hintFillGap: "Fill the gap",
  inputPlaceholder: "Type your answer",
  inputLabel: "Your answer",
  correct: "Correct.",
  wrong: "Not quite. The answer was {answer}",
  tooSlow: "Too slow. The answer was {answer}",
  idleMessage: "Press START to duel.",
  stageBanner: "STAGE {stage}",
  stageBannerSub: "+{bonus} · faster fuse",
  gameOver: "GAME OVER",
  finalScore: "SCORE {score}",
  newBest: "NEW BEST!",
  playAgain: "Press START to play again",
  pointsLabel: "+{points}",
  heartLostLabel: "-♥",
  heartsAria: "{who}: {n} of {max} hearts",
  fuseAria: "Time left",
  creditsLabel: "Word data:",
} as const;

/** Replace {name} placeholders with plain strings. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
