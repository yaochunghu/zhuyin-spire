import {
  splitSpell,
  ZHUYIN_SYMBOL_POOL,
  type CardDef,
  type Cue,
} from '../data/cards';
import type { MapNode } from '../data/map';
import type { Phrase } from '../data/phrases';
import { getPhrasesForZhuyin, loadPhraseSettings } from './phraseSettings';
import { isSpeechAvailable } from './speech';

export type CastMode = 'recognize' | 'listen' | 'listenHard';

/** How hard the cue spelling should lean. */
export type CueDifficulty = MapNode['castStage'] | 'practice';

export interface CastPrompt {
  mode: CastMode;
  /** Full correct spelling including 聲調符號, e.g. ㄅㄚˋ */
  correctSpell: string;
  /** Symbols of the correct answer, in order */
  correctParts: string[];
  cue: Cue;
  /**
   * Tappable symbol bank: every correct part + distractors
   * (includes 聲母、韻母、聲調 ˊˇˋ˙).
   */
  symbolBank: string[];
  speechFallback: boolean;
}

/** Recently shown phrase keys per 注音 — avoid immediate repeats in a session */
const recentByZhuyin = new Map<string, string[]>();
const RECENT_CAP = 12;

export function pickCastMode(
  castStage: MapNode['castStage'],
  rng: () => number = Math.random,
): CastMode {
  const r = rng();
  switch (castStage) {
    case 'early':
      return 'recognize';
    case 'mid':
      return r < 0.5 ? 'listen' : 'recognize';
    case 'elite':
      return r < 0.7 ? 'listen' : 'recognize';
    case 'boss':
      if (r < 0.5) return 'listen';
      if (r < 0.7) return 'listenHard';
      return 'recognize';
    default:
      return 'recognize';
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isToneMark(s: string): boolean {
  return s === 'ˊ' || s === 'ˇ' || s === 'ˋ' || s === '˙';
}

function spellMeta(spell: string): { len: number; hasTone: boolean } {
  const parts = splitSpell(spell);
  return {
    len: parts.length,
    hasTone: parts.some(isToneMark),
  };
}

function phraseKey(ph: Phrase | Cue): string {
  return `${ph.word}|${ph.spell}`;
}

function rememberPhrase(zhuyin: string, ph: Cue): void {
  const list = recentByZhuyin.get(zhuyin) ?? [];
  list.push(phraseKey(ph));
  while (list.length > RECENT_CAP) list.shift();
  recentByZhuyin.set(zhuyin, list);
}

/**
 * Prefer shorter / tone-light cues early; longer + 聲調 late.
 * Draws from the large shared phrase bank for this 注音 (not only card.cues).
 */
export function pickCueForDifficulty(
  def: CardDef,
  difficulty: CueDifficulty,
  rng: () => number = Math.random,
): Cue {
  const settings = loadPhraseSettings();
  const phrases = getPhrasesForZhuyin(def.zhuyin, def.cues, settings);
  const scored = phrases.map((c) => ({ c, ...spellMeta(c.spell) }));

  let pool = scored;

  if (difficulty === 'early' || difficulty === 'practice') {
    const short = scored.filter((s) => s.len <= 2);
    const midLen = scored.filter((s) => s.len <= 3);
    pool = short.length ? short : midLen.length ? midLen : scored;
    const noTone = pool.filter((s) => !s.hasTone);
    if (noTone.length && rng() < 0.75) pool = noTone;
  } else if (difficulty === 'mid') {
    const sweet = scored.filter((s) => s.len >= 2 && s.len <= 3);
    if (sweet.length && rng() < 0.55) pool = sweet;
  } else if (difficulty === 'elite') {
    const spicy = scored.filter((s) => s.len >= 3 || s.hasTone);
    if (spicy.length) pool = spicy;
  } else if (difficulty === 'boss') {
    const spicy = scored.filter((s) => s.len >= 3 || s.hasTone);
    if (spicy.length) pool = spicy;
    const toned = pool.filter((s) => s.hasTone);
    if (toned.length && rng() < 0.7) pool = toned;
    const long = pool.filter((s) => s.len >= 3);
    if (long.length && rng() < 0.55) pool = long;
  }

  // Prefer phrases not shown recently for this 注音
  const recent = new Set(recentByZhuyin.get(def.zhuyin) ?? []);
  const fresh = pool.filter((s) => !recent.has(phraseKey(s.c)));
  if (fresh.length > 0) pool = fresh;

  const i = Math.floor(rng() * pool.length);
  const picked = pool[Math.max(0, Math.min(i, pool.length - 1))]!.c;
  rememberPhrase(def.zhuyin, picked);
  return { word: picked.word, emoji: picked.emoji, spell: picked.spell };
}

/** Build a bank: all answer symbols (multiplicity preserved) + distractors. Tones last. */
export function buildSymbolBank(correctParts: string[], rng: () => number = Math.random): string[] {
  const needed = [...correctParts];
  const tones = ['ˊ', 'ˇ', 'ˋ', '˙'];
  const distractors: string[] = [];

  for (const t of shuffle(tones, rng)) {
    if (!needed.includes(t) && distractors.length < 2) distractors.push(t);
  }

  const maxDistractors = correctParts.length >= 4 ? 3 : 4;

  const pool = shuffle(
    ZHUYIN_SYMBOL_POOL.filter((s) => !needed.includes(s) && !distractors.includes(s)),
    rng,
  );
  for (const s of pool) {
    if (distractors.length >= maxDistractors) break;
    if (isToneMark(s) && distractors.filter(isToneMark).length >= 2) continue;
    distractors.push(s);
  }

  const bank = shuffle([...needed, ...distractors], rng);
  return bank.sort((a, b) => Number(isToneMark(a)) - Number(isToneMark(b)));
}

export function buildCastPrompt(
  def: CardDef,
  mode: CastMode,
  rng: () => number = Math.random,
  difficulty: CueDifficulty = 'mid',
): CastPrompt {
  let resolved = mode;
  let speechFallback = false;

  if ((mode === 'listen' || mode === 'listenHard') && !isSpeechAvailable()) {
    resolved = 'recognize';
    speechFallback = true;
  }

  const cue = pickCueForDifficulty(def, difficulty, rng);
  const correctSpell = cue.spell;
  const correctParts = splitSpell(correctSpell);
  const symbolBank = buildSymbolBank(correctParts, rng);

  return {
    mode: resolved,
    correctSpell,
    correctParts,
    cue,
    symbolBank,
    speechFallback,
  };
}

export function isSpellCorrect(attempt: string[], correctParts: string[]): boolean {
  if (attempt.length !== correctParts.length) return false;
  return attempt.every((s, i) => s === correctParts[i]);
}

/** Clear recent-phrase memory (e.g. new run). */
export function clearRecentCastPhrases(): void {
  recentByZhuyin.clear();
}
