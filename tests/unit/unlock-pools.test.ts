import { beforeEach, describe, expect, it } from 'vitest';
import { REWARD_POOL_IDS } from '../../src/data/cards';
import { getCharacter } from '../../src/data/characters';
import {
  filterObtainableCardsForProfile,
  getActiveProfile,
  updateActiveProfile,
} from '../../src/game/profiles';
import {
  createNewRun,
  pickCharacter,
  rewardPoolFor,
  startRun,
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

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

function scoredRun(score: number, actIndex: number) {
  updateActiveProfile((profile) => ({
    ...profile,
    characterProgress: {
      ...profile.characterProgress,
      echoMage: { score },
    },
  }));
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  state.actIndex = actIndex;
  return state;
}

describe('score-based card obtainability', () => {
  it('keeps Act I rewards at the nine-card teaching wave', () => {
    const state = scoredRun(300, 0);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool).toHaveLength(9);
    expect(pool).toEqual(REWARD_POOL_IDS);
  });

  it('starts later acts with the 12-card teaching pool', () => {
    const state = scoredRun(0, 1);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool).toHaveLength(12);
    expect(pool).toContain('bo');
    expect(pool).toContain('fo');
  });

  it('unlocks the first 21-card expansion at score 300', () => {
    const state = scoredRun(300, 1);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool).toHaveLength(33);
    expect(pool).toContain('rw_b024');
    expect(pool).toContain('o');
    expect(filterObtainableCardsForProfile(getActiveProfile(), 'echoMage', ['ji', 'rw_b024']))
      .toEqual(['ji', 'rw_b024']);
  });

  it('unlocks 54 cards at 1000 and the complete 75 at 2000', () => {
    expect(rewardPoolFor(scoredRun(1000, 1), 'normal')).toHaveLength(54);
    const complete = rewardPoolFor(scoredRun(2000, 1), 'normal');
    expect(complete).toHaveLength(75);
    const character = getCharacter('echoMage');
    if (character.status !== 'playable') throw new Error('Expected playable character');
    expect(new Set(complete)).toEqual(new Set(character.cardPoolIds));
  });

  it('uses the same score filter for elite later-act rewards', () => {
    const state = scoredRun(1000, 1);
    expect(rewardPoolFor(state, 'elite').sort()).toEqual(rewardPoolFor(state, 'normal').sort());
  });
});
