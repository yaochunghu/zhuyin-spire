import type { CastBinding, CastingGateId, CastingTier } from './types';

/** Mirrors `CardRarity`. `cards.ts` indexes this map with that union. */
export type CastCardRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'special';

export const RARITY_TIER: Record<CastCardRarity, 1 | 2 | 3 | 4> = {
  basic: 1,
  common: 2,
  uncommon: 3,
  rare: 4,
  /** No live card uses this rarity. Tier 4 keeps the map total. */
  special: 4,
};

/**
 * Future math-card binding. No shipped card sets `cast`.
 * `family` stays an open string until the math curriculum lands.
 */
export interface CardMathCast {
  gateId: 'math';
  family: string;
  gradeTwo?: boolean;
  gradeTwoFallbackFamily?: string;
}

/** The only math preference the binder needs. The rest of the parent panel is later. */
export interface MathGatePrefs {
  gradeTwo?: boolean;
}

export interface CastCardSource {
  id: string;
  zhuyin: string;
  rarity?: CastCardRarity;
  cast?: CardMathCast;
}

const ZHUYIN_VOWEL_FAMILIES = new Set(['ㄚ', 'ㄛ', 'ㄜ']);

/** True when a card still belongs to the Zhuyin coverage audit. */
export function isZhuyinGatedCard(card: { cast?: { gateId: string } | null }): boolean {
  return card.cast == null || card.cast.gateId === 'zhuyin';
}

export function resolveCastBinding(
  def: CastCardSource,
  gateId: CastingGateId = 'zhuyin',
  mathPrefs?: MathGatePrefs,
): CastBinding {
  if (gateId === 'math') return mathBinding(def, mathPrefs);
  if (gateId !== 'zhuyin') throw new Error(`gate ${gateId} not implemented`);
  const tier = def.rarity ? RARITY_TIER[def.rarity] : undefined;
  return {
    gateId,
    lessonFamilyId: ZHUYIN_VOWEL_FAMILIES.has(def.zhuyin)
      ? `vowel:${def.zhuyin}`
      : `initial:${def.zhuyin}`,
    displayGlyph: def.zhuyin,
    ...(tier !== undefined ? { tier } : {}),
  };
}

function mathBinding(def: CastCardSource, mathPrefs?: MathGatePrefs): CastBinding {
  if (def.cast?.gateId !== 'math') throw new Error(`card ${def.id} has no math binding`);
  const gradeTwo = Boolean(def.cast.gradeTwo && mathPrefs?.gradeTwo);
  const family = def.cast.gradeTwo && !gradeTwo
    ? def.cast.gradeTwoFallbackFamily ?? def.cast.family
    : def.cast.family;
  const tier: CastingTier = gradeTwo ? 5 : def.rarity ? RARITY_TIER[def.rarity] : 1;
  return {
    gateId: 'math',
    lessonFamilyId: `${family}@${tier}`,
    displayGlyph: def.zhuyin,
    tier,
  };
}
