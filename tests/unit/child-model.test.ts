import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { debugSearchEnabled, isDebugEnabled } from '../../src/debug/debugFlags';
import {
  CHILD_PERSONA_IDS,
  CHILD_PERSONAS,
  CHILD_RUN_POLICY,
  ZHUYIN_P_SWEEP,
  childModelFromSearch,
  chooseCombatAction,
  chooseMapNode,
  chooseReward,
  createChildRng,
  decideCast,
  planShopPurchases,
  successProbability,
  withZhuyinP,
  type CastAsk,
} from '../../src/debug/childModel';
import { responseBucketFor } from '../../src/game/playtestTelemetry';
import { runActI } from '../../scripts/simulate-act';

const MATH_ASK: CastAsk = {
  gateId: 'math',
  family: 'add10',
  tier: 1,
  retried: false,
  hintAvailable: false,
  inputMode: 'singleChoice',
  correctTokens: ['7'],
  choiceTokens: ['6', '7', '8', '9'],
  questionText: '3 + 4',
};

function readRepo(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('child-model query gate', () => {
  it('accepts a bare debug query and rejects other values', () => {
    expect(debugSearchEnabled('?debug')).toBe(true);
    expect(debugSearchEnabled('debug=1')).toBe(true);
    expect(debugSearchEnabled('?debug=TRUE')).toBe(true);
    expect(debugSearchEnabled('?debug=false')).toBe(false);
    expect(debugSearchEnabled('?debug=0')).toBe(false);
    expect(debugSearchEnabled('?childModel=firstGrader')).toBe(false);
  });

  it('ignores ?childModel unless the debug query is present', () => {
    expect(childModelFromSearch('?childModel=firstGrader&seed=4')).toBeNull();
    expect(childModelFromSearch('?debug=false&childModel=firstGrader')).toBeNull();
    expect(childModelFromSearch('?debug=1&childModel=unknown')).toBeNull();
    const request = childModelFromSearch('?debug&childModel=firstGrader&seed=12&zhuyinP=0.7');
    expect(request?.persona.id).toBe('firstGrader');
    expect(request?.persona.zhuyinP).toBe(0.7);
    expect(request?.seed).toBe(12);
    expect(request?.zhuyinP).toBe(0.7);
    expect(childModelFromSearch('?debug=1&childModel=struggling')?.persona.zhuyinP).toBe(0.7);
    expect(childModelFromSearch('?debug=1&childModel=strong')?.persona.zhuyinP).toBe(0.9);
  });

  it('does not treat localStorage debug as the child-model query', () => {
    vi.stubGlobal('window', { location: { search: '?childModel=firstGrader' } });
    vi.stubGlobal('localStorage', { getItem: (key: string) => (key === 'zhuyin-debug' ? '1' : null) });
    expect(isDebugEnabled()).toBe(true);
    expect(childModelFromSearch('?childModel=firstGrader')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('child-model answers', () => {
  it('includes the three personas and the 注音 sweep', () => {
    expect(CHILD_PERSONA_IDS).toEqual(['firstGrader', 'struggling', 'strong']);
    expect(CHILD_PERSONAS.firstGrader.balanceAlias).toBe('steady');
    expect(CHILD_PERSONAS.struggling.balanceAlias).toBe('struggling');
    expect(CHILD_PERSONAS.strong.balanceAlias).toBe('fast');
    expect([...ZHUYIN_P_SWEEP]).toEqual([0.7, 0.8, 0.9]);
    expect(CHILD_RUN_POLICY.takeBestRewardP).toBeGreaterThanOrEqual(0.7);
  });

  it('applies the family delta on the first try only, then clamps', () => {
    const steady = CHILD_PERSONAS.firstGrader;
    expect(successProbability(steady, { gateId: 'math', family: 'count', tier: 1, retried: false })).toBeCloseTo(0.96);
    expect(successProbability(steady, { gateId: 'math', family: 'word', tier: 3, retried: false })).toBeCloseTo(0.66);
    expect(successProbability(steady, { gateId: 'math', family: 'word@3', tier: 3, retried: false })).toBeCloseTo(0.66);
    expect(successProbability(steady, { gateId: 'math', family: 'word', tier: 3, retried: true })).toBeCloseTo(0.55);
    expect(successProbability(steady, { gateId: 'zhuyin', family: 'initial:ㄅ', tier: 1, retried: false })).toBeCloseTo(0.82);
    expect(successProbability(withZhuyinP(steady, 0.7), {
      gateId: 'zhuyin',
      family: 'initial:ㄆ',
      tier: 1,
      retried: false,
    })).toBeCloseTo(0.66);
    expect(successProbability(CHILD_PERSONAS.strong, {
      gateId: 'math',
      family: 'count',
      tier: 1,
      retried: false,
    })).toBeCloseTo(0.98);
  });

  it('is deterministic, misses like a child, and feeds response buckets', () => {
    const left = createChildRng(99);
    const right = createChildRng(99);
    const first = decideCast(CHILD_PERSONAS.struggling, MATH_ASK, left);
    expect(decideCast(CHILD_PERSONAS.struggling, MATH_ASK, right)).toEqual(first);
    expect(first.responseBucket).toBe(responseBucketFor(first.responseMs));

    const rng = createChildRng(99);
    let misses = 0;
    for (let index = 0; index < 200; index += 1) {
      const decision = decideCast(CHILD_PERSONAS.struggling, MATH_ASK, rng);
      expect(decision.responseBucket).toBe(responseBucketFor(decision.responseMs));
      if (!decision.correct) {
        misses += 1;
        expect(decision.attempt).not.toEqual(MATH_ASK.correctTokens);
        expect(decision.errorTag).not.toBeNull();
      }
    }
    expect(misses).toBeGreaterThan(20);

    const zhuyin = decideCast(CHILD_PERSONAS.firstGrader, {
      gateId: 'zhuyin',
      family: 'initial:ㄅ',
      tier: 1,
      retried: false,
      hintAvailable: false,
      inputMode: 'sequence',
      correctTokens: ['ㄅ', 'ˊ'],
      choiceTokens: ['ㄅ', 'ㄆ', 'ˊ', 'ˇ'],
      questionText: '',
    }, () => 0.99);
    expect(zhuyin.correct).toBe(false);
    expect(zhuyin.attempt).not.toEqual(['ㄅ', 'ˊ']);
  });
});

describe('child-model run policy', () => {
  it('takes the best reward at least 70% of the time', () => {
    const rng = createChildRng(7);
    let best = 0;
    const rolls = 4_000;
    for (let index = 0; index < rolls; index += 1) {
      const id = chooseReward([
        { id: 'best', score: 3 },
        { id: 'mid', score: 2 },
        { id: 'low', score: 1 },
      ], rng);
      if (id === 'best') best += 1;
    }
    expect(best / rolls).toBeGreaterThanOrEqual(0.7);
    expect(best / rolls).toBeLessThan(0.85);
  });

  it('buys when gold covers the shelf, and fights an elite when the path offers one', () => {
    expect(planShopPurchases({
      cards: [{ index: 0, price: 22, score: 1 }, { index: 1, price: 34, score: 9 }],
      potions: [{ index: 0, price: 18, score: 4 }],
      removePrice: 38,
    }, 22, 0.9, () => 0.99)).toEqual([{ kind: 'card', index: 0 }]);

    expect(planShopPurchases({
      cards: [{ index: 0, price: 22, score: 9 }],
      potions: [{ index: 0, price: 18, score: 1 }],
      removePrice: 38,
    }, 40, 0.4, () => 0.99)[0]).toEqual({ kind: 'potion', index: 0 });

    expect(planShopPurchases({
      cards: [{ index: 0, price: 22, score: 1 }],
      potions: [],
      removePrice: 38,
    }, 10, 0.9, () => 0)).toEqual([]);

    const healthy = {
      elitesFought: 0,
      hpFraction: 0.8,
      gold: 0,
      shopsVisited: 0,
    };
    expect(chooseMapNode([
      { id: 'fight', kind: 'fight', leadsToElite: true, leadsToRest: false, leadsToShop: false },
      { id: 'elite', kind: 'elite', leadsToElite: false, leadsToRest: false, leadsToShop: false },
    ], healthy, () => 0.5)).toBe('elite');

    expect(chooseMapNode([
      { id: 'elite', kind: 'elite', leadsToElite: false, leadsToRest: false, leadsToShop: false },
      { id: 'rest', kind: 'rest', leadsToElite: true, leadsToRest: false, leadsToShop: false },
    ], { ...healthy, hpFraction: 0.2 }, () => 0.5)).toBe('rest');

    expect(chooseMapNode([
      { id: 'fight', kind: 'fight', leadsToElite: false, leadsToRest: false, leadsToShop: false },
      { id: 'elite', kind: 'elite', leadsToElite: false, leadsToRest: false, leadsToShop: false },
    ], { ...healthy, hpFraction: 0.2 }, () => 0.5)).toBe('elite');
  });

  it('can end a turn with cards still uncast after one play', () => {
    const card = { uid: 'a', type: 'attack', damage: 6, block: 0, draw: 0 };
    const persona = { ...CHILD_PERSONAS.firstGrader, skipCastP: 1 };
    expect(chooseCombatAction(persona, [card], 0, 0, 0, () => 0)).toEqual({ kind: 'play', uid: 'a' });
    expect(chooseCombatAction(persona, [card], 0, 0, 1, () => 0)).toEqual({ kind: 'end', uncast: true });
  });
});

describe('one shared model source', () => {
  it('is imported by the browser bridge and the headless runner', () => {
    const bridge = readRepo('src/debug/childModelBridge.ts');
    const sim = readRepo('scripts/simulate-act.ts');
    const main = readRepo('src/main.ts');
    const legacy = readRepo('scripts/simulate-resonance-pool.mjs');
    expect(bridge).toContain("from './childModel'");
    expect(sim).toContain("from '../src/debug/childModel'");
    expect(sim).not.toMatch(/firstTryP/);
    const fold = main.indexOf('import.meta.env.DEV');
    const bridgeImport = main.indexOf('./debug/childModelBridge');
    expect(fold).toBeGreaterThan(0);
    expect(bridgeImport).toBeGreaterThan(fold);
    expect(legacy).toContain('ZS_SIM_ARGS');
    expect(legacy).toContain('vitest.sim.config.ts');
  });
});

describe('headless Act I', () => {
  it('finishes a seeded run for both characters and marks casts synthetic', () => {
    for (const characterId of ['echoMage', 'abacusFist'] as const) {
      const summary = runActI({ characterId, personaId: 'firstGrader', seed: 17_665 });
      expect(['actClear', 'defeat']).toContain(summary.result);
      expect(summary.rooms).toBeGreaterThan(0);
      expect(summary.note).not.toMatch(/stuck/);
      expect(summary.syntheticCasts).toBe(summary.casts);
      if (summary.casts > 0) {
        const buckets = Object.values(summary.buckets).reduce((sum, count) => sum + count, 0);
        expect(buckets).toBe(summary.casts);
      }
    }
  }, 120_000);
});
