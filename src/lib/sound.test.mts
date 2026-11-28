/**
 * Unit tests for the sound effects synth, against a fake audio context that
 * records the nodes it is asked for.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSoundPlayer, type SoundContext } from "./sound.ts";

class FakeParam {
  value = 0;
  calls: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.calls.push(["set", v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(["linear", v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push(["exponential", v, t]);
  }
}

class FakeNode {
  to: FakeNode[] = [];
  connect(destination: FakeNode) {
    this.to.push(destination);
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeSource extends FakeNode {
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  start(when: number) {
    this.startedAt = when;
  }
  stop(when: number) {
    this.stoppedAt = when;
  }
}

class FakeOscillator extends FakeSource {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
}

class FakeBuffer {
  data: Float32Array;
  constructor(length: number) {
    this.data = new Float32Array(length);
  }
  getChannelData() {
    return this.data;
  }
}

class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null;
}

class FakeContext implements SoundContext {
  state = "suspended";
  currentTime = 2;
  sampleRate = 8_000;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  bufferSources: FakeBufferSource[] = [];
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o;
  }
  createBuffer(_channels: number, length: number) {
    return new FakeBuffer(length);
  }
  createBufferSource() {
    const s = new FakeBufferSource();
    this.bufferSources.push(s);
    return s;
  }
  async resume() {
    this.state = "running";
  }
}

/** A player over a fake context, unlocked unless `locked`; its clock moves with `clock.ms`. */
async function setUp({ on = true, hidden = false, locked = false } = {}) {
  const ctx = new FakeContext();
  const clock = { ms: 0 };
  const player = createSoundPlayer({
    createContext: () => ctx,
    enabled: () => on,
    hidden: () => hidden,
    now: () => clock.ms,
  });
  if (!locked) assert.equal(await player.unlock(), true);
  // Only the unlock's silent sample so far.
  ctx.bufferSources.length = 0;
  return { ctx, clock, player };
}

describe("createSoundPlayer", () => {
  it("plays right as two square notes, 60 ms apart, through their gains into the master", async () => {
    const { ctx, player } = await setUp();
    player.play("right");

    assert.equal(ctx.oscillators.length, 2);
    const [low, high] = ctx.oscillators;
    assert.deepEqual([low.type, high.type], ["square", "square"]);
    assert.equal(low.frequency.calls[0][1], 659.25);
    assert.equal(high.frequency.calls[0][1], 987.77);
    assert.equal(low.startedAt, 2.01);
    assert.ok(Math.abs((high.startedAt ?? 0) - (low.startedAt ?? 0) - 0.06) < 1e-9);

    const [master, ...voiceGains] = ctx.gains;
    assert.equal(master.gain.value, 0.2);
    assert.deepEqual(master.to, [ctx.destination]);
    assert.equal(voiceGains.length, 2);
    assert.deepEqual(low.to, [voiceGains[0]]);
    assert.deepEqual(high.to, [voiceGains[1]]);
    for (const g of voiceGains) assert.deepEqual(g.to, [master]);
  });

  it("shapes each voice: 5 ms up to its level, 30 ms down at the end, stopped 10 ms later", async () => {
    const { ctx, player } = await setUp();
    player.play("count");
    const [osc] = ctx.oscillators;
    const gain = ctx.gains[1];
    const t = 2.01;
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const [rise0, rise, hold, fall] = gain.gain.calls;
    assert.deepEqual([rise0[0], rise0[1]], ["set", 0]);
    assert.ok(near(rise0[2], t));
    assert.deepEqual([rise[0], rise[1]], ["linear", 0.5]);
    assert.ok(near(rise[2], t + 0.005));
    assert.deepEqual([hold[0], hold[1]], ["set", 0.5]);
    assert.ok(near(hold[2], t + 0.09 - 0.03));
    assert.deepEqual([fall[0], fall[1]], ["exponential", 0.0001]);
    assert.ok(near(fall[2], t + 0.09));
    assert.ok(near(osc.stoppedAt ?? 0, t + 0.1));
  });

  it("slides a note's frequency and plays noise from a buffer", async () => {
    const { ctx, player } = await setUp();
    player.play("heartBreak");
    assert.equal(ctx.bufferSources.length, 1);
    assert.ok((ctx.bufferSources[0].buffer?.data.length ?? 0) > 0);
    const [buzz] = ctx.oscillators;
    assert.deepEqual(
      buzz.frequency.calls.map(([kind, v]) => [kind, v]),
      [
        ["set", 330],
        ["linear", 110],
      ],
    );
  });

  it("schedules nothing when sound is off", async () => {
    const { ctx, player } = await setUp({ on: false });
    player.play("right");
    assert.equal(ctx.oscillators.length, 0);
  });

  it("schedules nothing in a hidden tab", async () => {
    const { ctx, player } = await setUp({ hidden: true });
    player.play("right");
    assert.equal(ctx.oscillators.length, 0);
  });

  it("schedules nothing before audio is unlocked, or once it is suspended again", async () => {
    const { ctx, player } = await setUp({ locked: true });
    player.play("right");
    assert.equal(ctx.oscillators.length, 0);

    const unlocked = await setUp();
    unlocked.ctx.state = "suspended";
    unlocked.player.play("right");
    assert.equal(unlocked.ctx.oscillators.length, 0);
  });

  it("does nothing, and doesn't throw, without Web Audio", async () => {
    const player = createSoundPlayer({ createContext: null, enabled: () => true, hidden: () => false, now: () => 0 });
    assert.equal(await player.unlock(), false);
    player.play("right");
  });

  it("drops the same sound again within 50 ms, and plays it after", async () => {
    const { ctx, clock, player } = await setUp();
    player.play("count");
    clock.ms = 49;
    player.play("count");
    assert.equal(ctx.oscillators.length, 1);
    clock.ms = 50;
    player.play("count");
    assert.equal(ctx.oscillators.length, 2);
  });

  it("lets different sounds overlap", async () => {
    const { ctx, player } = await setUp();
    player.play("count");
    player.play("tick");
    assert.equal(ctx.oscillators.length, 2);
  });
});
