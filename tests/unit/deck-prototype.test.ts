import { beforeEach, describe, expect, it } from 'vitest';
import {
  ELITE_REWARD_POOL_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCard,
} from '../../src/data/cards';
import { getCharacter } from '../../src/data/characters';
import { getRelic } from '../../src/data/relics';
import { createCombat, endTurn, executeEffects, type CombatFx } from '../../src/game/combat';
import { createNewRun, pickCharacter, startRun } from '../../src/game/state';
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

describe('Echo Mage deck prototype', () => {
  it('has exactly three starter designs in the requested 5/4/1 composition', () => {
    expect(STARTER_DECK_IDS).toHaveLength(10);
    expect(STARTER_DECK_IDS.filter((id) => id === 'bo')).toHaveLength(5);
    expect(STARTER_DECK_IDS.filter((id) => id === 'mo')).toHaveLength(4);
    expect(STARTER_DECK_IDS.filter((id) => id === 'po')).toHaveLength(1);
    expect(new Set(STARTER_DECK_IDS)).toEqual(new Set(['bo', 'mo', 'po']));
    expect(getCard('bo')).toMatchObject({ cost: 1, type: 'attack' });
    expect(getCard('mo')).toMatchObject({ cost: 1, type: 'block' });
    expect(getCard('po')).toMatchObject({ cost: 2, type: 'attack' });
  });

  it('offers exactly nine unique Act I rewards, separate from starter designs', () => {
    expect(REWARD_POOL_IDS).toHaveLength(9);
    expect(new Set(REWARD_POOL_IDS).size).toBe(9);
    expect(REWARD_POOL_IDS.some((id) => STARTER_DECK_IDS.includes(id))).toBe(false);
    expect(ELITE_REWARD_POOL_IDS).toEqual(REWARD_POOL_IDS);
    expect(getCharacter('echoMage').actIRewardIds).toEqual(REWARD_POOL_IDS);
    expect(REWARD_POOL_IDS.every((id) => getCard(id).job !== undefined)).toBe(true);
  });

  it('binds the starter deck and starter relic to the selected character', () => {
    const character = getCharacter('echoMage');
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, character.id);
    expect(state.characterId).toBe(character.id);
    expect(state.deck).toEqual(character.starterDeckIds);
    expect(state.relicId).toBe(character.startingRelicId);
    expect(getRelic(state.relicId!).firstAttackBonusDamage).toBe(2);
  });

  it('loads a pre-character v1 save without replacing its legacy relic', () => {
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

describe('Echo combat rules', () => {
  const noDraw = () => [];
  const collect = (events: CombatFx[]) => (fx: CombatFx) => events.push(fx);

  it('applies Echo after the setup hit and triggers it on the next attack', () => {
    const combat = createCombat(['po', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    expect(enemy.echoTurns).toBe(2);
    expect(enemy.echoTriggeredThisTurn).toBe(false);
    const hpBefore = enemy.hp;
    const events: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(events), noDraw);
    expect(enemy.hp).toBe(hpBefore - 5);
    expect(enemy.echoTriggeredThisTurn).toBe(true);
    const strike = events.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(strike?.impacts[0]?.echoBonus).toBe(2);
  });

  it('lasts across two player turns and refreshes its once-per-turn trigger', () => {
    const combat = createCombat(['po', 'bo', 'mo', 'mo', 'mo'], 'rock', 99, 99);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(enemy.echoTriggeredThisTurn).toBe(true);
    endTurn(combat);
    expect(enemy.echoTurns).toBe(1);
    expect(enemy.echoTriggeredThisTurn).toBe(false);
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(enemy.echoTriggeredThisTurn).toBe(true);
    endTurn(combat);
    expect(enemy.echoTurns).toBe(0);
  });

  it('uses the tuning fork once per combat and explains its bonus in impact data', () => {
    const combat = createCombat(
      ['bo', 'bo'],
      'rock',
      30,
      30,
      getRelic('tuningFork'),
    );
    const enemy = combat.enemies[0]!;
    const first: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(first), noDraw);
    const firstStrike = first.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(firstStrike?.impacts[0]?.relicBonus).toBe(2);
    expect(combat.firstAttackBonusReady).toBe(false);

    const second: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(second), noDraw);
    const secondStrike = second.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(secondStrike?.impacts[0]?.relicBonus).toBeUndefined();
  });

  it('lets the scaling card grant block whenever Echo triggers', () => {
    const combat = createCombat(['shi', 'he', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('shi'), [], () => {}, noDraw);
    executeEffects(combat, getCard('he'), [enemy.id], () => {}, noDraw);
    expect(combat.block).toBe(0);
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(combat.block).toBe(2);
  });
});
