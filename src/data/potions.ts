/**
 * First potion belt for 共鳴武者.
 *
 * Three slots and six bottles, the top of the build-first 4–6 pool.
 * These six cover a blocked hit, a single-target finish, a small heal,
 * one extra pair of cards, and a smaller hit on every monster. Echo-only
 * bottles, cleanse, retain, double-cast, and anything that stops HP 0
 * from ending the run stay out. Numbers match the preschool scale already
 * written for these character-agnostic bottles.
 *
 * A bottle is not a card. It spends no Energy and never opens 注音.
 * Damage here is not an Attack. Text that does not say 直傷 still loses
 * to enemy Block. Nothing in this pool says 直傷.
 */

import {
  POTION_BELT_SLOTS,
  POTION_DROP_MAX,
  POTION_DROP_MIN,
  POTION_DROP_STEP,
  SHOP_POTION_COUNT,
} from './balance';

export type PotionWhere = 'combat' | 'anywhere';
export type PotionTarget = 'none' | 'enemy';

export interface PotionDef {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  /** Parent co-play line. */
  adultNote: string;
  where: PotionWhere;
  target: PotionTarget;
  block?: number;
  heal?: number;
  energy?: number;
  draw?: number;
  /** Block absorbs this. Not an Attack, and not 直傷. */
  damage?: number;
  /** When set, the printed text must say 直傷. Block does not absorb it. */
  trueDamage?: number;
  damageAll?: boolean;
}

export const POTIONS: Record<string, PotionDef> = {
  guardBubble: {
    id: 'guardBubble',
    emoji: '🫧',
    name: '護盾泡泡',
    blurb: '立刻獲得 8 點護盾',
    adultNote: '只在你的回合喝。護盾加在現有護盾上，回合結束照舊消失。不用能量，也不用念注音。',
    where: 'combat',
    target: 'none',
    block: 8,
  },
  soundPebble: {
    id: 'soundPebble',
    emoji: '💫',
    name: '音波小石',
    blurb: '對一隻怪物造成 6 點傷害',
    adultNote: '先點一隻怪物。護盾會擋下這 6 點。這不是攻擊，不會吃到易傷、練功或遺物加傷，也不是直傷。取消瞄準不會喝掉。',
    where: 'combat',
    target: 'enemy',
    damage: 6,
  },
  warmHoney: {
    id: 'warmHoney',
    emoji: '🍯',
    name: '蜂蜜暖茶',
    blurb: '回復 5 點生命',
    adultNote: '戰鬥、地圖、營火、商店和領獎時都能喝。不會超過最大生命。滿血時不能喝。比營火少很多。',
    where: 'anywhere',
    target: 'none',
    heal: 5,
  },
  sparkSoda: {
    id: 'sparkSoda',
    emoji: '⚡',
    name: '火花汽水',
    blurb: '這個回合獲得 2 點能量',
    adultNote: '可以超過平常的 3 點。回合結束沒用掉的能量會消失。出牌仍要念注音。',
    where: 'combat',
    target: 'none',
    energy: 2,
  },
  pageJuice: {
    id: 'pageJuice',
    emoji: '📖',
    name: '翻頁果汁',
    blurb: '立刻抽 3 張牌',
    adultNote: '手牌最多 10 張。手牌已滿，或牌堆沒有牌時，不能喝，免得浪費這一瓶。',
    where: 'combat',
    target: 'none',
    draw: 3,
  },
  chorusBurst: {
    id: 'chorusBurst',
    emoji: '🎆',
    name: '合唱爆泡',
    blurb: '每隻還在場上的怪物受到 4 點傷害',
    adultNote: '每隻怪物各自用護盾抵擋。這不是攻擊，也不是直傷。只有一隻怪時，比音波小石少 2 點。',
    where: 'combat',
    target: 'none',
    damage: 4,
    damageAll: true,
  },
};

export const POTION_POOL_IDS = [
  'guardBubble',
  'soundPebble',
  'warmHoney',
  'sparkSoda',
  'pageJuice',
  'chorusBurst',
] as const;

export type PotionPoolId = (typeof POTION_POOL_IDS)[number];

export function emptyPotionBelt(): (string | null)[] {
  return Array.from({ length: POTION_BELT_SLOTS }, () => null);
}

export function getPotion(id: string): PotionDef {
  const potion = POTIONS[id];
  if (!potion) throw new Error(`Unknown potion ${id}`);
  return potion;
}

export function isKnownPotionId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(POTIONS, id);
}

export function potionNeedsEnemy(potion: PotionDef): boolean {
  return potion.target === 'enemy' && !potion.damageAll;
}

export function clampPotionDropChance(chance: number): number {
  return Math.min(POTION_DROP_MAX, Math.max(POTION_DROP_MIN, Math.round(chance)));
}

export interface PotionRoll {
  dropped: boolean;
  potionId: string | null;
  nextChance: number;
}

/**
 * One eligible fight. `randomIndex(n)` returns an integer in `0 .. n-1`.
 * Every bottle is equally likely. Rarity weights wait until a rare exists,
 * so the area bottle is not secretly a third of all drops.
 */
export function rollCombatPotion(
  chancePercent: number,
  randomIndex: (exclusiveMax: number) => number,
): PotionRoll {
  const chance = clampPotionDropChance(chancePercent);
  const dropped = randomIndex(100) < chance;
  const potionId = dropped
    ? POTION_POOL_IDS[randomIndex(POTION_POOL_IDS.length)] ?? null
    : null;
  const didDrop = potionId !== null;
  const nextChance = clampPotionDropChance(chance + (didDrop ? -POTION_DROP_STEP : POTION_DROP_STEP));
  return { dropped: didDrop, potionId, nextChance };
}

/** One shop shelf shows each bottle at most once. */
export function rollShopPotions(
  randomIndex: (exclusiveMax: number) => number,
  count = SHOP_POTION_COUNT,
): string[] {
  const pool = [...POTION_POOL_IDS];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.min(pool.length - 1, Math.max(0, randomIndex(pool.length)));
    const [id] = pool.splice(index, 1);
    if (id) picked.push(id);
  }
  return picked;
}

export function firstEmptyPotionSlot(belt: readonly (string | null)[]): number {
  return belt.findIndex((id) => id === null);
}
