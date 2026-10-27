import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_HAND_SIZE,
  POTION_BELT_SLOTS,
  POTION_DROP_START,
  SHOP_POTION_COUNT,
  SHOP_POTION_PRICE,
} from '../../src/data/balance';
import {
  POTIONS,
  POTION_POOL_IDS,
  emptyPotionBelt,
  getPotion,
  rollCombatPotion,
  rollShopPotions,
  type PotionDef,
} from '../../src/data/potions';
import { applyCombatPotion, createCombat, drawCards, endTurn } from '../../src/game/combat';
import { coachForScreen } from '../../src/game/coach';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  buyShopPotion,
  createNewRun,
  debugFinishFight,
  debugOpenActTreasure,
  debugStartEncounter,
  declinePendingPotion,
  discardPotion,
  getCurrentActNodes,
  getOwnedRelics,
  pickCharacter,
  pickReward,
  replacePendingPotion,
  resolvePotionDrop,
  startRun,
  usePotion,
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

function scripted(values: number[]): (max: number) => number {
  let index = 0;
  return (max: number) => {
    const value = values[index] ?? 0;
    index += 1;
    return Math.min(max - 1, Math.max(0, value));
  };
}

function freshRun(): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  state.tutorialEligibleRun = false;
  state.tutorial = null;
  return state;
}

function claimsTrueDamage(potion: PotionDef): boolean {
  const text = `${potion.blurb}\n${potion.adultNote}`.split('不是直傷').join('');
  return text.includes('直傷');
}

describe('potion pool', () => {
  it('keeps a six-bottle pool and a three-slot belt', () => {
    expect(POTION_POOL_IDS).toHaveLength(6);
    expect(POTION_BELT_SLOTS).toBe(3);
    expect(emptyPotionBelt()).toEqual([null, null, null]);
    expect(SHOP_POTION_COUNT).toBe(2);
    expect(SHOP_POTION_PRICE).toBe(18);
    for (const id of POTION_POOL_IDS) {
      expect(getPotion(id).name).toMatch(/^[\u4e00-\u9fff]+$/);
      expect(getPotion(id).trueDamage).toBeUndefined();
      expect(claimsTrueDamage(getPotion(id))).toBe(false);
    }
    expect(JSON.stringify(POTIONS)).not.toContain('skipCast');
  });

  it('rolls uniformly and steps the drop chance inside 10–80', () => {
    expect(rollCombatPotion(40, scripted([39, 0]))).toEqual({
      dropped: true,
      potionId: 'guardBubble',
      nextChance: 30,
    });
    expect(rollCombatPotion(40, scripted([40]))).toEqual({
      dropped: false,
      potionId: null,
      nextChance: 50,
    });
    expect(rollCombatPotion(0, scripted([9, 2])).potionId).toBe('warmHoney');
    expect(rollCombatPotion(0, scripted([9, 2])).nextChance).toBe(10);
    expect(rollCombatPotion(0, scripted([10])).nextChance).toBe(20);
    expect(rollCombatPotion(100, scripted([79, 5])).potionId).toBe('chorusBurst');
    expect(rollCombatPotion(100, scripted([80])).nextChance).toBe(80);
    const shop = rollShopPotions(() => 0);
    expect(shop).toEqual(['guardBubble', 'soundPebble']);
    expect(new Set(shop).size).toBe(shop.length);
  });
});

