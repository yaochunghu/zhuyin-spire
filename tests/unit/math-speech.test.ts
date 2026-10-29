import { beforeEach, describe, expect, it } from 'vitest';
import { castStreamRng, type CastStream } from '../../src/game/castRng';
import { generateMathQuestion } from '../../src/game/casting/math/generate';
import { mathProvider } from '../../src/game/casting/math/provider';
import { speakableMathQuestion } from '../../src/game/casting/math/speech';
import type { CastingTier } from '../../src/game/casting/types';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

function stream(seed: number): CastStream {
  return { castSeed: seed, castCounter: 0 };
}

const FAMILIES = [
  'count', 'make10', 'add10', 'sub10', 'add20', 'sub20', 'placeValue', 'compare',
  'ordinal', 'add100', 'clock', 'calendar', 'money', 'length', 'shapes', 'sort',
  'word', 'g2Column', 'g2Times', 'g2Cm', 'g2ClockMin', 'g2Money1000', 'g2Missing',
] as const;

describe('speakable math speech', () => {
  it('strips emoji, says 加 for +, and uses 兩 before 顆 and 個', () => {
    expect(speakableMathQuestion('🍎🍎 有幾個？')).toBe('有幾個');
    expect(speakableMathQuestion('2 + 3 = ？')).toBe('二加三是多少');
    expect(speakableMathQuestion('10 - 4 = ？')).toBe('十減四是多少');
    expect(speakableMathQuestion('2顆')).toBe('兩顆');
    expect(speakableMathQuestion('2 顆珠子')).toBe('兩顆珠子');
    expect(speakableMathQuestion('2個')).toBe('兩個');
    expect(speakableMathQuestion('2 個')).toBe('兩個');
    expect(speakableMathQuestion('12 顆')).toBe('十二顆');
    expect(speakableMathQuestion('12 個')).toBe('十二個');
    expect(speakableMathQuestion('20 個')).toBe('二十個');
    expect(speakableMathQuestion('□ + 2 = 11')).toBe('多少加二等於十一');
  });

  it('keeps the written question and speaks a cleaned line from the provider', () => {
    const prompt = mathProvider.createPrompt({
      binding: {
        gateId: 'math',
        lessonFamilyId: 'count@1',
        displayGlyph: '🍎',
        tier: 1,
      },
      mode: 'recognize',
      fallbackCues: [],
      rng: () => 0,
    });
    expect(prompt.cue.text).toMatch(/\p{Extended_Pictographic}/u);
    expect(prompt.cue.speechText).toBe('有幾個');
    expect(prompt.cue.speechText).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(prompt.cue.word).toBe(prompt.cue.text);

    const equation = mathProvider.createPrompt({
      binding: {
        gateId: 'math',
        lessonFamilyId: 'add10@1',
        displayGlyph: '+',
        tier: 1,
      },
      mode: 'recognize',
      fallbackCues: [],
      rng: () => 0.5,
    });
    expect(equation.cue.text).toContain('+');
    expect(equation.cue.speechText).toContain('加');
    expect(equation.cue.speechText).not.toContain('+');
    expect(equation.cue.speechText).not.toMatch(/\d/);
  });

  it('speaks every generated question without emoji, raw operators, or 二 before a measure', () => {
    const tiers: CastingTier[] = [1, 2, 3, 4, 5];
    for (const family of FAMILIES) {
      for (const tier of tiers) {
        for (let seed = 1; seed <= 6; seed += 1) {
          const draft = generateMathQuestion(family, tier, castStreamRng(stream(seed * 17 + tier)));
          const speech = speakableMathQuestion(draft.question);
          const label = `${family}@${tier}#${seed} ${draft.question} -> ${speech}`;
          expect(speech, label).not.toMatch(/\p{Extended_Pictographic}/u);
          expect(speech, label).not.toMatch(/[+\-=?？□]/);
          expect(speech, label).not.toMatch(/\d/);
          expect(speech, label).not.toMatch(/(?<![十百千])二(?:顆|個|元|張|組|點|分|公分)/);
          if (/(^|[^\d])2\s*顆/.test(draft.question)) expect(speech, label).toContain('兩顆');
          if (/(^|[^\d])2\s*個/.test(draft.question)) expect(speech, label).toContain('兩個');
          if (draft.question.includes('+')) expect(speech, label).toContain('加');
          if (/(^|[^\d])-\s*\d/.test(draft.question)) expect(speech, label).toContain('減');
        }
      }
    }
  });
});
