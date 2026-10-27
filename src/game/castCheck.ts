import {
  getCardCastBinding,
  type CardDef,
  type Cue,
} from '../data/cards';
import type { MapNode } from '../data/map';
import {
  getCastingGateProvider,
  getGameCastingRegistry,
  type CastingGateRegistry,
} from './casting/registry';
import {
  buildZhuyinTokenBank,
  chooseZhuyinMode,
} from './casting/zhuyinProvider';
import type {
  CastMode,
  CastingDiagnosis,
  CastingGateId,
  CastingPrompt,
} from './casting/types';
import { recordCastingResult } from './profiles';

export type { CastMode } from './casting/types';
export type CastPrompt = CastingPrompt;
export type CueDifficulty = MapNode['castStage'] | 'practice';

/**
 * Educational difficulty is profile-controlled; tower stage is combat-only.
 * Zhuyin always uses `chooseZhuyinMode`, including when a caller passes another registry.
 */
export function pickCastMode(
  _castStage: MapNode['castStage'],
  rng: () => number = Math.random,
  lessonFamilyId = 'initial:ㄅ',
  gateId: CastingGateId = 'zhuyin',
  registry: CastingGateRegistry = getGameCastingRegistry(),
): CastMode {
  if (gateId === 'zhuyin') return chooseZhuyinMode(lessonFamilyId, rng);
  return registry.get(gateId).chooseMode?.(lessonFamilyId, rng) ?? 'recognize';
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

export function isCastAnswerCorrect(
  prompt: CastPrompt,
  attempt: string[],
  registry: CastingGateRegistry = getGameCastingRegistry(),
): boolean {
  return registry.get(prompt.gateId).validate(prompt, attempt);
}

export function diagnoseCast(
  prompt: CastPrompt,
  attempt: string[],
  registry: CastingGateRegistry = getGameCastingRegistry(),
): CastingDiagnosis | null {
  return registry.get(prompt.gateId).diagnose?.(prompt, attempt) ?? null;
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
