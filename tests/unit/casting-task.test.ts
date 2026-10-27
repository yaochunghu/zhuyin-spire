import { beforeEach, describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../../src/data/cards';
import {
  CHARACTERS,
  PLAYABLE_CHARACTER_IDS,
  selectPlayableFromCatalog,
} from '../../src/data/characters';
import { isZhuyinGatedCard, resolveCastBinding } from '../../src/game/casting/binding';
import {
  BUILD_TRAY_CAP,
  NUMBER_PAD_MAX_DIGITS,
  THREE_CHOICE_COUNT,
  applyCastingInput,
  canSubmitCastingInput,
  createCastingInput,
  submittedCastingAttempt,
} from '../../src/game/casting/input';
import {
  createCastingGateRegistry,
  createCastingPrompt,
  getCastingGateProvider,
  listRegisteredCastingGates,
} from '../../src/game/casting/registry';
import type { CastingGateProvider } from '../../src/game/casting/types';
import { zhuyinProvider } from '../../src/game/casting/zhuyinProvider';
import {
  chooseZhuyinMode,
  getZhuyinCardCoverage,
} from '../../src/game/casting/zhuyinProvider';
import {
  buildCastPrompt,
  diagnoseCast,
  isCastAnswerCorrect,
  pickCastMode,
  recordCastResult,
} from '../../src/game/castCheck';
import {
  awardActiveCharacterScore,
  getActiveProfile,
  getLessonProgress,
  setCharacterScore,
} from '../../src/game/profiles';
import { createNewRun, pickCharacter } from '../../src/game/state';
import { stubMathCastingTask } from '../helpers/stubCastingTask';

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

function mathCard(
  family: string,
  rarity: 'basic' | 'common' | 'rare' = 'basic',
  cast: { gradeTwo?: boolean; gradeTwoFallbackFamily?: string } = {},
) {
  return {
    id: `stub-${family}`,
    zhuyin: family === 'choice' ? '?' : '+',
    rarity,
    cast: { gateId: 'math' as const, family, ...cast },
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('casting task registry', () => {
  it('keeps 注音 as the only task registered for the game', () => {
    expect(listRegisteredCastingGates()).toEqual(['zhuyin', 'math']);
    expect(getCastingGateProvider('zhuyin')).toBe(zhuyinProvider);
    expect(getCastingGateProvider('math').id).toBe('math');
    expect(() => getCastingGateProvider('english')).toThrow(/not implemented yet/);
  });

  it('lets a test registry fill the reserved math slot without touching the game registry', () => {
    const registry = createCastingGateRegistry([zhuyinProvider, stubMathCastingTask]);
    expect(registry.ids()).toEqual(['zhuyin', 'math']);
    expect(registry.get('math')).toBe(stubMathCastingTask);
    expect(listRegisteredCastingGates()).toEqual(['zhuyin', 'math']);
    expect(() => createCastingGateRegistry([zhuyinProvider, zhuyinProvider])).toThrow(/already registered/);
  });

  it('routes mode picking to a non-zhuyin task and leaves zhuyin on chooseZhuyinMode', () => {
    const listening: CastingGateProvider = {
      id: 'math',
      createPrompt: () => { throw new Error('unused'); },
      validate: () => false,
      chooseMode: () => 'listen',
    };
    const registry = createCastingGateRegistry([listening]);
    expect(pickCastMode('early', () => 0, 'add@1', 'math', registry)).toBe('listen');
    expect(pickCastMode('early', () => 0, 'add@1', 'math')).toBe('recognize');

    for (const family of ['initial:ㄅ', 'initial:ㄆ', 'vowel:ㄚ']) {
      expect(pickCastMode('mid', seededRandom(9), family)).toBe(
        chooseZhuyinMode(family, seededRandom(9)),
      );
      expect(pickCastMode('mid', seededRandom(9), family, 'zhuyin', createCastingGateRegistry([]))).toBe(
        chooseZhuyinMode(family, seededRandom(9)),
      );
    }
  });
});

describe('stub math casting task', () => {
  const registry = createCastingGateRegistry([zhuyinProvider, stubMathCastingTask]);

  it('answers a three-choice prompt through the shared input model', () => {
    const binding = resolveCastBinding(mathCard('choice'), 'math');
    expect(binding).toMatchObject({ gateId: 'math', lessonFamilyId: 'choice@1', tier: 1 });
    const mode = pickCastMode('early', () => 0, binding.lessonFamilyId, 'math', registry);
    const prompt = createCastingPrompt(registry, {
      binding,
      mode,
      fallbackCues: [],
      rng: () => 0,
    });
    expect(prompt.inputMode).toBe('singleChoice');
    expect(prompt.choiceTokens).toHaveLength(THREE_CHOICE_COUNT);
    expect(prompt.presentation).toEqual({ kind: 'none' });

    const choices = prompt.choiceTokens;
    const wrong = applyCastingInput(createCastingInput('singleChoice'), { type: 'choose', value: '4' }, { choices });
    expect(wrong.submitted).toBe(true);
    expect(isCastAnswerCorrect(prompt, [...submittedCastingAttempt(wrong)!], registry)).toBe(false);
    expect(diagnoseCast(prompt, ['4'], registry)).toEqual({ code: 'mismatch' });

    const right = applyCastingInput(createCastingInput('singleChoice'), { type: 'choose', value: '5' }, { choices });
    expect(isCastAnswerCorrect(prompt, [...submittedCastingAttempt(right)!], registry)).toBe(true);
    expect(diagnoseCast(prompt, ['5'], registry)).toBeNull();
    expect(applyCastingInput(right, { type: 'choose', value: '6' }, { choices })).toBe(right);
    expect(applyCastingInput(
      createCastingInput('singleChoice'),
      { type: 'choose', value: '9' },
      { choices },
    ).submitted).toBe(false);
  });

  it('edits a number pad without leaking length or a leading zero', () => {
    const binding = resolveCastBinding(mathCard('pad', 'common'), 'math');
    expect(binding.lessonFamilyId).toBe('pad@2');
    const prompt = createCastingPrompt(registry, {
      binding,
      mode: 'recognize',
      fallbackCues: [],
      rng: () => 0,
    });
    expect(prompt.inputMode).toBe('numberPad');
    expect(prompt.presentation).toEqual({ kind: 'tenFrame', frames: [{ a: 8, b: 5 }] });

    let pad = createCastingInput('numberPad');
    expect(canSubmitCastingInput(pad)).toBe(false);
    pad = applyCastingInput(pad, { type: 'submit' });
    expect(pad.submitted).toBe(false);

    pad = applyCastingInput(pad, { type: 'digit', digit: '0' });
    pad = applyCastingInput(pad, { type: 'digit', digit: '0' });
    expect(pad.attempt).toEqual(['0']);
    pad = applyCastingInput(pad, { type: 'clear' });
    pad = applyCastingInput(pad, { type: 'digit', digit: '0' });
    pad = applyCastingInput(pad, { type: 'digit', digit: '1' });
    expect(pad.attempt).toEqual(['1']);
    pad = applyCastingInput(pad, { type: 'digit', digit: '3' });
    pad = applyCastingInput(pad, { type: 'digit', digit: '0' });
    pad = applyCastingInput(pad, { type: 'digit', digit: '9' });
    expect(pad.attempt).toEqual(['1', '3', '0']);
    expect(pad.attempt).toHaveLength(NUMBER_PAD_MAX_DIGITS);

    pad = applyCastingInput(pad, { type: 'backspace' });
    pad = applyCastingInput(pad, { type: 'backspace' });
    expect(pad.attempt).toEqual(['1']);
    pad = applyCastingInput(pad, { type: 'digit', digit: '3' });
    pad = applyCastingInput(pad, { type: 'submit' });
    expect(isCastAnswerCorrect(prompt, [...submittedCastingAttempt(pad)!], registry)).toBe(true);
  });

  it('accepts any coin combination that sums to the build answer', () => {
    const prompt = stubMathCastingTask.createPrompt({
      binding: resolveCastBinding(mathCard('tray', 'rare'), 'math'),
      mode: 'recognize',
      fallbackCues: [],
      rng: () => 0,
    });
    const limits = { trayCap: BUILD_TRAY_CAP };
    const first = ['10', '10', '1', '1', '1'].reduce(
      (state, id) => applyCastingInput(state, { type: 'addToken', id }, limits),
      createCastingInput('build'),
    );
    const submitted = applyCastingInput(first, { type: 'submit' }, limits);
    expect(stubMathCastingTask.validate(prompt, [...submitted.attempt])).toBe(true);

    const other = ['10', '5', '5', '1', '1', '1'];
    expect(stubMathCastingTask.validate(prompt, other)).toBe(true);
    expect(stubMathCastingTask.validate(prompt, ['10', '10'])).toBe(false);
    expect(canSubmitCastingInput(createCastingInput('build'))).toBe(false);

    const full = Array.from({ length: BUILD_TRAY_CAP }, () => '1').reduce(
      (state, id) => applyCastingInput(state, { type: 'addToken', id }, limits),
      createCastingInput('build'),
    );
    expect(applyCastingInput(full, { type: 'addToken', id: '1' }, limits).attempt).toHaveLength(BUILD_TRAY_CAP);
    const removed = applyCastingInput(full, { type: 'removeToken', index: 0 });
    expect(removed.attempt).toHaveLength(BUILD_TRAY_CAP - 1);
  });

  it('keeps a stub result in its own lesson key', () => {
    const prompt = createCastingPrompt(registry, {
      binding: resolveCastBinding(mathCard('choice'), 'math'),
      mode: 'recognize',
      fallbackCues: [],
      rng: () => 0,
    });
    recordCastResult(prompt, false, prompt.createdAt + 20);
    expect(getLessonProgress('math:choice@1')).toMatchObject({ attempts: 1, correct: 0 });
    expect(getLessonProgress('zhuyin:initial:ㄅ').attempts).toBe(0);
  });
});

describe('zhuyin behavior through the new seams', () => {
  it('still builds a sequence prompt and ignores the new prompt fields', () => {
    const prompt = buildCastPrompt(getCard('bo'), 'recognize', seededRandom(4));
    expect(prompt.gateId).toBe('zhuyin');
    expect(prompt.inputMode).toBe('sequence');
    expect(prompt.lessonFamilyId).toBe('initial:ㄅ');
    expect(prompt).not.toHaveProperty('presentation');
    expect(prompt).not.toHaveProperty('tier');
    expect(prompt).not.toHaveProperty('retry');
    expect(isCastAnswerCorrect(prompt, [...prompt.answerTokens])).toBe(true);
    expect(isCastAnswerCorrect(prompt, prompt.answerTokens.map(() => 'not-a-symbol'))).toBe(false);
    expect(diagnoseCast(prompt, ['not-a-symbol'])).toBeNull();
  });

  it('keeps zhuyin lesson families and adds rarity tier only on the binding', () => {
    expect(resolveCastBinding(getCard('bo'))).toMatchObject({
      gateId: 'zhuyin',
      lessonFamilyId: 'initial:ㄅ',
      displayGlyph: 'ㄅ',
      tier: 1,
    });
    expect(resolveCastBinding(getCard('a'))).toMatchObject({
      lessonFamilyId: 'vowel:ㄚ',
      displayGlyph: 'ㄚ',
    });
    const sequence = createCastingInput('sequence');
    const ready = ['ㄅ', 'ㄚ'].reduce(
      (state, symbol) => applyCastingInput(state, { type: 'appendSymbol', symbol }, { slotCount: 2 }),
      sequence,
    );
    expect(canSubmitCastingInput(ready, { slotCount: 2 })).toBe(true);
    expect(canSubmitCastingInput(applyCastingInput(ready, { type: 'backspace' }), { slotCount: 2 })).toBe(false);
  });

  it('keeps zhuyin coverage on every shipped card and skips a math binding', () => {
    expect(getZhuyinCardCoverage().map((item) => item.cardId).sort()).toEqual(
      Object.values(CARDS).filter((card) => isZhuyinGatedCard(card)).map((card) => card.id).sort(),
    );
    expect(isZhuyinGatedCard(getCard('bo'))).toBe(true);
    expect(isZhuyinGatedCard(mathCard('pad'))).toBe(false);
  });

  it('resolves a future math binding without a shipped card', () => {
    const rare = mathCard('add20', 'rare', { gradeTwo: true, gradeTwoFallbackFamily: 'add10' });
    expect(resolveCastBinding(rare, 'math')).toMatchObject({
      gateId: 'math',
      lessonFamilyId: 'add10@4',
      displayGlyph: '+',
      tier: 4,
    });
    expect(resolveCastBinding(rare, 'math', { gradeTwo: true })).toMatchObject({
      lessonFamilyId: 'add20@5',
      tier: 5,
    });
    expect(() => resolveCastBinding({ id: 'plain', zhuyin: 'ㄅ' }, 'math')).toThrow(/no math binding/);
    expect(() => resolveCastBinding(getCard('bo'), 'english')).toThrow(/not implemented/);
  });
});

describe('per-character selection and score', () => {
  it('selects a playable config from a catalog and refuses it in the game', () => {
    const catalog = [
      { id: 'echoMage', status: 'playable' as const, castingGateId: 'zhuyin' as const },
      { id: 'stubHero', status: 'playable' as const, castingGateId: 'math' as const },
      { id: 'future', status: 'inDesign' as const },
    ];
    expect(selectPlayableFromCatalog(catalog, 'stubHero')).toMatchObject({ castingGateId: 'math' });
    expect(selectPlayableFromCatalog(catalog, 'future')).toBeNull();
    expect(selectPlayableFromCatalog(catalog, 'missing')).toBeNull();
    expect(PLAYABLE_CHARACTER_IDS).toEqual(['echoMage', 'abacusFist']);
    expect(selectPlayableFromCatalog(Object.values(CHARACTERS), 'echoMage')?.castingGateId).toBe('zhuyin');

    const state = createNewRun();
    expect(state.characterId).toBeNull();
    expect(pickCharacter(state, 'stubHero')).toBe(false);
    expect(state.characterId).toBeNull();
    expect(pickCharacter(state, 'echoMage')).toBe(true);
  });

  it('stores score under the character id that earned it', () => {
    expect(setCharacterScore({ echoMage: { score: 300 } }, 'stubHero', 40)).toEqual({
      echoMage: { score: 300 },
      stubHero: { score: 40 },
    });
    expect(setCharacterScore({ echoMage: { score: 300 } }, 'echoMage', 10.8)).toEqual({
      echoMage: { score: 10 },
    });

    awardActiveCharacterScore('echoMage', 300);
    expect(getActiveProfile().characterProgress).toEqual({ echoMage: { score: 300 } });
  });
});
