import { beforeEach, describe, expect, it } from 'vitest';
import {
  CARDS,
  LATER_ACT_ELITE_REWARD_POOL_IDS,
  LATER_ACT_REWARD_POOL_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCard,
} from '../../src/data/cards';
import { getCharacter } from '../../src/data/characters';
import { getRelic } from '../../src/data/relics';
import {
  beginPlay,
  createCombat,
  endTurn,
  executeEffects,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatFx,
} from '../../src/game/combat';
import { applyEnemyIntent } from '../../src/game/battle/enemyHandler';
import {
  canSmith,
  createNewRun,
  pickCharacter,
  startRun,
} from '../../src/game/state';
import { applySnapshot, snapshotRun, type RunSnapshotV1 } from '../../src/game/save';

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

describe('共鳴武者 catalog', () => {
  it('keeps the 75-card implementation draft outside the live wave', () => {
    const character = getCharacter('echoMage');
    expect(Object.keys(CARDS)).toHaveLength(75);
    expect(new Set(Object.values(CARDS).map((card) => card.designId)).size).toBe(75);
    expect(Object.values(CARDS).every((card) => card.type !== 'block')).toBe(true);
    expect(character.status).toBe('playable');
    if (character.status !== 'playable') throw new Error('Expected playable character');
    expect(character.cardPoolIds).toHaveLength(12);
    expect(character.upgradesEnabled).toBe(false);
    expect(Object.values(CARDS).every((card) => !!card.upgrade)).toBe(true);
  });

  it('keeps the simple 5/4/1 starter and nine-card first reward wave', () => {
    expect(STARTER_DECK_IDS).toHaveLength(10);
    expect(STARTER_DECK_IDS.filter((id) => id === 'bo')).toHaveLength(5);
    expect(STARTER_DECK_IDS.filter((id) => id === 'mo')).toHaveLength(4);
    expect(STARTER_DECK_IDS.filter((id) => id === 'po')).toHaveLength(1);
    expect(REWARD_POOL_IDS).toHaveLength(9);
    expect(REWARD_POOL_IDS.some((id) => STARTER_DECK_IDS.includes(id))).toBe(false);
    expect(LATER_ACT_REWARD_POOL_IDS).toEqual(REWARD_POOL_IDS);
    expect(LATER_ACT_ELITE_REWARD_POOL_IDS).toEqual(REWARD_POOL_IDS);
    expect(getCard('mo')).toMatchObject({ type: 'skill', designId: 'B002' });
    const liveIds = [...new Set([...STARTER_DECK_IDS, ...REWARD_POOL_IDS])];
    expect(liveIds).toHaveLength(12);
    expect(liveIds.every((id) => getCard(id).cues.length >= 2)).toBe(true);
    expect(
      liveIds.every((id) =>
        !/\b(?:Deal|Gain|Apply|Draw|Spend|Cannot|Costs)\b/.test(getCard(id).description)
      ),
    ).toBe(true);
  });

  it('creates physical starter copies and preserves the compatibility lineage', () => {
    const character = getCharacter('echoMage');
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, character.id);
    expect(character.name).toBe('共鳴武者');
    expect(state.deck.map((card) => card.defId)).toEqual(character.starterDeckIds);
    expect(new Set(state.deck.map((card) => card.uid)).size).toBe(10);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
    expect(getRelic(state.relicId!).firstAttackBonusDamage).toBe(1);
  });

  it('keeps Smith unavailable until authored upgrades are approved', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'echoMage');
    const rest = state.runMap.acts[0]!.nodes.find((node) => node.kind === 'rest')!;
    state.activeNodeId = rest.id;
    state.screen = 'rest';
    expect(canSmith(state)).toBe(false);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
  });

  it('loads a checkpoint without replacing its selected relic', () => {
    const source = createNewRun();
    startRun(source);
    pickCharacter(source, 'echoMage');
    source.relicId = 'coinPouch';
    const snapshot = snapshotRun(source)!;
    delete (snapshot as Partial<RunSnapshotV1>).characterId;
    const restored = createNewRun();
    applySnapshot(restored, snapshot);
    expect(restored.characterId).toBe('echoMage');
    expect(restored.relicId).toBe('coinPouch');
  });
});

