import { beforeEach, describe, expect, it } from 'vitest';
import { RELIC_POOL_EXHAUST_GOLD } from '../../src/data/balance';
import { getCard } from '../../src/data/cards';
import { combatModsFor, getRelic, rollRelicDrop } from '../../src/data/relics';
import { makeCard } from '../../src/game/battle/piles';
import {
  beginPlay,
  createCombat,
  endTurn,
  executeEffects,
  resolveCastSuccess,
  type CombatState,
} from '../../src/game/combat';
import { coachForScreen } from '../../src/game/coach';
import { debugEnterAvailable } from '../../src/debug/debugActions';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  acquireRelic,
  createNewRun,
  debugFinishFight,
  debugOpenActTreasure,
  debugStartEncounter,
  getCurrentActNodes,
  getOwnedRelics,
  pickCharacter,
  pickReward,
  selectMapNode,
  startRun,
} from '../../src/game/state';
import { relicTestMap } from '../helpers/relicTestMap';

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

function freshRun() {
  const state = createNewRun();
  startRun(state);
  state.runMap = relicTestMap();
  pickCharacter(state, 'echoMage');
  state.tutorialEligibleRun = false;
  return state;
}

function play(combat: CombatState): void {
  const def = beginPlay(combat, combat.hand[0]!.uid);
  resolveCastSuccess(combat, def);
}

function damage(combat: CombatState, cardId: string): number {
  const enemy = combat.enemies[0]!;
  const before = enemy.hp;
  executeEffects(combat, getCard(cardId), [enemy.id], () => {}, () => []);
  return before - enemy.hp;
}

