/**
 * Gate-generic child-error model.
 *
 * This is the debug-only successor of the proposed `mathChildModel.ts`
 * (CHARACTER2_DESIGN.md §9.3). One module answers 注音 and math, and it is the
 * only place those rates live. The browser bridge and `scripts/simulate-act.ts`
 * both import it.
 *
 * Answers use the persona, the prompt, and this module's own rng. They do not
 * read HP, gold, or enemy intents. Map, shop, and rest choices are a separate
 * policy in this file (P46-D01 / Q16), because a later Act I re-measure reads
 * the same numbers.
 *
 * Every rate is written down in docs/sim/CHILD_MODEL.md. Change the numbers
 * there in the same commit.
 */

import { debugSearchEnabled } from './debugFlags';
import type { CastingPrompt } from '../game/casting/types';
import { responseBucketFor, type ResponseBucket } from '../game/playtestTelemetry';
import {
  answerCast,
  answerEventShrine,
  useParentHint,
  type RunState,
} from '../game/state';

export const CHILD_PERSONA_IDS = ['firstGrader', 'struggling', 'strong'] as const;
export type ChildPersonaId = (typeof CHILD_PERSONA_IDS)[number];

/** Roadmap names. P46-D01 adds `confusable` and `mistap` later. */
export const BALANCE_PERSONA_ALIAS = {
  firstGrader: 'steady',
  struggling: 'struggling',
  strong: 'fast',
} as const;

export type MathTier = 1 | 2 | 3 | 4 | 5;
export const MATH_ERROR_TAGS = [
  'carryMissed',
  'offByOne',
  'operandEcho',
  'reversedDigits',
  'borrowMissed',
  'other',
] as const;
export type MathErrorTag = (typeof MATH_ERROR_TAGS)[number];

/** 共鳴 comparison sweep until a measured 注音 rate replaces it (§9.2). */
export const ZHUYIN_P_SWEEP = [0.7, 0.8, 0.9] as const;

const TONES = ['ˊ', 'ˇ', 'ˋ', '˙'] as const;

/**
 * Added to the miss rate (subtracted from p). Negative means this family is
 * easier than the tier base. Missing keys are 0.
 * Grade-1 cells a child meets in Act I sit near 0. Larger numbers and word
 * problems miss more. Grade-2 ids are listed so a later binding has a rate.
 */
export const MATH_FAMILY_MISS: Record<string, number> = {
  count: -0.04,
  make10: -0.03,
  compare: -0.03,
  sort: -0.02,
  add10: -0.02,
  sub10: 0.03,
  add20: 0,
  sub20: 0.04,
  placeValue: 0.02,
  ordinal: 0.02,
  shapes: 0.01,
  length: 0.03,
  clock: 0.04,
  calendar: 0.05,
  word: 0.06,
  money: 0.06,
  add100: 0.07,
  g2Column: 0.08,
  g2Times: 0.08,
  g2Cm: 0.08,
  g2ClockMin: 0.08,
  g2Money1000: 0.08,
  g2Missing: 0.08,
};

/**
 * Miss delta for one 注音 symbol. Starter glyphs are slightly easier.
 * Initials that adults mix up (aspiration, retroflex, front/back nasal)
 * miss more. The sweep value stays the base, so a 0.8 run is still about 0.8.
 */
export const ZHUYIN_FAMILY_MISS: Record<string, number> = {
  ㄅ: -0.02,
  ㄇ: -0.02,
  ㄚ: -0.02,
  ㄛ: -0.01,
  ㄜ: -0.01,
  ㄆ: 0.04,
  ㄈ: 0.04,
  ㄉ: 0.04,
  ㄊ: 0.04,
  ㄋ: 0.03,
  ㄌ: 0.03,
  ㄓ: 0.04,
  ㄔ: 0.04,
  ㄕ: 0.04,
  ㄖ: 0.04,
  ㄗ: 0.04,
  ㄘ: 0.04,
  ㄙ: 0.04,
  ㄣ: 0.04,
  ㄥ: 0.04,
};

