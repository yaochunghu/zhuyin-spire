/**
 * Typed hook for the potion belt.
 *
 * The belt is being built separately and is not on this branch. Event choices
 * that need a free slot stay visible and say why they cannot be taken. When a
 * belt exists, replace `readPotionBelt` and `grantPotions` without changing
 * the event effect `{ op: 'gainPotion' }`.
 */

export type PotionRarity = 'common' | 'uncommon' | 'rare';

export interface PotionGrant {
  rarity: PotionRarity;
  count: number;
}

export interface PotionBeltSnapshot {
  /** 0 until the potion belt lands. The planned belt has 3 slots. */
  slotCount: number;
  filled: number;
}

export interface PotionGrantResult {
  ok: boolean;
  reason?: string;
}

export function readPotionBelt(): PotionBeltSnapshot {
  return { slotCount: 0, filled: 0 };
}

export function freePotionSlots(): number {
  const belt = readPotionBelt();
  return Math.max(0, belt.slotCount - belt.filled);
}

export function potionBlockReason(count: number): string | null {
  const belt = readPotionBelt();
  if (belt.slotCount <= 0) return '藥水還沒準備好';
  if (freePotionSlots() < count) return '藥水格已滿';
  return null;
}

export function grantPotions(grant: PotionGrant): PotionGrantResult {
  const reason = potionBlockReason(grant.count);
  if (reason) return { ok: false, reason };
  return { ok: false, reason: '藥水還沒準備好' };
}
