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
  menu: "MENU",
  menuAria: "Back to the title screen",
  title: {
    navHint: "← → or click to choose · Enter to play",
    play: "PLAY",
    choose: "Choose {name}",
    playName: "Play {name}",
    help: "How {name} works",
    close: "Close",
    previous: "Previous minigame",
    next: "Next minigame",
    pageOf: "{n} of {total}",
  },
  minigameInfo: {
    "word-strike": {
      description: "See a word, type its translation, hit Enter before the fuse runs out.",
      steps: [
        "A word appears",
        "Type it in {language} and press Enter before the fuse runs out",
        "A right answer breaks a CPU heart. Wrong or too slow breaks yours",
      ],
      rules: ["Switch the direction to practise both ways."],
    },
    "gap-guard": {
      description: "Fill the blank in a {language} sentence. Three choices, one is right.",
      steps: [
        "A sentence is missing one piece",
        "Pick the missing piece, or press 1, 2 or 3",
        "A right answer breaks a CPU heart. Wrong or too slow breaks yours",
      ],
      rules: [],
    },
  } as Record<string, { description: string; steps: [string, string, string]; rules: string[] }>,
  sharedRules: [
    "Right answers in a row build a combo: up to {cap}× points.",
    "Break all {hearts} CPU hearts to clear the stage. The fuse gets {step} second shorter each stage.",
  ],
  creditsLabel: "Word data:",
} as const;

/** Replace {name} placeholders with plain strings. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
