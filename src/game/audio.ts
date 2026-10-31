/**
 * Sound design (Web Audio API) — procedural tones plus two small bundled clips.
 *
 * Layers:
 * - SFX: short one-shots with distinct envelopes. Almost all are synthesised
 *   here; `ding` (星星 gain) and `gold` play small same-origin MP3 clips from
 *   src/assets/audio/sfx/ at gain 0.4 on the sfx bus, and fall back to the same sound
 *   synthesised from its recipe if the file cannot be loaded or decoded.
 *   PLACEHOLDER audio: both clips are procedural, original, and pending final
 *   sound design.
 * - No continuous background music (SFX + speech only)
 * - Speech: Web Speech in speech.ts; recorded voice clips in voice.ts, which
 *   plays through the voice bus via audioOutput()
 *
 * Volume: 0 | 0.45 | 1  (cycle via UI)
 *
 * Mixing (Spire Audio's DUCK_SPEC, AUDIO_DIRECTION §7a):
 * - Graph: voice / sfx / music / ui buses → masterGain (volume) → safety
 *   limiter (DynamicsCompressor) → destination.
 * - While a voice line plays (a clip from voice.ts, or Web Speech from
 *   speech.ts) the sfx bus ducks −6 dB and the music bus −12 dB, with linear
 *   ramps (80 ms down; 250 ms / 400 ms back up once the voice ends). UI taps
 *   use the ui bus, which never ducks. Nothing ducks at volume 0 or with the
 *   voice bus muted.
 * - Reward and outcome sounds (ding, gold, win) that trigger during a listening
 *   prompt wait until it ends and play 150 ms later.
 * - Two or more of the same non-UI sound within MERGE_WINDOW_MS play once, at
 *   the loudest requested level.
 */

const DING_URL = new URL('../assets/audio/sfx/ding_A.mp3', import.meta.url).href;
const GOLD_URL = new URL('../assets/audio/sfx/gold_A.mp3', import.meta.url).href;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;

export type VolLevel = 0 | 0.45 | 1;

/** voice, sfx and music are DUCK_SPEC's buses; ui carries taps, which never duck. */
export type Bus = 'voice' | 'sfx' | 'music' | 'ui';
const BUS_NAMES: readonly Bus[] = ['voice', 'sfx', 'music', 'ui'];
let buses: Record<Bus, GainNode> | null = null;

const dbToGain = (db: number): number => 10 ** (db / 20);

/** DUCK_SPEC numbers in one place (seconds for ramps, linear gain for levels). */
export const MIX = {
  /** sfx bus while a voice plays: −6 dB, about ×0.5. */
  sfxDuck: 0.5,
  /** music bus while a voice plays: −12 dB. */
  musicDuck: dbToGain(-12),
  attack: 0.08,
  sfxRelease: 0.25,
  musicRelease: 0.4,
  /** Bus mute / unmute ramp (never a step change). */
  busMuteRamp: 0.02,
  /** Reward and outcome sounds wait this long after a listening prompt ends. */
  promptTailMs: 150,
  /** Safety net: a held sound never waits longer than this. */
  holdMaxMs: 8_000,
  /** Same sound triggered again within this window plays once. */
  mergeWindowMs: 70,
  /** ding_A and gold_A base gain (QA P2 note 1): about −8 dB. */
  clipBaseGain: 0.4,
  limiter: { threshold: -1, ratio: 20, attack: 0.003, release: 0.1, knee: 0 },
} as const;

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
  applyDuck();
  if (volume === 0) releaseHeld(false);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-volume-change'));
  }
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

// ── buses ───────────────────────────────────────────────────────────────────

/** Per-bus mutes for the §7a Voice / Sound effects / Music toggles (no UI yet). */
const busMuted: Record<Bus, boolean> = { voice: false, sfx: false, music: false, ui: false };

export function setBusMuted(bus: 'voice' | 'sfx' | 'music', muted: boolean): void {
  busMuted[bus] = muted;
  if (bus === 'sfx') busMuted.ui = muted; // taps belong to the Sound effects toggle
  applyDuck();
  if (bus === 'voice' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-volume-change'));
  }
}

export function isBusMuted(bus: Bus): boolean {
  return busMuted[bus];
}

/** Voice lines play nothing (and fall back to nothing) when this is true. */
export function isVoiceMuted(): boolean {
  return volume === 0 || busMuted.voice;
}

