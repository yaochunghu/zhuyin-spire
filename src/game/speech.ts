/** Web Speech API helpers for cue-word listening (zh-TW). */

/** Bumps on cancel so pending auto-replays abort. */
let speakGen = 0;

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
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export function cancelSpeech(): void {
  speakGen += 1;
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}

export interface SpeakOpts {
  /** Slightly slower for preschool listening (default 0.82) */
  rate?: number;
  onEnd?: () => void;
}

export function speakCue(text: string, opts?: SpeakOpts): void {
  if (!isSpeechAvailable()) {
    opts?.onEnd?.();
    return;
  }
  try {
    // Soft cancel without bumping gen (inner replay uses same gen)
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = opts?.rate ?? 0.82;
    u.pitch = 1.08;
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }
    if (opts?.onEnd) {
      u.onend = () => opts.onEnd?.();
      u.onerror = () => opts.onEnd?.();
    }
    window.speechSynthesis.speak(u);
  } catch {
    opts?.onEnd?.();
  }
}

/**
 * Play cue once, then auto-replay once after a short pause.
 * `cancelSpeech()` aborts the pending replay.
 */
export function speakCueWithAutoReplay(text: string, replayDelayMs = 750): void {
  const gen = speakGen;
  speakCue(text, {
    onEnd: () => {
      if (gen !== speakGen) return;
      window.setTimeout(() => {
        if (gen !== speakGen) return;
        speakCue(text, { rate: 0.78 });
      }, replayDelayMs);
    },
  });
}