describe('relic edge cases', () => {
  it('rejects a duplicate acquire and rolls nothing from an empty pool', () => {
    const state = freshRun();
    expect(acquireRelic(state, 'gapThumb')).toBe(true);
    expect(acquireRelic(state, 'gapThumb')).toBe(false);
    expect(state.relicIds.filter((id) => id === 'gapThumb')).toHaveLength(1);
    expect(() => acquireRelic(state, '')).toThrow();
    expect(rollRelicDrop(
      ['tuningFork', 'gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'],
      () => 0,
    )).toBeNull();
  });

  it('pays 20 gold for the next drop after the last pool relic', () => {
    const state = freshRun();
    state.relicIds = ['tuningFork', 'gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart'];
    const nodes = getCurrentActNodes(state);
    const treasure = nodes.find((node) => node.kind === 'treasure')!;
    const parent = nodes.find((node) => node.nextIds.includes(treasure.id))!;
    state.currentNodeId = parent.id;
    state.visitedIds = [parent.id];
    selectMapNode(state, treasure.id);
    expect(state.pendingRelicId).toBe('trainingStance');
    pickReward(state, null);
    expect(state.relicIds).toContain('trainingStance');

    const before = state.gold;
    const boss = nodes.find((node) => node.kind === 'boss')!;
    debugStartEncounter(state, boss.enemyId ?? 'slime');
    state.activeNodeId = boss.id;
    debugFinishFight(state);
    expect(state.pendingRelicId).toBeNull();
    expect(state.relicIds).toHaveLength(6);
    expect(state.gold - before).toBeGreaterThanOrEqual(RELIC_POOL_EXHAUST_GOLD);
    expect(state.rewardOptions).toHaveLength(3);
  });

  it('saves and restores the relic list and its combat modifiers', () => {
    const state = freshRun();
    state.relicIds = ['tuningFork', 'listeningHeart', 'trainingStance'];
    state.screen = 'map';
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshotRun(state)!)!);
    expect(restored.relicIds).toEqual(['tuningFork', 'listeningHeart', 'trainingStance']);
    const combat = createCombat(['bo'], 'slime', 40, 40, getOwnedRelics(restored));
    expect(combat.firstAttackBonusDamage).toBe(1);
    expect(combat.jinGuardBlock).toBe(3);
    expect(combat.training).toBe(1);
  });

  it('rejects duplicate, unknown, and non-string relic ids', () => {
    const state = freshRun();
    state.screen = 'map';
    const snapshot = snapshotRun(state)!;
    expect(parseSnapshot({ ...snapshot, relicIds: ['tuningFork', 'tuningFork'] })).toBeNull();
    expect(parseSnapshot({ ...snapshot, relicIds: ['echoClapper'] })).toBeNull();
    expect(parseSnapshot({ ...snapshot, relicIds: ['tuningFork', 1] })).toBeNull();
  });

  it('counts each relic once when the same definition is passed twice', () => {
    const once = combatModsFor([
      getRelic('tuningFork'),
      getRelic('trainingStance'),
      getRelic('tempoWood'),
    ]);
    const doubled = combatModsFor([
      getRelic('tuningFork'),
      getRelic('tuningFork'),
      getRelic('trainingStance'),
      getRelic('trainingStance'),
      getRelic('tempoWood'),
    ]);
    expect(doubled).toEqual(once);
  });

  it('stacks the fork, the vulnerable hit, the basic hit, and turn-1 練功 before 易傷', () => {
    const combat = createCombat(
      ['bo', 'bo'],
      'rock',
      40,
      40,
      [
        getRelic('tuningFork'),
        getRelic('gapThumb'),
        getRelic('trainingWrap'),
        getRelic('trainingStance'),
      ],
    );
    const enemy = combat.enemies[0]!;
    enemy.hp = 80;
    enemy.vulnerableTurns = 2;
    expect(damage(combat, 'bo')).toBe(12);
    expect(damage(combat, 'bo')).toBe(6);
  });

  it('spends 尋隙指套 on the first vulnerable hit only', () => {
    const combat = createCombat(['bo', 'bo'], 'rock', 40, 40, getRelic('gapThumb'));
    const enemy = combat.enemies[0]!;
    enemy.hp = 40;
    enemy.vulnerableTurns = 2;
    expect(damage(combat, 'bo')).toBe(7);
    expect(damage(combat, 'bo')).toBe(4);
  });

  it('lets 尋隙指套 wait for a vulnerable enemy in an area attack', () => {
    const combat = createCombat(['ri'], ['slime', 'slime'], 40, 40, getRelic('gapThumb'));
    combat.enemies[0]!.hp = 20;
    combat.enemies[1]!.hp = 20;
    combat.enemies[1]!.vulnerableTurns = 2;
    executeEffects(combat, getCard('ri'), [], () => {}, () => []);
    expect(combat.enemies[0]!.hp).toBe(17);
    expect(combat.enemies[1]!.hp).toBe(13);
    expect(combat.vulnerableHitBonusReady).toBe(false);
  });

  it('adds 練功護腕 only to the first basic hit, and 練功起勢 only on turn 1', () => {
    const combat = createCombat(
      ['bo', 'shi', 'bo'],
      'rock',
      40,
      40,
      [getRelic('trainingWrap'), getRelic('trainingStance')],
    );
    combat.enemies[0]!.hp = 80;
    expect(combat.training).toBe(1);
    expect(damage(combat, 'bo')).toBe(5);
    executeEffects(combat, getCard('shi'), [], () => {}, () => []);
    expect(combat.training).toBe(3);
    combat.block = 99;
    endTurn(combat);
    combat.enemies[0]!.block = 0;
    expect(combat.training).toBe(2);
    expect(damage(combat, 'bo')).toBe(6);
    expect(createCombat(['bo'], 'rock', 40, 40, getRelic('trainingStance')).training).toBe(1);
  });

  it('keeps 練功 from a flawless 立身聽勁 after 練功起勢 expires', () => {
    const combat = createCombat(['rw_b128'], 'rock', 40, 40, getRelic('trainingStance'));
    executeEffects(combat, getCard('rw_b128'), [], () => {}, () => []);
    expect(combat.flawlessTrainingPending).toBe(1);
    combat.block = 99;
    endTurn(combat);
    expect(combat.training).toBe(1);
    expect(combat.firstTurnTraining).toBe(0);
  });

  it('holds 聽勁護心 until the next turn after one enemy is fully blocked', () => {
    const combat = createCombat(['mo'], 'slime', 40, 40, getRelic('listeningHeart'));
    combat.block = 4;
    endTurn(combat);
    expect(combat.heroHp).toBe(40);
    expect(combat.jin).toBe(1);
    expect(combat.block).toBe(3);
  });

  it('does not let 聽勁護心 block the next enemy or grant a second 勁', () => {
    const combat = createCombat(['mo'], ['slime', 'slime'], 40, 40, getRelic('listeningHeart'));
    combat.block = 4;
    endTurn(combat);
    expect(combat.jin).toBe(1);
    expect(combat.heroHp).toBe(36);
    expect(combat.block).toBe(3);
  });

  it('still grants both 勁 when the player own block stops both enemies', () => {
    const combat = createCombat(['mo'], ['slime', 'slime'], 40, 40, getRelic('listeningHeart'));
    combat.block = 10;
    endTurn(combat);
    expect(combat.jin).toBe(2);
    expect(combat.heroHp).toBe(40);
    expect(combat.block).toBe(3);
    expect(combat.jinGuardReady).toBe(false);
  });

  it('grants 聽勁護心 immediately when 破綻借力 gives the first 勁', () => {
    const combat = createCombat(['rw_b124'], 'rock', 40, 40, getRelic('listeningHeart'));
    combat.enemies[0]!.vulnerableTurns = 2;
    executeEffects(combat, getCard('rw_b124'), [combat.enemies[0]!.id], () => {}, () => []);
    expect(combat.jin).toBe(2);
    expect(combat.block).toBe(3);
    expect(combat.jinGuardReady).toBe(false);
  });

  it('does not spend 聽勁護心 when 破綻借力 removes no 易傷', () => {
    const combat = createCombat(['rw_b124'], 'rock', 40, 40, getRelic('listeningHeart'));
    executeEffects(combat, getCard('rw_b124'), [combat.enemies[0]!.id], () => {}, () => []);
    expect(combat.jin).toBe(0);
    expect(combat.block).toBe(0);
    expect(combat.jinGuardReady).toBe(true);
  });

  it('grants 聽勁護心 immediately when 剛柔並濟 gives 勁 on the second 轉拍', () => {
    const combat = createCombat(
      ['rw_b131', 'mo', 'bo', 'mo'],
      'rock',
      40,
      40,
      getRelic('listeningHeart'),
    );
    combat.hand = ['rw_b131', 'mo', 'bo', 'mo'].map((id) => makeCard(id));
    combat.energy = 10;
    play(combat);
    play(combat);
    play(combat);
    expect(combat.jin).toBe(0);
    expect(combat.tempoCount).toBe(1);
    play(combat);
    expect(combat.tempoCount).toBe(2);
    expect(combat.jin).toBe(1);
    expect(combat.block).toBe(11);
    expect(combat.jinGuardReady).toBe(false);
  });

  it('does not fire 聽勁護心 when 勁 is already at 9', () => {
    const combat = createCombat(['rw_b124'], 'rock', 40, 40, getRelic('listeningHeart'));
    combat.jin = 9;
    combat.enemies[0]!.vulnerableTurns = 2;
    executeEffects(combat, getCard('rw_b124'), [combat.enemies[0]!.id], () => {}, () => []);
    expect(combat.jin).toBe(9);
    expect(combat.block).toBe(0);
    expect(combat.jinGuardReady).toBe(true);
    combat.block = 4;
    endTurn(combat);
    expect(combat.jin).toBe(9);
    expect(combat.block).toBe(0);
    expect(combat.jinGuardReady).toBe(true);
  });

  it('does not fire 聽勁護心 again after 勁 is spent and regained', () => {
    const combat = createCombat(['rw_b082'], 'slime', 40, 40, getRelic('listeningHeart'));
    combat.jin = 1;
    combat.jinGuardReady = false;
    combat.block = 3;
    executeEffects(combat, getCard('rw_b082'), [combat.enemies[0]!.id], () => {}, () => []);
    expect(combat.jin).toBe(0);
    combat.block = 4;
    endTurn(combat);
    expect(combat.jin).toBe(1);
    expect(combat.block).toBe(0);
    expect(combat.jinGuardReady).toBe(false);
  });

  it('describes chests, bosses, and card-granted 勁 for adults', () => {
    expect(coachForScreen('map', { act: 1 }).body).toContain('一件遺物');
    expect(coachForScreen('map', { act: 1 }).body).not.toContain('選牌');
    const chest = coachForScreen('reward', { rewardSource: 'treasure' });
    expect(chest.body).toContain('沒有選牌');
    expect(chest.body).toContain('20 金幣');
    expect(coachForScreen('reward', { rewardSource: 'fight' }).body).toContain('Boss');
    const note = getRelic('listeningHeart').adultNote;
    expect(note).toContain('破綻借力');
    expect(note).toContain('剛柔並濟');
    expect(note).not.toContain('只在完整擋住');
  });

  it('skips a visited chest and clears a stale fight node', () => {
    const state = freshRun();
    const nodes = getCurrentActNodes(state);
    const treasures = nodes.filter((node) => node.kind === 'treasure');
    const first = treasures[0]!;
    const later = treasures.find((node) => node.id !== first.id)!;
    const parent = nodes.find((node) => node.nextIds.includes(later.id))!;
    state.currentNodeId = parent.id;
    state.visitedIds = [first.id];
    state.pathIds = [parent.id];
    debugEnterAvailable(state, 'treasure');
    expect(state.visitedIds).not.toContain(state.activeNodeId);
    expect(parent.nextIds).toContain(state.activeNodeId);
    state.activeNodeId = first.id;
    debugStartEncounter(state, 'slime');
    expect(state.activeNodeId).toBeNull();
    expect(debugOpenActTreasure(state)).toBe(true);
    expect(state.visitedIds).not.toContain(state.activeNodeId);
  });
});
