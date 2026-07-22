import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllAppData, isAppStorageKey } from '../../src/game/privacy';
import { sanitizeNickname } from '../../src/game/profiles';
import { parseSnapshot, snapshotRun } from '../../src/game/save';
import { createNewRun, pickCharacter, startRun } from '../../src/game/state';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function validSnapshot() {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  const snapshot = snapshotRun(state);
  if (!snapshot) throw new Error('Expected stable map checkpoint');
  return snapshot;
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('privacy boundaries', () => {
  it('deletes only this game data', () => {
    localStorage.setItem('zhuyin-spire-run-v1', 'game');
    localStorage.setItem('zhuyin-debug', '1');
    localStorage.setItem('another-app', 'keep');
    clearAllAppData();
    expect(localStorage.getItem('zhuyin-spire-run-v1')).toBeNull();
    expect(localStorage.getItem('zhuyin-debug')).toBeNull();
    expect(localStorage.getItem('another-app')).toBe('keep');
    expect(isAppStorageKey('zhuyin-spire-settings')).toBe(true);
    expect(isAppStorageKey('another-app')).toBe(false);
  });

  it('normalizes short nicknames and strips invisible controls', () => {
    expect(sanitizeNickname('  小\u202e 玩家\n一號  ')).toBe('小 玩家一號');
    expect(Array.from(sanitizeNickname('abcdefghijklmnop')).length).toBe(12);
  });
});

describe('untrusted save validation', () => {
  it('accepts a real stable checkpoint, including duplicate cards', () => {
    const snapshot = validSnapshot();
    expect(new Set(snapshot.deck.map((card) => card.defId)).size).toBeLessThan(snapshot.deck.length);
    expect(new Set(snapshot.deck.map((card) => card.uid)).size).toBe(snapshot.deck.length);
    expect(parseSnapshot(snapshot)).not.toBeNull();
  });

  it('rejects wrong primitive types and unknown content ids', () => {
    const snapshot = validSnapshot();
    expect(parseSnapshot({ ...snapshot, gold: '999' })).toBeNull();
    expect(parseSnapshot({
      ...snapshot,
      deck: [...snapshot.deck, { uid: 'bad', defId: 'unknown-card', upgradeLevel: 0 }],
    })).toBeNull();
  });

  it('rejects duplicate physical UIDs and unsupported permanent upgrades', () => {
    const snapshot = validSnapshot();
    const duplicateUid = structuredClone(snapshot);
    duplicateUid.deck[1]!.uid = duplicateUid.deck[0]!.uid;
    expect(parseSnapshot(duplicateUid)).toBeNull();

    const invalidUpgrade = structuredClone(snapshot);
    const unupgradedDefinition = invalidUpgrade.deck.find((card) => card.defId === 'po')!;
    unupgradedDefinition.upgradeLevel = 2;
    expect(parseSnapshot(invalidUpgrade)).toBeNull();
  });

  it('rejects markup in persisted map labels and invalid graph edges', () => {
    const markup = structuredClone(validSnapshot());
    markup.runMap.acts[0]!.title = '<img src=x onerror=alert(1)>';
    expect(parseSnapshot(markup)).toBeNull();

    const broken = structuredClone(validSnapshot());
    broken.runMap.acts[0]!.nodes[0]!.nextIds = ['not-a-real-node'];
    expect(parseSnapshot(broken)).toBeNull();
  });
});
