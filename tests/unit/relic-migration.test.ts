import { beforeEach, describe, expect, it } from 'vitest';
import { createCombat } from '../../src/game/combat';
import { applySnapshot, parseSnapshot, snapshotRun, type RunSnapshot } from '../../src/game/save';
import {
  createNewRun,
  getOwnedRelics,
  pickCharacter,
  startRun,
  type RunState,
} from '../../src/game/state';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

function savedRun(): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  state.screen = 'map';
  return state;
}

function asV2(snapshot: RunSnapshot, relicId: string | null): Record<string, unknown> {
  const legacy: Record<string, unknown> = { ...snapshot, v: 2, relicId };
  delete legacy.relicIds;
  delete legacy.pendingRelicId;
  delete legacy.rewardSource;
  return legacy;
}

describe('relic save migration', () => {
  it('loads a v2 relicId without paying its gold again', () => {
    const state = savedRun();
    state.gold = 40;
    state.relicIds = ['coinPouch'];
    const migrated = parseSnapshot(asV2(snapshotRun(state)!, 'coinPouch'));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(3);
    expect(migrated!.relicIds).toEqual(['coinPouch']);
    const restored = createNewRun();
    applySnapshot(restored, migrated!);
    expect(restored.relicIds).toEqual(['coinPouch']);
    expect(restored.gold).toBe(40);
  });

  it('loads a v2 legacy combat relic and still applies it', () => {
    const state = savedRun();
    const migrated = parseSnapshot(asV2(snapshotRun(state)!, 'shieldCharm'))!;
    const restored = createNewRun();
    applySnapshot(restored, migrated);
    const combat = createCombat(
      restored.deck,
      'slime',
      restored.heroHp,
      restored.heroMaxHp,
      getOwnedRelics(restored),
    );
    expect(combat.block).toBe(2);
  });

  it('loads a v2 save that had not chosen a relic', () => {
    const state = savedRun();
    state.screen = 'relicPick';
    state.characterId = null;
    state.relicIds = [];
    const migrated = parseSnapshot(asV2(snapshotRun(state)!, null))!;
    expect(migrated.relicIds).toEqual([]);
    const restored = createNewRun();
    applySnapshot(restored, migrated);
    expect(restored.relicIds).toEqual([]);
    expect(restored.characterId).toBeNull();
  });

  it('loads a v1 string deck together with its relicId', () => {
    const modern = snapshotRun(savedRun())!;
    const legacy: Record<string, unknown> = {
      ...modern,
      v: 1,
      relicId: 'luckyDraw',
      deck: modern.deck.map((card) => card.defId),
      rewardOptions: [],
      shopOffers: [],
    };
    delete legacy.relicIds;
    delete legacy.nextCardUid;
    delete legacy.pendingRelicId;
    delete legacy.rewardSource;
    const migrated = parseSnapshot(legacy)!;
    expect(migrated.v).toBe(3);
    expect(migrated.relicIds).toEqual(['luckyDraw']);
    expect(migrated.deck).toHaveLength(10);
    expect(migrated.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
    expect(new Set(migrated.deck.map((card) => card.uid)).size).toBe(10);
    const restored = createNewRun();
    applySnapshot(restored, migrated);
    const combat = createCombat(
      ['bo', 'bo', 'bo', 'mo', 'mo', 'mo'],
      'slime',
      40,
      40,
      getOwnedRelics(restored),
    );
    expect(combat.hand).toHaveLength(6);
  });

  it('rejects an unknown v2 relic and a duplicated v3 list', () => {
    const state = savedRun();
    const snapshot = snapshotRun(state)!;
    expect(parseSnapshot(asV2(snapshot, 'echoClapper'))).toBeNull();
    expect(parseSnapshot({ ...snapshot, relicIds: ['tuningFork', 'tuningFork'] })).toBeNull();
    expect(parseSnapshot({ ...snapshot, relicIds: ['not-a-relic'] })).toBeNull();
  });

  it('round-trips the ordered v3 list and the reward relic', () => {
    const state = savedRun();
    state.relicIds = ['tuningFork', 'tempoWood', 'listeningHeart'];
    state.pendingRelicId = 'listeningHeart';
    state.rewardSource = 'treasure';
    state.screen = 'reward';
    const snapshot = snapshotRun(state)!;
    expect(snapshot.v).toBe(3);
    expect(snapshot).not.toHaveProperty('relicId');
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    expect(restored.relicIds).toEqual(['tuningFork', 'tempoWood', 'listeningHeart']);
    expect(restored.pendingRelicId).toBe('listeningHeart');
    expect(restored.rewardSource).toBe('treasure');
  });
});
