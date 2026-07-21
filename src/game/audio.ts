/**
 * Procedural sound design (Web Audio API) — no asset files.
 *
 * Layers:
 * - SFX: short one-shots with distinct envelopes
 * - No continuous background music (SFX + speech only)
 * - Speech: handled separately in speech.ts
 *
 * Volume: 0 | 0.45 | 1  (cycle via UI)
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

type VolLevel = 0 | 0.45 | 1;

function loadVol(): VolLevel {
  try {
    const v = localStorage.getItem('zhuyin-spire-vol');
    if (v === '0') return 0;
    if (v === '0.45') return 0.45;
    if (v === '1') return 1;
    // migrate old mute flag
    if (localStorage.getItem('zhuyin-spire-mute') === '1') return 0;
  } catch {
    /* ignore */
  }
  return 1;
}

let volume: VolLevel = loadVol();

export function getVolume(): VolLevel {
  return volume;
}

export function isMuted(): boolean {
  return volume === 0;
}

export function setVolume(v: VolLevel): void {
  volume = v;
  try {
    localStorage.setItem('zhuyin-spire-vol', String(v));
  } catch {
    /* ignore */
  }
  applyMaster();
}

/** Cycle 🔊 full → 🔉 half → 🔇 mute → full */
export function cycleVolume(): VolLevel {
  if (volume === 1) setVolume(0.45);
  else if (volume === 0.45) setVolume(0);
  else setVolume(1);
  return volume;
}

export function toggleMute(): boolean {
  setVolume(volume === 0 ? 1 : 0);
  return isMuted();
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    applyMaster();
  }
  return ctx;
}

function applyMaster(): void {
  if (!masterGain || !ctx) return;
  masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
}

async function resume(): Promise<AudioContext | null> {
  if (volume === 0) return null;
  try {
    const c = getCtx();
    if (c.state === 'suspended') await c.resume();
    return c;
  } catch {
    return null;
  }
}

/** Warm audio on first user gesture */
export function warmAudio(): void {
  void resume();
}

interface ToneOpts {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  when?: number;
  slideTo?: number;
}

function tone(opts: ToneOpts): void {
  if (volume === 0) return;
  void resume().then((c) => {
    if (!c || !masterGain) return;
    const t0 = c.currentTime + (opts.when ?? 0);
    const dur = opts.dur ?? 0.12;
    const g0 = (opts.gain ?? 0.08) * 0.9;

    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
    }
    // quick attack, exponential release
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(g0, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  });
}

/** Filtered noise burst (fizzle / whoosh) */
function noiseBurst(dur: number, gain = 0.05, when = 0): void {
  if (volume === 0) return;
  void resume().then((c) => {
    if (!c || !masterGain) return;
    const t0 = c.currentTime + when;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  });
}

function chord(freqs: number[], dur = 0.2, gain = 0.04, type: OscillatorType = 'triangle'): void {
  freqs.forEach((f, i) => tone({ freq: f, dur, type, gain, when: i * 0.02 }));
}

/** Kept as no-ops so call sites stay simple (no BGM). */
export function startMusic(): void {
  /* intentionally empty — continuous pad removed */
}

export function stopMusic(): void {
  /* intentionally empty */
}

