"use client";

import { SOUNDS, type SoundName, type Voice } from "./soundBank.ts";
import { soundOn, storeSoundOn } from "./soundSetting.ts";

/*
 * The sound effects synth (ADR 0016): the only module that touches Web Audio.
 * Each sound in the bank is played as one oscillator (or noise burst) per
 * voice, each through its own envelope, into one master gain.
 */

/** The master level: the loudest voice (0.6) peaks at about 0.12 of full scale. */
const MASTER_LEVEL = 0.2;
/** Every voice starts this far ahead, so the first is never scheduled in the past. */
const LEAD_S = 0.01;
/** The envelope: a linear rise to the voice's level, then an exponential fall to near silence. */
const ATTACK_S = 0.005;
const RELEASE_S = 0.03;
const SILENT = 0.0001;
/** A source stops this long after its envelope ends. */
const STOP_AFTER_S = 0.01;
/** The noise burst's buffer, shared by every noise voice. */
const NOISE_S = 0.25;
/** A second play of the same sound this soon after the first is dropped (React's dev Strict Mode, two controller frames). */
const DEDUPE_MS = 50;

/*
 * The parts of Web Audio the synth uses. A real AudioContext fits them, and
 * so does the tests' fake.
 */
interface SoundParam {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}

interface SoundNode {
  connect(destination: SoundNode): unknown;
}

interface SoundGain extends SoundNode {
  readonly gain: SoundParam;
}

interface SoundSource extends SoundNode {
  start(when: number): void;
  stop(when: number): void;
}

interface SoundOscillator extends SoundSource {
  type: OscillatorType;
  readonly frequency: SoundParam;
}

interface SoundBuffer {
  getChannelData(channel: number): Float32Array;
}

interface SoundBufferSource extends SoundSource {
  buffer: SoundBuffer | null;
}

export interface SoundContext {
  readonly state: string;
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: SoundNode;
  createGain(): SoundGain;
  createOscillator(): SoundOscillator;
  createBuffer(channels: number, length: number, sampleRate: number): SoundBuffer;
  createBufferSource(): SoundBufferSource;
  resume(): Promise<void>;
}

/** What happened to a play: the development sound log prints it. */
type PlayResult = "played" | "muted" | "hidden" | "locked" | "unsupported";

const isDev = process.env.NODE_ENV === "development";

function warn(error: unknown) {
  if (isDev) console.warn("[sound]", error);
}

