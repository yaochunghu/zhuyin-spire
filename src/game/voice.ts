/**
 * Recorded voice lines: 老師 prompts and feedback, 點燈人 story lines.
 *
 * PLACEHOLDER audio: every clip is ElevenLabs eleven_v4 TTS generated for the
 * first playtest (see src/data/voiceLines.ts and THIRD_PARTY_NOTICES.md).
 *
 * - Loading: the registry chunk (voiceClips.ts) and each MP3 load on first use.
 *   Clips are same-origin assets: fetch → decodeAudioData → AudioBufferSource
 *   → the voice bus, like the sfx clips, so the CSP keeps media-src 'none'.
 *   A failed load is not cached: the next play of that clip tries again.
 * - Fallback: a key without a clip, or a clip that cannot load in time, is
 *   spoken by speakCue() with the line text (or `fallbackText`), at the
 *   current volume.
 * - One voice at a time: a new line stops the current clip (30 ms fade-out)
 *   and Web Speech; cancelSpeech() and speakCue() stop a clip. `queue: true`
 *   waits instead.
 * - Mixing: a playing clip ducks the sfx and music buses (audio.ts); `prompt`
 *   lines also hold reward sounds until they end.
 * - Settings: muted (volume 0) plays nothing, and muting stops the clip or the
 *   Web Speech fallback that is playing. A hidden page or paused teaching
 *   timers start nothing, exactly like speakCue().
 */
import { teachingTimers } from '../ui/pauseTimers';
import { audioOutput, getVolume, isVoiceMuted, setVoiceActivity } from './audio';
import { cancelSpeech, setSpeechInterruptHook, speakCue } from './speech';
import type { ResolvedVoiceLine } from './voiceClips';

export interface VoiceLineOpts {
  /** Web Speech text when the key has no clip. Defaults to the registry text. */
  fallbackText?: string;
  /** 'none' skips Web Speech: the line is silent if its clip cannot play. */
  fallback?: 'speech' | 'none';
  /** Wait for the current line (and earlier queued ones) instead of stopping it. */
  queue?: boolean;
  /** Silence before a queued line starts. */
  gapMs?: number;
  /** Part of a listening prompt (a 注音 or math question): reward sounds wait for it. */
  prompt?: boolean;
  /**
   * The line finished, or was skipped because sound is off. Not called when a
   * newer line, cancelSpeech(), a hidden page or a pause stopped it.
   */
  onEnd?: () => void;
}

/** A clip that is not decoded by then gives way to the fallback. */
export const VOICE_LOAD_TIMEOUT_MS = 2_000;
/** Kid-scale gap between two queued lines (the scripts ask for ≥ 0.4 s). */
const DEFAULT_GAP_MS = 450;
/** A queued line that waited this long belongs to a screen that has moved on. */
const QUEUE_MAX_AGE_MS = 20_000;
const MAX_QUEUE = 4;
/** Decoded clips kept in memory (each is a few seconds of mono PCM). */
const MAX_CACHED_CLIPS = 24;
/** A clip cut short by a newer line fades out over this long (DUCK_SPEC rule 1). */
export const VOICE_STOP_FADE_S = 0.03;

interface Pending {
  key: string;
  opts: VoiceLineOpts;
  at: number;
}

let registry: Promise<typeof import('./voiceClips') | null> | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const queue: Pending[] = [];

/** Bumps whenever a line starts or is stopped, so stale loads never play. */
let token = 0;
let busy = false;
let source: { node: AudioBufferSourceNode; gain: GainNode; ctx: AudioContext } | null = null;
/** True while this module's Web Speech fallback line is speaking. */
let fallbackSpeaking = false;
let gapTimer: ReturnType<typeof setTimeout> | undefined;
let stallTimer: ReturnType<typeof setTimeout> | undefined;
/** True while this module itself drives speech.ts, so its hook ignores us. */
let selfDriven = false;

