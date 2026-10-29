import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GOLD_ELITE_BASE,
  GOLD_ELITE_FLAT_BONUS,
  GOLD_FIGHT_BASE,
  GOLD_JITTER,
  GOLD_TREASURE_BASE,
  GOLD_TREASURE_JITTER,
  POTION_DROP_START,
} from '../../src/data/balance';
import { getCard } from '../../src/data/cards';
import type { PlayableCharacterId } from '../../src/data/characters';
import { getPlayableCharacter } from '../../src/data/characters';
import { POTION_POOL_IDS, emptyPotionBelt, rollCombatPotion } from '../../src/data/potions';
import { relicPoolIdsFor, rollRelicDrop } from '../../src/data/relics';
import { pickRewardIds } from '../../src/game/combat';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  cloneRunRng,
  createRunRng,
  runRandomFloat,
  runRandomInt,
  takeRunUnit,
  RUN_RNG_STREAMS,
} from '../../src/game/runRng';
import {
  createNewRun,
  debugFinishFight,
  debugOpenActTreasure,
  debugStartEncounter,
  pickCharacter,
  playerEndTurn,
  rewardPoolFor,
  selectMapNode,
  type RunState,
} from '../../src/game/state';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function expectShare(count: number, total: number, expected: number, slack = 0.04): void {
  expect(Math.abs(count / total - expected)).toBeLessThanOrEqual(slack);
}

function fresh(characterId: PlayableCharacterId): RunState {
  const state = createNewRun();
  pickCharacter(state, characterId);
  state.tutorial = null;
  state.tutorialEligibleRun = false;
  state.heroHp = 400;
  state.heroMaxHp = 400;
  return state;
}

/** Act I is 0, Act II is 0.25, later acts are 0.5. Mirrors `upgradedOfferChance`. */
function upgradeChance(actIndex: number): number {
  if (actIndex <= 0) return 0;
  if (actIndex === 1) return 0.25;
  return 0.5;
}