function getCtx(): AudioContext {
  if (!ctx) {
    const c = new AudioContext();
    const master = c.createGain();
    let out: AudioNode = c.destination;
    if (typeof c.createDynamicsCompressor === 'function') {
      // Safety limiter on the master (rule 7).
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = MIX.limiter.threshold;
      lim.ratio.value = MIX.limiter.ratio;
      lim.attack.value = MIX.limiter.attack;
      lim.release.value = MIX.limiter.release;
      lim.knee.value = MIX.limiter.knee;
      lim.connect(c.destination);
      limiter = lim;
      out = lim;
    }
    master.connect(out);
    const made = {} as Record<Bus, GainNode>;
    for (const name of BUS_NAMES) {
      const bus = c.createGain();
      bus.gain.value = busTarget(name);
      rampTargets[name] = bus.gain.value;
      bus.connect(master);
      made[name] = bus;
    }
    ctx = c;
    masterGain = master;
    buses = made;
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

/**
 * The running context and the voice bus, for recorded voice clips (voice.ts).
 * Null when muted or when Web Audio is unavailable. Never rejects.
 */
export async function audioOutput(): Promise<{ ctx: AudioContext; dest: AudioNode } | null> {
  const c = await resume();
  if (!c || !buses) return null;
  return { ctx: c, dest: buses.voice };
}

// ── ducking ─────────────────────────────────────────────────────────────────

export type VoiceSource = 'clip' | 'speech';
/** Who is speaking right now, and whether that line is a listening prompt. */
const speaking = new Map<VoiceSource, { prompt: boolean }>();

function duckingEnabled(): boolean {
  return volume !== 0 && !busMuted.voice;
}

function voiceActive(): boolean {
  return speaking.size > 0;
}

function promptActive(): boolean {
  for (const s of speaking.values()) if (s.prompt) return true;
  return false;
}

function busTarget(bus: Bus): number {
  if (busMuted[bus]) return 0;
  const ducked = voiceActive() && duckingEnabled();
  if (!ducked) return 1;
  if (bus === 'sfx') return MIX.sfxDuck;
  if (bus === 'music') return MIX.musicDuck;
  return 1; // voice and ui never duck
}

/** The level each bus was last sent to. */
const rampTargets: Partial<Record<Bus, number>> = {};

/** Linear ramp from wherever the bus is now (rule 5: never a step change). */
function rampBus(bus: Bus): void {
  if (!ctx || !buses) return;
  const param = buses[bus].gain;
  const target = busTarget(bus);
  const now = ctx.currentTime;
  const from = param.value;
  let secs: number = MIX.busMuteRamp;
  if (!busMuted[bus] && rampTargets[bus] !== 0) {
    if (target < from) secs = MIX.attack;
    else secs = bus === 'music' ? MIX.musicRelease : MIX.sfxRelease;
  }
  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);
  param.linearRampToValueAtTime(target, now + secs);
  rampTargets[bus] = target;
}

function applyDuck(): void {
  if (!ctx || !buses) return;
  for (const name of BUS_NAMES) {
    if (rampTargets[name] === busTarget(name)) continue;
    try {
      rampBus(name);
    } catch {
      /* audio must never throw into the UI */
    }
  }
}

/**
 * voice.ts and speech.ts report when a voice line starts and stops. `prompt`
 * marks a listening prompt (a 注音 word or a math question and its frame).
 */
export function setVoiceActivity(source: VoiceSource, active: boolean, prompt = false): void {
  const wasPrompt = promptActive();
  if (active) speaking.set(source, { prompt });
  else speaking.delete(source);
  applyDuck();
  const isPrompt = promptActive();
  if (isPrompt) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  } else if (wasPrompt || held.length) {
    scheduleFlush(MIX.promptTailMs);
  }
}

// ── one-shots: routing, merging, holding ────────────────────────────────────

interface Shot {
  key: string;
  bus: Bus;
  /** Linear gain for this shot (base × level); a merge raises it to the loudest. */
  gain: number;
  at: number;
  node: GainNode | null;
  body: () => void;
}

/** Recent non-UI shots by key, for the merge window. */
const recent = new Map<string, Shot>();
/** Prompt-critical shots waiting for a listening prompt to end. */
const held: Shot[] = [];
let heldSince = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
/** The shot whose body is running, so tone() and friends know where to connect. */
let currentShot: Shot | null = null;

