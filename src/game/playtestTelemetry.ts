import { diagnoseCast } from './castCheck';
import type { CastingPrompt } from './casting/types';
import { getDebugSkipCast, isDebugEnabled } from '../debug/debugFlags';

/**
 * Local playtest log. The storage key stays `zhuyin-spire-playtest-v1` so a
 * browser that already has events keeps them. The export schema string is
 * `zhuyin-spire-playtest-v3` once the run fields (act clear, shop, boss
 * entry, rest, potion, relic-pool exhaust, fight turns, sitting) exist.
 * Events already in storage are copied out unchanged. A v1 or v2 event is
 * not upgraded and is not dropped.
 */
export const PLAYTEST_STORAGE_KEY = 'zhuyin-spire-playtest-v1';
export const PLAYTEST_EXPORT_SCHEMA = 'zhuyin-spire-playtest-v3';

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
      /** Player turns taken. Captured when the fight ends, before a boss full heal. */
      turns: number;
      nodeKind: CombatNodeKind;
      /** Map floor, 1-based (row + 1). 0 when the fight has no map node. */
      floor: number;
      /** Hero HP when the fight ended, before a boss restores full HP. */
      hp: number;
      /** Gold when the fight ended, before that fight's gold is added. */
      gold: number;
      deckSize: number;
    }
  | {
      kind: 'actClear';
      at: number;
      /** Act just cleared, 1-based. */
      act: number;
      characterId: string;
      hp: number;
      gold: number;
      deckSize: number;
    }
  | {
      kind: 'shopEnter';
      at: number;
      act: number;
      floor: number;
      gold: number;
    }
  | {
      kind: 'bossEntry';
      at: number;
      act: number;
      floor: number;
      characterId: string;
      /** HP and gold as the boss fight starts, before any damage or payout. */
      hp: number;
      gold: number;
      deckSize: number;
    }
  | {
      kind: 'rest';
      at: number;
      act: number;
      floor: number;
      choice: RestChoice;
    }
  | {
      kind: 'potionUsed';
      at: number;
      act: number;
      potionId: string;
      inCombat: boolean;
    }
  | {
      kind: 'relicPoolExhaust';
      at: number;
      act: number;
      floor: number;
      characterId: string;
    }
  | {
      kind: 'sittingStart';
      at: number;
      characterId: string;
    }
  | {
      kind: 'sittingEnd';
      at: number;
      reason: SittingEndReason;
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
const REST_CHOICES = new Set<string>(['rest', 'smith', 'remove']);
const SITTING_REASONS = new Set<string>(['defeat', 'victory', 'leave']);
const NODE_KINDS = new Set<string>(['fight', 'elite', 'boss', 'unknown', 'event']);

export type RestChoice = 'rest' | 'smith' | 'remove';
export type SittingEndReason = 'defeat' | 'victory' | 'leave';
export type CombatNodeKind = 'fight' | 'elite' | 'boss' | 'unknown' | 'event';

/**
 * Headless model runs have no `?debug` query and no browser webdriver flag.
 * The sim calls this before it plays so every event it writes is synthetic.
 * A human session never calls it.
 */
let syntheticMark = false;

export function markSyntheticPlaytest(): void {
  syntheticMark = true;
}

export function clearSyntheticPlaytestMark(): void {
  syntheticMark = false;
}

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

export function recordSittingStart(characterId: string): void {
  recordPlaytestEvent({
    kind: 'sittingStart',
    at: Date.now(),
    characterId: typeof characterId === 'string' ? characterId : '',
  });
}

function storedEvent(event: PlaytestEvent): PlaytestEvent {
  const synthetic = event.synthetic === true || isSyntheticPlaytest();
  const marked = synthetic ? { synthetic: true as const } : {};
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
      ...marked,
    };
  }
  if (event.kind === 'combatEnd') {
    return {
      kind: 'combatEnd',
      at: event.at,
      won: event.won,
      hpLost: countField(event.hpLost),
      act: countField(event.act, 9),
      deck: event.deck.map(({ defId, upgradeLevel }) => ({ defId, upgradeLevel })),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      turns: countField(event.turns, 999),
      nodeKind: asNodeKind(event.nodeKind),
      floor: countField(event.floor, 99),
      hp: countField(event.hp, 9999),
      gold: countField(event.gold),
      deckSize: countField(event.deckSize, 999),
      ...marked,
    };
  }
  if (event.kind === 'actClear') {
    return {
      kind: 'actClear',
      at: event.at,
      act: countField(event.act, 9),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      hp: countField(event.hp, 9999),
      gold: countField(event.gold),
      deckSize: countField(event.deckSize, 999),
      ...marked,
    };
  }
  if (event.kind === 'shopEnter') {
    return {
      kind: 'shopEnter',
      at: event.at,
      act: countField(event.act, 9),
      floor: countField(event.floor, 99),
      gold: countField(event.gold),
      ...marked,
    };
  }
  if (event.kind === 'bossEntry') {
    return {
      kind: 'bossEntry',
      at: event.at,
      act: countField(event.act, 9),
      floor: countField(event.floor, 99),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      hp: countField(event.hp, 9999),
      gold: countField(event.gold),
      deckSize: countField(event.deckSize, 999),
      ...marked,
    };
  }
  if (event.kind === 'rest') {
    return {
      kind: 'rest',
      at: event.at,
      act: countField(event.act, 9),
      floor: countField(event.floor, 99),
      choice: asRestChoice(event.choice),
      ...marked,
    };
  }
  if (event.kind === 'potionUsed') {
    return {
      kind: 'potionUsed',
      at: event.at,
      act: countField(event.act, 9),
      potionId: openId(event.potionId),
      inCombat: event.inCombat === true,
      ...marked,
    };
  }
  if (event.kind === 'relicPoolExhaust') {
    return {
      kind: 'relicPoolExhaust',
      at: event.at,
      act: countField(event.act, 9),
      floor: countField(event.floor, 99),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      ...marked,
    };
  }
  if (event.kind === 'sittingStart') {
    return {
      kind: 'sittingStart',
      at: event.at,
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      ...marked,
    };
  }
  if (event.kind === 'sittingEnd') {
    return {
      kind: 'sittingEnd',
      at: event.at,
      reason: asSittingReason(event.reason),
      characterId: typeof event.characterId === 'string' ? event.characterId : '',
      ...marked,
    };
  }
  return synthetic ? { ...event, synthetic: true } : event;
}

function isSyntheticPlaytest(): boolean {
  if (syntheticMark) return true;
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

function countField(value: number, max = 1_000_000): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

function asRestChoice(value: string): RestChoice {
  return REST_CHOICES.has(value) ? value as RestChoice : 'rest';
}

function asSittingReason(value: string): SittingEndReason {
  return SITTING_REASONS.has(value) ? value as SittingEndReason : 'leave';
}

function asNodeKind(value: string): CombatNodeKind {
  return NODE_KINDS.has(value) ? value as CombatNodeKind : 'fight';
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
