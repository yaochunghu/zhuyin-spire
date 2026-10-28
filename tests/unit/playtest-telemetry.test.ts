import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCard } from '../../src/data/cards';
import { setDebugSkipCast } from '../../src/debug/debugFlags';
import type { CastingPrompt } from '../../src/game/casting/types';
import { beginPlay } from '../../src/game/combat';
import {
  PLAYTEST_EXPORT_SCHEMA,
  PLAYTEST_STORAGE_KEY,
  exportPlaytestTelemetry,
  priorErrorTagFor,
  clearSyntheticPlaytestMark,
  markSyntheticPlaytest,
  recordCastMeasurement,
  recordPlaytestEvent,
  responseBucketFor,
  sanitizeErrorTag,
  type PlaytestEvent,
} from '../../src/game/playtestTelemetry';
import { openEvent } from '../../src/game/eventEngine';
import {
  answerCast,
  answerEventShrine,
  answerPractice,
  chooseEventChoice,
  confirmEventChoice,
  createNewRun,
  debugFinishFight,
  debugStartEncounter,
  enterPractice,
  pickCharacter,
  startRun,
  tryPlayCard,
  useParentHint,
  type RunState,
} from '../../src/game/state';

const V1_FIXTURE = JSON.parse(readFileSync(
  new URL('../fixtures/playtest-v1-events.json', import.meta.url),
  'utf8',
)) as unknown[];

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const FORBIDDEN_KEYS = [
  'attempt',
  'attempts',
  'answer',
  'answers',
  'typed',
  'typedAnswer',
  'text',
  'question',
  'prompt',
  'promptText',
  'correctSpell',
  'correctParts',
  'choice',
  'choices',
  'choiceTokens',
  'symbolBank',
  'cue',
  'correctionText',
  'contentId',
  'responseMs',
  'responseTime',
  'freeText',
  'selected',
  'spell',
  'word',
  'speechText',
];

const CAST_KEYS = new Set([
  'kind',
  'at',
  'gateId',
  'family',
  'tier',
  'correct',
  'retried',
  'hintLevel',
  'errorTag',
  'responseBucket',
  'synthetic',
]);

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
  setDebugSkipCast(false);
  navigator.webdriver = false;
});

afterEach(() => {
  setDebugSkipCast(false);
  clearSyntheticPlaytestMark();
  navigator.webdriver = false;
  vi.unstubAllGlobals();
});

function stored(): Array<Record<string, unknown>> {
  return JSON.parse(localStorage.getItem(PLAYTEST_STORAGE_KEY) ?? '[]') as Array<Record<string, unknown>>;
}

function casts(): Array<Record<string, unknown>> {
  return stored().filter((event) => event.kind === 'cast');
}

function assertCastShape(event: Record<string, unknown>, secrets: string[]): void {
  expect(event.kind).toBe('cast');
  for (const key of Object.keys(event)) expect(CAST_KEYS.has(key)).toBe(true);
  for (const key of FORBIDDEN_KEYS) expect(event).not.toHaveProperty(key);
  expect(['<5s', '5-15s', '15-30s', '>30s']).toContain(event.responseBucket);
  expect(event).not.toHaveProperty('responseMs');
  const strings = Object.values(event).filter((value): value is string => typeof value === 'string');
  const blob = JSON.stringify(event);
  for (const secret of secrets) {
    expect(strings).not.toContain(secret);
    if (!/^\d+$/.test(secret)) expect(blob).not.toContain(secret);
  }
}

function startFight(characterId: 'echoMage' | 'abacusFist'): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, characterId);
  debugStartEncounter(state, 'slime');
  return state;
}

function playable(state: RunState) {
  const combat = state.combat!;
  const card = combat.hand.find((entry) => getCard(entry.defId).cost <= combat.energy);
  if (!card) throw new Error('no playable card');
  return card;
}