/** Fixed-seed noise (mulberry32), so every page load and test run cracks the same. */
function fillNoise(data: Float32Array) {
  let seed = 0x5eed;
  for (let i = 0; i < data.length; i++) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    data[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
}

export interface SoundPlayer {
  /** Plays a sound now, unless it is off, the tab is hidden or audio isn't unlocked; such sounds are dropped, never queued. */
  play: (name: SoundName) => void;
  /** Creates or resumes the audio context; call it inside a gesture. Resolves to whether audio now runs. */
  unlock: () => Promise<boolean>;
}

export function createSoundPlayer({
  createContext,
  enabled,
  hidden,
  now,
}: {
  /** Makes the page's one audio context, the first time audio unlocks; null where there is no Web Audio. */
  createContext: (() => SoundContext) | null;
  enabled: () => boolean;
  hidden: () => boolean;
  /** A clock in ms, for the same-sound dedupe. */
  now: () => number;
}): SoundPlayer {
  let ctx: SoundContext | null = null;
  let master: SoundGain | null = null;
  let noise: SoundBuffer | null = null;
  const lastPlayed = new Map<SoundName, number>();

  const noiseBuffer = (context: SoundContext) => {
    if (!noise) {
      noise = context.createBuffer(1, Math.round(NOISE_S * context.sampleRate), context.sampleRate);
      fillNoise(noise.getChannelData(0));
    }
    return noise;
  };

  const masterGain = (context: SoundContext) => {
    if (!master) {
      master = context.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(context.destination);
    }
    return master;
  };

  const playVoice = (context: SoundContext, out: SoundGain, voice: Voice, at: number) => {
    const start = at + voice.start / 1000;
    const end = start + voice.length / 1000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(voice.level, start + ATTACK_S);
    gain.gain.setValueAtTime(voice.level, Math.max(start + ATTACK_S, end - RELEASE_S));
    gain.gain.exponentialRampToValueAtTime(SILENT, end);
    gain.connect(out);

    let source: SoundSource;
    if (voice.wave === "noise") {
      const burst = context.createBufferSource();
      burst.buffer = noiseBuffer(context);
      source = burst;
    } else {
      const osc = context.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(voice.freq, start);
      if (voice.slideTo != null) osc.frequency.linearRampToValueAtTime(voice.slideTo, end);
      source = osc;
    }
    source.connect(gain);
    source.start(start);
    source.stop(end + STOP_AFTER_S);
  };

  const result = (): PlayResult => {
    if (!enabled()) return "muted";
    if (hidden()) return "hidden";
    if (!createContext) return "unsupported";
    // Not unlocked by a gesture yet, or suspended since (an iPhone call, a sleeping background tab).
    if (ctx?.state !== "running") return "locked";
    return "played";
  };

  const play = (name: SoundName) => {
    const at = now();
    const last = lastPlayed.get(name);
    if (last != null && at - last < DEDUPE_MS) return;
    lastPlayed.set(name, at);

    let outcome = result();
    if (outcome === "played" && ctx) {
      try {
        const out = masterGain(ctx);
        const startAt = ctx.currentTime + LEAD_S;
        for (const voice of SOUNDS[name]) playVoice(ctx, out, voice, startAt);
      } catch (error) {
        // No audio on this device: the duel plays silently.
        warn(error);
        outcome = "unsupported";
      }
    }
    if (isDev) console.debug(`[sound] ${name} (${outcome})`);
  };

  const unlock = async () => {
    if (!createContext) return false;
    try {
      const context = (ctx ??= createContext());
      const resumed = context.resume();
      // One silent sample: the old iOS Safari unlock, harmless elsewhere.
      const silence = context.createBufferSource();
      silence.buffer = context.createBuffer(1, 1, context.sampleRate);
      silence.connect(context.destination);
      silence.start(0);
      await resumed;
      return context.state === "running";
    } catch (error) {
      // No audio on this device: the duel plays silently.
      warn(error);
      return false;
    }
  };

  return { play, unlock };
}

/** Safari 16.4+ lets a page say what kind of audio it plays. */
function hasAudioSession(nav: Navigator): nav is Navigator & { audioSession: { type: string } } {
  if (!("audioSession" in nav)) return false;
  const session = nav.audioSession;
  return typeof session === "object" && session !== null && "type" in session;
}

function createBrowserContext(): SoundContext {
  // Ambient: on an iPhone, sounds follow the ring/silent switch and mix with the player's own music.
  if (hasAudioSession(navigator)) navigator.audioSession.type = "ambient";
  const context = new AudioContext();
  // Suspended again (an iPhone call, a sleeping background tab): the next gesture resumes it.
  context.addEventListener("statechange", () => {
    if (context.state !== "running") armUnlock();
  });
  return context;
}

const player = createSoundPlayer({
  createContext: typeof AudioContext === "undefined" ? null : createBrowserContext,
  enabled: soundOn,
  hidden: () => document.visibilityState === "hidden",
  now: () => performance.now(),
});

/**
 * Browsers only start audio inside a tap, click or key press, so the first
 * of these on the page unlocks it. A player opening a versus link fresh may
 * miss their first countdown until they tap or type: there is no way round
 * that before a gesture.
 */
const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
let armed = false;

function onGesture() {
  void player.unlock().then((running) => {
    if (running) disarmUnlock();
  });
}

function disarmUnlock() {
  armed = false;
  for (const g of GESTURES) window.removeEventListener(g, onGesture, { capture: true });
}

/** Listens for the gesture that unlocks audio, until it runs; every screen that can play sound calls this on mount. */
export function armUnlock() {
  if (armed) return;
  armed = true;
  for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true });
}

export const playSound = (name: SoundName) => player.play(name);

/** The sound button: turning sound on unlocks audio inside the click and beeps, so the player hears it works. */
export function setSoundOn(on: boolean) {
  storeSoundOn(on);
  if (!on) return;
  void player.unlock().then((running) => {
    if (running) disarmUnlock();
    player.play("count");
  });
}
