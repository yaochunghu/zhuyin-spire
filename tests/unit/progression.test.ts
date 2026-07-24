import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProfile,
  filterUnlockedCardsForProfile,
  getActiveProfile,
  getCharacterCardProgress,
  getCharacterScore,
} from '../../src/game/profiles';
import {
  calculateRunScore,
  createRunScoreStats,
} from '../../src/game/progression';
import {
  commitRunScore,
  createNewRun,
  pickCharacter,
} from '../../src/game/state';
import {
  applySnapshot,
  parseSnapshot,
  snapshotRun,
} from '../../src/game/save';

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

describe('character progression', () => {
  it('starts a fresh learner with the curated 12-card wave', () => {
    const profile = getActiveProfile();
    expect(getCharacterScore(profile, 'echoMage')).toBe(0);
    expect(getCharacterCardProgress(profile, 'echoMage')).toMatchObject({
      unlockedCards: 12,
      totalCards: 12,
      nextUnlockScore: null,
    });
  });

  it('migrates a stored pre-progression profile to score 300', () => {
    getActiveProfile();
    const key = 'zhuyin-spire-learner-profiles-v1';
    const store = JSON.parse(localStorage.getItem(key)!) as {
      profiles: Array<Record<string, unknown>>;
    };
    delete store.profiles[0]!.characterProgress;
    localStorage.setItem(key, JSON.stringify(store));

    const migrated = getActiveProfile();
    expect(getCharacterScore(migrated, 'echoMage')).toBe(300);
    expect(getCharacterCardProgress(migrated, 'echoMage').unlockedCards).toBe(12);
  });

  it('sanitizes malformed and unknown character progress', () => {
    getActiveProfile();
    const key = 'zhuyin-spire-learner-profiles-v1';
    const store = JSON.parse(localStorage.getItem(key)!) as {
      profiles: Array<Record<string, unknown>>;
    };
    store.profiles[0]!.characterProgress = {
      echoMage: { score: -500 },
      unknownHero: { score: 9_999_999_999 },
    };
    localStorage.setItem(key, JSON.stringify(store));

    const sanitized = getActiveProfile();
    expect(getCharacterScore(sanitized, 'echoMage')).toBe(0);
    expect(sanitized.characterProgress).not.toHaveProperty('unknownHero');
  });

  it('starts a new learner with the published 12-card wave', () => {
    createProfile('新玩家', '🐣');
    const profile = getActiveProfile();
    expect(getCharacterCardProgress(profile, 'echoMage')).toMatchObject({
      score: 0,
      unlockedCards: 12,
      totalCards: 12,
      nextUnlockScore: null,
    });
    expect(
      filterUnlockedCardsForProfile(profile, 'echoMage', ['ge', 'ji', 'ci']),
    ).toEqual(['ge']);
  });

  it('banks a terminal score once without publishing unreviewed cards', () => {
    createProfile('新玩家', '🐣');
    const state = createNewRun();
    expect(pickCharacter(state, 'echoMage')).toBe(true);
    state.scoreStats.roomsCompleted = 30;
    state.scoreStats.normalWins = 12;
    state.scoreStats.eliteWins = 1;

    commitRunScore(state, false);
    expect(state.scoreResult).toMatchObject({
      gained: 300,
      cumulativeScore: 300,
    });
    expect(state.scoreResult?.newlyUnlockedCardIds).toEqual([]);
    expect(getCharacterScore(getActiveProfile(), 'echoMage')).toBe(300);

    commitRunScore(state, false);
    expect(getCharacterScore(getActiveProfile(), 'echoMage')).toBe(300);
  });

  it('refuses to start an unknown retired character without mutating the run', () => {
    const state = createNewRun();
    const before = structuredClone(state);
    expect(pickCharacter(state, 'resonanceWarrior')).toBe(false);
    expect(state).toEqual(before);
  });
});

describe('run scorecard', () => {
  it('calculates every gameplay score category exactly', () => {
    const stats = {
      ...createRunScoreStats(),
      roomsCompleted: 2,
      normalWins: 1,
      eliteWins: 1,
      bossWins: 1,
      flawlessElites: 1,
      flawlessBosses: 1,
    };
    const result = calculateRunScore(stats, true);
    expect(result.total).toBe(270);
    expect(result.breakdown.map((item) => item.points)).toEqual([
      10, 10, 30, 75, 15, 30, 100,
    ]);
  });

  it('persists pending score stats in backward-compatible run snapshots', () => {
    const state = createNewRun();
    state.screen = 'map';
    state.scoreStats.roomsCompleted = 7;
    state.scoreStats.normalWins = 3;
    const snapshot = snapshotRun(state)!;
    const parsed = parseSnapshot(snapshot)!;
    const restored = createNewRun();
    applySnapshot(restored, parsed);
    expect(restored.scoreStats).toMatchObject({
      roomsCompleted: 7,
      normalWins: 3,
    });

    const legacy = { ...snapshot };
    delete legacy.scoreStats;
    delete legacy.scoreCommitted;
    const parsedLegacy = parseSnapshot(legacy)!;
    applySnapshot(restored, parsedLegacy);
    expect(restored.scoreStats).toEqual(createRunScoreStats());
  });
});
