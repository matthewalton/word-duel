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
  pressEnter: "OR PRESS ENTER",
  countdownGo: "GO!",
  go: "GO",
  you: "YOU",
  best: "BEST {score}",
  score: "Score",
  hintTypeIn: "Type it in {language}",
  hintFillGap: "Fill the gap",
  inputLabel: "Your answer",
  correct: "CORRECT",
  wrong: "THE ANSWER WAS",
  tooSlow: "TOO SLOW · IT WAS",
  stageUp: "STAGE {stage}",
  gameOver: "GAME OVER",
  finalScore: "SCORE {score}",
  newBest: "NEW BEST!",
  playAgain: "Press START to play again",
  toReview: "TO REVIEW",
  youAnswered: "You answered",
  tooSlowShort: "TOO SLOW",
  pointsLabel: "+{points}",
  heartsAria: "{who}: {n} of {max} hearts",
  stageProgressAria: "Stage {stage}: {n} of {max} right answers to the next stage",
  timeLeftAria: "Time left",
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
      description: "See a word, type its translation, hit Enter before time runs out.",
      steps: [
        "A word appears",
        "Type it in {language} and press Enter before time runs out",
        "A right answer fills the stage bar. Wrong or too slow breaks a heart",
      ],
      rules: ["Switch the direction to practise both ways."],
    },
    "gap-guard": {
      description: "Fill the blank in a {language} sentence. Three choices, one is right.",
      steps: [
        "A sentence is missing one piece",
        "Pick the missing piece, or press 1, 2 or 3",
        "A right answer fills the stage bar. Wrong or too slow breaks a heart",
      ],
      rules: [],
    },
  } as Record<string, { description: string; steps: [string, string, string]; rules: string[] }>,
  sharedRules: [
    "Right answers in a row build a combo: up to {cap}× points.",
    "Get {hearts} right to fill the stage bar and reach the next stage. Each stage gives you {step} second less to answer.",
  ],
  creditsLabel: "Word data:",
  account: {
    signIn: "SIGN IN",
    panelTitle: "SIGN IN",
    panelBody: "Keep your best scores on any device. You don't need an account to play.",
    continueWith: "CONTINUE WITH {provider}",
    providers: { google: "Google", github: "GitHub", discord: "Discord" },
    mergeNote: "Your best scores from this browser come with you.",
    keepGuest: "KEEP PLAYING AS A GUEST",
    signInFailed: "Sign-in didn't start. Try again, or pick another option.",
    merged: "THIS BROWSER'S PROGRESS IS IN YOUR ACCOUNT",
    accountAria: "Account: {name}",
    signedInWith: "Signed in with {provider}",
    savedNote: "Your best scores are saved to your account.",
    signOut: "SIGN OUT",
    gameOverNudge: "Sign in to keep your best scores on any device.",
  },
} as const;

/** Replace {name} placeholders with plain strings. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