function loadRegistry(): Promise<typeof import('./voiceClips') | null> {
  registry ??= import('./voiceClips').catch(() => {
    registry = null; // a failed chunk load may succeed on the next line
    return null;
  });
  return registry;
}

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  let load = buffers.get(url);
  if (load) {
    buffers.delete(url); // keep recently used clips at the end
  } else {
    const attempt: Promise<AudioBuffer | null> = (async () => {
      try {
        if (typeof fetch !== 'function') return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await ctx.decodeAudioData(await res.arrayBuffer())) ?? null;
      } catch {
        return null;
      }
    })().then((buffer) => {
      // Never keep a failure: the fallback covers this play, the next one retries.
      if (!buffer && buffers.get(url) === attempt) buffers.delete(url);
      return buffer;
    });
    load = attempt;
  }
  buffers.set(url, load);
  while (buffers.size > MAX_CACHED_CLIPS) buffers.delete(buffers.keys().next().value!);
  return load;
}

function blocked(): boolean {
  return typeof document !== 'undefined' && (document.hidden || teachingTimers.isPaused());
}

/** Before the first tap the game stays silent (and an AudioContext could not start). */
function userHasInteracted(): boolean {
  const activation = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    : undefined;
  return activation ? activation.hasBeenActive : true;
}

function stopSource(): void {
  const playing = source;
  source = null;
  if (!playing) return;
  setVoiceActivity('clip', false);
  playing.node.onended = null;
  try {
    const now = playing.ctx.currentTime;
    const g = playing.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + VOICE_STOP_FADE_S);
    playing.node.stop(now + VOICE_STOP_FADE_S);
  } catch {
    try {
      playing.node.stop();
    } catch {
      /* already stopped */
    }
  }
}

function clearTimers(): void {
  clearTimeout(gapTimer);
  clearTimeout(stallTimer);
  gapTimer = undefined;
  stallTimer = undefined;
}

/** Stop the clip, drop queued lines, and invalidate anything still loading. */
function interrupt(): void {
  token += 1;
  busy = false;
  fallbackSpeaking = false;
  queue.length = 0;
  clearTimers();
  stopSource();
}

/** interrupt(), and also silence this module's Web Speech fallback line. */
function interruptWithSpeech(): void {
  const speaking = fallbackSpeaking;
  interrupt();
  if (speaking) driveSpeech(() => cancelSpeech());
}

setSpeechInterruptHook(() => {
  if (!selfDriven) interrupt();
});

function driveSpeech(run: () => void): void {
  selfDriven = true;
  try {
    run();
  } finally {
    selfDriven = false;
  }
}

/** Stop any voice line, queued line and Web Speech. Same as cancelSpeech(). */
export function stopVoice(): void {
  cancelSpeech();
}

export function isVoiceBusy(): boolean {
  return busy;
}

export function playVoiceLine(key: string, opts: VoiceLineOpts = {}): void {
  if (opts.queue && busy) {
    if (queue.length < MAX_QUEUE) queue.push({ key, opts, at: Date.now() });
    return;
  }
  // Starting fresh drops lines queued for the screen we are leaving.
  if (!opts.queue) queue.length = 0;
  begin(key, opts);
}

