import { beforeEach, describe, expect, it } from 'vitest';
import { getCard } from '../../src/data/cards';
import { PHRASES_BY_INITIAL } from '../../src/data/phrases';
import { buildCastPrompt } from '../../src/game/castCheck';
import {
  chooseZhuyinMode,
  countEligibleZhuyinPhrases,
  findUnavailableZhuyinCards,
  getZhuyinCardCoverage,
} from '../../src/game/casting/zhuyinProvider';
import {
  defaultCastingPreferences,
  getLessonProgress,
  recordCastingResult,
  saveCastingPreferences,
} from '../../src/game/profiles';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function seededRandom(seed = 12345): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('Zhuyin casting provider', () => {
  it('keeps the expanded phrase bank structurally valid', () => {
    const rows = Object.entries(PHRASES_BY_INITIAL).flatMap(([family, phrases]) =>
      phrases.map((phrase) => ({ family, phrase })),
    );
    expect(rows.length).toBeGreaterThanOrEqual(1_300);
    const wrongFamilies: string[] = [];
    for (const { family, phrase } of rows) {
      expect(phrase.word.trim()).not.toBe('');
      expect(phrase.emoji.trim()).not.toBe('');
      if ([...phrase.spell][0] !== family) {
        wrongFamilies.push(`${family}: ${phrase.word}/${phrase.spell}`);
      }
      expect(phrase.vocabulary).toMatch(/^(core|broad)$/);
    }
    expect(wrongFamilies).toEqual([]);
  });

  it('keeps every card castable with the default preschool curriculum', () => {
    expect(findUnavailableZhuyinCards(defaultCastingPreferences())).toEqual([]);
  });

  it('offers a larger opt-in broad bank than the preschool core', () => {
    const core = defaultCastingPreferences();
    const broad = { ...core, vocabulary: 'coreAndBroad' as const };
    expect(countEligibleZhuyinPhrases(broad)).toBeGreaterThan(
      countEligibleZhuyinPhrases(core),
    );
  });

  it('meets the authored diversity floor for starter and reward cards', () => {
    const coverage = getZhuyinCardCoverage(defaultCastingPreferences());
    const deficits = coverage.flatMap((item) => {
      const starter = item.cardId === 'bo' || item.cardId === 'po' || item.cardId === 'mo';
      const promptFloor = starter ? 24 : 16;
      const answerFloor = starter ? 12 : 8;
      return item.promptCount < promptFloor || item.distinctAnswerCount < answerFloor
        ? [`${item.cardId}/${item.displayGlyph}: ${item.promptCount} prompts, ${item.distinctAnswerCount} answers`]
        : [];
    });
    expect(deficits).toEqual([]);
  });

  it('draws each distinct spelling once before refilling its persistent bag', () => {
    const card = getCard('bo');
    const count = getZhuyinCardCoverage().find((item) => item.cardId === card.id)!
      .distinctAnswerCount;
    const rng = seededRandom();
    const answers = Array.from({ length: count }, () =>
      buildCastPrompt(card, 'recognize', rng).correctSpell,
    );
    expect(new Set(answers).size).toBe(count);

    const persisted = getLessonProgress('zhuyin:initial:ㄅ');
    expect(persisted.remainingAnswerKeys).toHaveLength(0);
    const next = buildCastPrompt(card, 'recognize', rng).correctSpell;
    expect(next).not.toBe(answers.at(-1));
  });

  it('uses consonant-plus-vowel examples to teach sparse standalone vowels', () => {
    const rng = seededRandom(77);
    const prompts = Array.from({ length: 20 }, () =>
      buildCastPrompt(getCard('a'), 'recognize', rng),
    );
    expect(prompts.every((prompt) => prompt.correctParts.includes('ㄚ'))).toBe(true);
    expect(prompts.some((prompt) => prompt.correctParts[0] !== 'ㄚ')).toBe(true);
  });

  it('persists learning results by lesson family', () => {
    recordCastingResult('zhuyin:initial:ㄇ', false, 1500);
    recordCastingResult('zhuyin:initial:ㄇ', true, 900);
    expect(getLessonProgress('zhuyin:initial:ㄇ')).toMatchObject({
      attempts: 2,
      correct: 1,
      totalResponseMs: 2400,
      recentResults: [false, true],
    });
  });

  it('gently backs away from hard listening after repeated difficulty', () => {
    expect(chooseZhuyinMode('initial:ㄇ', () => 0.97)).toBe('listenHard');
    recordCastingResult('zhuyin:initial:ㄇ', false, 1300);
    recordCastingResult('zhuyin:initial:ㄇ', false, 1500);
    expect(chooseZhuyinMode('initial:ㄇ', () => 0.97)).toBe('listen');
  });

  it('reports filters that would remove all prompts from obtainable cards', () => {
    const preferences = {
      ...defaultCastingPreferences(),
      includeWords: ['爸爸'],
    };
    saveCastingPreferences(preferences);
    const unavailable = findUnavailableZhuyinCards(preferences);
    expect(unavailable.length).toBeGreaterThan(0);
    expect(unavailable.some((item) => item.cardId === 'mo')).toBe(true);
  });
});