describe('potion use', () => {
  it('adds block without spending energy or opening 注音', () => {
    const state = freshRun();
    debugStartEncounter(state, 'slime');
    const energy = state.combat!.energy;
    state.potions[0] = 'guardBubble';
    expect(usePotion(state, 0)).toEqual({ ok: true, endedFight: false });
    expect(state.combat!.block).toBe(8);
    expect(state.combat!.energy).toBe(energy);
    expect(state.cast).toBeNull();
    expect(state.screen).toBe('combat');
    expect(state.potions[0]).toBeNull();
  });

  it('lets enemy block absorb a pebble and ignores 易傷 and attack relics', () => {
    const state = freshRun();
    debugStartEncounter(state, 'slime');
    const enemy = state.combat!.enemies[0]!;
    enemy.block = 4;
    enemy.vulnerableTurns = 2;
    const hp = enemy.hp;
    expect(state.combat!.firstAttackBonusReady).toBe(true);
    state.potions[0] = 'soundPebble';
    expect(usePotion(state, 0)).toEqual({ ok: false, reason: 'target' });
    expect(state.potions[0]).toBe('soundPebble');
    expect(usePotion(state, 0, enemy.id)).toEqual({ ok: true, endedFight: false });
    expect(enemy.hp).toBe(hp - 2);
    expect(enemy.block).toBe(0);
    expect(state.combat!.firstAttackBonusReady).toBe(true);
  });

  it('hits each living enemy separately with the chorus bottle', () => {
    const state = freshRun();
    state.combat = createCombat(
      state.deck,
      ['slime', 'slime'],
      state.heroHp,
      state.heroMaxHp,
      getOwnedRelics(state),
    );
    state.screen = 'combat';
    const [first, second] = state.combat.enemies;
    first!.block = 4;
    second!.block = 1;
    const firstHp = first!.hp;
    const secondHp = second!.hp;
    state.potions[1] = 'chorusBurst';
    expect(usePotion(state, 1)).toEqual({ ok: true, endedFight: false });
    expect(first!.hp).toBe(firstHp);
    expect(first!.block).toBe(0);
    expect(second!.hp).toBe(secondHp - 3);
    expect(second!.block).toBe(0);
    expect(state.potions).toEqual([null, null, null]);
  });

  it('sends 直傷 through the true-damage path only when the text says so', () => {
    const state = freshRun();
    debugStartEncounter(state, 'slime');
    const enemy = state.combat!.enemies[0]!;
    enemy.block = 9;
    enemy.vulnerableTurns = 3;
    const before = enemy.hp;
    const synthetic: PotionDef = {
      ...getPotion('soundPebble'),
      id: 'testTrue',
      damage: undefined,
      trueDamage: 6,
      blurb: '造成 6 點直傷',
      adultNote: '這是直傷，護盾擋不住。',
    };
    expect(claimsTrueDamage(synthetic)).toBe(true);
    expect(applyCombatPotion(state.combat!, synthetic, enemy.id)).toMatchObject({
      ok: true,
      endedFight: false,
    });
    expect(enemy.hp).toBe(before - 6);
    expect(enemy.block).toBe(9);
    expect(state.combat!.firstAttackBonusReady).toBe(true);
  });

  it('heals with honey outside combat and refuses a full life bar', () => {
    const state = freshRun();
    state.screen = 'map';
    state.heroHp = 20;
    state.potions[0] = 'warmHoney';
    expect(usePotion(state, 0)).toEqual({ ok: true, endedFight: false });
    expect(state.heroHp).toBe(25);
    state.heroHp = state.heroMaxHp;
    state.potions[0] = 'warmHoney';
    expect(usePotion(state, 0)).toEqual({ ok: false, reason: 'full-hp' });
    expect(state.potions[0]).toBe('warmHoney');
    state.heroHp = 38;
    expect(usePotion(state, 0)).toEqual({ ok: true, endedFight: false });
    expect(state.heroHp).toBe(state.heroMaxHp);
  });

  it('adds energy for this turn only and draws until the hand cannot grow', () => {
    const state = freshRun();
    debugStartEncounter(state, 'slime');
    const combat = state.combat!;
    state.potions[0] = 'sparkSoda';
    expect(usePotion(state, 0).ok).toBe(true);
    expect(combat.energy).toBe(combat.maxEnergy + 2);
    endTurn(combat);
    expect(combat.energy).toBe(combat.maxEnergy);

    state.potions[1] = 'pageJuice';
    const hand = combat.hand.length;
    expect(usePotion(state, 1)).toEqual({ ok: true, endedFight: false });
    expect(combat.hand.length).toBe(hand + 3);
    while (combat.hand.length < MAX_HAND_SIZE) {
      if (drawCards(combat, 1).length === 0) break;
    }
    expect(combat.hand.length).toBe(MAX_HAND_SIZE);
    state.potions[2] = 'pageJuice';
    expect(usePotion(state, 2)).toEqual({ ok: false, reason: 'no-draw' });
    expect(state.potions[2]).toBe('pageJuice');

    const tiny = freshRun();
    tiny.combat = createCombat(['bo', 'mo'], 'slime', tiny.heroHp, tiny.heroMaxHp, getOwnedRelics(tiny));
    tiny.screen = 'combat';
    tiny.potions[0] = 'pageJuice';
    expect(tiny.combat.hand).toHaveLength(2);
    expect(usePotion(tiny, 0)).toEqual({ ok: false, reason: 'no-draw' });
  });

  it('leaves the other slots in place and locks the belt during the tutorial', () => {
    const state = freshRun();
    state.screen = 'map';
    state.potions = ['warmHoney', 'soundPebble', null];
    expect(discardPotion(state, 0)).toBe(true);
    expect(state.potions).toEqual([null, 'soundPebble', null]);

    debugStartEncounter(state, 'slime');
    state.tutorial = { step: 'shield', wrongAttempts: 0 };
    state.potions[0] = 'guardBubble';
    expect(usePotion(state, 0)).toEqual({ ok: false, reason: 'tutorial' });
    expect(discardPotion(state, 0)).toBe(false);
    expect(state.potions[0]).toBe('guardBubble');
  });

  it('ends the fight through the normal reward path when a bottle defeats the room', () => {
    const state = freshRun();
    debugStartEncounter(state, 'slime');
    const enemy = state.combat!.enemies[0]!;
    enemy.hp = 4;
    state.potions[0] = 'soundPebble';
    expect(usePotion(state, 0, enemy.id)).toEqual({ ok: true, endedFight: true });
    expect(enemy.hp).toBe(0);
    expect(state.screen).toBe('reward');
    expect(state.cast).toBeNull();
  });
});