function mathPrompt(answer = '41'): CastingPrompt {
  return {
    id: 'math-telemetry',
    contentId: 'math:add10@1:20 + 21:41',
    gateId: 'math',
    lessonFamilyId: 'add10@1',
    adaptiveFamily: 'placeValue',
    focusGlyph: '+',
    inputMode: 'singleChoice',
    mode: 'recognize',
    cue: {
      text: '20 + 21 = ？',
      emoji: '🧮',
      speechText: '二十加二十一',
      word: '20 + 21',
      spell: answer,
    },
    answerTokens: [answer],
    choiceTokens: ['40', answer, '42'],
    correctSpell: answer,
    correctParts: [answer],
    symbolBank: ['40', answer, '42'],
    correctionText: `答案是 ${answer}`,
    ambientMana: { id: 'clear', icon: '✨', label: '魔力清澈' },
    speechFallback: false,
    createdAt: Date.now() - 8_000,
    tier: 1,
  };
}

describe('response buckets', () => {
  it('keeps only the four buckets and clamps the raw duration', () => {
    expect(responseBucketFor(-1)).toBe('<5s');
    expect(responseBucketFor(0)).toBe('<5s');
    expect(responseBucketFor(4_999)).toBe('<5s');
    expect(responseBucketFor(5_000)).toBe('5-15s');
    expect(responseBucketFor(14_999)).toBe('5-15s');
    expect(responseBucketFor(15_000)).toBe('15-30s');
    expect(responseBucketFor(29_999)).toBe('15-30s');
    expect(responseBucketFor(30_000)).toBe('>30s');
    expect(responseBucketFor(300_000)).toBe('>30s');
    expect(responseBucketFor(300_001)).toBe('>30s');
    expect(responseBucketFor(Number.NaN)).toBe('<5s');
    expect(sanitizeErrorTag('offByOne')).toBe('offByOne');
    expect(sanitizeErrorTag('subjectVerb')).toBe('subjectVerb');
    expect(sanitizeErrorTag('41')).toBeNull();
    expect(sanitizeErrorTag('答案是 41')).toBeNull();
    expect(sanitizeErrorTag('off by one')).toBeNull();
  });
});

describe('注音 gate cast', () => {
  it('emits one cast and stores no spelling, word, or attempt', () => {
    const state = startFight('echoMage');
    tryPlayCard(state, playable(state).uid);
    expect(state.cast?.prompt.gateId).toBe('zhuyin');
    const live = state.cast!.prompt;
    live.createdAt = Date.now() - 8_000;
    const secrets = [live.cue.text, live.correctSpell, live.correctionText, live.cue.word];
    answerCast(state, [...live.correctParts]);
    expect(casts()).toHaveLength(1);
    const event = casts()[0]!;
    assertCastShape(event, secrets);
    expect(event.gateId).toBe('zhuyin');
    expect(String(event.family)).toMatch(/^(initial|vowel):/);
    expect(event.tier).toBeTypeOf('number');
    expect(event.correct).toBe(true);
    expect(event.retried).toBe(false);
    expect(event.hintLevel).toBe(0);
    expect(event.errorTag).toBeNull();
    expect(event.responseBucket).toBe('5-15s');
    expect(Object.values(event)).not.toContain(8_000);
  });

  it('records a wrong practice cast without the typed token', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'echoMage');
    enterPractice(state);
    const live = state.cast!.prompt;
    expect(live.gateId).toBe('zhuyin');
    live.createdAt = Date.now() - 40_000;
    answerPractice(state, ['nope-token']);
    expect(casts()).toHaveLength(1);
    const event = casts()[0]!;
    assertCastShape(event, [live.cue.text, live.correctSpell, 'nope-token']);
    expect(event.correct).toBe(false);
    expect(event.retried).toBe(false);
    expect(event.responseBucket).toBe('>30s');
    expect(event.errorTag).toBeNull();
    expect(priorErrorTagFor(live, ['nope-token'])).toBeNull();
  });
});

