import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProfile,
  getActiveProfile,
  getCastingPreferences,
  getProfiles,
  recordCastingResult,
  saveCastingPreferences,
  switchProfile,
  updateActiveProfile,
} from '../../src/game/profiles';
import {
  createNewRun,
  startRun,
} from '../../src/game/state';
import {
  activeRunSaveKey,
  hasSavedRun,
  loadSnapshot,
  saveRunCheckpoint,
  snapshotRun,
} from '../../src/game/save';
import {
  isTutorialComplete,
  markTutorialComplete,
} from '../../src/game/settings';

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

describe('learner profiles', () => {
  it('adopts an existing v1 run as the first learner without rewriting it', () => {
    const legacyRun = createNewRun();
    legacyRun.screen = 'relicPick';
    const snapshot = snapshotRun(legacyRun)!;
    localStorage.setItem('zhuyin-spire-run-v1', JSON.stringify(snapshot));

    const first = getActiveProfile();
    expect(hasSavedRun()).toBe(true);
    expect(loadSnapshot()?.screen).toBe('relicPick');
    expect(activeRunSaveKey()).toContain(first.id);
  });

  it('migrates legacy learning settings and progress into the first profile', () => {
    localStorage.setItem('zhuyin-spire-practice-correct', '12');
    localStorage.setItem('zhuyin-spire-run-count', '3');
    localStorage.setItem('zhuyin-spire-tutorial-complete-v1', '1');
    localStorage.setItem(
      'zhuyin-spire-phrase-settings-v1',
      JSON.stringify({ packs: ['food'], excludeWords: ['飯'] }),
    );

    const profile = getActiveProfile();
    expect(profile).toMatchObject({
      name: '小玩家 1',
      practiceCorrect: 12,
      completedRuns: 3,
      tutorialComplete: true,
    });
    expect(profile.casting.packs).toEqual(['food']);
    expect(profile.casting.excludeWords).toEqual(['飯']);
  });

  it('keeps curriculum, learning history, and stats separate per child', () => {
    const first = getActiveProfile();
    saveCastingPreferences({ ...getCastingPreferences(), maxAnswerParts: 2 });
    recordCastingResult('zhuyin:initial:ㄅ', true, 800);
    updateActiveProfile((profile) => ({ ...profile, practiceCorrect: 5 }));
    const newRun = createNewRun();
    startRun(newRun);
    expect(getCastingPreferences().maxAnswerParts).toBe(2);

    const second = createProfile('米米', '🐰')!;
    expect(second.id).not.toBe(first.id);
    expect(getCastingPreferences().maxAnswerParts).toBe(4);
    expect(getActiveProfile().practiceCorrect).toBe(0);

    switchProfile(first.id);
    expect(getCastingPreferences().maxAnswerParts).toBe(2);
    expect(getActiveProfile().practiceCorrect).toBe(5);
    expect(getActiveProfile().castingHistory.lessons['zhuyin:initial:ㄅ']?.correct).toBe(1);
    expect(getProfiles()).toHaveLength(2);
  });

  it('tracks first-battle tutorial completion per child', () => {
    const firstId = getActiveProfile().id;
    markTutorialComplete();
    expect(isTutorialComplete()).toBe(true);

    createProfile('樂樂', '🐻');
    expect(isTutorialComplete()).toBe(false);
    markTutorialComplete();
    expect(isTutorialComplete()).toBe(true);

    switchProfile(firstId);
    expect(isTutorialComplete()).toBe(true);
  });

  it('uses an independent resumable run slot for every profile', () => {
    const firstId = getActiveProfile().id;
    const firstRun = createNewRun();
    startRun(firstRun);
    saveRunCheckpoint(firstRun);
    expect(hasSavedRun()).toBe(true);
    expect(activeRunSaveKey()).toContain(firstId);

    const second = createProfile('安安', '🐣')!;
    expect(hasSavedRun()).toBe(false);
    const secondRun = createNewRun();
    startRun(secondRun);
    saveRunCheckpoint(secondRun);
    expect(activeRunSaveKey()).toContain(second.id);
    expect(hasSavedRun()).toBe(true);

    switchProfile(firstId);
    expect(hasSavedRun()).toBe(true);
  });
});
