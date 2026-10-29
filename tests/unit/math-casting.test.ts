import { beforeEach, describe, expect, it } from 'vitest';
import { ABACUS_CARDS } from '../../src/data/abacusCards';
import { getCard, getCardCastBinding } from '../../src/data/cards';
import { castStreamRng, type CastStream } from '../../src/game/castRng';
import { buildCastPrompt, recordCastResult } from '../../src/game/castCheck';
import { mathProvider } from '../../src/game/casting/math/provider';
import {
  generateMathQuestion,
  redirectMathFamily,
  resolveMathTask,
  type MathQuestion,
} from '../../src/game/casting/math/generate';
import { coachForScreen } from '../../src/game/coach';
import { cardAriaLabel } from '../../src/ui/cards';
import {
  DEFAULT_MATH_PREFS,
  MATH_FAMILY_IDS,
  effectiveMathTier,
  nextAdaptiveDrop,
  type MathCastingPreferences,
} from '../../src/game/casting/math/prefs';
import {
  getActiveProfile,
  getMathAdaptiveDrop,
  getMathCastingPreferences,
  saveMathCastingPreferences,
  setMathAdaptiveDrop,
} from '../../src/game/profiles';
import {
  createNewRun,
  debugStartEncounter,
  pickCharacter,
  startRun,
  tryPlayCard,
} from '../../src/game/state';
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

function ask(family: string, tier: CastingTier, seed: number): MathQuestion {
  return generateMathQuestion(family, tier, castStreamRng(stream(seed)));
}

function equation(question: string): { left: number; op: '+' | '-'; right: number } | null {
  const match = question.match(/(\d+)\s*([+-])\s*(\d+)/);
  if (!match) return null;
  return { left: Number(match[1]), op: match[2] as '+' | '-', right: Number(match[3]) };
}

const GRADE_ONE: Array<[string, CastingTier]> = [
  ['count', 1], ['count', 2], ['count', 3],
  ['make10', 1], ['make10', 2], ['make10', 3],
  ['add10', 1], ['sub10', 1],
  ['add20', 2], ['add20', 3],
  ['sub20', 2], ['sub20', 3],
  ['placeValue', 2], ['placeValue', 3],
  ['compare', 1], ['compare', 2], ['compare', 3],
  ['ordinal', 2], ['ordinal', 3],
  ['add100', 3], ['add100', 4],
  ['clock', 2], ['clock', 3],
  ['calendar', 2],
  ['money', 3], ['money', 4],
  ['shapes', 2],
  ['sort', 1], ['sort', 2],
  ['word', 2], ['word', 3], ['word', 4],
];

function nearestMake10Distractors(total: number): number[] {
  const picked = [total];
  let distance = 1;
  while (picked.length < 3 && distance <= 10) {
    for (const candidate of [total + distance, total - distance]) {
      if (candidate < 0 || candidate > 10 || picked.includes(candidate)) continue;
      picked.push(candidate);
      if (picked.length === 3) break;
    }
    distance += 1;
  }
  return picked.slice(1).sort((left, right) => left - right);
}

function expectNearMake10Choices(total: number, choices: string[]): void {
  const numbers = choices.map(Number);
  expect(new Set(numbers).size).toBe(3);
  expect(numbers).toContain(total);
  for (const choice of numbers) {
    expect(Number.isInteger(choice)).toBe(true);
    expect(choice).toBeGreaterThanOrEqual(0);
    expect(choice).toBeLessThanOrEqual(10);
  }
  const distractors = numbers.filter((choice) => choice !== total).sort((left, right) => left - right);
  expect(distractors).toEqual(nearestMake10Distractors(total));
}

function expectChoice(question: MathQuestion): void {
  expect(question.choices).toHaveLength(3);
  expect(new Set(question.choices).size).toBe(3);
  expect(question.choices).toContain(question.answer);
  expect(question.answer).not.toMatch(/^0\d/);
  expect(question.question).not.toMatch(/[?？]\s*[+-]/);
}