export const sfx = {
  click: () => tone({ freq: 720, dur: 0.04, type: 'sine', gain: 0.04 }),

  spellKey: () => tone({ freq: 480 + Math.random() * 80, dur: 0.06, type: 'triangle', gain: 0.05 }),

  castOk: () => {
    tone({ freq: 523.25, dur: 0.09, type: 'sine', gain: 0.07 });
    tone({ freq: 659.25, dur: 0.1, type: 'sine', gain: 0.06, when: 0.07 });
    tone({ freq: 783.99, dur: 0.16, type: 'triangle', gain: 0.07, when: 0.14 });
  },

  fizzle: () => {
    noiseBurst(0.18, 0.06);
    tone({ freq: 220, dur: 0.2, type: 'sawtooth', gain: 0.035, slideTo: 90 });
  },

  /**
   * Hero takes unblocked damage — dull body thump (not the same as landing on a foe).
   */
  hit: () => {
    noiseBurst(0.09, 0.055);
    tone({ freq: 140, dur: 0.12, type: 'square', gain: 0.07, slideTo: 70 });
    tone({ freq: 90, dur: 0.16, type: 'sine', gain: 0.04, when: 0.03, slideTo: 50 });
  },

  heavyHit: () => {
    noiseBurst(0.14, 0.09);
    tone({ freq: 100, dur: 0.16, type: 'square', gain: 0.085, slideTo: 45 });
    tone({ freq: 70, dur: 0.22, type: 'triangle', gain: 0.05, when: 0.05, slideTo: 40 });
  },

  /**
   * Player attack lands on the monster — meaty impact (clear “you hit”).
   */
  enemyHit: () => {
    noiseBurst(0.07, 0.06);
    tone({ freq: 200, dur: 0.08, type: 'square', gain: 0.07, slideTo: 95 });
    tone({ freq: 120, dur: 0.12, type: 'triangle', gain: 0.05, when: 0.03, slideTo: 70 });
    tone({ freq: 280, dur: 0.06, type: 'sine', gain: 0.03, when: 0.05 });
  },

  /** Big attack / multi last hit on monster */
  enemyHitHeavy: () => {
    noiseBurst(0.12, 0.085);
    tone({ freq: 160, dur: 0.1, type: 'square', gain: 0.08, slideTo: 70 });
    tone({ freq: 95, dur: 0.18, type: 'sawtooth', gain: 0.045, when: 0.04, slideTo: 50 });
    tone({ freq: 220, dur: 0.08, type: 'triangle', gain: 0.04, when: 0.08, slideTo: 140 });
  },

  /** Gain block (play a card) — solid shield raise */
  block: () => {
    tone({ freq: 320, dur: 0.06, type: 'triangle', gain: 0.055 });
    tone({ freq: 480, dur: 0.09, type: 'triangle', gain: 0.05, when: 0.04 });
    tone({ freq: 640, dur: 0.1, type: 'sine', gain: 0.035, when: 0.08 });
  },

  /** Attack lands on hero shield — bright metallic clang (unmistakable) */
  shieldHit: () => {
    noiseBurst(0.05, 0.04);
    tone({ freq: 980, dur: 0.06, type: 'triangle', gain: 0.07 });
    tone({ freq: 1480, dur: 0.09, type: 'sine', gain: 0.055, when: 0.015 });
    tone({ freq: 720, dur: 0.12, type: 'triangle', gain: 0.04, when: 0.04, slideTo: 380 });
  },

  /** Shield shatters — crack + debris (must read as “break”) */
  shieldBreak: () => {
    noiseBurst(0.12, 0.09);
    tone({ freq: 600, dur: 0.07, type: 'square', gain: 0.055, slideTo: 160 });
    tone({ freq: 1100, dur: 0.1, type: 'triangle', gain: 0.045, when: 0.03, slideTo: 220 });
    tone({ freq: 280, dur: 0.16, type: 'sawtooth', gain: 0.035, when: 0.07, slideTo: 80 });
    tone({ freq: 900, dur: 0.05, type: 'sine', gain: 0.03, when: 0.1 });
  },

  win: () => {
    chord([523.25, 659.25, 783.99, 1046.5], 0.28, 0.045, 'sine');
  },

  /** Soft monster “poof” — rewarding, not violent */
  monsterPoof: () => {
    noiseBurst(0.14, 0.05);
    tone({ freq: 400, dur: 0.12, type: 'sine', gain: 0.05, slideTo: 700 });
    tone({ freq: 600, dur: 0.1, type: 'triangle', gain: 0.04, when: 0.08, slideTo: 900 });
    tone({ freq: 880, dur: 0.16, type: 'sine', gain: 0.05, when: 0.16 });
  },

  lose: () => {
    tone({ freq: 311, dur: 0.18, type: 'sawtooth', gain: 0.04, slideTo: 180 });
    tone({ freq: 196, dur: 0.28, type: 'sawtooth', gain: 0.04, when: 0.12, slideTo: 110 });
  },

  /** Gentle “faint” — soft, not scary */
  heroFaint: () => {
    tone({ freq: 392, dur: 0.2, type: 'sine', gain: 0.04, slideTo: 260 });
    tone({ freq: 330, dur: 0.25, type: 'triangle', gain: 0.035, when: 0.15, slideTo: 200 });
    tone({ freq: 262, dur: 0.35, type: 'sine', gain: 0.03, when: 0.28, slideTo: 180 });
  },

  listenOpen: () => {
    tone({ freq: 392, dur: 0.08, type: 'sine', gain: 0.05 });
    tone({ freq: 588, dur: 0.12, type: 'sine', gain: 0.05, when: 0.08 });
  },

  heal: () => {
    tone({ freq: 392, dur: 0.1, type: 'sine', gain: 0.05 });
    tone({ freq: 523, dur: 0.12, type: 'sine', gain: 0.05, when: 0.08 });
    tone({ freq: 659, dur: 0.16, type: 'triangle', gain: 0.05, when: 0.16 });
  },

  elite: () => {
    tone({ freq: 150, dur: 0.12, type: 'square', gain: 0.05 });
    tone({ freq: 200, dur: 0.14, type: 'square', gain: 0.05, when: 0.1 });
    noiseBurst(0.1, 0.03, 0.05);
  },

  fork: () => tone({ freq: 494, dur: 0.12, type: 'triangle', gain: 0.05 }),

  gold: () => {
    tone({ freq: 988, dur: 0.06, type: 'sine', gain: 0.045 });
    tone({ freq: 1319, dur: 0.1, type: 'sine', gain: 0.04, when: 0.05 });
  },

  shopBuy: () => {
    tone({ freq: 587, dur: 0.08, type: 'triangle', gain: 0.05 });
    tone({ freq: 784, dur: 0.12, type: 'triangle', gain: 0.05, when: 0.07 });
  },

  shopDeny: () => tone({ freq: 140, dur: 0.14, type: 'square', gain: 0.04 }),

  relic: () => {
    chord([440, 554, 659], 0.22, 0.04, 'sine');
  },

  cardPlay: () => tone({ freq: 340, dur: 0.05, type: 'triangle', gain: 0.04, slideTo: 280 }),

  mapStep: () => tone({ freq: 400, dur: 0.07, type: 'sine', gain: 0.035 }),

  removeCard: () => {
    tone({ freq: 300, dur: 0.1, type: 'sawtooth', gain: 0.03, slideTo: 160 });
    noiseBurst(0.08, 0.03, 0.02);
  },
};

export function volumeIcon(): string {
  if (volume === 0) return '🔇';
  if (volume === 0.45) return '🔉';
  return '🔊';
}
