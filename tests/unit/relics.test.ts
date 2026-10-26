import { beforeEach, describe, expect, it } from 'vitest';
import { GOLD_ELITE_BASE, GOLD_JITTER, GOLD_TREASURE_BASE, GOLD_TREASURE_JITTER, RELIC_POOL_EXHAUST_GOLD } from '../../src/data/balance';
import { getCard } from '../../src/data/cards';
import {
  RELICS,
  RELIC_POOL_IDS,
  getRelic,
  rollRelicDrop,
} from '../../src/data/relics';
import { runEnemyTurn } from '../../src/game/battle/enemyHandler';
import { makeCard } from '../../src/game/battle/piles';
import {
  beginPlay,
  createCombat,
  endTurn,
  executeEffects,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatFx,
  type CombatState,
} from '../../src/game/combat';
import { getDebugSkipCast } from '../../src/debug/debugFlags';
import {
  acquireRelic,
  createNewRun,
  debugFinishFight,
  getCurrentActNodes,
  getOwnedRelics,
  pickCharacter,
  selectMapNode,
  startRun,
  tryPlayCard,
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

function damageFrom(combat: CombatState, cardId: string): number {
  const enemy = combat.enemies[0]!;
  const before = enemy.hp;
  executeEffects(combat, getCard(cardId), [enemy.id], () => {}, () => []);
  return before - enemy.hp;
}

function playNext(combat: CombatState, success: boolean): void {
  const uid = combat.hand[0]!.uid;
  const def = beginPlay(combat, uid);
  if (success) resolveCastSuccess(combat, def);
  else resolveCastFizzle(combat, def);
}

function freshRun(): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  state.tutorialEligibleRun = false;
  return state;
}

function approach(state: RunState, kind: 'treasure' | 'elite' | 'boss' | 'fight') {
  const nodes = getCurrentActNodes(state);
  const node = nodes.find(
    (candidate) =>
      candidate.kind === kind &&
      nodes.some((parent) => parent.nextIds.includes(candidate.id)),
  );
  if (!node) throw new Error(`Missing ${kind}`);
  const parent = nodes.find((candidate) => candidate.nextIds.includes(node.id));
  if (!parent) throw new Error(`Missing parent for ${kind}`);
  state.currentNodeId = parent.id;
  state.visitedIds = [parent.id];
  state.pathIds = [parent.id];
  return node;
}

describe('0.5 relic pool', () => {
  it('offers three to six 共鳴 relics and keeps the starter and legacy relics out', () => {
    expect(RELIC_POOL_IDS.length).toBeGreaterThanOrEqual(3);
    expect(RELIC_POOL_IDS.length).toBeLessThanOrEqual(6);
    expect(RELICS.tuningFork.source).toBe('starter');
    expect(RELIC_POOL_IDS).not.toContain('tuningFork');
    for (const id of ['shieldCharm', 'coinPouch', 'morningSpark', 'luckyDraw'] as const) {
      expect(RELICS[id].source).toBe('legacy');
      expect(RELIC_POOL_IDS).not.toContain(id);
    }
    for (const id of RELIC_POOL_IDS) {
      const relic = RELICS[id];
      expect(relic.source).toBe('pool');
      expect(relic.name).toMatch(/\p{Script=Han}/u);
      expect(relic.blurb).toMatch(/\p{Script=Han}/u);
      expect(JSON.stringify(relic)).not.toMatch(/skipCast|bypassCast|freeCast/);
      expect(relic.blurb).not.toMatch(/跳過注音|不用念|免去施放/);
    }
    expect(new Set(RELIC_POOL_IDS).size).toBe(RELIC_POOL_IDS.length);
  });

  it('rolls only an unowned pool relic', () => {
    expect(rollRelicDrop(['tuningFork'], () => 0)).toBe(RELIC_POOL_IDS[0]);
    expect(rollRelicDrop(['tuningFork', 'gapThumb'], () => 0)).toBe('trainingWrap');
    expect(rollRelicDrop(['tuningFork', ...RELIC_POOL_IDS], () => 0)).toBeNull();
  });
});