function expectBand(family: string, tier: CastingTier, draft: MathQuestion): void {
  const { question, answer } = draft;
  const value = Number(answer);
  const parts = equation(question);
  if (family === 'add10' || family === 'sub10' || family === 'add20' || family === 'sub20' || family === 'add100' || family === 'word' || family.startsWith('g2')) {
    if (parts && family !== 'g2Missing') {
      const expected = parts.op === '+' ? parts.left + parts.right : parts.left - parts.right;
      expect(value).toBe(expected);
    }
  }
  if (family === 'add10' && parts) {
    expect(parts.left + parts.right).toBeLessThanOrEqual(10);
    expect(parts.left).toBeGreaterThanOrEqual(0);
    expect(parts.right).toBeGreaterThanOrEqual(0);
  }
  if (family === 'sub10' && parts) {
    expect(parts.left).toBeGreaterThanOrEqual(2);
    expect(parts.left).toBeLessThanOrEqual(10);
    expect(parts.right).toBeGreaterThanOrEqual(1);
    expect(parts.right).toBeLessThan(parts.left);
  }
  if (family === 'add20' && tier === 2 && parts) {
    expect(parts.left).toBeGreaterThanOrEqual(10);
    expect(parts.left).toBeLessThanOrEqual(18);
    expect((parts.left % 10) + parts.right).toBeLessThanOrEqual(9);
  }
  if (family === 'add20' && tier === 3 && parts) {
    expect(parts.left + parts.right).toBeGreaterThanOrEqual(11);
    expect(parts.left + parts.right).toBeLessThanOrEqual(18);
  }
  if (family === 'sub20' && tier === 2 && parts) {
    expect(parts.right).toBeLessThanOrEqual(parts.left % 10);
    expect(parts.left).toBeGreaterThanOrEqual(11);
  }
  if (family === 'sub20' && tier === 3 && parts) {
    expect(parts.right).toBeGreaterThan(parts.left % 10);
    expect(value).toBeGreaterThanOrEqual(2);
  }
  if (family === 'add100' && tier === 4 && parts) {
    expect(value).toBeLessThanOrEqual(99);
    expect(value).toBeGreaterThanOrEqual(0);
    if (parts.op === '+') expect((parts.left % 10) + (parts.right % 10)).toBeLessThan(10);
  }
  if (family === 'count' && tier === 1) {
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(10);
    expect(question.split('🍎').length - 1).toBe(value);
  }
  if (family === 'compare' && tier === 1) expect(['左邊', '右邊', '一樣']).toContain(answer);
  if (family === 'compare' && tier > 1) expect(['>', '<', '=']).toContain(answer);
  if (family === 'shapes') {
    expect(['圓形', '三角形', '正方形', '長方形']).toContain(answer);
    expect(question.includes(answer)).toBe(false);
    expect(question).not.toMatch(/紅旗|窗戶/);
  }
  if (family === 'make10' && (tier === 1 || tier === 2)) {
    expect(question).not.toMatch(/已經有|再幾顆/);
  }
  if (family === 'make10' && tier === 1) {
    const partsOfTen = /^10 可以分成 (\d+) 和幾？$/.exec(question);
    expect(partsOfTen).not.toBeNull();
    expect(value).toBe(10 - Number(partsOfTen![1]));
  }
  if (family === 'make10' && tier === 2) {
    const join = /^(\d+) 和 (\d+) 合起來是幾？$/.exec(question);
    expect(join).not.toBeNull();
    const left = Number(join![1]);
    const right = Number(join![2]);
    expect(left + right).toBeGreaterThanOrEqual(1);
    expect(left + right).toBeLessThanOrEqual(10);
    expect(left === 0 && right === 0).toBe(false);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(10);
    expect(value).toBe(left + right);
    expectNearMake10Choices(value, draft.choices);
  }
  if (family === 'clock') expect(answer).toMatch(/點/);
  if (family === 'g2Missing') {
    expect(question).toContain('□');
    const match = question.match(/□ \+ (\d+) = (\d+)/);
    expect(match).not.toBeNull();
    expect(value).toBe(Number(match![2]) - Number(match![1]));
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(9);
  }
  if (family === 'g2Times') expect([2, 5, 10].some((size) => value % size === 0)).toBe(true);
  if (family === 'g2Column' && parts) expect(value).toBeLessThanOrEqual(200);
  if (family !== 'g2Missing') expect(question).not.toContain('□');
}

