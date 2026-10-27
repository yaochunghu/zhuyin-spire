/**
 * Central combat / economy targets (preschool co-op).
 * Tuned for **15 climb floors + boss × 7-lane** acts: more rooms,
 * campfires matter, no free heal after every ordinary fight.
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

/**
 * @deprecated Boss clears now restore directly to heroMaxHp.
 * Kept as the default hero's full-pool equivalent for compatibility.
 */
export const ACT_CLEAR_HEAL = HERO_MAX_HP;

/**
 * Post-combat heal removed for climb pacing — campfires and boss clears are
 * the recovery beats.
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
 * Paid when a chest, elite, or boss would drop a relic but every pool relic
 * is already owned. About one normal fight's gold, not a second relic.
 */
export const RELIC_POOL_EXHAUST_GOLD = 20;

/**
 * Shop prices — still buyable after a few fights + treasure.
 */
export const SHOP_CARD_PRICES = [22, 34, 46] as const;

/** Pay gold at shop to remove one card from the deck (once per shop visit) */
export const SHOP_REMOVE_PRICE = 38;

/**
 * Potion belt. Three slots sit on their own row, so relic badges keep the phone scroll row.
 * A one-use bottle should cost about one normal fight, under the cheapest card.
 */
export const POTION_BELT_SLOTS = 3;
export const SHOP_POTION_COUNT = 2;
export const SHOP_POTION_PRICE = 18;

/** Combat drop chance, in percent. Starts at 40 each act, steps by 10, clamps here. */
export const POTION_DROP_START = 40;
export const POTION_DROP_STEP = 10;

/** 珠算武者 beads. A 湊十 fires at this size and leaves the remainder. */
export const BEAD_CAP = 9;
export const TENS_CAP = 9;
export const MAKE_TEN_SIZE = 10;
/** 湊十訣 adds at most this many beads, and never past the next ten. */
export const BEAD_FILL_CAP = 5;
/** 木珠串: direct damage on each 湊十. Skips Block and 易傷. */
export const WOOD_BEADS_DIRECT_DAMAGE = 2;
/** 算珠袋: beads added once at combat start, as its own add. */
export const BEAD_POUCH_START = 4;
/** 小尺子: block when this many casts have succeeded this turn. */
export const RULER_CHARM_CAST = 3;
export const RULER_CHARM_BLOCK = 3;
/** 十響鈴: energy on the first 湊十 of the combat. */
export const TEN_BELL_ENERGY = 1;
/** 橡皮擦: beads on the first final fizzle of the combat. */
export const ERASER_BEADS = 2;
/** 珠串陣 block on each 湊十, then the upgraded amount. */
export const BEAD_ARRAY_BLOCK = 4;
export const BEAD_ARRAY_BLOCK_PLUS = 6;
/** 珠落玉盤 direct damage to every living enemy, then the upgraded amount. */
export const BEAD_BURST_DAMAGE = 2;
export const BEAD_BURST_DAMAGE_PLUS = 3;
/** 撥算如飛 beads at the start of each player turn after the power is in play. */
export const TURN_START_BEADS = 2;

/** Every live math prompt offers this many answers. */
export const MATH_CHOICE_COUNT = 3;
export const MATH_TIER_FLOOR_DEFAULT = 1;
export const MATH_TIER_CEILING_DEFAULT = 4;
export const MATH_ADAPTIVE_DROP_CAP = 4;
/** Struggle: this many misses inside the recent window, including a miss just now. */
export const MATH_MISS_WINDOW = 5;
export const MATH_MISS_TRIGGER = 2;
/** Recovery: this many hits inside the recent window, including a hit just now. */
export const MATH_RECOVER_WINDOW = 8;
export const MATH_RECOVER_HITS = 6;
/** Wrong answers in a row this combat force the next prompt down to tier 1. */
export const MATH_WARMUP_STREAK = 3;
export const POTION_DROP_MIN = 10;
export const POTION_DROP_MAX = 80;