const BUCKET_MS: Record<ResponseBucket, readonly [number, number]> = {
  '<5s': [800, 4_999],
  '5-15s': [5_000, 14_999],
  '15-30s': [15_000, 29_999],
  '>30s': [30_000, 90_000],
};

export interface ChildPersona {
  id: ChildPersonaId;
  balanceAlias: (typeof BALANCE_PERSONA_ALIAS)[ChildPersonaId];
  /** First-try math success by tier, before the family delta. */
  firstTryP: Record<MathTier, number>;
  /** P(correct | the combat's one scaffolded retry). Not used for 注音. */
  retryP: number;
  /** Weights over MATH_ERROR_TAGS. They do not have to be used raw if a tag cannot apply. */
  errorMix: Record<MathErrorTag, number>;
  /** Base 注音 first-try success before the symbol delta. Sweep overrides this. */
  zhuyinP: number;
  /** Chance a correct pad/build entry still adds a typo. Choice casts ignore it. */
  padTypoP: number;
  /** Chance a miss becomes a hinted correct, when 💡 is still available. */
  hintP: number;
  /** Chance to end the turn while a card is still playable, after at least one play. */
  skipCastP: number;
  /** Chance a 注音 miss is a wrong tone rather than a wrong symbol. */
  zhuyinWrongToneP: number;
  responseWeights: Record<ResponseBucket, number>;
}

/**
 * Shared run policy (Q16). Personas differ in accuracy, speed, hints, and
 * uncast cards. They share these choices so a balance read is not five policies.
 */
export const CHILD_RUN_POLICY = {
  /** Floor is 0.70. 0.74 leaves a visible tail of second-best and skips. */
  takeBestRewardP: 0.74,
  /** Of the rolls that do not take the best card, this share still takes a card. */
  secondBestGivenNotBestP: 0.62,
  /** Rest below this fraction of max HP. Otherwise Smith. */
  restBelowHpFraction: 0.6,
  /**
   * Take an elite now when HP is at least this, or when this node is the last
   * chance to reach an elite. Below it, a rest that still leads to an elite wins.
   */
  eliteMinHpFraction: 0.4,
  /** Buy a potion before a card when HP is under this. */
  healPotionBelowHpFraction: 0.55,
  /** After the required purchase, chance to buy one more affordable item. */
  secondPurchaseP: 0.22,
  /** Cheapest live shop card. A potion is 18, so "can buy" usually means 18. */
  shopCardFloorPrice: 22,
  path: {
    eliteNow: 80,
    eliteLater: 36,
    eliteDelayed: 12,
    restWhenHurt: 28,
    restWhenFine: 4,
    shopWhenAffordable: 22,
    shopWhenPoor: 2,
    treasure: 14,
    fight: 8,
    unknown: 5,
    boss: 3,
    jitter: 3,
  },
} as const;

const FIRST_GRADER_MIX: Record<MathErrorTag, number> = {
  carryMissed: 0.25,
  offByOne: 0.25,
  operandEcho: 0.15,
  reversedDigits: 0.1,
  borrowMissed: 0.15,
  other: 0.1,
};