describe('math prompt generation', () => {
  it('keeps grade-1 cells inside their bands, with three choices and no unknown addend', () => {
    for (const [family, tier] of GRADE_ONE) {
      for (let seed = 1; seed <= 24; seed += 1) {
        const draft = ask(family, tier, seed * 17 + tier);
        expectChoice(draft);
        expectBand(family, tier, draft);
      }
    }
  });

  it('asks grade 2 only at tier 5, and only 倍數連閃 uses the blank', () => {
    for (const family of ['g2Column', 'g2Times', 'g2Cm', 'g2ClockMin', 'g2Money1000', 'g2Missing']) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const draft = ask(family, 5, seed * 31);
        expectChoice(draft);
        expectBand(family, 5, draft);
      }
    }
  });

  it('keeps 公分 off every grade-1 tier and leaves the length generator at tier 5', () => {
    const lengthUnit = /公分|公尺|毫米|公厘|公寸|公丈|公里|厘米|英寸|英吋|英尺|英呎|英哩|英里|幾格|比較長|迴紋針/;
    for (const family of MATH_FAMILY_IDS) {
      for (const tier of [1, 2, 3, 4] as const) {
        for (let seed = 1; seed <= 12; seed += 1) {
          const draft = ask(family, tier, seed * 19 + tier);
          const text = `${draft.question}\n${draft.answer}\n${draft.choices.join('\n')}`;
          expect(text, `${family}@${tier} seed ${seed}`).not.toMatch(lengthUnit);
          expect(text, `${family}@${tier}`).not.toMatch(/已經有|再幾顆就/);
        }
      }
    }
    expect(Object.values(ABACUS_CARDS).map((card) => card.cast?.family)).not.toContain('length');
    expect(ABACUS_CARDS.ab_m017?.cast).toMatchObject({ gateId: 'math', family: 'compare' });
    const binding = getCardCastBinding(getCard('ab_m017'), 'math', DEFAULT_MATH_PREFS);
    expect(binding).toMatchObject({ adaptiveFamily: 'compare', tier: 3 });
    const parked = resolveMathTask(
      {
        gateId: 'math',
        lessonFamilyId: 'length@3',
        displayGlyph: '📏',
        tier: 3,
        adaptiveFamily: 'length',
      },
      DEFAULT_MATH_PREFS,
    );
    expect(parked).toEqual({ cardFamily: 'length', family: 'add100', tier: 3 });
    const kept = ask('length', 5, 4);
    expect(kept.question).toContain('公分');
    expect(kept.question).toMatch(/長幾公分/);
    expect(Number(kept.answer)).toBeGreaterThan(0);
  });

  it('asks make10 tier 2 how many N and M make, with nearby choices inside 0..10', () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const draft = ask('make10', 2, seed);
      const match = /^(\d+) 和 (\d+) 合起來是幾？$/.exec(draft.question);
      expect(match, draft.question).not.toBeNull();
      const left = Number(match![1]);
      const right = Number(match![2]);
      expect(left + right).toBeGreaterThanOrEqual(1);
      expect(left + right).toBeLessThanOrEqual(10);
      expect(left === 0 && right === 0).toBe(false);
      expect(Number(draft.answer)).toBeGreaterThanOrEqual(1);
      expect(Number(draft.answer)).toBeLessThanOrEqual(10);
      expect(Number(draft.answer)).toBe(left + right);
      expect(draft.choices).toHaveLength(3);
      expectNearMake10Choices(left + right, draft.choices);
      expect(draft.question).not.toMatch(/已經有|再幾顆|10 可以分成/);
    }

    const scripted = (draws: number[]) => {
      let index = 0;
      return () => draws[index++] ?? 0;
    };
    const singleZeroWithOne = generateMathQuestion('make10', 2, scripted([0, 0, 0]));
    expect(singleZeroWithOne.question, '0 和 1 is a legal single-zero question').toBe('0 和 1 合起來是幾？');
    expect(singleZeroWithOne.question).not.toContain('0 和 0');
    expect(singleZeroWithOne.answer).toBe('1');
    expect(singleZeroWithOne.choices.map(Number).sort((a, b) => a - b)).toEqual([0, 1, 2]);

    const oneZero = generateMathQuestion('make10', 2, scripted([0, 0.6, 0]));
    expect(oneZero.question).toBe('0 和 7 合起來是幾？');
    expect(oneZero.answer).toBe('7');
    expect(oneZero.choices.map(Number).sort((a, b) => a - b)).toEqual([6, 7, 8]);

    const ten = generateMathQuestion('make10', 2, scripted([0, 0.95, 0.9]));
    expect(ten.question).toBe('10 和 0 合起來是幾？');
    expect(ten.answer).toBe('10');
    expect(ten.choices.map(Number).sort((a, b) => a - b)).toEqual([8, 9, 10]);

    const seven = generateMathQuestion('make10', 2, scripted([0.4, 0.6, 0.5]));
    expect(seven.question).toBe('4 和 3 合起來是幾？');
    expect(seven.answer).toBe('7');
    expect(seven.choices.map(Number).sort((a, b) => a - b)).toEqual([6, 7, 8]);

    const samplesPerSeed = 2500;
    const seeds = [1, 17, 42, 99, 256];
    for (const seed of seeds) {
      const rng = castStreamRng(stream(seed));
      let singleZero = 0;
      for (let index = 0; index < samplesPerSeed; index += 1) {
        const draft = generateMathQuestion('make10', 2, rng);
        const match = /^(\d+) 和 (\d+) 合起來是幾？$/.exec(draft.question);
        expect(match, draft.question).not.toBeNull();
        const left = Number(match![1]);
        const right = Number(match![2]);
        expect(left === 0 && right === 0, draft.question).toBe(false);
        const total = left + right;
        expect(total).toBeGreaterThanOrEqual(1);
        expect(total).toBeLessThanOrEqual(10);
        expect(Number(draft.answer)).toBe(total);
        expectNearMake10Choices(total, draft.choices);
        const zeros = Number(left === 0) + Number(right === 0);
        expect(zeros).toBeLessThanOrEqual(1);
        if (zeros === 1) {
          singleZero += 1;
          const other = left === 0 ? right : left;
          expect(other).toBeGreaterThanOrEqual(1);
          expect(other).toBeLessThanOrEqual(10);
        } else {
          expect(left).toBeGreaterThanOrEqual(1);
          expect(right).toBeGreaterThanOrEqual(1);
          expect(total).toBeGreaterThanOrEqual(2);
        }
      }
      const rate = singleZero / samplesPerSeed;
      expect(rate, `seed ${seed} single-0 rate ${rate}`).toBeGreaterThanOrEqual(0.05);
      expect(rate, `seed ${seed} single-0 rate ${rate}`).toBeLessThanOrEqual(0.15);
    }
  });

  it('matches every clock face to the hour it asks', () => {
    const wholeFaces = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    const halfFaces = ['🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'];
    const hourRng = (hour: number) => {
      const bucket = (hour - 1 + 0.5) / 12;
      let first = true;
      return () => {
        if (first) {
          first = false;
          return bucket;
        }
        return 0.2;
      };
    };
    for (const tier of [1, 2, 3, 4] as const) {
      const half = tier > 2;
      const seen = new Set<string>();
      for (let hour = 1; hour <= 12; hour += 1) {
        const draft = generateMathQuestion('clock', tier, hourRng(hour));
        const expected = (half ? halfFaces : wholeFaces)[hour - 1]!;
        expect(draft.answer).toBe(half ? `${hour}點半` : `${hour}點`);
        expect(draft.question).toContain(half ? `短針在 ${hour}` : `短針指著 ${hour}`);
        expect(draft.emoji).toBe(expected);
        seen.add(draft.emoji);
      }
      expect(seen.size).toBe(12);
    }
  });

  it('uses unambiguous shape objects', () => {
    const scenes = [
      ['球是什麼形狀？', '圓形', '⚽'],
      ['三角飯糰是什麼形狀？', '三角形', '🍙'],
      ['魔術方塊的一面是什麼形狀？', '正方形', '🟦'],
      ['書本是什麼形狀？', '長方形', '📘'],
    ] as const;
    const seen = new Set<string>();
    for (let index = 0; index < scenes.length; index += 1) {
      const draft = generateMathQuestion('shapes', 2, () => (index + 0.5) / 4);
      const [question, answer, emoji] = scenes[index]!;
      expect(draft.question).toBe(question);
      expect(draft.answer).toBe(answer);
      expect(draft.emoji).toBe(emoji);
      expect(draft.question).not.toMatch(/紅旗|窗戶/);
      seen.add(draft.question);
    }
    expect(seen.size).toBe(4);
  });

  it('draws the same question from the same cast stream', () => {
    const batch = (seed: number) =>
      [1, 2, 3, 4, 5].map((step) => ask('add20', 3, seed + step));
    expect(batch(100)).toEqual(batch(100));
    expect(batch(100)).not.toEqual(batch(900));
  });

  it('lowers a family that cannot ask the requested tier', () => {
    const prefs = { ...DEFAULT_MATH_PREFS };
    const dropped = resolveMathTask(
      { gateId: 'math', lessonFamilyId: 'add20@1', displayGlyph: '+', tier: 1, adaptiveFamily: 'add20' },
      prefs,
    );
    expect(dropped).toMatchObject({ family: 'add10', tier: 1, cardFamily: 'add20' });
    const gradeTwoOff = resolveMathTask(
      {
        gateId: 'math',
        lessonFamilyId: 'add100@4',
        displayGlyph: '×',
        tier: 4,
        adaptiveFamily: 'add100',
        fallbackFamily: 'add100',
      },
      prefs,
    );
    expect(gradeTwoOff.family).not.toMatch(/^g2/);
    expect(gradeTwoOff.tier).toBeLessThanOrEqual(4);
  });
});

