import { diagnoseCast } from './castCheck';
import type { CastingPrompt } from './casting/types';
import { getDebugSkipCast, isDebugEnabled } from '../debug/debugFlags';

/**
 * Local playtest log. The storage key stays `zhuyin-spire-playtest-v1` so a
 * browser that already has events keeps them. The export schema string is
 * `zhuyin-spire-playtest-v2` once `cast` and `combatEnd.characterId` exist.
 * Events already in storage are copied out unchanged.
 */
export const PLAYTEST_STORAGE_KEY = 'zhuyin-spire-playtest-v1';
export const PLAYTEST_EXPORT_SCHEMA = 'zhuyin-spire-playtest-v2';

const MAX_EVENTS = 10_000;
const RESPONSE_CLAMP_MS = 300_000;
/** Diagnosis codes are short identifiers. Digits, spaces, and answer text are dropped. */
const ERROR_TAG = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

export type ResponseBucket = '<5s' | '5-15s' | '15-30s' | '>30s';

type SyntheticMark = { synthetic?: true };

export type PlaytestEvent = SyntheticMark & (
  | {
      kind: 'offer';
      at: number;
      uid: string;
      defId: string;
      upgradeLevel: 0 | 1;
      act: number;
      source: 'reward' | 'shop';
    }
  | { kind: 'pick' | 'smith' | 'remove'; at: number; uid: string; defId: string; upgradeLevel: 0 | 1 }
  | { kind: 'skip'; at: number; offeredUids: string[]; act: number }
  | {
      kind: 'combatEnd';
      at: number;
      won: boolean;
      hpLost: number;
      act: number;
      deck: Array<{ defId: string; upgradeLevel: 0 | 1 }>;
      /** Run character id. Open string so a later hero does not need a new schema. */
      characterId: string;
    }
  | {
      kind: 'cast';
      at: number;
      /** Open string. Live gates are `zhuyin` and `math`. `english` is reserved. */
      gateId: string;
      /** Asked lesson family. Open string, not a closed curriculum union. */
      family: string;
      tier: number;
      correct: boolean;
      retried: boolean;
      hintLevel: number;
      /** Provider diagnosis code, or null. Never an attempt or a sentence. */
      errorTag: string | null;
      responseBucket: ResponseBucket;
    }
);

const RESPONSE_BUCKETS = new Set<string>(['<5s', '5-15s', '15-30s', '>30s']);

function asBucket(value: string): ResponseBucket {
  return RESPONSE_BUCKETS.has(value) ? value as ResponseBucket : '>30s';
}

export function responseBucketFor(responseMs: number): ResponseBucket {
  if (!Number.isFinite(responseMs)) return '<5s';
  const ms = Math.max(0, Math.min(RESPONSE_CLAMP_MS, Math.round(responseMs)));
  if (ms < 5_000) return '<5s';
  if (ms < 15_000) return '5-15s';
  if (ms < 30_000) return '15-30s';
  return '>30s';
}

/** Keeps `family@tier` ids from repeating the tier, and leaves every other id whole. */
export function castFamilyId(lessonFamilyId: string, tier: number): string {
  const suffix = `@${tier}`;
  if (lessonFamilyId.length > suffix.length && lessonFamilyId.endsWith(suffix)) {
    const family = lessonFamilyId.slice(0, -suffix.length);
    if (family.length > 0) return family;
  }
  return lessonFamilyId;
}

export function sanitizeErrorTag(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return ERROR_TAG.test(value) ? value : null;
}

/**
 * Code from the first wrong attempt, for a retry that has not resolved yet.
 * Returns null when the provider has no diagnosis. Never returns the attempt.
 */
export function priorErrorTagFor(prompt: CastingPrompt, attempt: readonly string[]): string | null {
  try {
    return sanitizeErrorTag(diagnoseCast(prompt, [...attempt])?.code ?? null);
  } catch {
    return null;
  }
}

export interface CastMeasurement {
  gateId: string;
  family: string;
  tier: number;
  correct: boolean;
  retried: boolean;
  hintLevel: number;
  errorTag: string | null;
  responseMs: number;
  at?: number;
}

/**
 * Gate-generic writer. A later subject calls this with its own `gateId` and
 * `family` strings. The export schema does not change for that.
 */