describe('共鳴 combat rules', () => {
  const noDraw = () => [];
  const collect = (events: CombatFx[]) => (fx: CombatFx) => events.push(fx);

  it('amplifies Attack damage by 易傷', () => {
    const combat = createCombat(['po', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    expect(enemy.vulnerableTurns).toBe(2);
    const hpBefore = enemy.hp;
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hpBefore - 4);
  });

  it('adds 練功 to every hit of a 基礎攻擊', () => {
    const combat = createCombat(['shi', 'te'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('shi'), [], () => {}, noDraw);
    expect(combat.training).toBe(2);
    const hpBefore = enemy.hp;
    executeEffects(combat, getCard('te'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hpBefore - 8);
  });

  it('grants one 勁 when an enemy attack action is fully blocked', () => {
    const combat = createCombat(['mo'], 'slime', 30, 30);
    combat.block = 99;
    endTurn(combat);
    expect(combat.jin).toBe(1);
  });

  it('treats a multi-hit intent as one 化勁 action and rejects any HP leak', () => {
    const blocked = createCombat(['mo'], 'bat', 30, 30);
    blocked.block = 4;
    applyEnemyIntent(blocked, blocked.enemies[0]!);
    expect(blocked.heroHp).toBe(30);
    expect(blocked.jin).toBe(1);

    const leaked = createCombat(['mo'], 'bat', 30, 30);
    leaked.block = 3;
    applyEnemyIntent(leaked, leaked.enemies[0]!);
    expect(leaked.heroHp).toBe(29);
    expect(leaked.jin).toBe(0);
  });

  it('triggers 轉拍 only after two successful alternating casts', () => {
    const combat = createCombat(['mo', 'yi', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    const shield = combat.hand.find((card) => card.defId === 'mo')!;
    const tempoAttack = combat.hand.find((card) => card.defId === 'yi')!;

    const shieldDef = beginPlay(combat, shield.uid);
    resolveCastSuccess(combat, shieldDef);
    expect(combat.lastPlayedType).toBe('skill');
    const blockBefore = combat.block;

    const attackDef = beginPlay(combat, tempoAttack.uid, [enemy.id]);
    resolveCastSuccess(combat, attackDef);
    expect(combat.tempoCount).toBe(1);
    expect(combat.block).toBe(blockBefore + 3);
  });

  it('failed casts do not update 轉拍 or spend 勁', () => {
    const combat = createCombat(['mo', 'fo', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    combat.jin = 1;
    const shield = combat.hand.find((card) => card.defId === 'mo')!;
    const shieldDef = beginPlay(combat, shield.uid);
    resolveCastFizzle(combat, shieldDef);
    expect(combat.lastPlayedType).toBeNull();

    const spender = combat.hand.find((card) => card.defId === 'fo')!;
    const spenderDef = beginPlay(combat, spender.uid, [combat.enemies[0]!.id]);
    resolveCastFizzle(combat, spenderDef);
    expect(combat.jin).toBe(1);
  });

  it('spends one 勁 only when 化勁掌 resolves successfully', () => {
    const combat = createCombat(['fo', 'bo', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    combat.jin = 1;
    const enemy = combat.enemies[0]!;
    const hpBefore = enemy.hp;
    const spender = combat.hand.find((card) => card.defId === 'fo')!;
    const def = beginPlay(combat, spender.uid, [enemy.id]);
    expect(combat.jin).toBe(1);
    resolveCastSuccess(combat, def);
    expect(combat.jin).toBe(0);
    expect(enemy.hp).toBe(hpBefore - 8);
  });

  it('uses 初心音叉 once each player turn', () => {
    const combat = createCombat(['bo', 'bo'], 'rock', 99, 99, getRelic('tuningFork'));
    const enemy = combat.enemies[0]!;
    const first: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(first), noDraw);
    const firstStrike = first.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(firstStrike?.impacts[0]?.relicBonus).toBe(1);
    expect(combat.firstAttackBonusReady).toBe(false);
    combat.block = 99;
    endTurn(combat);
    expect(combat.firstAttackBonusReady).toBe(true);
  });
});
