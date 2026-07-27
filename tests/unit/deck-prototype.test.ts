import { beforeEach, describe, expect, it } from 'vitest';
import {
  ELITE_REWARD_POOL_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCard,
  getCardAtUpgrade,
  validateCardDefinitions,
  type CardDef,
} from '../../src/data/cards';
import { getCharacter } from '../../src/data/characters';
import { getRelic } from '../../src/data/relics';
import {
  beginPlay,
  createCombat,
  endTurn,
  executeEffects,
  makeCard,
  previewCardDamage,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatFx,
} from '../../src/game/combat';
import { createNewRun, pickCharacter, startRun } from '../../src/game/state';
import {
  applySnapshot,
  parseSnapshot,
  snapshotRun,
  type RunSnapshotV1,
} from '../../src/game/save';

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

describe('Resonance Warrior card foundation', () => {
  it('keeps the 5/4/1 starter composition with Attack, Skill, and Vulnerable data', () => {
    expect(STARTER_DECK_IDS).toHaveLength(10);
    expect(STARTER_DECK_IDS.filter((id) => id === 'bo')).toHaveLength(5);
    expect(STARTER_DECK_IDS.filter((id) => id === 'mo')).toHaveLength(4);
    expect(STARTER_DECK_IDS.filter((id) => id === 'po')).toHaveLength(1);
    expect(new Set(STARTER_DECK_IDS)).toEqual(new Set(['bo', 'mo', 'po']));
    expect(getCard('bo')).toMatchObject({ cost: 1, type: 'attack', tags: ['basicAttack'] });
    expect(getCard('mo')).toMatchObject({ cost: 1, type: 'skill' });
    expect(getCard('po').effects[1]).toEqual({ kind: 'applyVulnerable', amount: 2 });
    expect(validateCardDefinitions()).toEqual([]);
  });

  it('reports malformed authored definitions before they can enter rewards', () => {
    const bad = {
      ...getCard('bo'),
      id: 'wrong-id',
      effects: [],
    };
    expect(validateCardDefinitions({ bo: bad })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('id must match'),
        expect.stringContaining('requires ordered effects'),
      ]),
    );
  });

  it('offers nine unique Act I rewards and includes a real Power', () => {
    expect(REWARD_POOL_IDS).toHaveLength(9);
    expect(new Set(REWARD_POOL_IDS).size).toBe(9);
    expect(REWARD_POOL_IDS.some((id) => STARTER_DECK_IDS.includes(id))).toBe(false);
    expect(ELITE_REWARD_POOL_IDS).toEqual(REWARD_POOL_IDS);
    expect(getCharacter('echoMage').actIRewardIds).toEqual(REWARD_POOL_IDS);
    expect(getCard('shi').type).toBe('power');
  });

  it('creates ten separate physical cards and binds the universal starter relic', () => {
    const character = getCharacter('echoMage');
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, character.id);
    expect(state.characterId).toBe(character.id);
    expect(state.deck.map((card) => card.defId)).toEqual(character.starterDeckIds);
    expect(new Set(state.deck.map((card) => card.uid)).size).toBe(state.deck.length);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
    expect(state.relicId).toBe(character.startingRelicId);
    expect(getRelic(state.relicId!).firstAttackBonusDamage).toBe(1);
  });

  it('migrates a V1 string deck without dropping or grouping duplicates', () => {
    const source = createNewRun();
    startRun(source);
    pickCharacter(source, 'echoMage');
    source.relicId = 'coinPouch';
    const current = snapshotRun(source)!;
    const legacy: RunSnapshotV1 = {
      ...current,
      v: 1,
      deck: current.deck.map((card) => card.defId),
    };
    delete legacy.characterId;

    const migrated = parseSnapshot(legacy)!;
    expect(migrated.v).toBe(2);
    expect(migrated.deck.map((card) => card.defId)).toEqual(legacy.deck);
    expect(new Set(migrated.deck.map((card) => card.uid)).size).toBe(legacy.deck.length);

    const restored = createNewRun();
    applySnapshot(restored, migrated);
    expect(restored.characterId).toBe('echoMage');
    expect(restored.relicId).toBe('coinPouch');
  });

  it('resolves an authored upgrade without changing its stable definition id', () => {
    const upgraded = getCardAtUpgrade('bo', 1);
    expect(upgraded.id).toBe('bo');
    expect(upgraded.effects).toEqual([{ kind: 'damage', amount: 5 }]);
    expect(upgraded.description).toContain('5');
  });
});

