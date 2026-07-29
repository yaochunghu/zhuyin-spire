import { beforeEach, describe, expect, it } from 'vitest';
import {
  defaultGameSettings,
  gameplayMs,
  isTutorialComplete,
  loadGameSettings,
  markTutorialComplete,
  parseGameSettings,
  resetTutorialCompletion,
  updateGameSettings,
  LEARNING_REVEAL_CONTINUE_MS,
  LEARNING_REVEAL_TOTAL_MS,
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

describe('GameSettingsV1', () => {
  it('uses safe defaults and validates malformed values', () => {
    expect(defaultGameSettings()).toEqual({
      tutorialEnabled: true,
      animationSpeed: 1,
      combatTipsEnabled: false,
    });
    expect(parseGameSettings(null)).toEqual(defaultGameSettings());
    expect(parseGameSettings({ tutorialEnabled: 'yes', animationSpeed: 99 })).toEqual(
      defaultGameSettings(),
    );
    expect(parseGameSettings({ tutorialEnabled: false, animationSpeed: 2 })).toEqual({
      tutorialEnabled: false,
      animationSpeed: 2,
      combatTipsEnabled: false,
    });
  });

  it('persists speed and scales gameplay timing only when explicitly used', () => {
    updateGameSettings({ animationSpeed: 2 });
    expect(loadGameSettings().animationSpeed).toBe(2);
    expect(gameplayMs(480)).toBe(240);
    expect(gameplayMs(480, 1)).toBe(480);
    expect(LEARNING_REVEAL_CONTINUE_MS).toBe(1_200);
    expect(LEARNING_REVEAL_TOTAL_MS).toBe(2_000);
  });

  it('stores tutorial completion separately and supports replay reset', () => {
    expect(isTutorialComplete()).toBe(false);
    markTutorialComplete();
    expect(isTutorialComplete()).toBe(true);
    resetTutorialCompletion();
    expect(isTutorialComplete()).toBe(false);
  });
});
