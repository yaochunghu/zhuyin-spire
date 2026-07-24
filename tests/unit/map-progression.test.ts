import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLIMB_ROWS,
  allStartsReachBoss,
  generateRunMap,
  type ActMap,
} from '../../src/data/map';
import {
  createNewRun,
  debugFinishFight,
  debugStartEncounter,
  pickCharacter,
  pickReward,
  startRun,
} from '../../src/game/state';
import { parseSnapshot, snapshotRun } from '../../src/game/save';

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

function seededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

describe('act floor contract', () => {
  it('builds 15 climb floors, a guaranteed Rest floor, and a 16th-floor boss', () => {
    const runMaps = Array.from({ length: 12 }, (_, seed) =>
      generateRunMap(seededRng(seed + 1))
    );

    for (const runMap of runMaps) {
      for (const act of runMap.acts) {
        expect(act.maxRow).toBe(CLIMB_ROWS);
        expect(CLIMB_ROWS).toBe(15);
        expect(act.nodes.find((node) => node.id === act.bossId)?.row).toBe(15);
        expect(act.nodes.filter((node) => node.kind !== 'boss').every((node) => node.row <= 14))
          .toBe(true);

        const finalClimbFloor = act.nodes.filter((node) => node.row === 14);
        expect(finalClimbFloor.length).toBeGreaterThan(0);
        expect(finalClimbFloor.every((node) => node.kind === 'rest')).toBe(true);
        expect(finalClimbFloor.every((node) => node.nextIds.length === 1)).toBe(true);
        expect(finalClimbFloor.every((node) => node.nextIds[0] === act.bossId)).toBe(true);
        expect(allStartsReachBoss(act)).toBe(true);
      }
    }
  });

  it('upgrades an existing 15-total-floor save without discarding its run', () => {
    const state = createNewRun();
    startRun(state);
    expect(pickCharacter(state, 'echoMage')).toBe(true);
    const snapshot = snapshotRun(state)!;

    for (const act of snapshot.runMap.acts) {
      const rests = act.nodes.filter((node) => node.row === 14);
      const restIds = new Set(rests.map((node) => node.id));
      for (const node of act.nodes) {
        if (node.row === 13) {
          node.nextIds = [
            ...new Set(node.nextIds.map((id) =>
              restIds.has(id) ? act.bossId : id
            )),
          ];
        }
      }
      act.nodes = act.nodes.filter((node) => node.row !== 14);
      act.nodes.find((node) => node.id === act.bossId)!.row = 14;
      act.maxRow = 14;
    }

    const migrated = parseSnapshot(snapshot);
    expect(migrated).not.toBeNull();
    for (const act of migrated!.runMap.acts) {
      expect(act.maxRow).toBe(15);
      expect(act.nodes.find((node) => node.id === act.bossId)?.row).toBe(15);
      expect(act.nodes.filter((node) => node.row === 14).every((node) => node.kind === 'rest'))
        .toBe(true);
      expect(allStartsReachBoss(act as ActMap)).toBe(true);
    }
  });
});

describe('boss recovery', () => {
  it('restores full HP as soon as a boss is cleared', () => {
    const state = createNewRun();
    startRun(state);
    expect(pickCharacter(state, 'echoMage')).toBe(true);
    const boss = state.runMap.acts[0]!.nodes.find((node) => node.kind === 'boss')!;

    state.heroHp = 7;
    state.activeNodeId = boss.id;
    debugStartEncounter(state, boss.enemyId!);
    debugFinishFight(state);

    expect(state.screen).toBe('reward');
    expect(state.heroHp).toBe(state.heroMaxHp);
    expect(state.pendingHeal).toBe(state.heroMaxHp - 7);

    pickReward(state, null);
    expect(state.screen).toBe('actClear');
    expect(state.heroHp).toBe(state.heroMaxHp);
  });
});