describe('math difficulty only moves down', () => {
  const prefs: MathCastingPreferences = { ...DEFAULT_MATH_PREFS, tierFloor: 1, tierCeiling: 4 };

  it('lets a grade-2 card sit at tier 5 until a drop pulls it into the band', () => {
    expect(effectiveMathTier(5, prefs, 0)).toBe(5);
    expect(effectiveMathTier(5, prefs, 1)).toBe(4);
    expect(effectiveMathTier(4, prefs, 2)).toBe(2);
    expect(effectiveMathTier(2, prefs, 0)).toBe(2);
    expect(effectiveMathTier(2, { ...prefs, raritySetsDifficulty: false, fixedTier: 1 }, 0)).toBe(1);
    expect(effectiveMathTier(4, prefs, 0, 1)).toBe(1);
    expect(effectiveMathTier(4, { ...prefs, tierFloor: 2 }, 0, 1)).toBe(2);
  });

  it('raises the drop after two recent misses and lowers it after a recovery run', () => {
    expect(nextAdaptiveDrop(0, [false, false])).toBe(1);
    expect(nextAdaptiveDrop(0, [false, true])).toBe(0);
    expect(nextAdaptiveDrop(1, [true, true, true, true, true, true])).toBe(0);
    expect(nextAdaptiveDrop(2, [false, false, true, true, true, true, true, true])).toBe(1);
    expect(nextAdaptiveDrop(1, [true, true, true, true, true, true, false, false])).toBe(2);
  });

  it('stores the drop on the card family and leaves it off a profile that never set one', () => {
    expect(getActiveProfile().mathCasting).toBeUndefined();
    expect(getMathCastingPreferences()).toEqual(DEFAULT_MATH_PREFS);
    saveMathCastingPreferences({ ...DEFAULT_MATH_PREFS, gradeTwo: true });
    setMathAdaptiveDrop('add20', 2);
    expect(getMathCastingPreferences().gradeTwo).toBe(true);
    expect(getMathAdaptiveDrop('add20')).toBe(2);
    expect(getActiveProfile().mathCasting?.gradeTwo).toBe(true);
  });

  it('moves the stored drop only when the math result closes', () => {
    const binding = getCardCastBinding(getCard('ab_m005'), 'math', DEFAULT_MATH_PREFS);
    const prompt = mathProvider.createPrompt({
      binding,
      mode: 'recognize',
      fallbackCues: [],
      rng: castStreamRng(stream(4)),
    });
    expect(prompt.adaptiveFamily).toBe('add20');
    recordCastResult({ ...prompt, createdAt: 1 }, false, 2);
    recordCastResult({ ...prompt, createdAt: 1 }, false, 3);
    expect(getMathAdaptiveDrop('add20')).toBe(1);
    for (let index = 0; index < 6; index += 1) {
      recordCastResult({ ...prompt, createdAt: 1 }, true, 4 + index);
    }
    expect(getMathAdaptiveDrop('add20')).toBe(0);
  });
});