describe('relic effects', () => {
  it('adds 尋隙指套 only to a hit that was already 易傷, before the multiplier', () => {
    const combat = createCombat(['po', 'bo', 'bo'], 'rock', 40, 40, getRelic('gapThumb'));
    combat.enemies[0]!.hp = 80;
    expect(damageFrom(combat, 'po')).toBe(5);
    expect(combat.enemies[0]!.vulnerableTurns).toBe(2);
    expect(combat.vulnerableHitBonusReady).toBe(true);
    expect(damageFrom(combat, 'bo')).toBe(7);
    expect(combat.vulnerableHitBonusReady).toBe(false);
    expect(damageFrom(combat, 'bo')).toBe(4);
    combat.block = 99;
    endTurn(combat);
    combat.enemies[0]!.block = 0;
    expect(combat.vulnerableHitBonusReady).toBe(true);
    expect(damageFrom(combat, 'bo')).toBe(7);
  });

  it('adds 練功護腕 to the first basic hit of the turn only', () => {
    const combat = createCombat(['ge', 'te', 'te'], 'rock', 40, 40, getRelic('trainingWrap'));
    combat.enemies[0]!.hp = 80;
    expect(damageFrom(combat, 'ge')).toBe(6);
    expect(combat.basicHitBonusReady).toBe(true);
    expect(damageFrom(combat, 'te')).toBe(5);
    expect(combat.basicHitBonusReady).toBe(false);
    expect(damageFrom(combat, 'te')).toBe(4);
    combat.block = 99;
    endTurn(combat);
    expect(combat.basicHitBonusReady).toBe(true);
  });

  it('tags pool hit bonuses on the strike so combat can float them', () => {
    const combat = createCombat(
      ['po', 'te'],
      'rock',
      40,
      40,
      [getRelic('gapThumb'), getRelic('trainingWrap')],
    );
    combat.enemies[0]!.hp = 80;
    combat.enemies[0]!.vulnerableTurns = 2;
    const strikes: CombatFx[] = [];
    executeEffects(combat, getCard('te'), [combat.enemies[0]!.id], (fx) => strikes.push(fx), () => []);
    const strike = strikes.find((fx) => fx.type === 'playerStrike');
    expect(strike?.type === 'playerStrike' && strike.impacts[0]).toMatchObject({
      basicRelicBonus: 1,
      vulnerableRelicBonus: 2,
    });
  });

  it('adds 練功起勢 on turn 1 and takes only that 練功 back', () => {
    const combat = createCombat(['bo', 'bo', 'shi'], 'rock', 40, 40, getRelic('trainingStance'));
    combat.enemies[0]!.hp = 40;
    expect(combat.training).toBe(1);
    expect(damageFrom(combat, 'bo')).toBe(4);
    expect(damageFrom(combat, 'bo')).toBe(4);
    executeEffects(combat, getCard('shi'), [], () => {}, () => []);
    expect(combat.training).toBe(3);
    combat.block = 99;
    endTurn(combat);
    expect(combat.turn).toBe(2);
    expect(combat.training).toBe(2);
    expect(combat.firstTurnTraining).toBe(0);
    combat.enemies[0]!.block = 0;
    expect(damageFrom(combat, 'bo')).toBe(5);
  });

  it('lets 練功起勢 and 練功護腕 stack on turn 1 only', () => {
    const combat = createCombat(
      ['bo', 'bo'],
      'rock',
      40,
      40,
      [getRelic('trainingStance'), getRelic('trainingWrap')],
    );
    combat.enemies[0]!.hp = 40;
    expect(damageFrom(combat, 'bo')).toBe(5);
    expect(damageFrom(combat, 'bo')).toBe(4);
    combat.block = 99;
    endTurn(combat);
    combat.enemies[0]!.block = 0;
    expect(combat.training).toBe(0);
    expect(damageFrom(combat, 'bo')).toBe(4);
    expect(damageFrom(combat, 'bo')).toBe(3);
  });

  it('gives 換拍木魚 block only for a successful 轉拍, once per turn', () => {
    const combat = createCombat(['mo', 'bo', 'bo'], 'rock', 40, 40, getRelic('tempoWood'));
    combat.hand = ['mo', 'bo', 'bo'].map((id) => makeCard(id));
    combat.energy = 10;
    playNext(combat, true);
    expect(combat.block).toBe(4);
    expect(combat.tempoRelicReady).toBe(true);
    playNext(combat, false);
    expect(combat.block).toBe(4);
    expect(combat.tempoRelicReady).toBe(true);
    playNext(combat, true);
    expect(combat.block).toBe(6);
    expect(combat.tempoRelicReady).toBe(false);
    expect(combat.tempoCount).toBe(1);

    const again = createCombat(['mo', 'bo', 'mo'], 'rock', 40, 40, getRelic('tempoWood'));
    again.hand = ['mo', 'bo', 'mo'].map((id) => makeCard(id));
    again.energy = 10;
    playNext(again, true);
    playNext(again, true);
    playNext(again, true);
    expect(again.block).toBe(10);
    expect(again.tempoCount).toBe(2);
  });

  it('gives 聽勁護心 block once, only after a full block actually grants 勁', () => {
    const combat = createCombat(['mo'], ['slime', 'slime'], 40, 40, getRelic('listeningHeart'));
    combat.block = 8;
    runEnemyTurn(combat);
    expect(combat.jin).toBe(2);
    expect(combat.block).toBe(3);
    expect(combat.jinGuardReady).toBe(false);

    const leaked = createCombat(['mo'], 'slime', 40, 40, getRelic('listeningHeart'));
    leaked.block = 2;
    runEnemyTurn(leaked);
    expect(leaked.heroHp).toBe(38);
    expect(leaked.jin).toBe(0);
    expect(leaked.block).toBe(0);
    expect(leaked.jinGuardReady).toBe(true);

    const capped = createCombat(['mo'], 'slime', 40, 40, getRelic('listeningHeart'));
    capped.jin = 9;
    capped.block = 10;
    runEnemyTurn(capped);
    expect(capped.jin).toBe(9);
    expect(capped.block).toBe(6);
    expect(capped.jinGuardReady).toBe(true);
  });

  it('still applies the four legacy relics for old saves', () => {
    expect(createCombat(['bo'], 'slime', 40, 40, getRelic('shieldCharm')).block).toBe(2);
    const spark = createCombat(['bo'], 'slime', 40, 40, getRelic('morningSpark'));
    expect(spark.energy).toBe(4);
    expect(spark.maxEnergy).toBe(3);
    spark.block = 99;
    endTurn(spark);
    expect(spark.energy).toBe(3);
    const drawn = createCombat(
      ['bo', 'bo', 'bo', 'mo', 'mo', 'mo'],
      'slime',
      40,
      40,
      getRelic('luckyDraw'),
    );
    expect(drawn.hand).toHaveLength(6);

    const state = freshRun();
    state.gold = 3;
    state.relicIds = [];
    expect(acquireRelic(state, 'coinPouch')).toBe(true);
    expect(state.gold).toBe(17);
    expect(acquireRelic(state, 'coinPouch')).toBe(false);
    expect(state.gold).toBe(17);
  });

  it('does not resolve a card without the cast screen', () => {
    expect(getDebugSkipCast()).toBe(false);
    const state = freshRun();
    state.relicIds = ['tuningFork', ...RELIC_POOL_IDS];
    const fight = getCurrentActNodes(state).find((node) => node.kind === 'fight' && node.row === 0)!;
    selectMapNode(state, fight.id);
    expect(state.screen).toBe('combat');
    const hp = state.combat!.enemies[0]!.hp;
    tryPlayCard(state, state.combat!.hand[0]!.uid);
    expect(state.screen).toBe('castCheck');
    expect(state.combat!.pending).not.toBeNull();
    expect(state.combat!.enemies[0]!.hp).toBe(hp);
  });
});