function offerWouldUpgrade(state: RunState, defId: string): boolean {
  const character = getPlayableCharacter(state.characterId ?? '');
  const card = getCard(defId);
  const eligible = character?.upgradesEnabled === true && card.rarity !== 'basic' && !!card.upgrade;
  return eligible && runRandomFloat(state.rng.upgrade) < upgradeChance(state.actIndex);
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('run rng streams', () => {
  it('keeps each purpose on its own counter', () => {
    const left = createRunRng(17665);
    const right = createRunRng(17665);
    expect(left).toEqual(right);
    const seeds = RUN_RNG_STREAMS.map((name) => left[name].seed);
    expect(new Set(seeds).size).toBe(RUN_RNG_STREAMS.length);

    takeRunUnit(left.reward);
    runRandomInt(left.gold, GOLD_JITTER);
    expect(left.combat).toEqual(right.combat);
    expect(left.shop).toEqual(right.shop);
    expect(left.relic).toEqual(right.relic);
    expect(left.potion).toEqual(right.potion);
    expect(left.upgrade).toEqual(right.upgrade);
    expect(left.reward.counter).toBe(1);
    expect(left.gold.counter).toBe(1);
    expect(right.reward.counter).toBe(0);
  });

  it('resumes deck order from the saved combat counter', () => {
    const hands: string[][] = [];
    for (let copy = 0; copy < 2; copy += 1) {
      const state = fresh('echoMage');
      state.rng = createRunRng(17665);
      debugStartEncounter(state, 'slime');
      playerEndTurn(state);
      playerEndTurn(state);
      hands.push(state.combat?.hand.map((card) => card.defId) ?? []);
      expect(state.rng.reward.counter).toBe(0);
      expect(state.rng.combat.counter).toBeGreaterThan(0);
    }
    expect(hands[1]).toEqual(hands[0]);
    expect(hands[0]?.length).toBeGreaterThan(0);
  });

  it('reads fight rewards from the gold, reward, upgrade, and potion streams', () => {
    const state = fresh('echoMage');
    state.rng = createRunRng(17665);
    debugStartEncounter(state, 'slime');
    const gold = cloneRunRng(state.rng).gold;
    const reward = cloneRunRng(state.rng).reward;
    const upgrade = cloneRunRng(state.rng).upgrade;
    const potion = cloneRunRng(state.rng).potion;
    const relicCounter = state.rng.relic.counter;
    debugFinishFight(state);

    const jitter = runRandomInt(gold, GOLD_JITTER);
    expect(state.pendingGold).toBe(GOLD_FIGHT_BASE + jitter);
    const ids = pickRewardIds(rewardPoolFor(state, 'normal'), 3, () => takeRunUnit(reward));
    state.rng.upgrade = upgrade;
    const levels = ids.map((id) => (offerWouldUpgrade(state, id) ? 1 : 0));
    expect(state.rewardOptions.map((card) => card.defId)).toEqual(ids);
    expect(state.rewardOptions.map((card) => card.upgradeLevel)).toEqual(levels);
    const rolled = rollCombatPotion(POTION_DROP_START, (max) => runRandomInt(potion, max));
    expect(state.pendingPotionId).toBe(rolled.potionId);
    expect(state.potionDropChance).toBe(rolled.nextChance);
    expect(state.rng.relic.counter).toBe(relicCounter);
  });

  it('reads an elite relic from the relic stream and elite gold from the gold stream', () => {
    const state = fresh('abacusFist');
    state.rng = createRunRng(17665);
    debugStartEncounter(state, 'slime');
    const elite = state.runMap.acts[0]?.nodes.find((node) => node.row > 0);
    if (!elite) throw new Error('expected a map node to mark as an elite');
    elite.kind = 'elite';
    elite.goldBonus = undefined;
    elite.rewardTier = 'elite';
    state.activeNodeId = elite.id;
    const gold = cloneRunRng(state.rng).gold;
    const relic = cloneRunRng(state.rng).relic;
    const owned = [...state.relicIds];
    debugFinishFight(state);

    const jitter = runRandomInt(gold, GOLD_JITTER);
    expect(state.pendingGold).toBe(GOLD_ELITE_BASE + GOLD_ELITE_FLAT_BONUS + jitter);
    expect(state.pendingRelicId).toBe(rollRelicDrop(owned, (max) => runRandomInt(relic, max), 'abacusFist'));
  });

  it('reads shop cards, shop upgrades, and shop potions from their own streams', () => {
    const state = fresh('echoMage');
    const act = state.runMap.acts[0];
    const anchor = act?.nodes.find((node) => node.kind === 'fight');
    const shop = act?.nodes.find((node) => node.id !== anchor?.id);
    if (!act || !shop || !anchor) throw new Error('expected two map nodes');
    shop.kind = 'shop';
    anchor.nextIds = [shop.id];
    state.currentNodeId = anchor.id;
    state.rng = createRunRng(17665);
    const shopStream = cloneRunRng(state.rng).shop;
    const upgrade = cloneRunRng(state.rng).upgrade;
    const potion = cloneRunRng(state.rng).potion;
    selectMapNode(state, shop.id);

    const ids = pickRewardIds(rewardPoolFor(state, 'normal'), 3, () => takeRunUnit(shopStream));
    state.rng.upgrade = upgrade;
    const levels = ids.map((id) => (offerWouldUpgrade(state, id) ? 1 : 0));
    expect(state.shopOffers.map((offer) => offer.defId)).toEqual(ids);
    expect(state.shopOffers.map((offer) => offer.upgradeLevel)).toEqual(levels);
    expect(state.rng.reward.counter).toBe(0);
    const picked: string[] = [];
    const pool = [...POTION_POOL_IDS];
    while (picked.length < 2 && pool.length > 0) {
      const index = runRandomInt(potion, pool.length);
      const [id] = pool.splice(index, 1);
      if (id) picked.push(id);
    }
    expect(state.shopPotionOffers.map((offer) => offer.potionId)).toEqual(picked);
  });

  it('reads treasure gold and the chest relic from their own streams', () => {
    const state = fresh('echoMage');
    state.rng = createRunRng(17665);
    const gold = cloneRunRng(state.rng).gold;
    const relic = cloneRunRng(state.rng).relic;
    const owned = [...state.relicIds];
    expect(debugOpenActTreasure(state)).toBe(true);
    expect(state.pendingGold).toBe(GOLD_TREASURE_BASE + runRandomInt(gold, GOLD_TREASURE_JITTER));
    expect(state.pendingRelicId).toBe(rollRelicDrop(owned, (max) => runRandomInt(relic, max), 'echoMage'));
    expect(state.rewardOptions).toEqual([]);
  });
});

describe('balance distributions', () => {
  const seeds = 4000;

  it('spreads fight gold, treasure gold, relics, and potion drops across seeds', () => {
    const fight = new Map<number, number>();
    const elite = new Map<number, number>();
    const treasure = new Map<number, number>();
    const relics = new Map<string, number>();
    let drops = 0;
    const bottles = new Map<string, number>();

    for (let seed = 0; seed < seeds; seed += 1) {
      const rng = createRunRng(seed);
      const fightGold = GOLD_FIGHT_BASE + runRandomInt(rng.gold, GOLD_JITTER);
      fight.set(fightGold, (fight.get(fightGold) ?? 0) + 1);
      const eliteGold = GOLD_ELITE_BASE + GOLD_ELITE_FLAT_BONUS + runRandomInt(rng.gold, GOLD_JITTER);
      elite.set(eliteGold, (elite.get(eliteGold) ?? 0) + 1);
      const chest = GOLD_TREASURE_BASE + runRandomInt(rng.gold, GOLD_TREASURE_JITTER);
      treasure.set(chest, (treasure.get(chest) ?? 0) + 1);

      const relicId = rollRelicDrop([], (max) => runRandomInt(rng.relic, max), 'echoMage');
      if (relicId) relics.set(relicId, (relics.get(relicId) ?? 0) + 1);

      const potion = rollCombatPotion(POTION_DROP_START, (max) => runRandomInt(rng.potion, max));
      if (potion.potionId) {
        drops += 1;
        bottles.set(potion.potionId, (bottles.get(potion.potionId) ?? 0) + 1);
      }
    }

    for (let gold = GOLD_FIGHT_BASE; gold < GOLD_FIGHT_BASE + GOLD_JITTER; gold += 1) {
      expectShare(fight.get(gold) ?? 0, seeds, 1 / GOLD_JITTER);
    }
    for (let offset = 0; offset < GOLD_JITTER; offset += 1) {
      const gold = GOLD_ELITE_BASE + GOLD_ELITE_FLAT_BONUS + offset;
      expectShare(elite.get(gold) ?? 0, seeds, 1 / GOLD_JITTER);
    }
    for (let offset = 0; offset < GOLD_TREASURE_JITTER; offset += 1) {
      const gold = GOLD_TREASURE_BASE + offset;
      expectShare(treasure.get(gold) ?? 0, seeds, 1 / GOLD_TREASURE_JITTER, 0.03);
    }
    expect(fight.size).toBe(GOLD_JITTER);
    expect(elite.size).toBe(GOLD_JITTER);
    expect(treasure.size).toBe(GOLD_TREASURE_JITTER);

    const relicPool = relicPoolIdsFor('echoMage');
    expect(relics.size).toBe(relicPool.length);
    for (const id of relicPool) expectShare(relics.get(id) ?? 0, seeds, 1 / relicPool.length);

    expectShare(drops, seeds, POTION_DROP_START / 100);
    expect(bottles.size).toBe(POTION_POOL_IDS.length);
    for (const id of POTION_POOL_IDS) {
      expectShare(bottles.get(id) ?? 0, drops, 1 / POTION_POOL_IDS.length);
    }
  });

  it('offers reward cards in proportion to the live pool, not a separate rarity table', () => {
    for (const characterId of ['echoMage', 'abacusFist'] as const) {
      const state = fresh(characterId);
      const pool = rewardPoolFor(state, 'normal');
      const rarityCount = new Map<string, number>();
      for (const id of pool) {
        const rarity = getCard(id).rarity ?? 'basic';
        rarityCount.set(rarity, (rarityCount.get(rarity) ?? 0) + 1);
      }
      const seen = new Map<string, number>();
      const offers = 3000;
      for (let seed = 0; seed < offers; seed += 1) {
        const rng = createRunRng(seed + (characterId === 'echoMage' ? 0 : 10_000));
        for (const id of pickRewardIds(pool, 3, () => takeRunUnit(rng.reward))) {
          seen.set(id, (seen.get(id) ?? 0) + 1);
        }
      }
      const slots = offers * 3;
      for (const id of pool) expectShare(seen.get(id) ?? 0, slots, 1 / pool.length, 0.02);
      for (const [rarity, count] of rarityCount) {
        let got = 0;
        for (const id of pool) {
          if ((getCard(id).rarity ?? 'basic') === rarity) got += seen.get(id) ?? 0;
        }
        expectShare(got, slots, count / pool.length, 0.02);
      }
    }
  });

  it('upgrades offered cards at the act rates in live fights', () => {
    const state = fresh('echoMage');
    const trials = 200;
    for (const actIndex of [0, 1, 2] as const) {
      let upgraded = 0;
      let eligible = 0;
      state.actIndex = actIndex;
      for (let seed = 0; seed < trials; seed += 1) {
        state.rng = createRunRng(seed + actIndex * 1_000);
        state.potionDropChance = POTION_DROP_START;
        state.potions = emptyPotionBelt();
        state.pendingPotionId = null;
        state.pendingPotionUnplaced = false;
        debugStartEncounter(state, 'slime');
        debugFinishFight(state);
        for (const offer of state.rewardOptions) {
          const card = getCard(offer.defId);
          if (card.rarity === 'basic' || !card.upgrade) continue;
          eligible += 1;
          if (offer.upgradeLevel === 1) upgraded += 1;
        }
      }
      expect(eligible).toBeGreaterThan(0);
      if (actIndex === 0) expect(upgraded).toBe(0);
      else expectShare(upgraded, eligible, upgradeChance(actIndex), 0.07);
    }
  }, 20_000);
});

describe('v4 saves without rng state', () => {
  it('loads every current fixture shape and derives streams from castSeed', () => {
    const raw = JSON.parse(readFileSync(
      path.join(root, 'tests/fixtures/saves/echoMage-reward.json'),
      'utf8',
    )) as Record<string, unknown>;
    delete raw.rng;
    const parsed = parseSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.rng).toBeUndefined();
    expect(parsed?.v).toBe(4);

    const first = createNewRun();
    applySnapshot(first, parsed!);
    const second = createNewRun();
    applySnapshot(second, parsed!);
    expect(first.rng).toEqual(createRunRng(first.castSeed));
    expect(second.rng).toEqual(first.rng);
    expect(first.rewardOptions.map((card) => card.defId)).toEqual(
      parsed!.rewardOptions.map((card) => card.defId),
    );

    const again = snapshotRun(first);
    expect(again?.rng).toEqual(first.rng);
    expect(parseSnapshot({ ...parsed, rng: null })).toBeNull();
    expect(parseSnapshot({
      ...parsed,
      rng: { ...first.rng, combat: { seed: 1, counter: -1 } },
    })).toBeNull();
    const incomplete = { ...first.rng };
    delete incomplete.combat;
    expect(parseSnapshot({ ...parsed, rng: incomplete })).toBeNull();
  });
});
