/**
 * Recorded voice lines: 老師 prompts and feedback, 點燈人 story lines.
 *
 * PLACEHOLDER audio: every clip is ElevenLabs eleven_v4 TTS generated for the
 * first playtest (see src/data/voiceLines.ts and THIRD_PARTY_NOTICES.md).
 *
 * - Loading: the registry chunk (voiceClips.ts) and each MP3 load on first use.
 *   Clips are same-origin assets: fetch → decodeAudioData → AudioBufferSource
 *   → masterGain, like the sfx clips, so the CSP keeps media-src 'none'.
 * - Fallback: a key without a clip, or a clip that cannot load in time, is
 *   spoken by speakCue() with the line text (or `fallbackText`).
 * - One voice at a time: a new line stops the current clip and Web Speech;
 *   cancelSpeech() and speakCue() stop a clip. `queue: true` waits instead.
 * - Settings: muted (volume 0) plays nothing. A hidden page or paused teaching
 *   timers start nothing, exactly like speakCue().
 */
import { teachingTimers } from '../ui/pauseTimers';
import { audioOutput, isMuted } from './audio';
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
let source: AudioBufferSourceNode | null = null;
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
    load = (async () => {
      try {
        if (typeof fetch !== 'function') return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await ctx.decodeAudioData(await res.arrayBuffer())) ?? null;
      } catch {
        return null;
      }
    })();
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
  playing.onended = null;
  try {
    playing.stop();
  } catch {
    /* already stopped */
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
  queue.length = 0;
  clearTimers();
  stopSource();
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
  const mine = ++token;
  if (blocked()) {
    busy = false;
    queue.length = 0;
    return;
  }
  if (isMuted() || !userHasInteracted()) {
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
      if (!out || !buffer || blocked() || isMuted()) {
        if (settle()) {
          clearTimeout(deadline);
          if (blocked() || isMuted()) finishSilently(mine);
          else fallBack(mine, line, opts);
        }
        return;
      }
      if (!settle()) return;
      clearTimeout(deadline);
      const node = out.ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(out.dest);
      node.onended = () => {
        if (source === node) source = null;
        if (mine === token) finish(mine, opts);
      };
      source = node;
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
  // Web Speech gives no end event on some failures; never let the queue stall.
  stallTimer = setTimeout(() => finish(mine, opts), 1_500 + text.length * 320);
  driveSpeech(() => speakCue(text, { onEnd: () => finish(mine, opts) }));
}

function finishSilently(mine: number): void {
  if (mine !== token) return;
  busy = false;
  queue.length = 0;
}

function finish(mine: number, opts: VoiceLineOpts): void {
  if (mine !== token) return;
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
  if (isMuted() || !userHasInteracted()) return;
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
    if (isMuted() && busy) interrupt();
  });
}

/** Test seam: forget decoded clips and queued lines. */
export function resetVoiceForTests(): void {
  interrupt();
  buffers.clear();
  registry = null;
}