describe('relic drops', () => {
  it('gives a chest one pool relic and no card choice', () => {
    const state = freshRun();
    const treasure = approach(state, 'treasure');
    const before = state.gold;
    selectMapNode(state, treasure.id);
    expect(state.screen).toBe('reward');
    expect(state.rewardSource).toBe('treasure');
    expect(state.rewardOptions).toEqual([]);
    expect(RELIC_POOL_IDS as readonly string[]).toContain(state.pendingRelicId);
    expect(state.relicIds).toEqual(['tuningFork', state.pendingRelicId]);
    const gain = state.gold - before;
    expect(gain).toBeGreaterThanOrEqual(GOLD_TREASURE_BASE);
    expect(gain).toBeLessThan(GOLD_TREASURE_BASE + GOLD_TREASURE_JITTER);
  });

  it('gives an elite a relic in addition to the card reward', () => {
    const state = freshRun();
    const elite = approach(state, 'elite');
    selectMapNode(state, elite.id);
    expect(state.screen).toBe('combat');
    expect(getOwnedRelics(state).map((relic) => relic.id)).toEqual(['tuningFork']);
    debugFinishFight(state);
    expect(state.screen).toBe('reward');
    expect(state.rewardSource).toBe('fight');
    expect(state.rewardOptions).toHaveLength(3);
    expect(RELIC_POOL_IDS as readonly string[]).toContain(state.pendingRelicId);
    expect(state.relicIds).toEqual(['tuningFork', state.pendingRelicId]);
  });

  it('pays gold when the pool is already owned', () => {
    const state = freshRun();
    state.relicIds = ['tuningFork', ...RELIC_POOL_IDS];
    const treasure = approach(state, 'treasure');
    const before = state.gold;
    selectMapNode(state, treasure.id);
    expect(state.pendingRelicId).toBeNull();
    expect(state.relicIds).toEqual(['tuningFork', ...RELIC_POOL_IDS]);
    const gain = state.gold - before;
    expect(gain).toBeGreaterThanOrEqual(GOLD_TREASURE_BASE + RELIC_POOL_EXHAUST_GOLD);
    expect(gain).toBeLessThan(GOLD_TREASURE_BASE + GOLD_TREASURE_JITTER + RELIC_POOL_EXHAUST_GOLD);
  });

  it('does not drop a relic for a normal fight', () => {
    const fightRun = freshRun();
    const fight = approach(fightRun, 'fight');
    selectMapNode(fightRun, fight.id);
    debugFinishFight(fightRun);
    expect(fightRun.pendingRelicId).toBeNull();
    expect(fightRun.relicIds).toEqual(['tuningFork']);
    expect(fightRun.rewardOptions).toHaveLength(3);
  });

  it('gives a boss a relic in addition to the card reward and full heal', () => {
    const state = freshRun();
    state.heroHp = 7;
    const boss = approach(state, 'boss');
    selectMapNode(state, boss.id);
    debugFinishFight(state);
    expect(state.screen).toBe('reward');
    expect(state.rewardSource).toBe('fight');
    expect(state.heroHp).toBe(state.heroMaxHp);
    expect(state.rewardOptions).toHaveLength(3);
    expect(RELIC_POOL_IDS as readonly string[]).toContain(state.pendingRelicId);
    expect(state.relicIds).toEqual(['tuningFork', state.pendingRelicId]);
  });

  it('pays exhaust gold on a boss when the pool is already owned', () => {
    const state = freshRun();
    state.relicIds = ['tuningFork', ...RELIC_POOL_IDS];
    const before = state.gold;
    const boss = approach(state, 'boss');
    selectMapNode(state, boss.id);
    debugFinishFight(state);
    expect(state.pendingRelicId).toBeNull();
    expect(state.relicIds).toEqual(['tuningFork', ...RELIC_POOL_IDS]);
    expect(state.rewardOptions).toHaveLength(3);
    const gain = state.gold - before;
    expect(gain).toBeGreaterThanOrEqual(GOLD_ELITE_BASE + RELIC_POOL_EXHAUST_GOLD);
    expect(gain).toBeLessThan(GOLD_ELITE_BASE + GOLD_JITTER + RELIC_POOL_EXHAUST_GOLD);
  });
});
