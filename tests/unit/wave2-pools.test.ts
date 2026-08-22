import { beforeEach, describe, expect, it } from 'vitest';
import {
  REWARD_POOL_IDS,
  RESONANCE_WAVE_ONE_IDS,
  RESONANCE_WAVE_TWO_IDS,
} from '../../src/data/cards';
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

describe('Wave 2 obtainability pools', () => {
  it('keeps Act I rewards at the nine-card teaching wave', () => {
    const state = scoredRun(300, 0);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool).toHaveLength(9);
    expect(pool.sort()).toEqual([...REWARD_POOL_IDS].sort());
    expect(pool.some((id) => (RESONANCE_WAVE_TWO_IDS as readonly string[]).includes(id))).toBe(false);
  });

  it('offers only Wave 1 in later acts before score 300', () => {
    const state = scoredRun(0, 1);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool.sort()).toEqual([...RESONANCE_WAVE_ONE_IDS].sort());
    expect(pool).toHaveLength(12);
  });

  it('adds the 13 reviewed Commons after score 300 in later acts', () => {
    const state = scoredRun(300, 1);
    const pool = rewardPoolFor(state, 'normal');
    expect(pool).toHaveLength(25);
    expect(new Set(pool)).toEqual(
      new Set([...RESONANCE_WAVE_ONE_IDS, ...RESONANCE_WAVE_TWO_IDS]),
    );
    expect(pool).not.toContain('rw_b024');
    expect(pool).not.toContain('o');
    expect(filterObtainableCardsForProfile(getActiveProfile(), 'echoMage', ['ji', 'rw_b024']))
      .toEqual(['ji']);
  });

  it('uses the same obtainable filter for elite later-act rewards', () => {
    const state = scoredRun(300, 1);
    expect(rewardPoolFor(state, 'elite').sort()).toEqual(rewardPoolFor(state, 'normal').sort());
  });
});
