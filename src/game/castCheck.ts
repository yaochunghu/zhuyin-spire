import {
  getCardCastBinding,
  type CardDef,
  type Cue,
} from '../data/cards';
import type { MapNode } from '../data/map';
import { getCastingGateProvider } from './casting/registry';
import {
  buildZhuyinTokenBank,
  chooseZhuyinMode,
} from './casting/zhuyinProvider';
import type {
  CastMode,
  CastingGateId,
  CastingPrompt,
} from './casting/types';
import { recordCastingResult } from './profiles';

export type { CastMode } from './casting/types';
export type CastPrompt = CastingPrompt;
export type CueDifficulty = MapNode['castStage'] | 'practice';

/** Educational difficulty is profile-controlled; tower stage is combat-only. */
export function pickCastMode(
  _castStage: MapNode['castStage'],
  rng: () => number = Math.random,
  lessonFamilyId = 'initial:ㄅ',
): CastMode {
  return chooseZhuyinMode(lessonFamilyId, rng);
}

export function pickCueForDifficulty(
  def: CardDef,
  _difficulty: CueDifficulty,
  rng: () => number = Math.random,
): Cue {
  return buildCastPrompt(def, 'recognize', rng).cue;
}

export function buildSymbolBank(
  correctParts: string[],
  rng: () => number = Math.random,
): string[] {
  return buildZhuyinTokenBank(correctParts, 4, rng);
}

export function buildCastPrompt(
  def: CardDef,
  mode: CastMode,
  rng: () => number = Math.random,
  _difficulty: CueDifficulty = 'mid',
  gateId: CastingGateId = 'zhuyin',
): CastPrompt {
  const binding = getCardCastBinding(def, gateId);
  return getCastingGateProvider(gateId).createPrompt({
    binding,
    mode,
    fallbackCues: def.cues,
    rng,
  });
}

export function isSpellCorrect(attempt: string[], correctParts: string[]): boolean {
  if (attempt.length !== correctParts.length) return false;
  return attempt.every((symbol, index) => symbol === correctParts[index]);
}

export function isCastAnswerCorrect(prompt: CastPrompt, attempt: string[]): boolean {
  return getCastingGateProvider(prompt.gateId).validate(prompt, attempt);
}

export function recordCastResult(
  prompt: CastPrompt,
  correct: boolean,
  now = Date.now(),
): void {
  recordCastingResult(
    `${prompt.gateId}:${prompt.lessonFamilyId}`,
    correct,
    now - prompt.createdAt,
  );
}

/** History is intentionally profile-persistent; a new run must not reset it. */
export function clearRecentCastPhrases(): void {
  // Kept as a compatibility no-op for callers from the pre-profile picker.
}
