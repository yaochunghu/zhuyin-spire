import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { combatRulesForGate, createCombat, addBeads } from '../../src/game/combat';
import { takePendingFx } from '../../src/game/battle';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

interface Node {
  kind: string;
  opts: Record<string, unknown>;
  connectedTo: Node[];
  connect: (n: Node) => Node;
  frequency: { value: number; setValueAtTime: () => void };
  gain: {
    value: number;
    setValueAtTime: () => void;
    linearRampToValueAtTime: () => void;
    setTargetAtTime: () => void;
    cancelScheduledValues: () => void;
  };
  Q: { value: number };
  type?: string;
  buffer?: unknown;
  start: () => void;
  stop: () => void;
}

let created: Node[] = [];
let decode: () => Promise<unknown>;
let master: Node | null = null;
/** performance.now() for the merge window; tests advance it by hand. */
let clock = 0;

function makeNode(kind: string): Node {
  const n: Node = {
    kind,
    opts: {},
    connectedTo: [],
    connect(to) { this.connectedTo.push(to); return to; },
    frequency: { value: 0, setValueAtTime: () => {} },
    gain: {
      value: 1,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      setTargetAtTime: () => {},
      cancelScheduledValues: () => {},
    },
    Q: { value: 0 },
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
  decodeAudioData = (): Promise<unknown> => decode();
  createGain(): Node {
    const n = makeNode('gain');
    if (!master) master = n; // first gain is masterGain
    return n;
  }
  createOscillator(): Node { return makeNode('osc'); }
  createBiquadFilter(): Node { return makeNode('biquad'); }
  createBufferSource(): Node { return makeNode('source'); }
  createBuffer(): unknown { return { getChannelData: () => new Float32Array(8) }; }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

async function loadAudio(vol: string | null, fetchImpl: () => Promise<unknown>) {
  vi.resetModules();
  created = [];
  master = null;
  const store = new MemoryStorage();
  if (vol !== null) store.setItem('zhuyin-spire-vol', vol);
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  clock = 1_000;
  vi.stubGlobal('performance', { now: () => clock });
  return import('../../src/game/audio');
}

const okFetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const freqs = () => created.filter((n) => n.kind === 'osc').map((n) => n.frequency.value);

beforeEach(() => {
  decode = async () => ({ fake: 'buffer' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bundled sfx clips', () => {
  it('plays nothing at volume 0 (no context, no fetch)', async () => {
    const { sfx } = await loadAudio('0', okFetch);
    sfx.ding();
    sfx.gold();
    await flush();
    expect(created).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('plays the decoded clip at gain 0.4 through the sfx bus', async () => {
    const { sfx } = await loadAudio('1', okFetch);
    sfx.ding();
    await flush();
    const url = String((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toMatch(/ding_A.*\.mp3$/u);
    const src = created.find((n) => n.kind === 'source')!;
    expect(src.buffer).toEqual({ fake: 'buffer' });
    const gains = created.filter((n) => n.kind === 'gain');
    // masterGain, then the voice / sfx / music / ui buses, then this shot's gain.
    expect(gains).toHaveLength(6);
    const [, , sfxBus] = gains;
    const shotGain = src.connectedTo[0]!;
    expect(shotGain).toBe(gains[5]);
    expect(shotGain.gain.value).toBeCloseTo(0.4);
    expect(shotGain.connectedTo).toEqual([sfxBus]);
    expect(sfxBus!.connectedTo).toEqual([master]);
    expect(src.start).toHaveBeenCalledTimes(1);
    expect(created.filter((n) => n.kind === 'osc')).toHaveLength(0);
  });

  it('loads the gold clip from gold_A and reuses the decoded buffer', async () => {
    const { sfx } = await loadAudio('0.45', okFetch);
    sfx.gold();
    await flush();
    clock += 500; // outside the 70 ms merge window
    sfx.gold();
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0])).toMatch(/gold_A.*\.mp3$/u);
    expect(created.filter((n) => n.kind === 'source')).toHaveLength(2);
  });

  it('falls back to the ding recipe (E6 + 2.4x partial) when the fetch fails', async () => {
    const { sfx } = await loadAudio('1', async () => { throw new Error('offline'); });
    sfx.ding();
    await flush();
    expect(created.filter((n) => n.kind === 'source')).toHaveLength(0);
    expect(freqs()).toEqual([1318.51, 1318.51 * 2.4]);
    const lp = created.find((n) => n.kind === 'biquad')!;
    expect(lp.type).toBe('lowpass');
    expect(lp.frequency.value).toBe(6000);
  });

  it('falls back to the gold recipe (G5, 60 Hz highpass) when decoding fails', async () => {
    decode = async () => { throw new Error('bad data'); };
    const { sfx } = await loadAudio('1', okFetch);
    sfx.gold();
    await flush();
    const f = freqs();
    expect(f).toHaveLength(4);
    expect(f[0]).toBeCloseTo(783.99);
    expect(f).not.toContain(988);
    expect(f).not.toContain(1319);
    const hp = created.find((n) => n.kind === 'biquad' && n.type === 'highpass')!;
    expect(hp.frequency.value).toBe(60);
  });

  it('falls back on a non-ok response and never throws without AudioContext', async () => {
    const a = await loadAudio('1', async () => ({ ok: false }));
    a.sfx.ding();
    await flush();
    expect(freqs()).toHaveLength(2);

    vi.resetModules();
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('AudioContext', undefined);
    const b = await import('../../src/game/audio');
    expect(() => { b.sfx.ding(); b.sfx.gold(); b.warmAudio(); }).not.toThrow();
    await flush();
  });

  it('retries a clip whose load failed, while the recipe covers the failed play', async () => {
    let fail = true;
    const { sfx } = await loadAudio('1', async () => {
      if (fail) throw new Error('offline');
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    });
    sfx.ding();
    await flush();
    expect(freqs()).toHaveLength(2); // the recipe played
    fail = false;
    clock += 500;
    sfx.ding();
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(created.filter((n) => n.kind === 'source')).toHaveLength(1);
  });

  it('sfx.gold no longer plays the 988/1319 Hz coin motif', async () => {
    const { sfx } = await loadAudio('1', async () => { throw new Error('offline'); });
    sfx.gold();
    await flush();
    expect(freqs().some((f) => Math.round(f) === 988 || Math.round(f) === 1319)).toBe(false);
  });

  it('warmAudio preloads both clips', async () => {
    const { warmAudio } = await loadAudio('1', okFetch);
    warmAudio();
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('bead gain triggers one ding per event', () => {
  it('addBeads queues exactly one playerBeads fx per call, even for +2', () => {
    const c = createCombat(['bo'], 'slime', 40, 40, [], undefined, combatRulesForGate('math'));
    takePendingFx(c);
    addBeads(c, 2);
    expect(takePendingFx(c).filter((f) => f.type === 'playerBeads')).toEqual([
      { type: 'playerBeads', amount: 2, value: 2 },
    ]);
    addBeads(c, 1);
    addBeads(c, 1);
    expect(takePendingFx(c).filter((f) => f.type === 'playerBeads')).toHaveLength(2);
  });

  it('queues nothing when beads are disabled or amount is 0', () => {
    const plain = createCombat(['bo'], 'slime', 40, 40);
    takePendingFx(plain);
    addBeads(plain, 2);
    expect(takePendingFx(plain).some((f) => f.type === 'playerBeads')).toBe(false);
    const math = createCombat(['bo'], 'slime', 40, 40, [], undefined, combatRulesForGate('math'));
    takePendingFx(math);
    addBeads(math, 0);
    expect(takePendingFx(math).some((f) => f.type === 'playerBeads')).toBe(false);
  });

  it('the FX layer plays sfx.ding once for a +2 playerBeads event', async () => {
    vi.resetModules();
    const ding = vi.fn();
    vi.doMock('../../src/game/audio', () => ({ sfx: new Proxy({ ding }, { get: (t, k) => (t as never)[k] ?? vi.fn() }) }));
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('window', { setTimeout: (fn: () => void) => { fn(); return 0; } });
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => ({ style: {}, classList: { add() {} }, remove() {} }),
      body: { appendChild() {} },
    });
    const { playCombatFxBatch } = await import('../../src/ui/cardFx');
    await playCombatFxBatch([{ type: 'playerBeads', amount: 2, value: 2 }], null, () => '');
    expect(ding).toHaveBeenCalledTimes(1);
    vi.doUnmock('../../src/game/audio');
  });
});
