/**
 * Central combat / economy targets (preschool co-op).
 * Tuned for **15-floor × 7-lane** acts: more rooms, campfires matter,
 * no free heal after every fight.
 */

/** Player life pool — longer climb needs a bit more buffer */
export const HERO_MAX_HP = 40;

/** StS-aligned hand rules */
export const DRAW_PER_TURN = 5;
/** Further draws do not enter hand (StS “hand is full”). */
export const MAX_HAND_SIZE = 10;

/**
 * Campfire heal = this fraction of max HP (floored, min 1).
 * e.g. max 40 → +16 HP.
 */
export const REST_HEAL_FRACTION = 0.4;

/** @deprecated use restHealAmount(maxHp) — kept for any import of flat value */
export const REST_HEAL = Math.floor(HERO_MAX_HP * REST_HEAL_FRACTION);

/** Heal amount at campfire for a given max HP */
export function restHealAmount(heroMaxHp: number): number {
  return Math.max(1, Math.floor(heroMaxHp * REST_HEAL_FRACTION));
}

/** Heal when clearing Act I or II boss (before next act) */
export const ACT_CLEAR_HEAL = 16;

/**
 * Post-combat heal removed for 15-floor pacing — campfires are the recovery beat.
 * Constant kept at 0 so any leftover callers are no-ops.
 */
export const HEAL_AFTER_COMBAT = 0;

/** Gold after a normal fight (plus 0..GOLD_JITTER-1) — more fights → lower per fight */
export const GOLD_FIGHT_BASE = 16;
/** Gold after elite / boss fight */
export const GOLD_ELITE_BASE = 28;
export const GOLD_JITTER = 5;
/** Extra on elite beyond base */
export const GOLD_ELITE_FLAT_BONUS = 4;
/** Danger-path / hard fight bonus */
export const GOLD_DANGER_BONUS = 8;

/** Treasure chest gold (plus jitter) */
export const GOLD_TREASURE_BASE = 32;
export const GOLD_TREASURE_JITTER = 8;

/**
 * Shop prices — still buyable after a few fights + treasure.
 */
export const SHOP_CARD_PRICES = [22, 34, 46] as const;

/** Pay gold at shop to remove one card from the deck (once per shop visit) */
export const SHOP_REMOVE_PRICE = 38;