export const CHILD_PERSONAS: Record<ChildPersonaId, ChildPersona> = {
  firstGrader: {
    id: 'firstGrader',
    balanceAlias: 'steady',
    firstTryP: { 1: 0.92, 2: 0.85, 3: 0.72, 4: 0.6, 5: 0.45 },
    retryP: 0.55,
    errorMix: FIRST_GRADER_MIX,
    zhuyinP: 0.8,
    padTypoP: 0.03,
    hintP: 0.06,
    skipCastP: 0.12,
    zhuyinWrongToneP: 0.55,
    responseWeights: { '<5s': 0.18, '5-15s': 0.52, '15-30s': 0.24, '>30s': 0.06 },
  },
  struggling: {
    id: 'struggling',
    balanceAlias: 'struggling',
    firstTryP: { 1: 0.6, 2: 0.6, 3: 0.6, 4: 0.6, 5: 0.6 },
    retryP: 0.4,
    errorMix: {
      carryMissed: 0.15,
      offByOne: 0.3,
      operandEcho: 0.2,
      reversedDigits: 0.1,
      borrowMissed: 0.15,
      other: 0.1,
    },
    zhuyinP: 0.7,
    padTypoP: 0.08,
    hintP: 0.2,
    skipCastP: 0.22,
    zhuyinWrongToneP: 0.7,
    responseWeights: { '<5s': 0.08, '5-15s': 0.28, '15-30s': 0.4, '>30s': 0.24 },
  },
  strong: {
    id: 'strong',
    balanceAlias: 'fast',
    firstTryP: { 1: 0.97, 2: 0.97, 3: 0.97, 4: 0.85, 5: 0.75 },
    retryP: 0.8,
    errorMix: {
      carryMissed: 0.1,
      offByOne: 0.4,
      operandEcho: 0.15,
      reversedDigits: 0.1,
      borrowMissed: 0.1,
      other: 0.15,
    },
    zhuyinP: 0.9,
    padTypoP: 0.01,
    hintP: 0.02,
    skipCastP: 0.05,
    zhuyinWrongToneP: 0.35,
    responseWeights: { '<5s': 0.62, '5-15s': 0.3, '15-30s': 0.07, '>30s': 0.01 },
  },
};

export interface CastAsk {
  gateId: string;
  family: string;
  tier: number;
  retried: boolean;
  hintAvailable: boolean;
  inputMode: string;
  correctTokens: readonly string[];
  choiceTokens: readonly string[];
  questionText: string;
}

export interface CastDecision {
  attempt: string[];
  correct: boolean;
  errorTag: string | null;
  responseMs: number;
  responseBucket: ResponseBucket;
  hint: boolean;
}

export interface ChildModelRequest {
  persona: ChildPersona;
  seed: number;
  /** Set when the query named a sweep value. Already copied onto `persona.zhuyinP`. */
  zhuyinP: number | null;
}

export interface CardScoreInput {
  type: string;
  cost: number;
  value: number;
  hits?: number;
  bonusBlock?: number;
  draw?: number;
  direction?: string;
}

export interface RewardOption {
  id: string;
  score: number;
}

export interface MapOption {
  id: string;
  kind: string;
  leadsToElite: boolean;
  leadsToRest: boolean;
  leadsToShop: boolean;
}

export interface MapChoiceContext {
  elitesFought: number;
  hpFraction: number;
  gold: number;
  shopsVisited: number;
}

export interface ShopCardOffer {
  index: number;
  price: number;
  score: number;
}

export interface ShopShelf {
  cards: ShopCardOffer[];
  potions: ShopCardOffer[];
  removePrice: number | null;
}

export type ShopPurchase =
  | { kind: 'card' | 'potion'; index: number }
  | { kind: 'remove' };

export interface EventChoiceView {
  id: string;
  losesHp: number;
  heals: boolean;
  gainsGold: number;
  isLeave: boolean;
}

export interface CombatCardView {
  uid: string;
  type: string;
  damage: number;
  block: number;
  draw: number;
}

export type CombatAction =
  | { kind: 'end'; uncast: boolean }
  | { kind: 'play'; uid: string };

/** Child decisions use this stream. It is not `Math.random`, so it does not move the map. */
export function createChildRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix the run seed so a cast roll cannot replay a map roll from the same stream. */
export function childDecisionSeed(runSeed: number): number {
  return (runSeed ^ 0xc411d500) >>> 0;
}

export function isChildPersonaId(value: string): value is ChildPersonaId {
  return (CHILD_PERSONA_IDS as readonly string[]).includes(value);
}

export function personaById(id: string): ChildPersona | null {
  if (!isChildPersonaId(id)) return null;
  return CHILD_PERSONAS[id];
}

export function withZhuyinP(persona: ChildPersona, zhuyinP: number): ChildPersona {
  return { ...persona, zhuyinP: clampUnit(zhuyinP) };
}

/**
 * `?childModel` is ignored unless the debug query is also present.
 * An unknown persona is ignored too. Local-storage debug alone is not enough:
 * the query itself has to say `debug`.
 */