/** Test seam: what played, where, at what gain (most recent last, bounded). */
const shotLog: Array<{ key: string; bus: Bus; gain: number; heldMs: number }> = [];

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function scheduleFlush(ms: number): void {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!held.length) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    if (promptActive() && duckingEnabled() && nowMs() - heldSince < MIX.holdMaxMs) {
      scheduleFlush(Math.max(0, MIX.holdMaxMs - (nowMs() - heldSince)));
      return;
    }
    releaseHeld(true);
  }, ms);
}

function releaseHeld(play: boolean): void {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  const due = held.splice(0);
  if (play) for (const shot of due) fire(shot);
}

function fire(shot: Shot): void {
  if (volume === 0) return;
  shotLog.push({ key: shot.key, bus: shot.bus, gain: shot.gain, heldMs: Math.round(nowMs() - shot.at) });
  if (shotLog.length > 64) shotLog.shift();
  const prev = currentShot;
  currentShot = shot;
  try {
    shot.body();
  } catch {
    /* audio must never throw into the UI */
  } finally {
    currentShot = prev;
  }
}

/** The per-shot GainNode (created on first use) that feeds the shot's bus. */
function shotOut(c: AudioContext, shot: Shot | null): AudioNode | null {
  if (!buses) return null;
  if (!shot) return buses.ui;
  if (!shot.node) {
    const g = c.createGain();
    g.gain.value = shot.gain;
    g.connect(buses[shot.bus]);
    shot.node = g;
  }
  return shot.node;
}

interface SfxOpts {
  bus: 'sfx' | 'ui';
  /** Reward or outcome sound: waits out a listening prompt. */
  critical?: boolean;
  /** Base gain before any duck. */
  base?: number;
}

function trigger(key: string, level: number | undefined, opts: SfxOpts, body: () => void): void {
  if (volume === 0) return;
  const gain = (opts.base ?? 1) * Math.max(0, level ?? 1);
  const at = nowMs();
  if (opts.bus === 'sfx') {
    const last = recent.get(key);
    if (last && at - last.at <= MIX.mergeWindowMs) {
      // Rule 3: one sound at the loudest requested level.
      if (gain > last.gain) {
        last.gain = gain;
        if (last.node && ctx) {
          last.node.gain.cancelScheduledValues(ctx.currentTime);
          last.node.gain.setValueAtTime(gain, ctx.currentTime);
        }
      }
      return;
    }
  }
  const shot: Shot = { key, bus: opts.bus, gain, at, node: null, body };
  if (opts.bus === 'sfx') {
    recent.set(key, shot);
    if (recent.size > 32) recent.delete(recent.keys().next().value!);
  }
  if (opts.critical && promptActive() && duckingEnabled()) {
    if (!held.length) heldSince = at;
    held.push(shot);
    if (!flushTimer) scheduleFlush(MIX.holdMaxMs);
    return;
  }
  fire(shot);
}

/** Test seam: the live mix (bus targets, limiter, held and played sounds). */
export function getMixSnapshot(): {
  voiceActive: boolean;
  promptActive: boolean;
  ducking: boolean;
  buses: Record<Bus, number> | null;
  busTargets: Record<Bus, number>;
  limiter: { threshold: number; ratio: number; attack: number; release: number } | null;
  held: string[];
  shots: Array<{ key: string; bus: Bus; gain: number; heldMs: number }>;
} {
  const targets = {} as Record<Bus, number>;
  for (const name of BUS_NAMES) targets[name] = busTarget(name);
  return {
    voiceActive: voiceActive(),
    promptActive: promptActive(),
    ducking: voiceActive() && duckingEnabled(),
    buses: buses
      ? (Object.fromEntries(BUS_NAMES.map((n) => [n, buses![n].gain.value])) as Record<Bus, number>)
      : null,
    busTargets: targets,
    limiter: limiter
      ? {
          threshold: limiter.threshold.value,
          ratio: limiter.ratio.value,
          attack: limiter.attack.value,
          release: limiter.release.value,
        }
      : null,
    held: held.map((s) => s.key),
    shots: shotLog.map((s) => ({ ...s })),
  };
}

/** Test seam: forget voice activity, held and recent sounds. */
export function resetMixForTests(): void {
  speaking.clear();
  releaseHeld(false);
  recent.clear();
  shotLog.length = 0;
  for (const bus of BUS_NAMES) busMuted[bus] = false;
  applyDuck();
}

type ClipKey = 'ding' | 'gold';

const CLIP_URLS: Record<ClipKey, string> = { ding: DING_URL, gold: GOLD_URL };
/**
 * Resolves to the decoded clip, or null when loading/decoding failed (never
 * rejects). A failed load is forgotten, so a later play tries the file again.
 */
