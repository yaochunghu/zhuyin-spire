import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, speakCue, speakCueWithAutoReplay } from '../../src/game/speech';
import { getMixSnapshot } from '../../src/game/audio';

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

describe('speech and the mix', () => {
  it('passes the volume to the utterance, clamped to 0–1', () => {
    speakCue('爸爸', { volume: 0.45 });
    speakCue('貓咪', { volume: 3 });
    expect(spoken.map((u) => u.volume)).toEqual([0.45, 1]);
  });
  it('leaves the default volume alone when none is given', () => {
    speakCue('爸爸');
    expect(spoken[0]!.volume).toBeUndefined();
  });
  it('marks speech as a voice (a prompt by default) until it ends', () => {
    speakCue('爸爸');
    expect(getMixSnapshot()).toMatchObject({ voiceActive: true, promptActive: true });
    spoken[0]!.onend!({} as SpeechSynthesisEvent);
    expect(getMixSnapshot().voiceActive).toBe(false);
  });
  it('a non-prompt line ducks but does not hold rewards', () => {
    speakCue('答對了', { prompt: false });
    expect(getMixSnapshot()).toMatchObject({ voiceActive: true, promptActive: false });
  });
  it('cancel, error and a missing end event all clear the voice', () => {
    speakCue('爸爸');
    cancelSpeech();
    expect(getMixSnapshot().voiceActive).toBe(false);
    speakCue('爸爸');
    spoken[1]!.onerror!({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    expect(getMixSnapshot().voiceActive).toBe(false);
    speakCue('爸爸');
    spoken[2]!.onstart?.({} as SpeechSynthesisEvent);
    vi.advanceTimersByTime(1_500 + 2 * 320 + 1);
    expect(getMixSnapshot().voiceActive).toBe(false);
  });
});