describe('potion acquisition', () => {
  it('auto-places a drop and makes a full belt choose before the card', () => {
    const state = freshRun();
    state.screen = 'reward';
    resolvePotionDrop(state, scripted([0, 5]));
    expect(state.potions[0]).toBe('chorusBurst');
    expect(state.pendingPotionUnplaced).toBe(false);
    expect(state.potionDropChance).toBe(30);

    state.potions = ['guardBubble', 'soundPebble', 'warmHoney'];
    state.potionDropChance = 40;
    resolvePotionDrop(state, scripted([0, 5]));
    expect(state.pendingPotionId).toBe('chorusBurst');
    expect(state.pendingPotionUnplaced).toBe(true);
    expect(state.potions[0]).toBe('guardBubble');
    pickReward(state, null);
    expect(state.screen).toBe('reward');
    expect(state.flash).toBe('🧪先選');
    expect(replacePendingPotion(state, 1)).toBe(true);
    expect(state.potions[1]).toBe('chorusBurst');
    expect(state.pendingPotionUnplaced).toBe(false);

    state.potions = ['guardBubble', 'soundPebble', 'warmHoney'];
    state.pendingPotionId = 'pageJuice';
    state.pendingPotionUnplaced = true;
    state.screen = 'reward';
    expect(discardPotion(state, 2)).toBe(true);
    expect(state.potions[2]).toBe('pageJuice');
    expect(state.pendingPotionUnplaced).toBe(false);
    expect(declinePendingPotion(state)).toBe(false);
  });

  it('changes the drop chance after a fight, skips treasure, and resets on the next act', () => {
    const state = freshRun();
    const chance = state.potionDropChance;
    expect(chance).toBe(POTION_DROP_START);
    debugOpenActTreasure(state);
    expect(state.potionDropChance).toBe(chance);
    expect(state.pendingPotionId).toBeNull();
    expect(state.rewardSource).toBe('treasure');

    debugStartEncounter(state, 'slime');
    debugFinishFight(state);
    expect([30, 50]).toContain(state.potionDropChance);
    expect(state.screen).toBe('reward');

    const boss = getCurrentActNodes(state).find((node) => node.kind === 'boss')!;
    debugStartEncounter(state, 'slime');
    state.activeNodeId = boss.id;
    debugFinishFight(state);
    expect(state.screen).toBe('reward');
    pickReward(state, null);
    expect(state.screen).toBe('actClear');
    expect(state.potionDropChance).toBe(POTION_DROP_START);
  });

  it('sells two bottles and refuses a full belt without taking gold', () => {
    const state = freshRun();
    state.screen = 'shop';
    state.gold = 40;
    state.shopPotionOffers = [
      { potionId: 'warmHoney', price: SHOP_POTION_PRICE, sold: false },
      { potionId: 'sparkSoda', price: SHOP_POTION_PRICE, sold: false },
    ];
    expect(buyShopPotion(state, 0)).toBe(true);
    expect(state.gold).toBe(22);
    expect(state.potions[0]).toBe('warmHoney');
    expect(state.shopPotionOffers[0]!.sold).toBe(true);
    state.potions = ['guardBubble', 'soundPebble', 'warmHoney'];
    expect(buyShopPotion(state, 1)).toBe(false);
    expect(state.gold).toBe(22);
    expect(state.flash).toBe('🧪滿');
    expect(state.shopPotionOffers[1]!.sold).toBe(false);
  });
});