export function recordCastMeasurement(input: CastMeasurement): void {
  const at = typeof input.at === 'number' && Number.isFinite(input.at) ? input.at : Date.now();
  recordPlaytestEvent({
    kind: 'cast',
    at,
    gateId: openId(input.gateId),
    family: openId(input.family),
    tier: sanitizeTier(input.tier),
    correct: input.correct === true,
    retried: input.retried === true,
    hintLevel: sanitizeHintLevel(input.hintLevel),
    errorTag: sanitizeErrorTag(input.errorTag),
    responseBucket: responseBucketFor(input.responseMs),
  });
}

/** One resolved prompt. A scaffolded retry that is still open does not call this. */
export function recordResolvedCast(input: {
  prompt: CastingPrompt;
  attempt: readonly string[] | null;
  correct: boolean;
  tier: number;
  now?: number;
}): void {
  try {
    const now = input.now ?? Date.now();
    const tier = sanitizeTier(input.tier);
    const errorTag = input.prompt.retry
      ? sanitizeErrorTag(input.prompt.priorErrorTag)
      : input.correct || input.attempt == null
        ? null
        : priorErrorTagFor(input.prompt, input.attempt);
    recordCastMeasurement({
      gateId: input.prompt.gateId,
      family: castFamilyId(input.prompt.lessonFamilyId, tier),
      tier,
      correct: input.correct,
      retried: input.prompt.retry === true,
      hintLevel: input.prompt.hintLevel ?? (input.prompt.hintRevealedAnswer ? 1 : 0),
      errorTag,
      responseMs: now - input.prompt.createdAt,
      at: now,
    });
  } catch {
    /* Telemetry is optional and must never interrupt play. */
  }
}

export function recordPlaytestEvent(event: PlaytestEvent): void {
  try {
    const existing = JSON.parse(localStorage.getItem(PLAYTEST_STORAGE_KEY) ?? '[]') as unknown;
    const events = Array.isArray(existing) ? existing.slice(-MAX_EVENTS + 1) : [];
    events.push(storedEvent(event));
    localStorage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* Telemetry is optional, local-only, and must never interrupt play. */
  }
}

export function exportPlaytestTelemetry(): string {
  try {
    const value = JSON.parse(localStorage.getItem(PLAYTEST_STORAGE_KEY) ?? '[]') as unknown;
    return JSON.stringify(
      {
        schema: PLAYTEST_EXPORT_SCHEMA,
        exportedAt: Date.now(),
        events: Array.isArray(value) ? value : [],
      },
      null,
      2,
    );
  } catch {
    return JSON.stringify(
      { schema: PLAYTEST_EXPORT_SCHEMA, exportedAt: Date.now(), events: [] },
      null,
      2,
    );
  }
}

export function clearPlaytestTelemetry(): void {
  try {
    localStorage.removeItem(PLAYTEST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function storedEvent(event: PlaytestEvent): PlaytestEvent {
  const synthetic = event.synthetic === true || isSyntheticPlaytest();
  if (event.kind === 'cast') {
    return {
      kind: 'cast',
      at: event.at,
      gateId: openId(event.gateId),
      family: openId(event.family),
      tier: sanitizeTier(event.tier),
      correct: event.correct === true,
      retried: event.retried === true,
      hintLevel: sanitizeHintLevel(event.hintLevel),
      errorTag: sanitizeErrorTag(event.errorTag),
      responseBucket: asBucket(event.responseBucket),
      ...(synthetic ? { synthetic: true as const } : {}),
    };
  }
  if (event.kind === 'combatEnd') {
    return {
      kind: 'combatEnd',
      at: event.at,
      won: event.won,
      hpLost: event.hpLost,
      act: event.act,
      deck: event.deck.map(({ defId, upgradeLevel }) => ({ defId, upgradeLevel })),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      ...(synthetic ? { synthetic: true as const } : {}),
    };
  }
  return synthetic ? { ...event, synthetic: true } : event;
}

function isSyntheticPlaytest(): boolean {
  try {
    if (isDebugEnabled() || getDebugSkipCast()) return true;
  } catch {
    /* ignore */
  }
  try {
    return typeof navigator !== 'undefined' && navigator.webdriver === true;
  } catch {
    return false;
  }
}

function openId(value: string): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  // One token. A question or a typed answer has spaces and is dropped.
  if (trimmed.length === 0 || trimmed.length > 80 || /[\s\u0000-\u001f]/.test(trimmed)) return '';
  return trimmed;
}

function sanitizeTier(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.floor(value)));
}

function sanitizeHintLevel(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(9, Math.floor(value));
}
