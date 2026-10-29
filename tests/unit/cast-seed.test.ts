import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FIRST_CHARACTER_ID } from '../../src/data/characters';
import { debugCharacterId, debugInspect, debugSetMetaProgress } from '../../src/debug/debugActions';
import { createCombat, makeCard } from '../../src/game/combat';
import { castUint32, castUnit } from '../../src/game/castRng';
import { RUN_RNG_STREAMS, takeRunUnit } from '../../src/game/runRng';
import type { CastPrompt } from '../../src/game/castCheck';
import {
  getActiveProfile,
  getCharacterScore,
  updateActiveProfile,
} from '../../src/game/profiles';
import {
  applySnapshot,
  parseSnapshot,
  resumeSavedRun,
  saveRunCheckpoint,
  snapshotRun,
} from '../../src/game/save';
import {
  answerCast,
  createNewRun,
  getOwnedRelics,
  nextPracticePrompt,
  pickCharacter,
  tryPlayCard,
  type RunState,
} from '../../src/game/state';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function clearLessons(): void {
  updateActiveProfile((profile) => ({
    ...profile,
    castingHistory: { lessons: {} },
  }));
}

function promptSignature(prompt: CastPrompt, cardId: string) {
  return {
    cardId,
    contentId: prompt.contentId,
    mode: prompt.mode,
    lessonFamilyId: prompt.lessonFamilyId,
    answerTokens: [...prompt.answerTokens],
    choiceTokens: [...prompt.choiceTokens],
  };
}

function practiceSequence(seed: number, count: number) {
  clearLessons();
  const state = createNewRun();
  state.castSeed = seed;
  state.castCounter = 0;
  const prompts = [];
  for (let index = 0; index < count; index += 1) {
    nextPracticePrompt(state);
    const cast = state.cast;
    if (!cast) throw new Error('expected a practice prompt');
    prompts.push(promptSignature(cast.prompt, cast.cardDef.id));
  }
  return { prompts, counter: state.castCounter };
}

function armCombat(state: RunState): void {
  state.tutorial = null;
  state.tutorialEligibleRun = false;
  state.combat = createCombat(
    state.deck,
    'slime',
    state.heroHp,
    state.heroMaxHp,
    getOwnedRelics(state),
  );
  state.screen = 'combat';
}