describe('potion save', () => {
  it('round-trips the belt and still loads a v3 checkpoint with an empty belt', () => {
    const state = freshRun();
    state.screen = 'map';
    state.potions = ['warmHoney', 'warmHoney', null];
    state.potionDropChance = 70;
    state.pendingPotionId = 'pageJuice';
    state.pendingPotionUnplaced = false;
    state.shopPotionOffers = [{ potionId: 'sparkSoda', price: 18, sold: true }];
    const snapshot = snapshotRun(state)!;
    expect(snapshot.v).toBe(4);
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    expect(restored.potions).toEqual(['warmHoney', 'warmHoney', null]);
    expect(restored.potionDropChance).toBe(70);
    expect(restored.pendingPotionId).toBe('pageJuice');
    expect(restored.shopPotionOffers).toEqual([{ potionId: 'sparkSoda', price: 18, sold: true }]);

    const legacy = { ...snapshot, v: 3 as const };
    delete (legacy as { potions?: unknown }).potions;
    delete (legacy as { potionDropChance?: unknown }).potionDropChance;
    delete (legacy as { pendingPotionId?: unknown }).pendingPotionId;
    delete (legacy as { pendingPotionUnplaced?: unknown }).pendingPotionUnplaced;
    delete (legacy as { shopPotionOffers?: unknown }).shopPotionOffers;
    const migrated = parseSnapshot(legacy)!;
    expect(migrated.v).toBe(4);
    expect(migrated.potions).toEqual([null, null, null]);
    expect(migrated.potionDropChance).toBe(40);
    expect(migrated.pendingPotionId).toBeNull();
    expect(migrated.pendingPotionUnplaced).toBe(false);
    expect(migrated.shopPotionOffers).toEqual([]);
    expect(migrated.relicIds).toEqual(snapshot.relicIds);
  });

  it('rejects an unknown bottle, a bad chance, a short belt, and a repeated shop bottle', () => {
    const state = freshRun();
    state.screen = 'map';
    const snapshot = snapshotRun(state)!;
    expect(parseSnapshot({ ...snapshot, potions: ['nope', null, null] })).toBeNull();
    expect(parseSnapshot({ ...snapshot, potionDropChance: 9 })).toBeNull();
    expect(parseSnapshot({ ...snapshot, potionDropChance: 81 })).toBeNull();
    expect(parseSnapshot({ ...snapshot, potions: [null, null] })).toBeNull();
    expect(parseSnapshot({
      ...snapshot,
      shopPotionOffers: [
        { potionId: 'warmHoney', price: 18, sold: false },
        { potionId: 'warmHoney', price: 18, sold: false },
      ],
    })).toBeNull();
  });
});

describe('potion coach', () => {
  it('mentions the belt where an adult can see a bottle', () => {
    for (const screen of ['map', 'rest', 'shop', 'combat'] as const) {
      expect(coachForScreen(screen).body).toContain('藥水');
    }
    expect(coachForScreen('reward', { rewardSource: 'fight' }).body).toContain('藥水');
    expect(coachForScreen('reward', { rewardSource: 'treasure' }).body).toContain('不掉藥水');
  });
});