describe('Vulnerable, Powers, and universal relic rules', () => {
  const noDraw = () => [];
  const collect = (events: CombatFx[]) => (fx: CombatFx) => events.push(fx);

  it('applies Vulnerable after the setup hit, then multiplies and floors Attack damage', () => {
    const combat = createCombat(['po', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    const beforeSetup = enemy.hp;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(beforeSetup - 5);
    expect(enemy.vulnerableTurns).toBe(2);

    const events: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(events), noDraw);
    const strike = events.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(strike?.impacts[0]).toMatchObject({
      baseDamage: 3,
      finalDamage: 4,
      vulnerableApplied: true,
      hpDamage: 4,
    });
  });

  it('stacks Vulnerable additively to nine and ticks after the enemy phase', () => {
    const combat = createCombat(['po'], 'rock', 99, 99);
    const enemy = combat.enemies[0]!;
    enemy.vulnerableTurns = 8;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    expect(enemy.vulnerableTurns).toBe(9);
    endTurn(combat);
    expect(enemy.vulnerableTurns).toBe(8);
  });

  it('does not apply Vulnerable or the Attack relic to direct non-Attack damage', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30, getRelic('tuningFork'));
    const enemy = combat.enemies[0]!;
    enemy.vulnerableTurns = 2;
    const direct: CardDef = {
      ...getCard('bo'),
      type: 'skill',
      target: 'singleEnemy',
      tags: [],
      effects: [{ kind: 'damage', amount: 3, damageType: 'direct' }],
    };
    const hp = enemy.hp;
    executeEffects(combat, direct, [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hp - 3);
    expect(combat.firstAttackBonusReady).toBe(true);
  });

  it('uses the tuning fork on only the first resolved hit and readies it next turn', () => {
    const combat = createCombat(['te', 'mo', 'mo', 'mo', 'mo'], 'rock', 99, 99, getRelic('tuningFork'));
    const enemy = combat.enemies[0]!;
    expect(previewCardDamage(combat, getCard('te'), enemy)).toMatchObject({
      effective: 3,
      laterEffective: 2,
      hits: 2,
    });
    const first: CombatFx[] = [];
    executeEffects(combat, getCard('te'), [enemy.id], collect(first), noDraw);
    const strike = first.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    )!;
    expect(strike.impacts.map((impact) => impact.relicBonus ?? 0)).toEqual([1, 0]);
    expect(combat.firstAttackBonusReady).toBe(false);
    endTurn(combat);
    expect(combat.firstAttackBonusReady).toBe(true);
  });

  it('consumes the tuning fork even when the first hit is fully blocked', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30, getRelic('tuningFork'));
    const enemy = combat.enemies[0]!;
    enemy.block = 99;
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(combat.firstAttackBonusReady).toBe(false);
    expect(enemy.hp).toBe(enemy.maxHp);
  });

  it('installs a Power outside discard circulation and strengthens tagged basic attacks', () => {
    const combat = createCombat(['shi', 'bo'], 'rock', 30, 30);
    const power = makeCard('shi');
    combat.hand = [power];
    beginPlay(combat, power.uid);
    resolveCastSuccess(combat, getCard('shi'));
    expect(combat.powerPile.map((card) => card.defId)).toEqual(['shi']);
    expect(combat.discardPile).toHaveLength(0);
    expect(combat.basicAttackBonusDamage).toBe(2);

    const enemy = combat.enemies[0]!;
    const preview = previewCardDamage(combat, getCard('bo'), enemy);
    expect(preview).toMatchObject({ base: 3, basicAttackBonus: 2, effective: 5 });
  });

  it('a failed Power pays Energy, discards, and installs no battle effect', () => {
    const combat = createCombat(['shi'], 'rock', 30, 30, getRelic('tuningFork'));
    const power = makeCard('shi');
    combat.hand = [power];
    beginPlay(combat, power.uid);
    expect(combat.energy).toBe(2);
    resolveCastFizzle(combat, getCard('shi'));
    expect(combat.discardPile.map((card) => card.defId)).toEqual(['shi']);
    expect(combat.powerPile).toHaveLength(0);
    expect(combat.basicAttackBonusDamage).toBe(0);
    expect(combat.firstAttackBonusReady).toBe(true);
  });
});