function playBo(state: RunState) {
  const combat = state.combat;
  if (!combat?.enemies[0]) throw new Error('expected a living enemy');
  const card = makeCard('bo');
  combat.hand = [card];
  combat.energy = combat.maxEnergy;
  combat.status = 'playing';
  combat.phase = 'playerAction';
  state.screen = 'combat';
  tryPlayCard(state, card.uid, [combat.enemies[0].id]);
  const prompt = state.cast?.prompt;
  if (!prompt) throw new Error('expected a combat prompt');
  const signature = promptSignature(prompt, 'bo');
  answerCast(state, []);
  return signature;
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('cast prompt stream', () => {
  it('draws the same unit from the same seed and index', () => {
    expect(castUnit(0xa84a, 0)).toBe(castUnit(0xa84a, 0));
    expect(castUnit(0xa84a, 0)).not.toBe(castUnit(0xa84a, 1));
    expect(castUnit(0xa84a, 4)).toBeGreaterThanOrEqual(0);
    expect(castUnit(0xa84a, 4)).toBeLessThan(1);
  });

  it('keeps the practice mixer byte-identical for existing seeds', () => {
    const pinned: Record<number, readonly number[]> = {
      0: [0, 1144304738, 1416247, 958946056, 627933444, 2007157716, 2340967985, 2642484575],
      1: [63, 2693262067, 11749833, 2265367787, 4213581821, 4159151403, 1207330352, 2632122864],
      17665: [1316701674, 2573271168, 754236273, 3490741695, 3865397003, 2660776019, 937219081, 2330980587],
      0xc0ffee: [3842675552, 90802087, 2860920651, 3349951739, 3176491012, 459804437, 2151861270, 626884110],
      0xffffffff: [142530043, 3850105811, 813802916, 3073704848, 4054706436, 3630262831, 2315588663, 2922715533],
    };
    for (const [seedText, values] of Object.entries(pinned)) {
      const seed = Number(seedText);
      expect(values.map((_, index) => castUint32(seed, index))).toEqual([...values]);
      expect(castUnit(seed, 3)).toBe(values[3]! / 0x1_0000_0000);
    }
  });

  it('keeps practice questions unchanged when other run streams advance', () => {
    const untouched = practiceSequence(17665, 4);
    clearLessons();
    const state = createNewRun();
    state.castSeed = 17665;
    state.castCounter = 0;
    for (const name of RUN_RNG_STREAMS) {
      for (let step = 0; step < 20; step += 1) takeRunUnit(state.rng[name]);
    }
    const prompts = [];
    for (let index = 0; index < 4; index += 1) {
      nextPracticePrompt(state);
      const cast = state.cast;
      if (!cast) throw new Error('expected a practice prompt');
      prompts.push(promptSignature(cast.prompt, cast.cardDef.id));
    }
    expect(prompts).toEqual(untouched.prompts);
    expect(state.castCounter).toBe(untouched.counter);
  });

  it('pins practice question bytes for existing seeds', () => {
    // Four prompts each, for seeds 0, 1, 17665, and 0xc0ffee.
    const payload = [0, 1, 17665, 0xc0ffee].map((seed) => ({
      seed,
      sequence: practiceSequence(seed, 4),
    }));
    const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    expect(digest).toBe('91e23d3c86c44b7846f4702ac529b768f4c30476b68f9be6068b46eb86ffb41d');
  });

  it('repeats a practice prompt sequence for the same seed', () => {
    const first = practiceSequence(0x51, 6);
    const second = practiceSequence(0x51, 6);
    expect(second).toEqual(first);
    expect(first.counter).toBeGreaterThan(6);
    expect(practiceSequence(0x52, 6).prompts).not.toEqual(first.prompts);
  });

  it('reloads the same later combat prompts from the saved seed and counter', () => {
    clearLessons();
    const state = createNewRun();
    pickCharacter(state, 'echoMage');
    state.castSeed = 0xc0ffee;
    state.castCounter = 0;
    armCombat(state);
    for (let index = 0; index < 2; index += 1) playBo(state);

    state.screen = 'map';
    saveRunCheckpoint(state);
    const saved = snapshotRun(state);
    expect(saved?.castSeed).toBe(0xc0ffee);
    expect(saved?.castCounter).toBe(state.castCounter);
    const history = structuredClone(getActiveProfile().castingHistory);
    const counter = state.castCounter;

    const later = [playBo(state), playBo(state), playBo(state)];

    const loaded = createNewRun();
    expect(resumeSavedRun(loaded)).toBe(true);
    updateActiveProfile((profile) => ({
      ...profile,
      castingHistory: structuredClone(history),
    }));
    expect(loaded.castSeed).toBe(0xc0ffee);
    expect(loaded.castCounter).toBe(counter);
    expect(JSON.stringify(saved)).not.toContain('remainingAnswerKeys');
    expect(Object.keys(history.lessons).length).toBeGreaterThan(0);

    armCombat(loaded);
    const replay = [playBo(loaded), playBo(loaded), playBo(loaded)];
    expect(replay).toEqual(later);
    expect(loaded.castCounter).toBeGreaterThan(counter);
  });

  it('initializes a seed when an older save omits one', () => {
    const state = createNewRun();
    pickCharacter(state, 'echoMage');
    state.castSeed = 0;
    state.castCounter = 4;
    const saved = snapshotRun(state)!;
    expect(parseSnapshot({ ...saved, castSeed: 0, castCounter: 4 })?.castSeed).toBe(0);

    const legacy = parseSnapshot({ ...saved, castSeed: undefined, castCounter: undefined });
    expect(legacy).not.toBeNull();
    const restored = createNewRun();
    applySnapshot(restored, legacy!);
    expect(Number.isInteger(restored.castSeed)).toBe(true);
    expect(restored.castSeed).toBeGreaterThanOrEqual(0);
    expect(restored.castSeed).toBeLessThanOrEqual(0xffff_ffff);
    expect(restored.castCounter).toBe(0);

    const seedOnly = parseSnapshot({ ...saved, castCounter: null });
    const kept = createNewRun();
    applySnapshot(kept, seedOnly!);
    expect(kept.castSeed).toBe(0);
    expect(kept.castCounter).toBe(0);

    expect(parseSnapshot({ ...saved, castSeed: -1 })).toBeNull();
    expect(parseSnapshot({ ...saved, castCounter: 1.5 })).toBeNull();
  });
});

describe('debug character id', () => {
  it('follows the run character and otherwise writes 共鳴武者', () => {
    const state = createNewRun();
    expect(debugCharacterId(state)).toBe(FIRST_CHARACTER_ID);
    expect(debugInspect(state)).toContain(`meta: ${FIRST_CHARACTER_ID}`);
    pickCharacter(state, 'echoMage');
    expect(debugCharacterId(state)).toBe(state.characterId);
    debugSetMetaProgress(300, state);
    expect(getCharacterScore(getActiveProfile(), debugCharacterId(state))).toBe(300);
  });
});