export function childModelFromSearch(search: string): ChildModelRequest | null {
  if (!debugSearchEnabled(search)) return null;
  let query: URLSearchParams;
  try {
    query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return null;
  }
  const rawPersona = query.get('childModel');
  if (!rawPersona) return null;
  const persona = personaById(rawPersona);
  if (!persona) return null;
  const seed = parseSeed(query.get('seed'));
  const zhuyinRaw = query.get('zhuyinP');
  const zhuyinP = zhuyinRaw === null ? null : Number(zhuyinRaw);
  const resolved = zhuyinP !== null && Number.isFinite(zhuyinP)
    ? withZhuyinP(persona, zhuyinP)
    : persona;
  return {
    persona: resolved,
    seed,
    zhuyinP: zhuyinP !== null && Number.isFinite(zhuyinP) ? resolved.zhuyinP : null,
  };
}

export function familyKey(family: string, tier: number): string {
  const suffix = `@${tier}`;
  if (family.endsWith(suffix) && family.length > suffix.length) {
    return family.slice(0, -suffix.length);
  }
  const at = family.lastIndexOf('@');
  if (at > 0 && /^\d+$/.test(family.slice(at + 1))) return family.slice(0, at);
  return family;
}

export function zhuyinSymbol(family: string): string {
  const marker = family.includes(':') ? family.slice(family.lastIndexOf(':') + 1) : family;
  return marker;
}

