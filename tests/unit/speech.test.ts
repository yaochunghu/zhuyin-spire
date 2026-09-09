import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, speakCue, speakCueWithAutoReplay } from '../../src/game/speech';

let spoken: SpeechSynthesisUtterance[];
let fallback: string[];
let voices: Array<{ lang: string; name: string; default: boolean }>;

beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  fallback = [];
  voices = [{ lang: 'zh-TW', name: 'Mandarin', default: false }];
  const events = new EventTarget();
  events.addEventListener('zhuyin-speech-fallback', (event) => fallback.push((event as CustomEvent).detail.text));
  vi.stubGlobal('window', Object.assign(events, {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    speechSynthesis: { getVoices: () => voices, cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u) },
  }));
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
});
afterEach(() => { cancelSpeech(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('speech fallback', () => {
  it('does not substitute an English default voice for a Mandarin lesson', () => {
    voices = [{ lang: 'en-US', name: 'English', default: true }];
    speakCue('爸爸');
    expect(spoken).toHaveLength(0);
    expect(fallback).toEqual(['爸爸']);
  });
  it('reports synthesis failure without starting an automatic replay', () => {
    speakCueWithAutoReplay('爸爸');
    spoken[0]!.onerror!({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    vi.runAllTimers();
    expect(fallback).toEqual(['爸爸']);
    expect(spoken).toHaveLength(1);
  });
  it('cancelled speech cannot replay or report a stale fallback', () => {
    speakCueWithAutoReplay('爸爸');
    cancelSpeech();
    spoken[0]!.onend!({} as SpeechSynthesisEvent);
    vi.runAllTimers();
    expect(spoken).toHaveLength(1);
    expect(fallback).toHaveLength(0);
  });
  it('old callbacks cannot disable a new utterance watchdog', () => {
    speakCue('爸爸');
    speakCue('貓咪');
    spoken[0]!.onend!({} as SpeechSynthesisEvent);
    vi.advanceTimersByTime(2000);
    expect(fallback).toEqual(['貓咪']);
  });
});
