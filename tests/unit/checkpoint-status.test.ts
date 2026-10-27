import { beforeEach, describe, expect, it } from 'vitest';
import { FIRST_CHARACTER_ID } from '../../src/data/characters';
import { createNewRun, pickCharacter, startRun } from '../../src/game/state';
import { applySnapshot, parseSnapshot, snapshotRun, getSaveStatus, saveRunCheckpoint } from '../../src/game/save';

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

  it('rejects an unknown character id and resumes a legacy id as 共鳴武者', () => {
    const state = createNewRun();
    expect(pickCharacter(state, 'echoMage')).toBe(true);
    const saved = snapshotRun(state);
    expect(saved).not.toBeNull();
    expect(parseSnapshot({ ...saved!, characterId: 'abacusFist' })).toBeNull();
    expect(parseSnapshot({ ...saved!, characterId: 'not-a-character' })).toBeNull();

    const legacy = parseSnapshot({ ...saved!, characterId: undefined });
    expect(legacy).not.toBeNull();
    const restored = createNewRun();
    applySnapshot(restored, legacy!);
    expect(restored.characterId).toBe(FIRST_CHARACTER_ID);

    const missing = parseSnapshot({ ...saved!, characterId: null });
    expect(missing).not.toBeNull();
    const restoredNull = createNewRun();
    applySnapshot(restoredNull, missing!);
    expect(restoredNull.characterId).toBe(FIRST_CHARACTER_ID);

    const pickingState = createNewRun();
    startRun(pickingState);
    const picking = snapshotRun(pickingState);
    expect(picking?.screen).toBe('relicPick');
    expect(picking?.characterId ?? null).toBeNull();
    const openPick = parseSnapshot({ ...picking!, characterId: null });
    expect(openPick).not.toBeNull();
    const pickState = createNewRun();
    applySnapshot(pickState, openPick!);
    expect(pickState.characterId).toBeNull();
  });
});
