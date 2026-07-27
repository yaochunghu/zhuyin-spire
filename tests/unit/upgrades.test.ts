import { beforeEach, describe, expect, it } from 'vitest';
import { CARDS, resolveCard } from '../../src/data/cards';
import {
  beginSmith,
  cancelSmith,
  canSmith,
  createNewRun,
  pickCharacter,
  smithCard,
  startRun,
} from '../../src/game/state';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';

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

function restState() {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  const rest = state.runMap.acts[0]!.nodes.find((node) => node.kind === 'rest')!;
  state.activeNodeId = rest.id;
  state.screen = 'rest' as const;
  return state;
}

describe('card upgrades', () => {
  it('resolves draft + faces without mutating base definitions', () => {
    for (const card of Object.values(CARDS)) {
      const before = structuredClone(card);
      const plus = resolveCard(card.id, 1);
      expect(plus.upgraded).toBe(true);
      expect(plus.upgradeLevel).toBe(1);
      expect(plus.description).toBe(card.upgrade!.description);
      expect(card).toEqual(before);
    }
  });

  it('opens Smith and preserves the rest node when cancelled', () => {
    const state = restState();
    const before = structuredClone(state.deck);
    expect(canSmith(state)).toBe(true);
    expect(beginSmith(state)).toBe(true);
    expect(state.screen).toBe('smith');
    cancelSmith(state);
    expect(state.screen).toBe('rest');
    expect(state.deck).toEqual(before);
    expect(state.activeNodeId).not.toBeNull();
  });

  it('upgrades exactly one physical copy and consumes the rest node', () => {
    const state = restState();
    const target = state.deck[0]!;
    expect(beginSmith(state)).toBe(true);
    expect(smithCard(state, target.uid)).toBe(true);
    expect(state.deck.find((card) => card.uid === target.uid)?.upgradeLevel).toBe(1);
    expect(state.deck.filter((card) => card.upgradeLevel === 1)).toHaveLength(1);
    expect(state.activeNodeId).toBeNull();
    expect(state.screen).toBe('map');
  });

  it('persists a physical upgrade level for future migration compatibility', () => {
    const state = restState();
    const target = state.deck[0]!;
    target.upgradeLevel = 1;
    state.screen = 'map';
    const snapshot = snapshotRun(state)!;
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    expect(restored.deck.find((card) => card.uid === target.uid)?.upgradeLevel).toBe(1);
  });

  it('restores an active Smith checkpoint', () => {
    const state = restState();
    const snapshot = snapshotRun(state)!;
    snapshot.screen = 'smith';
    const restored = createNewRun();
    applySnapshot(restored, snapshot);
    expect(restored.screen).toBe('smith');
  });

  it('migrates a legacy string deck and offers into stable level-zero instances', () => {
    const state = restState();
    state.screen = 'map';
    const modern = snapshotRun(state)!;
    const legacy = {
      ...modern,
      v: 1,
      deck: modern.deck.map((card) => card.defId),
      rewardOptions: ['ge', 'ri'],
      shopOffers: [{ cardId: 'ke', price: 45, sold: false }],
    };
    delete (legacy as { nextCardUid?: number }).nextCardUid;
    const migrated = parseSnapshot(legacy)!;
    expect(migrated.v).toBe(2);
    expect(migrated.deck).toHaveLength(10);
    expect(new Set(migrated.deck.map((card) => card.uid)).size).toBe(10);
    expect(migrated.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
    expect(migrated.rewardOptions.map((card) => card.defId)).toEqual(['ge', 'ri']);
    expect(migrated.shopOffers[0]).toMatchObject({ defId: 'ke', upgradeLevel: 0 });
  });
});
