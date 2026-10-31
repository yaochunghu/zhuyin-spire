import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

interface FakeSource {
  buffer: unknown;
  connectedTo: unknown[];
  onended: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: (to: unknown) => void;
}

interface FakeParam {
  value: number;
  ramps: Array<[number, number]>;
  cancelScheduledValues: () => void;
  setValueAtTime: (v: number) => void;
  setTargetAtTime: () => void;
  linearRampToValueAtTime: (v: number, t: number) => void;
}
interface FakeGain { gain: FakeParam; connectedTo: unknown[]; connect: (to: unknown) => void }

let sources: FakeSource[] = [];
/** Every GainNode: [0] masterGain, [1..4] voice / sfx / music / ui buses, then per-clip gains. */
const gains: FakeGain[] = [];
let master: unknown = null;
const voiceBus = () => gains[1];
let spoken: Array<{ text: string; onend?: () => void }> = [];
const synth = { getVoices: () => [{ lang: 'zh-TW', name: 'Mandarin', default: false }], cancel: vi.fn(), speak: vi.fn() };

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = async (): Promise<void> => {};
  decodeAudioData = async (data: ArrayBuffer): Promise<unknown> => ({ decoded: data.byteLength });
  createGain(): FakeGain {
    const param: FakeParam = {
      value: 1,
      ramps: [],
      cancelScheduledValues: () => {},
      setValueAtTime(v) { this.value = v; },
      setTargetAtTime: () => {},
      linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); this.value = v; },
    };
    const gain: FakeGain = { gain: param, connectedTo: [], connect(to) { this.connectedTo.push(to); } };
    gains.push(gain);
    master ??= gain;
    return gain;
  }
  createBufferSource(): FakeSource {
    const source: FakeSource = {
      buffer: null,
      connectedTo: [],
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
      connect(to) { this.connectedTo.push(to); },
    };
    sources.push(source);
    return source;
  }
}

const doc = { hidden: false };
const events = new EventTarget();
vi.stubGlobal('localStorage', new MemoryStorage());
vi.stubGlobal('AudioContext', FakeAudioContext);
vi.stubGlobal('document', doc);
vi.stubGlobal('window', Object.assign(events, {
  setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id?: number) => globalThis.clearTimeout(id),
  speechSynthesis: synth,
}));
vi.stubGlobal('SpeechSynthesisUtterance', class {
  onend?: () => void;
  volume = 1;
  constructor(public text: string) {}
});

type VoiceModule = typeof import('../../src/game/voice');
let voice: VoiceModule;
let audio: typeof import('../../src/game/audio');
let speech: typeof import('../../src/game/speech');
let timers: typeof import('../../src/ui/pauseTimers');

beforeAll(async () => {
  await import('../../src/game/voiceClips'); // warm the lazy chunk's module graph
  voice = await import('../../src/game/voice');
  audio = await import('../../src/game/audio');
  speech = await import('../../src/game/speech');
  timers = await import('../../src/ui/pauseTimers');
});

const okFetch = vi.fn(async (_url: string) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) }));

beforeEach(() => {
  vi.useFakeTimers();
  sources = [];
  spoken = [];
  doc.hidden = false;
  synth.cancel.mockClear();
  synth.speak.mockImplementation((u: { text: string; onend?: () => void }) => spoken.push(u));
  okFetch.mockClear();
  vi.stubGlobal('fetch', okFetch);
  audio.setVolume(1);
  voice.resetVoiceForTests();
});

afterEach(() => {
  voice.resetVoiceForTests();
  vi.useRealTimers();
});

const settle = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const fetchedUrls = () => okFetch.mock.calls.map(([url]) => String(url));
const endClip = (source: FakeSource) => source.onended?.();

