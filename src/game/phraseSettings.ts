/**
 * Compatibility facade for older phrase-pack callers. New curriculum UI and
 * persistence use the active learner profile in `profiles.ts`.
 */

import {
  ALL_PHRASE_PACKS,
  PHRASES_BY_INITIAL,
  type Phrase,
  type PhrasePack,
} from '../data/phrases';
import {
  getCastingPreferences,
  saveCastingPreferences,
} from './profiles';

export interface PhraseSettings {
  /** Active packs; empty / missing = all packs */
  packs: PhrasePack[];
  /**
   * Optional allowlist of words (exact match).
   * If non-empty, only these words may appear (still filtered by 注音).
   */
  includeWords: string[];
  /** Optional blocklist */
  excludeWords: string[];
}

export function defaultPhraseSettings(): PhraseSettings {
  return {
    packs: [...ALL_PHRASE_PACKS],
    includeWords: [],
    excludeWords: [],
  };
}

export function loadPhraseSettings(): PhraseSettings {
  const settings = getCastingPreferences();
  const packs = settings.packs.filter((pack): pack is PhrasePack =>
    ALL_PHRASE_PACKS.includes(pack as PhrasePack),
  );
  return {
    packs: packs.length ? packs : [...ALL_PHRASE_PACKS],
    includeWords: [...settings.includeWords],
    excludeWords: [...settings.excludeWords],
  };
}

export function savePhraseSettings(settings: PhraseSettings): void {
  const current = getCastingPreferences();
  saveCastingPreferences({
    ...current,
    packs: settings.packs,
    includeWords: settings.includeWords,
    excludeWords: settings.excludeWords,
  });
}

/** Merge card-local cues into bank as core pack phrases. */
function cardCuesAsPhrases(
  cardCues: { word: string; emoji: string; spell: string }[],
): Phrase[] {
  return cardCues.map((c) => ({
    word: c.word,
    emoji: c.emoji,
    spell: c.spell,
    packs: ['core'] as PhrasePack[],
  }));
}

/**
 * All phrases for a 注音 initial after pack / allow / deny filters.
 */
export function getPhrasesForZhuyin(
  zhuyin: string,
  cardCues: { word: string; emoji: string; spell: string }[] = [],
  settings: PhraseSettings = loadPhraseSettings(),
): Phrase[] {
  const bank = [
    ...(PHRASES_BY_INITIAL[zhuyin] ?? []),
    ...cardCuesAsPhrases(cardCues),
  ];

  // Dedupe by word+spell
  const seen = new Set<string>();
  const unique: Phrase[] = [];
  for (const ph of bank) {
    const k = `${ph.word}|${ph.spell}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(ph);
  }

  const packSet = new Set(
    settings.packs.length ? settings.packs : ALL_PHRASE_PACKS,
  );
  let out = unique.filter((ph) => ph.packs.some((p) => packSet.has(p)));

  if (settings.includeWords.length > 0) {
    const allow = new Set(settings.includeWords);
    out = out.filter((ph) => allow.has(ph.word));
  }
  if (settings.excludeWords.length > 0) {
    const deny = new Set(settings.excludeWords);
    out = out.filter((ph) => !deny.has(ph.word));
  }

  // Never empty — fall back to unfiltered bank then to a stub
  if (out.length === 0) {
    out = unique.length
      ? unique
      : [{ word: zhuyin, emoji: '🔤', spell: zhuyin, packs: ['core'] }];
  }
  return out;
}
