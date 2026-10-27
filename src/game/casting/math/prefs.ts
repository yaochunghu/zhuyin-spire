import {
  MATH_ADAPTIVE_DROP_CAP,
  MATH_MISS_TRIGGER,
  MATH_MISS_WINDOW,
  MATH_RECOVER_HITS,
  MATH_RECOVER_WINDOW,
  MATH_TIER_CEILING_DEFAULT,
  MATH_TIER_FLOOR_DEFAULT,
} from '../../../data/balance';
import type { CastingTier } from '../types';

export interface MathCastingPreferences {
  gradeTwo: boolean;
  tierFloor: 1 | 2 | 3 | 4;
  tierCeiling: 1 | 2 | 3 | 4;
  raritySetsDifficulty: boolean;
  fixedTier: 1 | 2 | 3 | 4;
  scaffoldedRetry: boolean;
}

export interface MathInsights {
  adaptiveDrop: Record<string, number>;
}

export const MATH_FAMILY_IDS = [
  'count',
  'make10',
  'add10',
  'sub10',
  'add20',
  'sub20',
  'placeValue',
  'compare',
  'ordinal',
  'add100',
  'clock',
  'calendar',
  'money',
  'length',
  'shapes',
  'sort',
  'word',
  'g2Column',
  'g2Times',
  'g2Cm',
  'g2ClockMin',
  'g2Money1000',
  'g2Missing',
] as const;

export type MathFamilyId = (typeof MATH_FAMILY_IDS)[number];

const FAMILY_SET = new Set<string>(MATH_FAMILY_IDS);

export const DEFAULT_MATH_PREFS: MathCastingPreferences = {
  gradeTwo: false,
  tierFloor: MATH_TIER_FLOOR_DEFAULT as 1,
  tierCeiling: MATH_TIER_CEILING_DEFAULT as 4,
  raritySetsDifficulty: true,
  fixedTier: 1,
  scaffoldedRetry: true,
};

function bandTier(value: number, fallback: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  const rounded = Math.round(value);
  if (rounded === 1 || rounded === 2 || rounded === 3 || rounded === 4) return rounded;
  return fallback;
}

function clampTier(value: number, floor: number, ceiling: number): CastingTier {
  const clamped = Math.max(floor, Math.min(ceiling, Math.round(value)));
  if (clamped <= 1) return 1;
  if (clamped === 2) return 2;
  if (clamped === 3) return 3;
  if (clamped >= 5) return 5;
  return 4;
}

export function isMathFamilyId(value: string): value is MathFamilyId {
  return FAMILY_SET.has(value);
}

/** Parent band. Absent or broken input becomes the defaults and is not written back. */
export function parseMathCastingPreferences(value: unknown): MathCastingPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<MathCastingPreferences>;
  const tierFloor = bandTier(Number(data.tierFloor), DEFAULT_MATH_PREFS.tierFloor);
  let tierCeiling = bandTier(Number(data.tierCeiling), DEFAULT_MATH_PREFS.tierCeiling);
  if (tierCeiling < tierFloor) tierCeiling = tierFloor;
  const fixedTier = bandTier(Number(data.fixedTier), DEFAULT_MATH_PREFS.fixedTier);
  return {
    gradeTwo: data.gradeTwo === true,
    tierFloor,
    tierCeiling,
    raritySetsDifficulty: data.raritySetsDifficulty !== false,
    fixedTier,
    scaffoldedRetry: data.scaffoldedRetry !== false,
  };
}

export function parseMathInsights(value: unknown): MathInsights | null {
  if (!value || typeof value !== 'object') return null;
  const raw = (value as { adaptiveDrop?: unknown }).adaptiveDrop;
  if (!raw || typeof raw !== 'object') return { adaptiveDrop: {} };
  const adaptiveDrop: Record<string, number> = {};
  for (const [key, drop] of Object.entries(raw).slice(0, 64)) {
    if (!isMathFamilyId(key)) continue;
    const next = Math.floor(Number(drop));
    if (!Number.isFinite(next)) continue;
    adaptiveDrop[key] = Math.max(0, Math.min(MATH_ADAPTIVE_DROP_CAP, next));
  }
  return { adaptiveDrop };
}

/**
 * Difficulty only moves down from the card's nominal tier.
 * Grade-2 tier 5 ignores the grade-1 ceiling until a drop pulls it back inside.
 */
export function effectiveMathTier(
  nominal: CastingTier,
  prefs: MathCastingPreferences,
  drop: number,
  tierOverride?: CastingTier,
): CastingTier {
  const floor = prefs.tierFloor;
  const ceiling = prefs.tierCeiling;
  if (tierOverride) return clampTier(tierOverride, floor, ceiling);
  const safeDrop = Math.max(0, Math.min(MATH_ADAPTIVE_DROP_CAP, Math.floor(drop)));
  if (prefs.raritySetsDifficulty && nominal === 5 && safeDrop === 0) return 5;
  const base = prefs.raritySetsDifficulty ? nominal : prefs.fixedTier;
  if (prefs.raritySetsDifficulty && nominal === 5 && safeDrop > 0) {
    return clampTier(5 - safeDrop, floor, ceiling);
  }
  return clampTier(base - safeDrop, floor, Math.min(base, ceiling));
}

/**
 * Struggle and recovery are never applied to the same result.
 * A newest miss cannot also be a newest hit, so the two guards do not overlap.
 */
export function nextAdaptiveDrop(drop: number, recent: readonly boolean[]): number {
  if (recent.length === 0) return drop;
  const newest = recent[recent.length - 1] === true;
  const misses = recent.slice(-MATH_MISS_WINDOW).filter((hit) => !hit).length;
  const struggle = misses >= MATH_MISS_TRIGGER && !newest;
  const hits = recent.slice(-MATH_RECOVER_WINDOW).filter(Boolean).length;
  const recover = drop > 0 && hits >= MATH_RECOVER_HITS && newest;
  if (struggle && recover) return drop;
  if (struggle) return Math.min(MATH_ADAPTIVE_DROP_CAP, drop + 1);
  if (recover) return drop - 1;
  return drop;
}