export function asMathTier(tier: number): MathTier {
  if (tier <= 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  if (tier === 4) return 4;
  return 5;
}

/** Success chance for this ask. Family delta applies to the first try only. */
export function successProbability(persona: ChildPersona, ask: Pick<CastAsk, 'gateId' | 'family' | 'tier' | 'retried'>): number {
  if (ask.gateId === 'zhuyin') {
    const miss = ask.retried ? 0 : ZHUYIN_FAMILY_MISS[zhuyinSymbol(ask.family)] ?? 0;
    return clampProbability(persona.zhuyinP - miss);
  }
  const tier = asMathTier(ask.tier);
  const base = ask.retried ? persona.retryP : persona.firstTryP[tier];
  const miss = ask.retried ? 0 : MATH_FAMILY_MISS[familyKey(ask.family, tier)] ?? 0;
  return clampProbability(base - miss);
}

export function decideCast(persona: ChildPersona, ask: CastAsk, rng: () => number): CastDecision {
  const probability = successProbability(persona, ask);
  let correct = rng() < probability;
  let hint = false;
  let errorTag: string | null = null;
  if (!correct && !ask.retried && ask.hintAvailable && rng() < persona.hintP) {
    hint = true;
    correct = true;
  }
  let attempt: string[];
  if (correct && isPadMode(ask.inputMode) && rng() < persona.padTypoP) {
    correct = false;
    errorTag = 'padTypo';
    attempt = padTypo(ask.correctTokens, rng);
  } else if (correct) {
    attempt = [...ask.correctTokens];
  } else if (ask.gateId === 'zhuyin') {
    const wrong = wrongZhuyin(ask, persona.zhuyinWrongToneP, rng);
    attempt = wrong.tokens;
    errorTag = wrong.tag;
  } else {
    const tag = drawMathTag(persona, ask, rng);
    errorTag = tag;
    attempt = wrongMath(ask, tag, rng);
  }
  if (!correct && sameAttempt(attempt, ask.correctTokens)) {
    attempt = fallbackWrong(ask, rng);
    if (errorTag === null) errorTag = 'other';
  }
  const responseMs = sampleResponseMs(drawBucket(persona, rng), rng);
  return {
    attempt,
    correct,
    errorTag: correct ? null : errorTag,
    responseMs,
    responseBucket: responseBucketFor(responseMs),
    hint,
  };
}

/** Move `createdAt` so the live cast recorder buckets this decision's delay. */
export function applyModelClock(
  prompt: { createdAt: number },
  responseMs: number,
  now = Date.now(),
): void {
  const ms = Math.max(0, Math.round(responseMs));
  prompt.createdAt = now - ms;
}

export function castAskFromPrompt(prompt: CastingPrompt, hintAvailable: boolean): CastAsk {
  return {
    gateId: prompt.gateId,
    family: prompt.lessonFamilyId,
    tier: prompt.tier ?? 1,
    retried: prompt.retry === true,
    hintAvailable,
    inputMode: prompt.inputMode,
    correctTokens: prompt.answerTokens,
    choiceTokens: prompt.choiceTokens,
    questionText: prompt.cue.text,
  };
}

/**
 * One resolved cast, including a scaffolded retry.
 * Returns `retry` when the game opened 再算一次 and the caller should call again.
 */
export function resolveModelCast(
  state: RunState,
  persona: ChildPersona,
  rng: () => number,
): 'success' | 'fizzle' | 'retry' | 'idle' {
  const cast = state.cast;
  if (!cast) return 'idle';
  const hintAvailable = state.screen === 'castCheck'
    && !cast.prompt.hintRevealedAnswer
    && !state.combat?.parentHintUsed;
  const decision = decideCast(persona, castAskFromPrompt(cast.prompt, hintAvailable), rng);
  if (decision.hint && state.screen === 'castCheck') useParentHint(state);
  applyModelClock(cast.prompt, decision.responseMs);
  if (state.screen === 'eventCast') {
    answerEventShrine(state, decision.correct);
    return decision.correct ? 'success' : 'fizzle';
  }
  if (state.screen !== 'castCheck') return 'idle';
  return answerCast(state, decision.attempt);
}

/** Printed value per energy. Reward picks and the offer proxy share this. */
export function printedCardScore(card: CardScoreInput, focusDirection?: string): number {
  const cost = Math.max(0.6, card.cost);
  const hits = card.hits && card.hits > 0 ? card.hits : 1;
  let raw = 0;
  if (card.type === 'attack') raw += card.value * hits;
  else if (card.type === 'block') raw += card.value * 0.85;
  else if (card.type === 'skill') raw += card.value * 0.55 + (card.bonusBlock ?? 0) * 0.85;
  else if (card.type === 'power') raw += 6 + card.value * 0.45;
  else raw += card.value * 0.5;
  if (card.draw) raw += card.draw * 2.2;
  if (focusDirection && card.direction === focusDirection) raw += 1.6;
  return raw / cost;
}

export function chooseReward(options: readonly RewardOption[], rng: () => number): string | null {
  if (options.length === 0) return null;
  const ranked = [...options].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  if (rng() < CHILD_RUN_POLICY.takeBestRewardP) return ranked[0]!.id;
  if (ranked.length > 1 && rng() < CHILD_RUN_POLICY.secondBestGivenNotBestP) return ranked[1]!.id;
  return null;
}

export function chooseMapNode(
  options: readonly MapOption[],
  context: MapChoiceContext,
  rng: () => number,
): string | null {
  if (options.length === 0) return null;
  const weights = CHILD_RUN_POLICY.path;
  const anotherEliteLater = options.some((option) => option.kind !== 'elite' && option.leadsToElite);
  let best = options[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const option of options) {
    let score = 0;
    if (option.kind === 'elite' && context.elitesFought < 1) {
      const nowOrNever = !anotherEliteLater;
      if (nowOrNever || context.hpFraction >= CHILD_RUN_POLICY.eliteMinHpFraction) score += weights.eliteNow;
      else score += weights.eliteDelayed;
    }
    if (option.leadsToElite && context.elitesFought < 1) score += weights.eliteLater;
    if (option.kind === 'rest') {
      score += context.hpFraction < CHILD_RUN_POLICY.restBelowHpFraction
        ? weights.restWhenHurt
        : weights.restWhenFine;
    } else if (option.leadsToRest && context.hpFraction < CHILD_RUN_POLICY.restBelowHpFraction) {
      score += weights.restWhenHurt * 0.45;
    }
    const shopWeight = context.gold >= 18 && context.shopsVisited < 1
      ? weights.shopWhenAffordable
      : weights.shopWhenPoor;
    if (option.kind === 'shop') score += shopWeight;
    else if (option.leadsToShop) score += shopWeight * 0.45;
    if (option.kind === 'treasure') score += weights.treasure;
    if (option.kind === 'fight') score += weights.fight;
    if (option.kind === 'unknown') score += weights.unknown;
    if (option.kind === 'boss') score += weights.boss;
    score += (rng() - 0.5) * weights.jitter;
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best.id;
}

export function shouldRest(hpFraction: number, smithAvailable: boolean): boolean {
  if (!smithAvailable) return true;
  return hpFraction < CHILD_RUN_POLICY.restBelowHpFraction;
}

/**
 * At least one purchase when gold covers the cheapest shelf item.
 * A hurt child buys a potion first. Otherwise the best affordable card.
 * Remove is only the purchase when nothing else fits.
 */
export function planShopPurchases(
  shelf: ShopShelf,
  gold: number,
  hpFraction: number,
  rng: () => number,
): ShopPurchase[] {
  let purse = gold;
  const buys: ShopPurchase[] = [];
  const first = nextPurchase(shelf, purse, hpFraction, buys);
  if (!first) return buys;
  buys.push(first);
  purse -= priceOf(shelf, first);
  if (rng() >= CHILD_RUN_POLICY.secondPurchaseP) return buys;
  const second = nextPurchase(shelf, purse, hpFraction, buys);
  if (second) buys.push(second);
  return buys;
}

export function chooseEventChoice(
  choices: readonly EventChoiceView[],
  hpFraction: number,
  rng: () => number,
): string | null {
  if (choices.length === 0) return null;
  const leave = choices.find((choice) => choice.isLeave);
  const safe = choices.filter((choice) => choice.losesHp <= 0 && !choice.isLeave);
  const heal = safe.find((choice) => choice.heals);
  const gold = safe.find((choice) => choice.gainsGold > 0);
  if (hpFraction < 0.5 && heal) return heal.id;
  if (hpFraction < 0.4 && leave) return leave.id;
  if (gold && rng() < 0.7) return gold.id;
  if (heal) return heal.id;
  if (safe.length > 0) return safe[Math.floor(rng() * safe.length)]!.id;
  if (leave && hpFraction < 0.75) return leave.id;
  const risky = choices
    .filter((choice) => !choice.isLeave)
    .sort((left, right) => left.losesHp - right.losesHp);
  if (hpFraction >= 0.7 && risky[0] && risky[0].losesHp > 0 && risky[0].losesHp <= 8) return risky[0].id;
  return leave?.id ?? risky[0]?.id ?? choices[0]!.id;
}

/**
 * Play a threatened block, otherwise a power, otherwise the biggest attack.
 * After one card, `skipCastP` ends the turn and leaves the rest uncast.
 */
export function chooseCombatAction(
  persona: ChildPersona,
  cards: readonly CombatCardView[],
  incoming: number,
  currentBlock: number,
  cardsPlayedThisTurn: number,
  rng: () => number,
): CombatAction {
  if (cards.length === 0) return { kind: 'end', uncast: false };
  if (cardsPlayedThisTurn >= 1 && rng() < persona.skipCastP) return { kind: 'end', uncast: true };
  const threatened = incoming > currentBlock;
  if (threatened) {
    const block = [...cards].filter((card) => card.block > 0).sort((left, right) => right.block - left.block)[0];
    if (block) return { kind: 'play', uid: block.uid };
  }
  const power = cards.find((card) => card.type === 'power');
  if (power && !threatened) return { kind: 'play', uid: power.uid };
  const attack = [...cards].filter((card) => card.damage > 0).sort((left, right) => right.damage - left.damage)[0];
  if (attack) return { kind: 'play', uid: attack.uid };
  const support = [...cards].sort((left, right) => (right.block + right.draw) - (left.block + left.draw))[0];
  return support ? { kind: 'play', uid: support.uid } : { kind: 'end', uncast: false };
}

export function shouldDrinkPotion(
  kind: 'heal' | 'block' | 'other',
  hpFraction: number,
  incoming: number,
  currentBlock: number,
): boolean {
  if (kind === 'heal') return hpFraction < 0.35 && hpFraction < 1;
  if (kind === 'block') return incoming > currentBlock + 4;
  return false;
}

function nextPurchase(
  shelf: ShopShelf,
  gold: number,
  hpFraction: number,
  already: readonly ShopPurchase[],
): ShopPurchase | null {
  const cards = shelf.cards.filter((offer) => !already.some((buy) => buy.kind === 'card' && buy.index === offer.index));
  const potions = shelf.potions.filter((offer) => !already.some((buy) => buy.kind === 'potion' && buy.index === offer.index));
  const affordableCards = cards.filter((offer) => offer.price <= gold);
  const affordablePotions = potions.filter((offer) => offer.price <= gold);
  if (hpFraction < CHILD_RUN_POLICY.healPotionBelowHpFraction && affordablePotions.length > 0) {
    const cheapest = [...affordablePotions].sort((left, right) => left.price - right.price)[0]!;
    return { kind: 'potion', index: cheapest.index };
  }
  if (affordableCards.length > 0) {
    const best = [...affordableCards].sort((left, right) => right.score - left.score || left.price - right.price)[0]!;
    return { kind: 'card', index: best.index };
  }
  if (affordablePotions.length > 0) {
    const cheapest = [...affordablePotions].sort((left, right) => left.price - right.price)[0]!;
    return { kind: 'potion', index: cheapest.index };
  }
  const removed = already.some((buy) => buy.kind === 'remove');
  if (!removed && shelf.removePrice !== null && shelf.removePrice <= gold) return { kind: 'remove' };
  return null;
}

function priceOf(shelf: ShopShelf, buy: ShopPurchase): number {
  if (buy.kind === 'remove') return shelf.removePrice ?? 0;
  const list = buy.kind === 'card' ? shelf.cards : shelf.potions;
  return list.find((offer) => offer.index === buy.index)?.price ?? 0;
}

function drawMathTag(persona: ChildPersona, ask: CastAsk, rng: () => number): MathErrorTag {
  const applicable = MATH_ERROR_TAGS.filter((tag) => tagApplies(tag, ask));
  const pool = applicable.length > 0 ? applicable : (['offByOne'] as const);
  let total = 0;
  for (const tag of pool) total += persona.errorMix[tag];
  if (total <= 0) return 'offByOne';
  let roll = rng() * total;
  for (const tag of pool) {
    roll -= persona.errorMix[tag];
    if (roll < 0) return tag;
  }
  return pool[pool.length - 1] ?? 'offByOne';
}

function tagApplies(tag: MathErrorTag, ask: CastAsk): boolean {
  const answer = Number(ask.correctTokens[0]);
  if (!Number.isFinite(answer)) return tag === 'other' || tag === 'offByOne';
  if (tag === 'carryMissed') return answer >= 10;
  if (tag === 'reversedDigits') {
    const text = String(Math.abs(Math.trunc(answer)));
    return text.length >= 2 && text.split('').reverse().join('') !== text;
  }
  if (tag === 'operandEcho') {
    return (ask.questionText.match(/\d+/g) ?? []).some((piece) => Number(piece) !== answer);
  }
  return true;
}

function wrongMath(ask: CastAsk, tag: MathErrorTag, rng: () => number): string[] {
  const answer = Number(ask.correctTokens[0]);
  let guess: string | null = null;
  if (Number.isFinite(answer)) {
    if (tag === 'carryMissed' && answer >= 10) guess = String(answer - 10);
    else if (tag === 'borrowMissed') guess = String(answer + 10);
    else if (tag === 'offByOne') guess = String(Math.max(0, answer + (rng() < 0.5 ? -1 : 1)));
    else if (tag === 'reversedDigits') {
      const text = String(Math.abs(Math.trunc(answer)));
      const reversed = text.split('').reverse().join('');
      if (reversed !== text) guess = String(Number(reversed));
    } else if (tag === 'operandEcho') {
      const echo = (ask.questionText.match(/\d+/g) ?? []).map(Number).find((value) => value !== answer);
      if (echo !== undefined) guess = String(echo);
    }
  }
  if (guess === null || guess === ask.correctTokens[0]) {
    guess = Number.isFinite(answer) ? String(Math.max(0, answer + (answer === 0 ? 1 : -1))) : null;
  }
  return snapToWrongChoice(ask, guess, rng);
}

function wrongZhuyin(
  ask: CastAsk,
  wrongToneP: number,
  rng: () => number,
): { tokens: string[]; tag: string } {
  const tokens = [...ask.correctTokens];
  const toneIndex = tokens.findIndex((token) => (TONES as readonly string[]).includes(token));
  if (toneIndex >= 0 && rng() < wrongToneP) {
    const choices = TONES.filter((tone) => tone !== tokens[toneIndex]);
    tokens[toneIndex] = choices[Math.floor(rng() * choices.length)] ?? 'ˊ';
    return { tokens, tag: 'wrongTone' };
  }
  const distractors = ask.choiceTokens.filter((token) => !tokens.includes(token) && !(TONES as readonly string[]).includes(token));
  const symbolIndexes = tokens
    .map((token, index) => ((TONES as readonly string[]).includes(token) ? -1 : index))
    .filter((index) => index >= 0);
  if (symbolIndexes.length > 0 && distractors.length > 0) {
    const index = symbolIndexes[Math.floor(rng() * symbolIndexes.length)]!;
    tokens[index] = distractors[Math.floor(rng() * distractors.length)]!;
    return { tokens, tag: 'other' };
  }
  if (toneIndex >= 0) {
    const choices = TONES.filter((tone) => tone !== tokens[toneIndex]);
    tokens[toneIndex] = choices[Math.floor(rng() * choices.length)] ?? 'ˋ';
    return { tokens, tag: 'wrongTone' };
  }
  return { tokens: [...tokens, 'ㄅ'], tag: 'other' };
}

function padTypo(tokens: readonly string[], rng: () => number): string[] {
  const text = tokens.join('');
  if (text.length >= 2 && rng() < 0.5) {
    const chars = text.split('');
    const index = Math.floor(rng() * (chars.length - 1));
    const swap = chars[index]!;
    chars[index] = chars[index + 1]!;
    chars[index + 1] = swap;
    return [chars.join('')];
  }
  const extra = String(Math.floor(rng() * 10));
  return [`${text}${extra}`];
}

function snapToWrongChoice(ask: CastAsk, guess: string | null, rng: () => number): string[] {
  const correct = ask.correctTokens[0];
  const wrongs = ask.choiceTokens.filter((choice) => choice !== correct);
  if (wrongs.length === 0) return [guess ?? `${correct ?? '0'}9`];
  if (guess && wrongs.includes(guess)) return [guess];
  if (guess !== null && wrongs.every((choice) => Number.isFinite(Number(choice)))) {
    const target = Number(guess);
    const closest = [...wrongs].sort((left, right) => Math.abs(Number(left) - target) - Math.abs(Number(right) - target))[0]!;
    return [closest];
  }
  return [wrongs[Math.floor(rng() * wrongs.length)]!];
}

function fallbackWrong(ask: CastAsk, rng: () => number): string[] {
  return snapToWrongChoice(ask, null, rng);
}

function sameAttempt(attempt: readonly string[], correct: readonly string[]): boolean {
  return attempt.length === correct.length && attempt.every((token, index) => token === correct[index]);
}

function drawBucket(persona: ChildPersona, rng: () => number): ResponseBucket {
  const order: ResponseBucket[] = ['<5s', '5-15s', '15-30s', '>30s'];
  let total = 0;
  for (const bucket of order) total += persona.responseWeights[bucket];
  let roll = rng() * (total || 1);
  for (const bucket of order) {
    roll -= persona.responseWeights[bucket];
    if (roll < 0) return bucket;
  }
  return '5-15s';
}

function sampleResponseMs(bucket: ResponseBucket, rng: () => number): number {
  const [min, max] = BUCKET_MS[bucket];
  return min + Math.floor(rng() * (max - min + 1));
}

function isPadMode(inputMode: string): boolean {
  return inputMode === 'numberPad' || inputMode === 'build';
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.98, Math.max(0.05, value));
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  return Math.min(1, Math.max(0, value));
}

function parseSeed(value: string | null): number {
  if (value === null || value.trim() === '') return 1;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.trunc(Math.abs(parsed)) || 1;
}