describe('playVoiceLine', () => {
  it('plays a recorded clip through its own gain on the voice bus instead of Web Speech', async () => {
    const onEnd = vi.fn();
    voice.playVoiceLine('zy.listen', { onEnd });
    await settle();
    expect(fetchedUrls()).toHaveLength(1);
    expect(fetchedUrls()[0]).toMatch(/zy\.listen.*\.mp3$/u);
    expect(sources).toHaveLength(1);
    const clipGain = sources[0]!.connectedTo[0] as FakeGain;
    expect(gains.indexOf(clipGain)).toBeGreaterThan(4);
    expect(clipGain.connectedTo).toEqual([voiceBus()]);
    expect(voiceBus()!.connectedTo).toEqual([master]);
    expect(sources[0]!.start).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveLength(0);
    expect(onEnd).not.toHaveBeenCalled();
    endClip(sources[0]!);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back to speakCue with the given text when the key has no clip', async () => {
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零合起來是幾' });
    await settle();
    expect(okFetch).not.toHaveBeenCalled();
    expect(spoken.map((u) => u.text)).toEqual(['十和零合起來是幾']);
  });

  it('falls back to the line text when the clip cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const onEnd = vi.fn();
    voice.playVoiceLine('p.correct', { onEnd });
    await settle();
    expect(sources).toHaveLength(0);
    expect(spoken.map((u) => u.text)).toEqual(['答對了，好棒！']);
    spoken[0]!.onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back when the clip is still loading after the timeout, and never plays it late', async () => {
    let release!: () => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      release = () => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    })));
    voice.playVoiceLine('r.slow');
    await settle(voice.VOICE_LOAD_TIMEOUT_MS + 10);
    expect(spoken.map((u) => u.text)).toEqual(['慢慢來，不用急。']);
    release();
    await settle();
    expect(sources).toHaveLength(0);
  });

  it('stays silent with fallback none, but still continues the chain', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const onEnd = vi.fn();
    voice.playVoiceLine('zy.recognize', { fallback: 'none', onEnd });
    await settle();
    expect(spoken).toHaveLength(0);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('a new line stops the previous clip', async () => {
    voice.playVoiceLine('p.great');
    await settle();
    expect(sources).toHaveLength(1);
    voice.playVoiceLine('p.correct');
    await settle();
    expect(sources[0]!.stop).toHaveBeenCalled();
    expect(sources).toHaveLength(2);
    expect(sources[1]!.start).toHaveBeenCalled();
  });

  it('an older line whose clip loads late never starts over a newer one', async () => {
    const releases: Array<() => void> = [];
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      releases.push(() => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
    })));
    voice.playVoiceLine('r.retry');
    await settle();
    voice.playVoiceLine('r.close');
    await settle();
    releases[1]!();
    await settle();
    releases[0]!();
    await settle();
    expect(sources).toHaveLength(1);
    expect(sources[0]!.start).toHaveBeenCalledTimes(1);
  });

  it('cancelSpeech() and speakCue() stop a playing clip', async () => {
    voice.playVoiceLine('u.map');
    await settle();
    speech.cancelSpeech();
    expect(sources[0]!.stop).toHaveBeenCalled();
    expect(voice.isVoiceBusy()).toBe(false);

    voice.playVoiceLine('u.shop');
    await settle();
    speech.speakCue('蘋果');
    expect(sources[1]!.stop).toHaveBeenCalled();
    expect(spoken.map((u) => u.text)).toEqual(['蘋果']);
  });

  it('a clip cancels in-flight Web Speech', async () => {
    speech.speakCue('蘋果');
    synth.cancel.mockClear();
    voice.playVoiceLine('p.great');
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('queued lines wait for the current one, with a gap', async () => {
    voice.playVoiceLine('n.win.a');
    voice.playVoiceLine('n.wake.stir', { queue: true });
    await settle();
    expect(sources).toHaveLength(1);
    endClip(sources[0]!);
    await settle(100);
    expect(sources).toHaveLength(1);
    await settle(500);
    expect(sources).toHaveLength(2);
    expect(fetchedUrls()[1]).toMatch(/n\.wake\.stir.*\.mp3$/u);
  });

  it('an interrupting line drops queued lines', async () => {
    voice.playVoiceLine('n.win.a');
    voice.playVoiceLine('n.wake.stir', { queue: true });
    await settle();
    voice.playVoiceLine('u.endturn');
    await settle();
    endClip(sources[1]!);
    await settle(1_000);
    expect(sources).toHaveLength(2);
  });

  it('plays nothing when muted, and does not fall back to Web Speech', async () => {
    audio.setVolume(0);
    const onEnd = vi.fn();
    voice.playVoiceLine('p.correct', { onEnd });
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零' });
    await settle();
    expect(okFetch).not.toHaveBeenCalled();
    expect(sources).toHaveLength(0);
    expect(spoken).toHaveLength(0);
    expect(onEnd).toHaveBeenCalledTimes(1); // the chain (e.g. frame → word cue) continues
  });

  it('muting stops a clip that is playing', async () => {
    voice.playVoiceLine('u.camp');
    await settle();
    audio.setVolume(0);
    expect(sources[0]!.stop).toHaveBeenCalled();
  });

  it('starts nothing while the page is hidden or teaching timers are paused', async () => {
    doc.hidden = true;
    const onEnd = vi.fn();
    voice.playVoiceLine('p.correct', { onEnd });
    await settle();
    doc.hidden = false;
    timers.teachingTimers.pause('menu');
    voice.playVoiceLine('p.great', { onEnd });
    await settle();
    timers.teachingTimers.resume('menu');
    expect(okFetch).not.toHaveBeenCalled();
    expect(spoken).toHaveLength(0);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('reuses a decoded clip instead of fetching it again', async () => {
    voice.playVoiceLine('p.great');
    await settle();
    endClip(sources[0]!);
    voice.playVoiceLine('p.great');
    await settle();
    expect(okFetch).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(2);
  });

  it('shares one fetch for every 離開 choice', async () => {
    voice.playVoiceLine('ev.event_a1_whispering_door.c3');
    await settle();
    endClip(sources[0]!);
    voice.playVoiceLine('ev.event_shared_quiet_library.c3');
    await settle();
    expect(okFetch).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(2);
  });

  it('fades a stopped clip out over 30 ms instead of cutting it', async () => {
    voice.playVoiceLine('p.great');
    await settle();
    voice.playVoiceLine('p.correct');
    const clipGain = sources[0]!.connectedTo[0] as FakeGain;
    expect(clipGain.gain.ramps.at(-1)).toEqual([0, voice.VOICE_STOP_FADE_S]);
    expect(sources[0]!.stop).toHaveBeenCalledWith(voice.VOICE_STOP_FADE_S);
    expect(voice.VOICE_STOP_FADE_S).toBe(0.03);
  });

  it('reports the playing clip as voice activity, and prompts as prompts', async () => {
    voice.playVoiceLine('zy.listen', { prompt: true });
    await settle();
    expect(audio.getMixSnapshot()).toMatchObject({ voiceActive: true, promptActive: true });
    endClip(sources[0]!);
    expect(audio.getMixSnapshot().voiceActive).toBe(false);
    voice.playVoiceLine('p.great');
    await settle();
    expect(audio.getMixSnapshot()).toMatchObject({ voiceActive: true, promptActive: false });
  });

  // N1
  it('muting cancels a Web Speech fallback line that is speaking', async () => {
    const onEnd = vi.fn();
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零合起來是幾', onEnd });
    await settle();
    expect(spoken).toHaveLength(1);
    synth.cancel.mockClear();
    audio.setVolume(0);
    expect(synth.cancel).toHaveBeenCalled();
    expect(voice.isVoiceBusy()).toBe(false);
    spoken[0]!.onend?.(); // a late end event from the cancelled utterance
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('muting the voice bus also cancels the fallback line', async () => {
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零合起來是幾' });
    await settle();
    synth.cancel.mockClear();
    audio.setBusMuted('voice', true);
    expect(synth.cancel).toHaveBeenCalled();
    audio.setBusMuted('voice', false);
  });

  it('the Web Speech fallback speaks at the game volume', async () => {
    audio.setVolume(0.45);
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零合起來是幾' });
    await settle();
    expect((spoken[0] as unknown as { volume: number }).volume).toBe(0.45);
  });

  it('volume changes that do not mute leave the fallback line alone', async () => {
    voice.playVoiceLine('m.make10.sum.10_0', { fallbackText: '十和零合起來是幾' });
    await settle();
    synth.cancel.mockClear();
    audio.setVolume(0.45);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  // N2
  it('retries a clip whose load failed on the next play; Web Speech covers the failed one', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (fail) throw new Error('offline');
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    }));
    voice.playVoiceLine('p.correct');
    await settle();
    expect(sources).toHaveLength(0);
    expect(spoken.map((u) => u.text)).toEqual(['答對了，好棒！']);
    spoken[0]!.onend?.();
    fail = false;
    voice.playVoiceLine('p.correct');
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.start).toHaveBeenCalled();
  });

  it('retries after a non-ok response too', async () => {
    let ok = false;
    vi.stubGlobal('fetch', vi.fn(async () => (ok ? { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } : { ok: false })));
    voice.playVoiceLine('p.great');
    await settle();
    expect(sources).toHaveLength(0);
    ok = true;
    voice.playVoiceLine('p.great');
    await settle();
    expect(sources).toHaveLength(1);
  });
});
