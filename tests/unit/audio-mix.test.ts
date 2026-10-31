/**
 * The voice-over-SFX mix (audio/DUCK_SPEC.md): buses, ducking, holding reward
 * sounds during a listening prompt, merging repeats, and the master limiter.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

interface Param {
  value: number;
  ramps: Array<[number, number]>;
  setValueAtTime: (v: number) => void;
  linearRampToValueAtTime: (v: number, t: number) => void;
  setTargetAtTime: () => void;
  cancelScheduledValues: () => void;
  exponentialRampToValueAtTime: () => void;
}
interface Node {
  kind: string;
  connectedTo: Node[];
  connect: (n: Node) => Node;
  gain: Param;
  frequency: Param;
  Q: Param;
  threshold: Param;
  ratio: Param;
  attack: Param;
  release: Param;
  knee: Param;
  type?: string;
  buffer?: unknown;
  start: () => void;
  stop: () => void;
}

let created: Node[] = [];
let clock = 0;

function param(value = 1): Param {
  return {
    value,
    ramps: [],
    setValueAtTime(v) { this.value = v; },
    linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); this.value = v; },
    setTargetAtTime: () => {},
    cancelScheduledValues: () => {},
    exponentialRampToValueAtTime: () => {},
  };
}

function makeNode(kind: string): Node {
  const n: Node = {
    kind,
    connectedTo: [],
    connect(to) { this.connectedTo.push(to); return to; },
    gain: param(),
    frequency: param(0),
    Q: param(0),
    threshold: param(0),
    ratio: param(0),
    attack: param(0),
    release: param(0),
    knee: param(0),
    start: vi.fn(),
    stop: vi.fn(),
  };
  created.push(n);
  return n;
}

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = makeNode('destination');
  resume = async (): Promise<void> => {};
  decodeAudioData = async (): Promise<unknown> => ({ fake: 'buffer' });
  createGain(): Node { return makeNode('gain'); }
  createDynamicsCompressor(): Node { return makeNode('compressor'); }
  createOscillator(): Node { return makeNode('osc'); }
  createBiquadFilter(): Node { return makeNode('biquad'); }
  createBufferSource(): Node { return makeNode('source'); }
  createBuffer(): unknown { return { getChannelData: () => new Float32Array(8) }; }
}

type Audio = typeof import('../../src/game/audio');
let audio: Audio;

async function load(): Promise<Audio> {
  vi.resetModules();
  created = [];
  clock = 1_000;
  const store = new MemoryStorage();
  store.setItem('zhuyin-spire-vol', '1');
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('performance', { now: () => clock });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  audio = await import('../../src/game/audio');
  audio.warmAudio();
  await flush();
  return audio;
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
};
/** Advance both the timers and performance.now(). */
const wait = async (ms: number): Promise<void> => {
  clock += ms;
  await vi.advanceTimersByTimeAsync(ms);
};
const gains = () => created.filter((n) => n.kind === 'gain');
/** masterGain, then the buses in creation order. */
const bus = (name: 'voice' | 'sfx' | 'music' | 'ui') => gains()[1 + ['voice', 'sfx', 'music', 'ui'].indexOf(name)]!;
const shots = () => audio.getMixSnapshot().shots;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await load();
});
afterEach(() => {
  audio.resetMixForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('mix graph', () => {
  it('routes voice, sfx, music and ui buses into master, then a limiter, then the speakers', () => {
    const master = gains()[0]!;
    const lim = created.find((n) => n.kind === 'compressor')!;
    expect(master.connectedTo).toEqual([lim]);
    expect(lim.connectedTo).toEqual([created.find((n) => n.kind === 'destination')]);
    for (const name of ['voice', 'sfx', 'music', 'ui'] as const) {
      expect(bus(name).connectedTo).toEqual([master]);
    }
  });

  it('limiter: threshold −1 dB, ratio 20, attack 3 ms, release 100 ms', () => {
    expect(audio.getMixSnapshot().limiter).toEqual({ threshold: -1, ratio: 20, attack: 0.003, release: 0.1 });
  });
});

describe('ducking', () => {
  it('voice ducks sfx −6 dB and music −12 dB; voice and ui taps stay at full level', () => {
    audio.setVoiceActivity('clip', true);
    const t = audio.getMixSnapshot().busTargets;
    expect(t.sfx).toBeCloseTo(0.5, 2);
    expect(20 * Math.log10(t.music)).toBeCloseTo(-12, 5);
    expect(t.voice).toBe(1);
    expect(t.ui).toBe(1);
  });

  it('ducks with an 80 ms linear ramp and recovers music in 400 ms, sfx in 250 ms', () => {
    audio.setVoiceActivity('clip', true);
    expect(bus('sfx').gain.ramps.at(-1)).toEqual([0.5, 0.08]);
    expect(bus('music').gain.ramps.at(-1)![1]).toBeCloseTo(0.08);
    audio.setVoiceActivity('clip', false);
    expect(bus('sfx').gain.ramps.at(-1)).toEqual([1, 0.25]);
    expect(bus('music').gain.ramps.at(-1)).toEqual([1, 0.4]);
    expect(bus('voice').gain.ramps).toHaveLength(0);
    expect(bus('ui').gain.ramps).toHaveLength(0);
  });

  it('stays ducked while either a clip or Web Speech is speaking', () => {
    audio.setVoiceActivity('clip', true);
    audio.setVoiceActivity('speech', true);
    audio.setVoiceActivity('clip', false);
    expect(audio.getMixSnapshot().busTargets.sfx).toBeCloseTo(0.5, 2);
    audio.setVoiceActivity('speech', false);
    expect(audio.getMixSnapshot().busTargets.sfx).toBe(1);
  });

  it('does not duck when the Voice toggle is off or the game is muted', () => {
    audio.setBusMuted('voice', true);
    audio.setVoiceActivity('clip', true);
    expect(audio.getMixSnapshot().ducking).toBe(false);
    expect(audio.getMixSnapshot().busTargets.sfx).toBe(1);
    expect(audio.getMixSnapshot().busTargets.voice).toBe(0);
    audio.setBusMuted('voice', false);
    expect(audio.getMixSnapshot().busTargets.sfx).toBeCloseTo(0.5, 2);
  });

  it('bus toggles mute their bus; the Sound effects toggle also mutes taps', () => {
    audio.setBusMuted('music', true);
    expect(audio.getMixSnapshot().busTargets.music).toBe(0);
    audio.setBusMuted('sfx', true);
    expect(audio.getMixSnapshot().busTargets).toMatchObject({ sfx: 0, ui: 0, voice: 1 });
    expect(audio.isBusMuted('ui')).toBe(true);
  });
});

describe('one-shots during voice (DUCK_SPEC QA)', () => {
  it('card description + 3 quick taps: taps on the unducked ui bus, ding at once on the ducked sfx bus', () => {
    audio.setVoiceActivity('clip', true); // a card description is not a listening prompt
    audio.sfx.click();
    audio.sfx.cardPlay();
    audio.sfx.spellKey();
    audio.sfx.ding();
    const s = shots();
    expect(s.filter((x) => x.bus === 'ui').map((x) => x.key)).toEqual(['click', 'cardPlay', 'spellKey']);
    expect(s.find((x) => x.key === 'ding')).toMatchObject({ bus: 'sfx', heldMs: 0 });
    expect(audio.getMixSnapshot().busTargets).toMatchObject({ ui: 1, sfx: 0.5 });
  });

  it('taps are never merged, even within 70 ms', () => {
    audio.sfx.click();
    audio.sfx.click();
    audio.sfx.click();
    expect(shots().filter((x) => x.key === 'click')).toHaveLength(3);
  });

  it('math prompt + correct answer inside it: the ding waits until the prompt ends + 150 ms', async () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.ding();
    expect(audio.getMixSnapshot().held).toEqual(['ding']);
    expect(shots()).toHaveLength(0);
    await wait(900);
    expect(shots()).toHaveLength(0);
    audio.setVoiceActivity('clip', false);
    await wait(149);
    expect(shots()).toHaveLength(0);
    await wait(1);
    expect(shots()).toEqual([{ key: 'ding', bus: 'sfx', gain: 0.4, heldMs: 1_050 }]);
    expect(audio.getMixSnapshot().held).toEqual([]);
  });

  it('a prompt chain (frame → word) keeps holding through the gap', async () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.gold();
    audio.setVoiceActivity('clip', false);
    await wait(100);
    audio.setVoiceActivity('speech', true, true); // the word cue starts inside the tail
    await wait(500);
    expect(shots()).toHaveLength(0);
    audio.setVoiceActivity('speech', false);
    await wait(150);
    expect(shots().map((x) => x.key)).toEqual(['gold']);
  });

  it('win is prompt-critical too; non-critical sfx play at once during a prompt', () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.win();
    audio.sfx.hit();
    expect(audio.getMixSnapshot().held).toEqual(['win']);
    expect(shots().map((x) => x.key)).toEqual(['hit']);
  });

  it('never holds a reward longer than 8 s', async () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.ding();
    await wait(7_999);
    expect(shots()).toHaveLength(0);
    await wait(1);
    expect(shots().map((x) => x.key)).toEqual(['ding']);
  });

  it('muting drops held sounds instead of playing them later', async () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.ding();
    audio.setVolume(0);
    audio.setVoiceActivity('clip', false);
    await wait(200);
    expect(shots()).toHaveLength(0);
    audio.setVolume(1);
  });

  it('with the Voice toggle off nothing is held', () => {
    audio.setBusMuted('voice', true);
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.ding();
    expect(shots().map((x) => x.key)).toEqual(['ding']);
  });
});