describe('珠算 gate cast', () => {
  it('emits one cast for the asked family and tier, with no question or choice', () => {
    const state = startFight('abacusFist');
    tryPlayCard(state, playable(state).uid);
    expect(state.cast?.prompt.gateId).toBe('math');
    const live = state.cast!.prompt;
    live.createdAt = Date.now() - 20_000;
    const secrets = [live.cue.text, live.correctSpell, live.correctionText, ...live.choiceTokens];
    answerCast(state, [live.correctSpell]);
    expect(casts()).toHaveLength(1);
    const event = casts()[0]!;
    assertCastShape(event, secrets);
    expect(event.gateId).toBe('math');
    expect(String(event.family)).not.toContain('@');
    expect(String(event.family).length).toBeGreaterThan(0);
    expect(event.tier).toBe(live.tier);
    expect(event.correct).toBe(true);
    expect(event.retried).toBe(false);
    expect(event.hintLevel).toBe(0);
    expect(event.errorTag).toBeNull();
    expect(event.responseBucket).toBe('15-30s');
  });

  it('waits for the resolving attempt, then keeps the first error tag and drops the typed values', () => {
    const state = startFight('abacusFist');
    const prompt = mathPrompt();
    const def = beginPlay(state.combat!, playable(state).uid);
    state.cast = { prompt, cardDef: def };
    state.screen = 'castCheck';
    expect(answerCast(state, ['nope-token'])).toBe('retry');
    expect(casts()).toHaveLength(0);
    expect(JSON.stringify(state.cast?.prompt)).not.toContain('nope-token');
    expect(state.cast?.prompt.retry).toBe(true);
    expect(state.cast?.prompt.priorErrorTag).toBeUndefined();

    state.cast = {
      prompt: { ...state.cast!.prompt, priorErrorTag: 'carryMissed', createdAt: Date.now() - 12_345 },
      cardDef: def,
    };
    expect(answerCast(state, ['41'])).toBe('success');
    expect(casts()).toHaveLength(1);
    const event = casts()[0]!;
    assertCastShape(event, ['20 + 21 = ？', '答案是 41', 'nope-token', '二十加二十一', '20 + 21']);
    expect(event.family).toBe('add10');
    expect(event.tier).toBe(1);
    expect(event.correct).toBe(true);
    expect(event.retried).toBe(true);
    expect(event.errorTag).toBe('carryMissed');
    expect(event.responseBucket).toBe('5-15s');
    expect(Object.values(event)).not.toContain(12_345);
    expect(Object.values(event)).not.toContain('41');
  });

  it('records 家長協助 as hint level 1 and drops a free-text diagnosis', () => {
    const state = startFight('abacusFist');
    const prompt = mathPrompt();
    state.cast = { prompt, cardDef: beginPlay(state.combat!, playable(state).uid) };
    state.screen = 'castCheck';
    expect(useParentHint(state)).toBe('答案是 41');
    expect(state.cast?.prompt.hintRevealedAnswer).toBe(true);
    expect(answerCast(state, ['nope-token'])).toBe('fizzle');
    const hinted = casts()[0]!;
    assertCastShape(hinted, ['答案是 41', '20 + 21 = ？', 'nope-token']);
    expect(hinted.hintLevel).toBe(1);
    expect(hinted.correct).toBe(false);
    expect(hinted.retried).toBe(false);
    expect(hinted.errorTag).toBeNull();

    const again = state.combat!.hand.find((entry) => getCard(entry.defId).cost <= state.combat!.energy);
    if (!again) throw new Error('no later card');
    const def = beginPlay(state.combat!, again.uid);
    state.cast = {
      prompt: { ...mathPrompt(), retry: true, priorErrorTag: '答案是 41', createdAt: Date.now() - 1_000 },
      cardDef: def,
    };
    state.screen = 'castCheck';
    answerCast(state, ['still-typed']);
    const dropped = casts()[1]!;
    expect(dropped.errorTag).toBeNull();
    assertCastShape(dropped, ['答案是 41', 'still-typed']);
  });
});