describe('math provider', () => {
  it('answers every live card with three choices and does not spend the stream on the mode', () => {
    expect(mathProvider.chooseMode?.('add10@1', () => {
      throw new Error('mode roll must not read the cast stream');
    })).toBe('recognize');
    for (const card of Object.values(ABACUS_CARDS)) {
      const binding = getCardCastBinding(card, 'math', DEFAULT_MATH_PREFS);
      const prompt = buildCastPrompt(card, 'recognize', castStreamRng(stream(9)), 'mid', 'math');
      expect(prompt.inputMode).toBe('singleChoice');
      expect(prompt.mode).toBe('recognize');
      expect(prompt.choiceTokens).toHaveLength(3);
      expect(prompt.choiceTokens).toContain(prompt.correctSpell);
      expect(mathProvider.validate(prompt, [prompt.correctSpell])).toBe(true);
      expect(mathProvider.validate(prompt, ['nope'])).toBe(false);
      expect(prompt.cue.text).not.toContain('□');
      expect(binding.tier).toBeLessThanOrEqual(4);
    }
  });

  it('lifts 倍數連閃 to tier 5 only when 二年級 is on', () => {
    const card = getCard('ab_m025');
    const off = getCardCastBinding(card, 'math', DEFAULT_MATH_PREFS);
    expect(off.lessonFamilyId).toBe('add100@4');
    expect(off.adaptiveFamily).toBe('add100');
    const on = getCardCastBinding(card, 'math', { ...DEFAULT_MATH_PREFS, gradeTwo: true });
    expect(on).toMatchObject({ lessonFamilyId: 'g2Times@5', tier: 5, adaptiveFamily: 'g2Times' });
    saveMathCastingPreferences({ ...DEFAULT_MATH_PREFS, gradeTwo: true });
    const prompt = buildCastPrompt(card, 'recognize', castStreamRng(stream(11)), 'mid', 'math');
    expect(prompt.tier).toBe(5);
    expect(prompt.lessonFamilyId.startsWith('g2')).toBe(true);
    expect(prompt.adaptiveFamily).toBe('g2Times');
  });

  it('forces the next prompt to tier 1 after three misses this combat', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'abacusFist');
    debugStartEncounter(state, 'rock');
    const card = state.combat!.hand[0]!;
    card.defId = 'ab_m021';
    state.combat!.mathMissStreak = 3;
    tryPlayCard(state, card.uid);
    expect(state.cast?.prompt.tier).toBe(1);
    expect(state.cast?.prompt.lessonFamilyId).toBe('add10@1');
    expect(state.cast?.prompt.adaptiveFamily).toBe('placeValue');
  });

  it('drops an ordinal warm-up to 湊十 tier 1 after three misses', () => {
    expect(redirectMathFamily('ordinal', 1)).toEqual({ family: 'make10', tier: 1 });
    expect(redirectMathFamily('ordinal', 2)).toEqual({ family: 'ordinal', tier: 2 });
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'abacusFist');
    debugStartEncounter(state, 'rock');
    const card = state.combat!.hand[0]!;
    card.defId = 'ab_m010';
    state.combat!.mathMissStreak = 3;
    tryPlayCard(state, card.uid);
    expect(state.cast?.prompt.tier).toBe(1);
    expect(state.cast?.prompt.lessonFamilyId).toBe('make10@1');
    expect(state.cast?.prompt.adaptiveFamily).toBe('ordinal');
  });
});

