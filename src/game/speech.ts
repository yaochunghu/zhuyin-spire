import { teachingTimers } from '../ui/pauseTimers';
import { setVoiceActivity } from './audio';

/** Web Speech API helpers for cue-word listening (zh-TW). */

/** Bumps on cancel so pending auto-replays abort. */
let speakGen = 0;
let speechRequest = 0;
let speechWatchdog: number | undefined;
/** Recorded voice clips (voice.ts) register here so speech and clips never overlap. */
let interruptHook: (() => void) | null = null;
/** Clears the 'speech' voice activity if no end event ever arrives. */
let activityTimer: ReturnType<typeof setTimeout> | undefined;

/** Web Speech is speaking (or about to): duck the sfx and music buses meanwhile. */
function speechActive(active: boolean, prompt = false, text = ''): void {
  clearTimeout(activityTimer);
  activityTimer = undefined;
  setVoiceActivity('speech', active, prompt);
  if (active) {
    activityTimer = setTimeout(() => setVoiceActivity('speech', false), 1_500 + text.length * 320);
  }
}

export function setSpeechInterruptHook(hook: (() => void) | null): void {
  interruptHook = hook;
}

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Score voices — prefer Taiwan Mandarin, then any zh. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  let s = 0;
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();
  if (lang === 'zh-tw' || lang === 'zh-hant-tw') s += 100;
  else if (lang.startsWith('zh-tw') || lang.includes('taiwan')) s += 90;
  else if (lang === 'zh-hant' || lang.includes('hant')) s += 70;
  else if (lang.startsWith('zh-cn') || lang === 'zh-hans' || lang.startsWith('zh-cmn')) s += 40;
  else if (lang.startsWith('zh')) s += 30;
  else return -1;

  if (name.includes('meijia') || name.includes('mei-jia') || name.includes('美佳')) s += 25;
  if (name.includes('tingting') || name.includes('婷婷')) s += 15;
  if (name.includes('google') && (lang.includes('tw') || name.includes('台灣') || name.includes('台湾')))
    s += 20;
  if (name.includes('enhanced') || name.includes('premium') || name.includes('neural')) s += 10;
  if (name.includes('female') || name.includes('woman') || name.includes('girl')) s += 5;
  if (v.default) s += 2;
  return s;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  return bestScore >= 0 ? best : null;
}

/** Warm up voices list (Chrome loads async). Call on first user gesture. */
export function warmSpeech(): void {
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.getVoices();
  // Voice loading is asynchronous; speakCue checks the actual list each time.
}

export function cancelSpeech(): void {
  interruptHook?.();
  speakGen += 1;
  speechRequest += 1;
  globalThis.clearTimeout(speechWatchdog);
  speechActive(false);
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}

export interface SpeakOpts {
  /** Slightly slower for preschool listening (default 0.82) */
  rate?: number;
  /** 0–1, from the game volume (Web Speech cannot change it mid-utterance). Default 1. */
  volume?: number;
  /**
   * A listening prompt (a 注音 word or math question): reward sounds wait for
   * it to end. Default true; voice.ts passes false for ordinary lines.
   */
  prompt?: boolean;
  onEnd?: () => void;
}

function reportSpeechFallback(text: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-speech-fallback', { detail: { text } }));
  }
}

export function speakCue(text: string, opts?: SpeakOpts): void {
  if (typeof document !== 'undefined' && (document.hidden || teachingTimers.isPaused())) return;
  // A new line always stops a recorded clip, even when this device cannot speak it.
  interruptHook?.();
  if (!isSpeechAvailable()) {
    reportSpeechFallback(text);
    return;
  }
  const request = ++speechRequest;
  try {
    window.clearTimeout(speechWatchdog);
    window.speechSynthesis.cancel();
    speechActive(false);
    const voice = pickVoice();
    // Never silently substitute a non-Mandarin default voice for a lesson.
    if (!voice) {
      reportSpeechFallback(text);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice.lang;
    u.rate = opts?.rate ?? 0.82;
    u.pitch = 1.08;
    if (opts?.volume != null) u.volume = Math.min(1, Math.max(0, opts.volume));
    u.voice = voice;
    const gen = speakGen;
    u.onstart = () => {
      if (request === speechRequest) window.clearTimeout(speechWatchdog);
    };
    u.onend = () => {
      if (request !== speechRequest) return;
      window.clearTimeout(speechWatchdog);
      speechActive(false);
      if (gen === speakGen) opts?.onEnd?.();
    };
    u.onerror = (event) => {
      if (request !== speechRequest) return;
      window.clearTimeout(speechWatchdog);
      speechActive(false);
      if (gen === speakGen && event.error !== 'canceled' && event.error !== 'interrupted') {
        reportSpeechFallback(text);
      }
    };
    speechWatchdog = window.setTimeout(() => {
      if (gen === speakGen && request === speechRequest) {
        speechActive(false);
        reportSpeechFallback(text);
      }
    }, 2_000);
    speechActive(true, opts?.prompt ?? true, text);
    window.speechSynthesis.speak(u);
  } catch {
    reportSpeechFallback(text);
  }
}

/**
 * Play cue once, then auto-replay once after a short pause.
 * `cancelSpeech()` aborts the pending replay.
 */
export function speakCueWithAutoReplay(
  text: string,
  replayDelayMs = 750,
  onReplayEnd?: () => void,
): void {
  const gen = speakGen;
  speakCue(text, {
    onEnd: () => {
      if (gen !== speakGen) return;
      window.setTimeout(() => {
        if (gen !== speakGen) return;
        speakCue(text, { rate: 0.78, ...(onReplayEnd ? { onEnd: onReplayEnd } : {}) });
      }, replayDelayMs);
    },
  });
}