const clipLoads = new Map<ClipKey, Promise<AudioBuffer | null>>();

function loadClip(c: AudioContext, key: ClipKey): Promise<AudioBuffer | null> {
  let load = clipLoads.get(key);
  if (!load) {
    const attempt: Promise<AudioBuffer | null> = (async () => {
      try {
        if (typeof fetch !== 'function') return null;
        const res = await fetch(CLIP_URLS[key]);
        if (!res.ok) return null;
        return (await c.decodeAudioData(await res.arrayBuffer())) ?? null;
      } catch {
        return null;
      }
    })().then((buffer) => {
      if (!buffer && clipLoads.get(key) === attempt) clipLoads.delete(key);
      return buffer;
    });
    load = attempt;
    clipLoads.set(key, load);
  }
  return load;
}

/**
 * A bundled clip at MIX.clipBaseGain on the sfx bus, else its procedural recipe
 * at the same gain. Prompt-critical: it waits out a listening prompt.
 */
function playClip(key: ClipKey, level: number | undefined, fallback: (c: AudioContext, dest: AudioNode) => void): void {
  trigger(key, level, { bus: 'sfx', critical: true, base: MIX.clipBaseGain }, () => {
    const shot = currentShot;
    void resume().then(async (c) => {
      try {
        if (!c) return;
        const buffer = await loadClip(c, key);
        if (volume === 0) return;
        const dest = shotOut(c, shot);
        if (!dest) return;
        if (!buffer) {
          fallback(c, dest);
          return;
        }
        const src = c.createBufferSource();
        src.buffer = buffer;
        src.connect(dest);
        src.start();
      } catch {
        /* audio must never throw into the UI */
      }
    });
  });
}

/** Warm audio on first user gesture */
export function warmAudio(): void {
  void resume().then((c) => {
    if (!c) return;
    void loadClip(c, 'ding');
    void loadClip(c, 'gold');
  });
}

/**
 * PLACEHOLDER procedural fallback for ding_A.mp3 (叮！ star-bead glass bell).
 * Ported from the sfx_ding manifest recipe, variant A; level is for unity gain
 * (playClip applies the same MIX.clipBaseGain as the clip).
 */
function playDingFallback(c: BaseAudioContext, dest: AudioNode): void {
  const t0 = c.currentTime;
  const DUR = 0.42;
  const FADE = 0.03;
  const LEVEL = 0.19953;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6000;
  lp.Q.value = -3.01; // dB → Butterworth
  const out = c.createGain();
  out.gain.setValueAtTime(LEVEL, t0);
  out.gain.setValueAtTime(LEVEL, t0 + DUR - FADE);
  out.gain.linearRampToValueAtTime(0, t0 + DUR);
  lp.connect(out);
  out.connect(dest);
  const partial = (freq: number, amp: number, tau: number): void => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(amp, t0 + 0.0025);
    g.gain.setTargetAtTime(0, t0 + 0.0025, tau);
    o.connect(g);
    g.connect(lp);
    o.start(t0);
    o.stop(t0 + DUR + 0.01);
  };
  partial(1318.51, 1.0, 0.11);
  partial(1318.51 * 2.4, 0.22, 0.035);
}

/**
 * PLACEHOLDER procedural fallback for gold_A.mp3 (warm coin bell, single G5).
 * Ported from the sfx_gold manifest recipe, variant A; level is for unity gain
 * (playClip applies the same MIX.clipBaseGain as the clip).
 */
function playGoldFallback(c: BaseAudioContext, dest: AudioNode): void {
  const t0 = c.currentTime;
  const DUR = 0.45;
  const FADE = 0.03;
  const LEVEL = 0.19724;
  const G5 = 783.99;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5000;
  lp.Q.value = -3.01;
  const hp = c.createBiquadFilter(); // DC guard
  hp.type = 'highpass';
  hp.frequency.value = 60;
  hp.Q.value = -3.01;
  const out = c.createGain();
  out.gain.setValueAtTime(LEVEL, t0);
  out.gain.setValueAtTime(LEVEL, t0 + DUR - FADE);
  out.gain.linearRampToValueAtTime(0, t0 + DUR);
  lp.connect(hp);
  hp.connect(out);
  out.connect(dest);
  const voices = [
    { f: G5, a: 1.0, tau: 0.16 },
    { f: G5 + 4, a: 0.35, tau: 0.16 }, // +4 Hz twin: slow shimmer
    { f: G5 * 2, a: 0.3, tau: 0.07 },
    { f: G5 * 3, a: 0.1, tau: 0.035 },
  ];
  for (const p of voices) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = p.f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(p.a, t0 + 0.0025);
    g.gain.setTargetAtTime(0, t0 + 0.0025, p.tau);
    o.connect(g);
    g.connect(lp);
    o.start(t0);
    o.stop(t0 + DUR + 0.01);
  }
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
  const shot = currentShot;
  void resume().then((c) => {
    const dest = c ? shotOut(c, shot) : null;
    if (!c || !dest) return;
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
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  });
}

