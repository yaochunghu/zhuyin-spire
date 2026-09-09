import { beforeEach, describe, expect, it } from 'vitest';
import { createNewRun, pickCharacter } from '../../src/game/state';
import { parseSnapshot, snapshotRun, getSaveStatus, saveRunCheckpoint } from '../../src/game/save';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
});

describe('stable checkpoint compatibility', () => {
  it('preserves existing owned cards and already-generated offers in saves', () => {
    const state = createNewRun();
    pickCharacter(state, 'echoMage');
    state.deck.push({ uid: 'owned-card', defId: 'rw_b144', upgradeLevel: 1 });
    state.rewardOptions = [{ uid: 'saved-offer', defId: 'rw_b041', upgradeLevel: 0 }];
    const restored = parseSnapshot(snapshotRun(state));
    expect(restored?.deck).toContainEqual(state.deck.at(-1));
    expect(restored?.rewardOptions).toEqual(state.rewardOptions);
  });

  it('reports a failed checkpoint and recovers on the next successful stable save', () => {
    const state = createNewRun();
    pickCharacter(state, 'echoMage');
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    saveRunCheckpoint(state);
    expect(getSaveStatus()).toBe('unavailable');
    localStorage.setItem = original;
    saveRunCheckpoint(state);
    expect(getSaveStatus()).toBe('saved');
    state.screen = 'combat';
    saveRunCheckpoint(state);
    expect(getSaveStatus()).toBe('saved');
  });
});
