/**
 * The duel's sound effects as data (ADR 0016): each sound is a few chiptune
 * voices, synthesised in code when it plays (`src/lib/sound.ts`), so nothing
 * is downloaded or licensed. Pure, so `node --test` can check every sound
 * without listening.
 */

export const SOUND_NAMES = [
  "count",
  "go",
  "right",
  "comeback",
  "stageClear",
  "heartBreak",
  "rivalHit",
  "wrong",
  "tick",
  "win",
  "lose",
  "rivalJoined",
] as const satisfies readonly string[];

export type SoundName = (typeof SOUND_NAMES)[number];

/** One note: when it starts and how long it lasts (ms, from the sound's start), and its gain before the master. */
interface Timing {
  start: number;
  length: number;
  level: number;
}

/**
 * A square (the chiptune lead) or triangle (soft bass and bells) note at
 * `freq` Hz, ramping to `slideTo` over its length when set; or a burst of
 * noise, the crack of a breaking heart.
 */
export type Voice = Timing &
  ({ wave: "square" | "triangle"; freq: number; slideTo?: number } | { wave: "noise" });

const square = (freq: number, start: number, length: number, level: number): Voice => ({
  wave: "square",
  freq,
  start,
  length,
  level,
});
const triangle = (freq: number, start: number, length: number, level: number): Voice => ({
  wave: "triangle",
  freq,
  start,
  length,
  level,
});

// Note frequencies in Hz.
const C3 = 130.81;
const F3 = 174.61;
const F3s = 185;
const G3 = 196;
const C4 = 261.63;
const E4b = 311.13;
const G4 = 392;
const A4 = 440;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const B5 = 987.77;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

const heartBreak: Voice[] = [
  { wave: "noise", start: 0, length: 60, level: 0.5 },
  { wave: "square", freq: 330, slideTo: 110, start: 0, length: 260, level: 0.45 },
];

export const SOUNDS: Record<SoundName, Voice[]> = {
  /** 3, 2 and 1 of the countdown: a plain beep. */
  count: [square(A4, 0, 90, 0.5)],
  /** GO!: higher and longer. */
  go: [square(A5, 0, 300, 0.6), triangle(A4, 0, 300, 0.5)],
  /** A right answer: a two-note coin, up. */
  right: [square(E5, 0, 60, 0.5), square(B5, 60, 110, 0.5)],
  /** A COMEBACK: a brighter four-note sparkle, like the band's sparks. */
  comeback: [square(G5, 0, 50, 0.45), square(C6, 50, 50, 0.45), square(E6, 100, 50, 0.45), square(G6, 150, 140, 0.45)],
  /** The right answer that clears a stage: a rising arpeggio, its top note held over a bass. */
  stageClear: [
    square(C5, 0, 70, 0.5),
    square(E5, 70, 70, 0.5),
    square(G5, 140, 70, 0.5),
    square(C6, 210, 220, 0.5),
    triangle(C4, 0, 430, 0.5),
  ],
  /** Your heart breaks: a crack, then a falling buzz. */
  heartBreak,
  /** Versus: the rival was first, a quick strike, then your heart breaking. */
  rivalHit: [square(E6, 0, 40, 0.4), ...heartBreak.map((v) => ({ ...v, start: v.start + 50 }))],
  /** Versus: a wrong answer locks you out of the round; no heart broke, so no crack. */
  wrong: [square(G3, 0, 90, 0.4), square(F3s, 90, 140, 0.4)],
  /** One fuse segment lost near the end: a soft, short click. */
  tick: [triangle(C6, 0, 30, 0.5)],
  /** A won versus duel, or a solo NEW BEST!: a short fanfare. */
  win: [
    square(C5, 0, 110, 0.5),
    square(C5, 130, 110, 0.5),
    square(G5, 260, 110, 0.5),
    square(C6, 390, 330, 0.5),
    triangle(C4, 0, 240, 0.5),
    triangle(G3, 260, 460, 0.5),
  ],
  /** Game over without a win: three falling notes and a sagging low one. */
  lose: [
    square(G4, 0, 150, 0.45),
    square(E4b, 160, 150, 0.45),
    square(C4, 320, 150, 0.45),
    { wave: "square", freq: G3, slideTo: F3, start: 480, length: 400, level: 0.45 },
    triangle(C3, 480, 400, 0.4),
  ],
  /** Versus: the rival joins your room, a two-note doorbell. */
  rivalJoined: [triangle(B5, 0, 120, 0.5), triangle(E6, 120, 240, 0.5)],
};

/** How long a sound lasts, in ms: the end of its last voice. */
export function soundLength(name: SoundName): number {
  return Math.max(...SOUNDS[name].map((v) => v.start + v.length));
}