describe('gate-generic cast event', () => {
  it('accepts an english gate without another schema and strips answer-shaped fields', () => {
    recordCastMeasurement({
      gateId: 'english',
      family: 'pictureWords',
      tier: 2,
      correct: false,
      retried: true,
      hintLevel: 2,
      errorTag: 'subjectVerb',
      responseMs: 8_000,
      at: 1_700_000_000_000,
    });
    recordPlaytestEvent({
      kind: 'cast',
      at: 2,
      gateId: 'english',
      family: '20 + 21 = ？',
      tier: 1,
      correct: false,
      retried: false,
      hintLevel: 0,
      errorTag: '41',
      responseBucket: '<5s',
      attempt: ['secret-choice'],
      correctSpell: '41',
      question: '20 + 21 = ？',
    } as PlaytestEvent);
    const exported = JSON.parse(exportPlaytestTelemetry()) as { schema: string; events: Array<Record<string, unknown>> };
    expect(exported.schema).toBe('zhuyin-spire-playtest-v2');
    expect(PLAYTEST_EXPORT_SCHEMA).toBe('zhuyin-spire-playtest-v2');
    expect(PLAYTEST_STORAGE_KEY).toBe('zhuyin-spire-playtest-v1');
    expect(localStorage.getItem('zhuyin-spire-playtest-v2')).toBeNull();
    const [english, stripped] = exported.events;
    expect(english).toMatchObject({
      kind: 'cast',
      gateId: 'english',
      family: 'pictureWords',
      tier: 2,
      correct: false,
      retried: true,
      hintLevel: 2,
      errorTag: 'subjectVerb',
      responseBucket: '5-15s',
    });
    expect(english).not.toHaveProperty('synthetic');
    assertCastShape(stripped!, ['secret-choice', '20 + 21 = ？']);
    expect(stripped!.family).toBe('');
    expect(stripped!.errorTag).toBeNull();
    expect(stripped!.gateId).toBe('english');
  });
});

