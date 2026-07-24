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

describe('inactive card-upgrade foundation', () => {
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

  it('keeps Smith gated for the first character', () => {
    const state = restState();
    const before = structuredClone(state.deck);
    expect(canSmith(state)).toBe(false);
    expect(beginSmith(state)).toBe(false);
    cancelSmith(state);
    expect(state.screen).toBe('rest');
    expect(state.deck).toEqual(before);
    expect(state.activeNodeId).not.toBeNull();
  });

  it('refuses direct Smith mutations while the feature is gated', () => {
    const state = restState();
    const target = state.deck[0]!;
    state.screen = 'smith';
    expect(smithCard(state, target.uid)).toBe(false);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
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

  it('returns a dormant Smith checkpoint to the campfire', () => {
    const state = restState();
    const snapshot = snapshotRun(state)!;
    snapshot.screen = 'smith';
    const restored = createNewRun();
    applySnapshot(restored, snapshot);
    expect(restored.screen).toBe('rest');
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
