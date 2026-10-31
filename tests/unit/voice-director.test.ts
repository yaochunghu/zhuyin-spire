import { beforeEach, describe, expect, it, vi } from 'vitest';

const played: Array<{ key: string; queue: boolean }> = [];
const stopVoice = vi.fn();
vi.mock('../../src/game/voice', () => ({
  playVoiceLine: (key: string, opts: { queue?: boolean; onEnd?: () => void } = {}) => {
    played.push({ key, queue: !!opts.queue });
  },
  prefetchVoiceLines: () => {},
  stopVoice: () => stopVoice(),
  warmVoice: () => {},
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

const doc = Object.assign(new EventTarget(), { hidden: false });
vi.stubGlobal('document', doc);
vi.stubGlobal('localStorage', new MemoryStorage());

const director = await import('../../src/ui/voiceDirector');
const { createNewRun } = await import('../../src/game/state');
const { getVoiceMemory } = await import('../../src/game/profiles');
type RunState = ReturnType<typeof createNewRun>;

const keys = () => played.map((line) => line.key);

function runFor(characterId: string): RunState {
  const state = createNewRun();
  state.characterId = characterId;
  state.castSeed = Math.floor(Math.random() * 1e9);
  return state;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  played.length = 0;
  stopVoice.mockClear();
  director.resetVoiceDirectorForTests();
});

describe('voice director', () => {
  it('reads each 老師 button the first time per session only (Q61)', () => {
    director.voiceButton('u.endturn');
    director.voiceButton('u.endturn');
    director.voiceButton('u.back');
    expect(keys()).toEqual(['u.endturn', 'u.back']);
    expect(played.every((line) => !line.queue)).toBe(true);
  });

  it('plays the prologue once per learner, then 你想陪誰爬塔, and any tap skips it', () => {
    const state = runFor('echoMage');
    director.voiceAfterRender(state, 'relicPick');
    expect(keys()).toEqual(['n.pro.1', 'n.pro.2', 'n.pro.3', 'u.hero']);
    expect(getVoiceMemory().prologueHeard).toBe(true);
    doc.dispatchEvent(new Event('pointerdown'));
    expect(stopVoice).toHaveBeenCalledTimes(1);

    played.length = 0;
    director.resetVoiceDirectorForTests();
    director.voiceAfterRender(state, 'title');
    director.voiceAfterRender(state, 'relicPick');
    expect(keys()).toEqual(['u.hero']);
  });

  it('starts a run with the hero line and the act entry, and alternates with n.start.again later', () => {
    const state = runFor('abacusFist');
    director.voiceAfterRender(state, 'relicPick');
    played.length = 0;
    director.voiceAfterRender(state, 'map');
    expect(keys()[0]).toBe('n.hero.ry');
    expect(['n.act1.a', 'n.act1.b']).toContain(keys()[1]);
    expect(getVoiceMemory().runsStarted).toBe(1);

    const starts: string[] = [];
    for (let run = 0; run < 4; run += 1) {
      const next = runFor('abacusFist');
      played.length = 0;
      director.voiceAfterRender(next, 'relicPick');
      director.voiceAfterRender(next, 'map');
      starts.push(keys().find((key) => key === 'n.hero.ry' || key === 'n.start.again')!);
    }
    expect(new Set(starts)).toEqual(new Set(['n.hero.ry', 'n.start.again']));
    for (let i = 1; i < starts.length; i += 1) expect(starts[i]).not.toBe(starts[i - 1]);
  });

  it('wakes a sleeper the first time a hero clears an act, then lights lamps after', () => {
    const state = runFor('echoMage');
    state.lastClearedAct = 1;
    director.voiceAfterRender(state, 'actClear');
    expect(keys()).toEqual(['u.heal', 'n.wake.1']);
    expect(getVoiceMemory().actClears.echoMage).toEqual([1]);

    played.length = 0;
    director.voiceAfterRender(state, 'map');
    director.voiceAfterRender(state, 'actClear');
    expect(keys().filter((key) => key.startsWith('n.clear') || key.startsWith('n.wake'))).toHaveLength(1);
    expect(keys().some((key) => key.startsWith('n.clear.'))).toBe(true);

    // Another hero still gets the first-clear line.
    played.length = 0;
    const other = runFor('abacusFist');
    other.lastClearedAct = 1;
    director.voiceAfterRender(other, 'map');
    director.voiceAfterRender(other, 'actClear');
    expect(keys()).toContain('n.wake.1');
  });

  it('ends a won run with n.wake.3 the first time, n.wake.more after, then n.thanks', () => {
    const state = runFor('echoMage');
    director.voiceAfterRender(state, 'victory');
    expect(keys()).toEqual(['n.wake.3', 'n.thanks']);
    played.length = 0;
    director.voiceAfterRender(state, 'title');
    director.voiceAfterRender(state, 'victory');
    expect(keys()).toEqual(['n.wake.more', 'n.thanks']);
    expect(getVoiceMemory().runWins.echoMage).toBe(2);
  });

  it('speaks on at most one in three map picks, never on two picks in a row', () => {
    const state = runFor('echoMage');
    const node = { kind: 'fight' } as Parameters<typeof director.voiceMapPick>[1];
    const withLine: boolean[] = [];
    for (let pick = 0; pick < 9; pick += 1) {
      const before = played.length;
      director.voiceMapPick(state, node);
      withLine.push(played.length > before);
    }
    expect(withLine.filter(Boolean)).toHaveLength(3);
    for (let i = 1; i < withLine.length; i += 1) expect(withLine[i] && withLine[i - 1]).toBe(false);
    const lines = keys();
    for (let i = 1; i < lines.length; i += 1) expect(lines[i]).not.toBe(lines[i - 1]);
  });

  it('rotates praise so the same take never plays twice in a row', () => {
    const state = runFor('echoMage');
    const prompt = {
      gateId: 'zhuyin', mode: 'recognize', lessonFamilyId: 'x@1', retry: false, correctSpell: 'ㄇㄚ',
      cue: { text: '', speechText: '' },
    } as unknown as Parameters<typeof director.voiceCastAnswered>[1];
    for (let i = 0; i < 12; i += 1) director.voiceCastAnswered(state, prompt, 'correct', 'combat');
    const lines = keys();
    expect(lines).toContain('p.streak');
    expect(lines).toContain('p.zy.spell');
    for (let i = 1; i < lines.length; i += 1) expect(lines[i]).not.toBe(lines[i - 1]);
  });

  it('shows a math answer with its whole clip, and keeps 注音 misses gentle', () => {
    const state = runFor('abacusFist');
    const math = {
      gateId: 'math', mode: 'recognize', lessonFamilyId: 'add10@1', retry: false, correctSpell: '7',
      cue: { text: '', speechText: '' },
    } as unknown as Parameters<typeof director.voiceCastAnswered>[1];
    director.voiceCastAnswered(state, math, 'fizzle', 'combat');
    director.voiceCastAnswered(state, { ...math, correctSpell: '35' }, 'fizzle', 'combat');
    director.voiceCastAnswered(state, { ...math, lessonFamilyId: 'count@1' }, 'retry', 'combat');
    director.voiceCastAnswered(state, { ...math, gateId: 'zhuyin' }, 'fizzle', 'combat');
    director.voiceCastAnswered(state, { ...math, gateId: 'zhuyin' }, 'fizzle', 'practice');
    expect(keys()).toEqual(['m.answer.7', 'r.shown', 'm.count.again', 'r.fizzle', 'r.shown']);
  });

  it('never plays u.notnow', () => {
    const state = runFor('echoMage');
    for (const screen of ['relicPick', 'map', 'reward', 'shop', 'rest', 'event', 'victory', 'defeat']) {
      director.voiceAfterRender(state, screen);
    }
    expect(keys()).not.toContain('u.notnow');
  });
});