describe('v1 events and synthetic runs', () => {
  it('exports a v1 fixture unchanged under schema v2', () => {
    localStorage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(V1_FIXTURE));
    const exported = JSON.parse(exportPlaytestTelemetry()) as { schema: string; events: unknown[] };
    expect(exported.schema).toBe('zhuyin-spire-playtest-v2');
    expect(exported.events).toEqual(V1_FIXTURE);
    const combatEnd = exported.events[2] as Record<string, unknown>;
    expect(combatEnd.kind).toBe('combatEnd');
    expect(combatEnd).not.toHaveProperty('characterId');
    expect(combatEnd).not.toHaveProperty('synthetic');

    navigator.webdriver = true;
    recordCastMeasurement({
      gateId: 'zhuyin',
      family: 'initial:ㄅ',
      tier: 1,
      correct: true,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 1_000,
      at: 1_800_000_000_000,
    });
    const after = JSON.parse(exportPlaytestTelemetry()) as { schema: string; events: Array<Record<string, unknown>> };
    expect(after.schema).toBe('zhuyin-spire-playtest-v2');
    expect(after.events.slice(0, 3)).toEqual(V1_FIXTURE);
    expect(after.events[3]).toMatchObject({ kind: 'cast', gateId: 'zhuyin', synthetic: true });
    expect(localStorage.getItem(PLAYTEST_STORAGE_KEY)).toContain('"synthetic":true');
  });

  it('marks debug tools and webdriver runs synthetic, and leaves a human run unmarked', () => {
    recordCastMeasurement({
      gateId: 'math',
      family: 'add10',
      tier: 1,
      correct: true,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 100,
    });
    expect(casts()[0]).not.toHaveProperty('synthetic');

    localStorage.setItem('zhuyin-debug', '1');
    recordCastMeasurement({
      gateId: 'math',
      family: 'add10',
      tier: 1,
      correct: true,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 100,
    });
    expect(casts()[1]!.synthetic).toBe(true);
    localStorage.removeItem('zhuyin-debug');

    vi.stubGlobal('window', { location: { search: '?debug=1' } });
    recordCastMeasurement({
      gateId: 'zhuyin',
      family: 'initial:ㄅ',
      tier: 1,
      correct: false,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 100,
    });
    expect(casts()[2]!.synthetic).toBe(true);
    vi.unstubAllGlobals();

    setDebugSkipCast(true);
    recordCastMeasurement({
      gateId: 'math',
      family: 'make10',
      tier: 1,
      correct: true,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 100,
    });
    expect(casts()[3]!.synthetic).toBe(true);
    setDebugSkipCast(false);

    navigator.webdriver = true;
    recordPlaytestEvent({
      kind: 'offer',
      at: 1,
      uid: 'card-9',
      defId: 'bo',
      upgradeLevel: 0,
      act: 1,
      source: 'reward',
    });
    const offer = stored().find((event) => event.kind === 'offer');
    expect(offer).toMatchObject({ synthetic: true, defId: 'bo' });
  });

  it('adds characterId on combatEnd for both heroes and does not emit cast when skip-cast is on', () => {
    for (const characterId of ['echoMage', 'abacusFist'] as const) {
      localStorage.clear();
      const state = createNewRun();
      startRun(state);
      pickCharacter(state, characterId);
      debugStartEncounter(state, 'slime');
      debugFinishFight(state);
      const ended = stored().filter((event) => event.kind === 'combatEnd');
      expect(ended).toHaveLength(1);
      expect(ended[0]).toMatchObject({ kind: 'combatEnd', characterId, won: true });
      expect(ended[0]).not.toHaveProperty('synthetic');
    }

    localStorage.clear();
    setDebugSkipCast(true);
    const state = startFight('echoMage');
    tryPlayCard(state, playable(state).uid);
    expect(state.screen).toBe('combat');
    expect(casts()).toHaveLength(0);
  });

  it('marks a headless model run synthetic only while the mark is set', () => {
    markSyntheticPlaytest();
    recordCastMeasurement({
      gateId: 'math',
      family: 'add10',
      tier: 1,
      correct: false,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 12_000,
    });
    expect(casts()[0]).toMatchObject({ synthetic: true, responseBucket: '5-15s' });
    clearSyntheticPlaytestMark();
    recordCastMeasurement({
      gateId: 'math',
      family: 'add10',
      tier: 1,
      correct: true,
      retried: false,
      hintLevel: 0,
      errorTag: null,
      responseMs: 1_000,
    });
    expect(casts()[1]).not.toHaveProperty('synthetic');
  });
});

describe('event shrine casts', () => {
  it('emits cast for both gates and does not store the prompt text', () => {
    for (const characterId of ['echoMage', 'abacusFist'] as const) {
      localStorage.clear();
      const state = createNewRun();
      startRun(state);
      pickCharacter(state, characterId);
      const node = state.runMap.acts[0]!.nodes.find((candidate) => candidate.row > 0 && candidate.kind !== 'boss');
      if (!node) throw new Error('missing room');
      state.activeNodeId = node.id;
      openEvent(state, node.id, 'event_shared_phonetic_shrine');
      state.screen = 'event';
      chooseEventChoice(state, 'practice');
      confirmEventChoice(state);
      expect(state.screen).toBe('eventCast');
      const live = state.cast!.prompt;
      live.createdAt = Date.now() - 1_000;
      const secrets = [live.cue.text, live.correctSpell, live.correctionText];
      answerEventShrine(state, true);
      expect(casts()).toHaveLength(1);
      const event = casts()[0]!;
      assertCastShape(event, secrets);
      expect(event.gateId).toBe(characterId === 'echoMage' ? 'zhuyin' : 'math');
      expect(event.correct).toBe(true);
      expect(event.errorTag).toBeNull();
      expect(event.responseBucket).toBe('<5s');
    }
  });
});