function begin(key: string, opts: VoiceLineOpts): void {
  clearTimers();
  stopSource();
  driveSpeech(() => cancelSpeech());
  fallbackSpeaking = false;
  const mine = ++token;
  if (blocked()) {
    busy = false;
    queue.length = 0;
    return;
  }
  if (isVoiceMuted() || !userHasInteracted()) {
    busy = false;
    queue.length = 0;
    opts.onEnd?.();
    return;
  }
  busy = true;

  let settled = false;
  let line: ResolvedVoiceLine | null = null;
  const settle = (): boolean => {
    if (settled || mine !== token) return false;
    settled = true;
    return true;
  };
  const deadline = setTimeout(() => {
    if (settle()) fallBack(mine, line, opts);
  }, VOICE_LOAD_TIMEOUT_MS);

  void (async () => {
    try {
      line = (await loadRegistry())?.resolveVoiceLine(key) ?? null;
      const out = line?.url ? await audioOutput() : null;
      const buffer = out && line?.url ? await loadBuffer(out.ctx, line.url) : null;
      if (mine !== token || settled) return;
      if (!out || !buffer || blocked() || isVoiceMuted()) {
        if (settle()) {
          clearTimeout(deadline);
          if (blocked() || isVoiceMuted()) finishSilently(mine);
          else fallBack(mine, line, opts);
        }
        return;
      }
      if (!settle()) return;
      clearTimeout(deadline);
      const node = out.ctx.createBufferSource();
      const gain = out.ctx.createGain(); // per-clip gain, for the 30 ms stop fade
      node.buffer = buffer;
      node.connect(gain);
      gain.connect(out.dest);
      const playing = { node, gain, ctx: out.ctx };
      node.onended = () => {
        if (source === playing) {
          source = null;
          setVoiceActivity('clip', false);
        }
        if (mine === token) finish(mine, opts);
      };
      source = playing;
      setVoiceActivity('clip', true, !!opts.prompt);
      node.start();
    } catch {
      if (settle()) {
        clearTimeout(deadline);
        fallBack(mine, line, opts);
      }
    }
  })();
}

function fallBack(mine: number, line: ResolvedVoiceLine | null, opts: VoiceLineOpts): void {
  const text = opts.fallbackText ?? line?.text ?? '';
  if (opts.fallback === 'none' || !text) {
    finish(mine, opts);
    return;
  }
  if (isVoiceMuted()) {
    finishSilently(mine);
    return;
  }
  // Web Speech gives no end event on some failures; never let the queue stall.
  stallTimer = setTimeout(() => finish(mine, opts), 1_500 + text.length * 320);
  fallbackSpeaking = true;
  driveSpeech(() =>
    speakCue(text, {
      volume: getVolume(),
      prompt: !!opts.prompt,
      onEnd: () => finish(mine, opts),
    }),
  );
}

function finishSilently(mine: number): void {
  if (mine !== token) return;
  busy = false;
  queue.length = 0;
}

function finish(mine: number, opts: VoiceLineOpts): void {
  if (mine !== token) return;
  fallbackSpeaking = false;
  token += 1; // late end events from this line are now stale
  clearTimers();
  busy = false;
  opts.onEnd?.();
  if (busy) return; // onEnd started the next line itself
  advanceQueue();
}

function advanceQueue(): void {
  const now = Date.now();
  while (queue.length && now - queue[0]!.at > QUEUE_MAX_AGE_MS) queue.shift();
  const next = queue.shift();
  if (!next) return;
  busy = true;
  const mine = token;
  gapTimer = setTimeout(() => {
    if (mine !== token) return;
    begin(next.key, next.opts);
  }, next.opts.gapMs ?? DEFAULT_GAP_MS);
}

/**
 * Load the registry and decode a few upcoming clips without playing them.
 * Call from a user gesture (it may create the AudioContext).
 */
export function prefetchVoiceLines(keys: readonly string[]): void {
  if (isVoiceMuted() || !userHasInteracted()) return;
  void (async () => {
    const reg = await loadRegistry();
    if (!reg || keys.length === 0) return;
    const out = await audioOutput();
    if (!out) return;
    for (const key of keys) {
      const url = reg.resolveVoiceLine(key)?.url;
      if (url) void loadBuffer(out.ctx, url);
    }
  })();
}

/** Warm the registry chunk on the first tap so the first line starts quickly. */
export function warmVoice(): void {
  void loadRegistry();
}

if (typeof window !== 'undefined') {
  window.addEventListener('zhuyin-volume-change', () => {
    // Muting silences the clip and any Web Speech fallback line mid-sentence.
    if (isVoiceMuted() && (busy || fallbackSpeaking)) interruptWithSpeech();
  });
}

/** Test seam: forget decoded clips and queued lines. */
export function resetVoiceForTests(): void {
  interrupt();
  setVoiceActivity('clip', false);
  buffers.clear();
  registry = null;
}
