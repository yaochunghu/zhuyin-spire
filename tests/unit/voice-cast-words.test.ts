import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Played {
  key: string;
  queue: boolean;
  prompt: boolean;
  slowReplay?: boolean;
  gapMs?: number;
  fallbackText?: string;
  onEnd?: () => void;
}
const played: Played[] = [];
vi.mock('../../src/game/voice', () => ({
  playVoiceLine: (key: string, opts: Omit<Played, 'key' | 'queue' | 'prompt'> & { queue?: boolean; prompt?: boolean } = {}) => {
    played.push({ ...opts, key, queue: !!opts.queue, prompt: !!opts.prompt });
  },
  prefetchVoiceLines: () => {},
  stopVoice: () => {},
  warmVoice: () => {},
}));

const speakCue = vi.fn();
const speakCueWithAutoReplay = vi.fn();
vi.mock('../../src/game/speech', () => ({
  speakCue: (...args: unknown[]) => speakCue(...args),
  speakCueWithAutoReplay: (...args: unknown[]) => speakCueWithAutoReplay(...args),
}));

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
vi.stubGlobal('localStorage', new MemoryStorage());

const director = await import('../../src/ui/voiceDirector');
const { phraseClipKey } = await import('../../src/game/phraseClipLookup');
const { PHRASE_CLIPS } = await import('../../src/data/phraseClips');
const { PHRASES_BY_INITIAL } = await import('../../src/data/phrases');
const { createNewRun } = await import('../../src/game/state');

type Prompt = Parameters<typeof director.voiceCastOpen>[1];

function prompt(word: string, spell: string, mode: 'listen' | 'listenHard' | 'recognize', gateId = 'zhuyin'): Prompt {
  return {
    gateId, mode, lessonFamilyId: 'initial:ㄇ@1', retry: false, correctSpell: spell,
    cue: { text: word, word, emoji: '', speechText: word, spell },
  } as unknown as Prompt;
}

const state = createNewRun();
const keys = () => played.map((line) => line.key);
/** The frame line ends: its onEnd plays the word. */
const endLine = (key: string) => played.find((line) => line.key === key)!.onEnd!();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', new MemoryStorage());
  played.length = 0;
  speakCue.mockClear();
  speakCueWithAutoReplay.mockClear();
  director.resetVoiceDirectorForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('phrase clip lookup', () => {
  it('finds every clipped pool entry by its word and spell', () => {
    for (const [key, [initial, word]] of Object.entries(PHRASE_CLIPS)) {
      const entry = PHRASES_BY_INITIAL[initial]!.find((phrase) => phrase.word === word)!;
      expect(phraseClipKey(entry.word, entry.spell), key).toBe(key);
    }
  });

  it('has no clip for a word with another reading or a word that was not recorded', () => {
    expect(phraseClipKey('貓', 'ㄇㄠ')).toBe('w.animals.065');
    expect(phraseClipKey('貓', 'ㄇㄠˊ')).toBeNull();
    expect(phraseClipKey('大', 'ㄉㄚˋ')).toBeNull();
    expect(phraseClipKey('', '')).toBeNull();
  });
});

describe('cast word clips', () => {
  it('listen: the frame at 220 ms, then the word clip, then its replay queued 750 ms behind it', () => {
    director.voiceCastOpen(state, prompt('貓', 'ㄇㄠ', 'listen'));
    vi.advanceTimersByTime(219);
    expect(played).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(keys()).toEqual(['zy.listen']);
    endLine('zy.listen');
    expect(keys()).toEqual(['zy.listen', 'w.animals.065', 'w.animals.065']);
    const [, first, replay] = played;
    expect(first).toMatchObject({ queue: false, prompt: true, fallbackText: '貓' });
    expect(replay).toMatchObject({ queue: true, prompt: true, fallbackText: '貓', gapMs: 750 });
    expect(first?.slowReplay).toBeUndefined();
    expect(replay?.slowReplay).toBeUndefined();
    // First listen cast: the speaker tip follows the replay.
    replay!.onEnd!();
    expect(keys().at(-1)).toBe('zy.speaker');
    expect(speakCue).not.toHaveBeenCalled();
    expect(speakCueWithAutoReplay).not.toHaveBeenCalled();
  });

  it('listenHard uses its own frame before the clip', () => {
    director.voiceCastOpen(state, prompt('馬', 'ㄇㄚˇ', 'listenHard'));
    vi.advanceTimersByTime(220);
    endLine('zy.listenHard');
    expect(keys()).toEqual(['zy.listenHard', 'w.animals.057', 'w.animals.057']);
  });

  it('recognize: the frame at 150 ms, then the word clip once', () => {
    director.voiceCastOpen(state, prompt('貓', 'ㄇㄠ', 'recognize'));
    vi.advanceTimersByTime(149);
    expect(played).toEqual([]);
    vi.advanceTimersByTime(1);
    endLine('zy.recognize');
    expect(keys()).toEqual(['zy.recognize', 'w.animals.065']);
    expect(played[1]).toMatchObject({ queue: false, prompt: true });
  });

  it('🔊 再聽 and resume play the clip once after 再聽一次', () => {
    director.voiceReplayCue(prompt('貓', 'ㄇㄠ', 'listen'));
    expect(keys()).toEqual(['zy.again']);
    expect(played[0]?.slowReplay).toBeUndefined();
    endLine('zy.again');
    expect(played[1]?.slowReplay).toBe(true);
    director.voiceCueAgain(prompt('貓', 'ㄇㄠ', 'listen'));
    expect(keys()).toEqual(['zy.again', 'w.animals.065', 'w.animals.065']);
    expect(played[2]?.slowReplay).toBeUndefined();
    expect(speakCue).not.toHaveBeenCalled();
  });

  it('a word without a clip keeps its Web Speech read', () => {
    director.voiceCastOpen(state, prompt('大', 'ㄉㄚˋ', 'listen'));
    vi.advanceTimersByTime(220);
    endLine('zy.listen');
    expect(keys()).toEqual(['zy.listen']);
    expect(speakCueWithAutoReplay).toHaveBeenCalledWith('大', 750, expect.any(Function));

    played.length = 0;
    director.voiceCastOpen(state, prompt('大', 'ㄉㄚˋ', 'recognize'));
    vi.advanceTimersByTime(150);
    endLine('zy.recognize');
    director.voiceReplayCue(prompt('大', 'ㄉㄚˋ', 'recognize'));
    endLine('zy.again');
    expect(keys()).toEqual(['zy.recognize', 'zy.again']);
    expect(speakCue.mock.calls.map((call) => call[0])).toEqual(['大', '大']);
  });

  it('never looks up a clip for a math question', () => {
    expect(director.cueWordVoiceKey(prompt('貓', 'ㄇㄠ', 'recognize', 'math'))).toBeNull();
  });
});