describe('merging and gain', () => {
  it('3 golds within 50 ms play one gold sound', async () => {
    audio.sfx.gold();
    clock += 20;
    audio.sfx.gold();
    clock += 30;
    audio.sfx.gold();
    await flush();
    expect(shots().filter((x) => x.key === 'gold')).toHaveLength(1);
    expect(created.filter((n) => n.kind === 'source')).toHaveLength(1);
  });

  it('a merged sound plays at the loudest requested level', async () => {
    audio.sfx.gold(0.5);
    audio.sfx.gold(1);
    await flush();
    const src = created.find((n) => n.kind === 'source')!;
    expect(src.connectedTo[0]!.gain.value).toBeCloseTo(0.4);
  });

  it('repeats more than 70 ms apart are separate sounds', () => {
    audio.sfx.ding();
    clock += 71;
    audio.sfx.ding();
    expect(shots().filter((x) => x.key === 'ding')).toHaveLength(2);
  });

  it('different sounds never merge', () => {
    audio.sfx.ding();
    audio.sfx.gold();
    expect(shots().map((x) => x.key)).toEqual(['ding', 'gold']);
  });

  it('ding_A and gold_A play at gain 0.4', async () => {
    expect(audio.MIX.clipBaseGain).toBe(0.4);
    audio.sfx.ding();
    clock += 100;
    audio.sfx.gold();
    await flush();
    const sources = created.filter((n) => n.kind === 'source');
    expect(sources).toHaveLength(2);
    for (const s of sources) expect(s.connectedTo[0]!.gain.value).toBeCloseTo(0.4);
  });

  it('held repeats merge too: two dings during a prompt play once', async () => {
    audio.setVoiceActivity('clip', true, true);
    audio.sfx.ding();
    clock += 30;
    audio.sfx.ding();
    audio.setVoiceActivity('clip', false);
    await wait(150);
    expect(shots().map((x) => x.key)).toEqual(['ding']);
  });
});