describe('math prompt seed sweep', () => {
  const SEEDS = 2000;

  function sweep(family: string, tier: CastingTier): MathQuestion[] {
    const questions: MathQuestion[] = [];
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      questions.push(generateMathQuestion(family, tier, castStreamRng({ castSeed: seed, castCounter: 0 })));
    }
    return questions;
  }

  it('never borrows, subtracts zero, or asks a grade-1 count outside 1–9', () => {
    const subtracts = sweep('add100', 4).filter((question) => question.question.includes(' - '));
    expect(subtracts.length).toBeGreaterThan(100);
    for (const question of subtracts) {
      expect(question.question).not.toMatch(/ - 0 /);
      const match = /^(\d+) - (\d+) = ？$/.exec(question.question);
      expect(match).not.toBeNull();
      const left = Number(match![1]);
      const right = Number(match![2]);
      expect(right).toBeGreaterThanOrEqual(1);
      expect(right).toBeLessThanOrEqual(left % 10);
      expect(Number(question.answer)).toBe(left - right);
    }

    for (const question of sweep('count', 3)) {
      const answer = Number(question.answer);
      if (question.question.includes('有幾個一')) {
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(9);
      }
      if (question.question.includes('有幾個十')) {
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(9);
        expect(question.question.startsWith('100 ')).toBe(false);
      }
    }
  });

  it('never offers 第0個 and does not make every times distractor ±1', () => {
    for (const question of sweep('ordinal', 2)) {
      expect(question.choices).not.toContain('0');
      expect(question.choices.join(' ')).not.toContain('第0');
      expect(Number(question.answer)).toBeGreaterThanOrEqual(1);
      expect(question.choices).toContain(question.answer);
      expect(new Set(question.choices).size).toBe(3);
    }

    const times = sweep('g2Times', 5);
    let offByOne = 0;
    for (const question of times) {
      const answer = Number(question.answer);
      const choices = question.choices.map(Number).sort((left, right) => left - right);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices).toContain(question.answer);
      const plusMinus = choices[0] === answer - 1 && choices[1] === answer && choices[2] === answer + 1;
      if (plusMinus) offByOne += 1;
    }
    expect(offByOne).toBe(0);
    expect(times.length).toBe(SEEDS);
  });
});

