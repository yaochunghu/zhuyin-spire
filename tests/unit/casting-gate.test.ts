import { beforeEach, describe, expect, it } from 'vitest';
import { CARDS, STARTER_DECK_IDS, getCard } from '../../src/data/cards';
import { CURSES } from '../../src/data/curses';
import { CHARACTERS } from '../../src/data/characters';
import { ABACUS_CARDS, ABACUS_STARTER_DECK_IDS } from '../../src/data/abacusCards';
import { PHRASES_BY_INITIAL } from '../../src/data/phrases';
import { buildCastPrompt, isCastAnswerCorrect } from '../../src/game/castCheck';
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
    expect(rows.length).toBeGreaterThanOrEqual(1_295);
    const wrongFamilies: string[] = [];
    for (const { family, phrase } of rows) {
      expect(phrase.word.trim()).not.toBe('');
      expect(phrase.emoji.trim()).not.toBe('');
      const symbols = [...phrase.spell.normalize('NFC')];
      const head = symbols[0] === '˙' ? symbols[1] : symbols[0];
      if (head !== family) {
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

  it('meets the authored diversity floor for every obtainable card', () => {
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

  it('locks pictured phrases to the revised-dictionary headword', () => {
    const rows = Object.values(PHRASES_BY_INITIAL).flat();
    const spells = (word: string, emoji: string) =>
      rows
        .filter((phrase) => phrase.word === word && phrase.emoji === emoji)
        .map((phrase) => phrase.spell);

    expect(spells('幹', '🪵')).toEqual(['ㄍㄢˋ']);
    expect(spells('干', '🪵')).toEqual([]);
    expect(spells('更', '📈')).toEqual(['ㄍㄥˋ']);
    expect(spells('還', '↩️')).toEqual(['ㄏㄨㄢˊ']);
    expect(spells('卷', '📜')).toEqual(['ㄐㄩㄢˋ']);
    expect(spells('期', '📅')).toEqual(['ㄑㄧˊ']);
    expect(spells('傳', '📣')).toEqual(['ㄔㄨㄢˊ']);
    expect(spells('甚', '❓')).toEqual(['ㄕㄣˊ']);
    expect(spells('鑽', '💎')).toEqual(['ㄗㄨㄢˋ']);
    expect(spells('撒', '🌱')).toEqual(['ㄙㄚˇ']);
    expect(spells('微', '🔬')).toEqual(['ㄨㄟˊ']);
    expect(rows.filter((phrase) => phrase.word === '桌')).toEqual([
      expect.objectContaining({ emoji: '🍽️', spell: 'ㄓㄨㄛ' }),
    ]);
    // 余 already means 剩下、多餘 in 《重編國語辭典修訂本》, so the surplus picture stays 余.
    expect(spells('余', '➕')).toEqual(['ㄩˊ']);
    expect(spells('餘', '➕')).toEqual([]);

    // Round 3: the revised dictionary's reading for each pictured phrase.
    expect(spells('背', '🎒')).toEqual(['ㄅㄟ']);
    expect(spells('表', '⌚')).toEqual(['ㄅㄧㄠˇ']);
    expect(spells('鋪', '🛏️')).toEqual(['ㄆㄨˋ']);
    expect(spells('量', '⚖️')).toEqual(['ㄌㄧㄤˋ']);
    expect(spells('困', '😴')).toEqual(['ㄎㄨㄣˋ']);
    expect(spells('將', '♟️')).toEqual(['ㄐㄧㄤ']);
    expect(spells('閑', '😌')).toEqual(['ㄒㄧㄢˊ']);
    expect(spells('興', '🎉')).toEqual(['ㄒㄧㄥˋ']);
    expect(spells('血', '🩸')).toEqual(['ㄒㄧㄝˇ']);
    expect(spells('熟', '🔥')).toEqual(['ㄕㄨˊ']);
    expect(spells('掃', '🧹')).toEqual(['ㄙㄠˋ']);
    expect(spells('艘', '⛵')).toEqual(['ㄙㄠ']);
    expect(spells('應', '✅')).toEqual(['ㄧㄥˋ']);
    expect(spells('于', '📍')).toEqual(['ㄩˊ']);
    expect(spells('仔', '👶')).toEqual(['ㄗㄞˇ']);
    expect(spells('為什麼', '❓')).toEqual(['ㄨㄟˋ']);
    expect(spells('種子', '🌱')).toEqual(['ㄓㄨㄥˇ']);
  });

  it('writes every 輕聲 entry with the dot before the syllable', () => {
    const phrases = Object.entries(PHRASES_BY_INITIAL).flatMap(([family, rows]) =>
      rows.map((phrase) => ({ family, ...phrase })),
    );
    const cues = [...Object.values(CARDS), ...Object.values(CURSES)].flatMap((card) =>
      card.cues.map((cue) => ({ family: card.zhuyin, word: cue.word, spell: cue.spell })),
    );
    const neutral = [...phrases, ...cues].filter((entry) => entry.spell.includes('˙'));
    expect(neutral.map((entry) => `${entry.word}:${entry.spell}`).sort()).toEqual([
      '們:˙ㄇㄣ',
      '呢:˙ㄋㄜ',
    ]);
    for (const entry of neutral) {
      const symbols = [...entry.spell.normalize('NFC')];
      expect(symbols[0], entry.word).toBe('˙');
      expect(symbols.filter((symbol) => symbol === '˙'), entry.word).toHaveLength(1);
      expect(symbols.slice(1).some((symbol) => 'ˊˇˋ˙'.includes(symbol)), entry.word).toBe(false);
      expect(symbols[1], entry.word).toBe(entry.family);
    }
    const defaults = defaultCastingPreferences();
    expect(countEligibleZhuyinPhrases({ ...defaults, tones: [5] })).toBe(2);
    expect(countEligibleZhuyinPhrases({ ...defaults, tones: [1, 2, 3, 4] })).toBe(
      countEligibleZhuyinPhrases(defaults) - 2,
    );
  });

  it('shows and accepts 輕聲 in MOE order', () => {
    const defaults = defaultCastingPreferences();
    saveCastingPreferences({ ...defaults, includeWords: ['們'], tones: [5] });
    const men = buildCastPrompt(getCard('mo'), 'recognize', seededRandom(1));
    expect(men.cue.word).toBe('們');
    expect(men.cue.spell).toBe('˙ㄇㄣ');
    expect(men.correctSpell).toBe('˙ㄇㄣ');
    expect(men.correctionText).toBe('˙ㄇㄣ');
    expect(men.answerTokens).toEqual(['˙', 'ㄇ', 'ㄣ']);
    expect(isCastAnswerCorrect(men, ['˙', 'ㄇ', 'ㄣ'])).toBe(true);
    expect(isCastAnswerCorrect(men, ['ㄇ', 'ㄣ', '˙'])).toBe(false);

    saveCastingPreferences({ ...defaults, includeWords: ['呢'], tones: [5] });
    const ne = buildCastPrompt(getCard('ne'), 'recognize', seededRandom(2));
    expect(ne.cue.spell).toBe('˙ㄋㄜ');
    expect(ne.correctionText).toBe('˙ㄋㄜ');
    expect(ne.answerTokens).toEqual(['˙', 'ㄋ', 'ㄜ']);
    expect(isCastAnswerCorrect(ne, ['˙', 'ㄋ', 'ㄜ'])).toBe(true);
    expect(isCastAnswerCorrect(ne, ['ㄋ', 'ㄜ', '˙'])).toBe(false);
  });

  it('drops 采 and keeps 彩 on the same reading', () => {
    const phrases = Object.values(PHRASES_BY_INITIAL).flat();
    const words = [
      ...phrases.map((phrase) => phrase.word),
      ...Object.values(CARDS).flatMap((card) => [card.id, card.name, ...card.cues.map((cue) => cue.word)]),
      ...Object.values(CURSES).flatMap((card) => [card.id, card.name, ...card.cues.map((cue) => cue.word)]),
      ...Object.values(ABACUS_CARDS).flatMap((card) => [card.id, card.name]),
      ...STARTER_DECK_IDS,
      ...ABACUS_STARTER_DECK_IDS,
    ];
    expect(words.some((word) => [...word].includes('采'))).toBe(false);
    expect(phrases.filter((phrase) => phrase.spell === 'ㄘㄞˇ').map((phrase) => phrase.word).sort())
      .toEqual(['彩', '彩虹', '踩']);
  });

  it('names the vulnerable window as 空檔 on the character card', () => {
    expect(CHARACTERS.echoMage.theme).toBe('完整防守累積「勁」，在「易傷」空檔用攻守換拍反擊。');
    expect(CHARACTERS.echoMage.theme.includes('窗口')).toBe(false);
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