/** Filtered noise burst (fizzle / whoosh) */
function noiseBurst(dur: number, gain = 0.05, when = 0): void {
  if (volume === 0) return;
  const shot = currentShot;
  void resume().then((c) => {
    const dest = c ? shotOut(c, shot) : null;
    if (!c || !dest) return;
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
    g.connect(dest);
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

const sfxBodies = {
  click: () => tone({ freq: 720, dur: 0.04, type: 'sine', gain: 0.04 }),

  spellKey: () => tone({ freq: 480 + Math.random() * 80, dur: 0.06, type: 'triangle', gain: 0.05 }),

  castOk: () => {
    tone({ freq: 523.25, dur: 0.09, type: 'sine', gain: 0.07 });
    tone({ freq: 659.25, dur: 0.1, type: 'sine', gain: 0.06, when: 0.07 });
    tone({ freq: 783.99, dur: 0.16, type: 'triangle', gain: 0.07, when: 0.14 });
    tone({ freq: 1046.5, dur: 0.28, type: 'sine', gain: 0.055, when: 0.22 });
    tone({ freq: 1318.5, dur: 0.34, type: 'triangle', gain: 0.035, when: 0.31 });
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

  /** Player weapon meets a monster shield: clang → crack → break are distinct. */
  enemyShieldClang: () => {
    noiseBurst(0.045, 0.035);
    tone({ freq: 1180, dur: 0.09, type: 'triangle', gain: 0.075 });
    tone({ freq: 760, dur: 0.14, type: 'sine', gain: 0.04, when: 0.025, slideTo: 520 });
  },

  enemyShieldCrack: () => {
    noiseBurst(0.07, 0.055);
    tone({ freq: 820, dur: 0.08, type: 'square', gain: 0.045, slideTo: 360 });
    tone({ freq: 1260, dur: 0.07, type: 'triangle', gain: 0.04, when: 0.04, slideTo: 500 });
  },

  enemyShieldBreak: () => {
    noiseBurst(0.14, 0.09);
    tone({ freq: 940, dur: 0.08, type: 'square', gain: 0.06, slideTo: 180 });
    tone({ freq: 1420, dur: 0.11, type: 'triangle', gain: 0.05, when: 0.035, slideTo: 240 });
    tone({ freq: 260, dur: 0.2, type: 'sawtooth', gain: 0.04, when: 0.09, slideTo: 70 });
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

  /** Gold award — PLACEHOLDER clip gold_A (G5 coin bell); no longer the B5→E6 coin motif. */
  gold: (level?: number) => playClip('gold', level, playGoldFallback),

  /** 叮！ the player gained 星星 — PLACEHOLDER clip ding_A (E6 glass bell). One call per gain event. */
  ding: (level?: number) => playClip('ding', level, playDingFallback),

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

type SfxName = keyof typeof sfxBodies;

/** UI taps: never ducked, never merged (DUCK_SPEC table). */
const UI_SFX: ReadonlySet<SfxName> = new Set<SfxName>(['click', 'spellKey', 'cardPlay']);
/** Reward and outcome sounds that wait out a listening prompt (rule 2). */
const CRITICAL_SFX: ReadonlySet<SfxName> = new Set<SfxName>(['win']);

function routed(name: SfxName): (level?: number) => void {
  const body = sfxBodies[name] as (level?: number) => void;
  if (name === 'ding' || name === 'gold') return (level) => body(level); // playClip routes itself
  const bus = UI_SFX.has(name) ? 'ui' : 'sfx';
  const critical = CRITICAL_SFX.has(name);
  return (level) => trigger(name, level, { bus, critical }, () => body());
}

export const sfx = Object.fromEntries(
  (Object.keys(sfxBodies) as SfxName[]).map((name) => [name, routed(name)]),
) as { readonly [K in SfxName]: (level?: number) => void };

export function volumeIcon(): string {
  if (volume === 0) return '🔇';
  if (volume === 0.45) return '🔉';
  return '🔊';
}