describe('math cast copy', () => {
  it('names the retry state and the card, and keeps 注音 labels for 共鳴武者', () => {
    expect(coachForScreen('castCheck', {
      castingGateId: 'math',
      scaffoldedRetry: true,
    }).body).toContain('可以再算一次');
    expect(coachForScreen('castCheck', {
      castingGateId: 'math',
      mathRetryUsed: true,
      scaffoldedRetry: true,
    }).body).toContain('已經用過了');
    expect(coachForScreen('castCheck', {
      castingGateId: 'math',
      mathRetryUsed: true,
      scaffoldedRetry: true,
    }).body).not.toContain('可以再算一次');
    expect(coachForScreen('castCheck', {
      castingGateId: 'math',
      mathRetryOpen: true,
      mathRetryUsed: true,
    }).body).toContain('讓孩子自己按答案');
    expect(coachForScreen('castCheck', {
      castingGateId: 'math',
      scaffoldedRetry: false,
    }).body).not.toContain('再算一次');
    expect(coachForScreen('castCheck').body).toContain('拼出整個音');

    expect(cardAriaLabel(getCard('ab_m001'))).toBe('摘星擊');
    expect(cardAriaLabel(getCard('ab_m002'))).toBe('星光盾');
    expect(cardAriaLabel(getCard('ab_m003'))).toBe('十星閃');
    expect(cardAriaLabel(getCard('bo'))).toBe('注音 ㄅ');
  });
});
