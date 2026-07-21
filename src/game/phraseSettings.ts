/**
 * Parent settings for which phrase packs feed cast checks.
 * Stored in localStorage; can later drive per-run curriculum.
 */

import {
  ALL_PHRASE_PACKS,
  PHRASES_BY_INITIAL,
  type Phrase,
  type PhrasePack,
} from '../data/phrases';

const KEY = 'zhuyin-spire-phrase-settings-v1';

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
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPhraseSettings();
    const data = JSON.parse(raw) as Partial<PhraseSettings>;
    const packs = Array.isArray(data.packs)
      ? (data.packs.filter((p) => ALL_PHRASE_PACKS.includes(p as PhrasePack)) as PhrasePack[])
      : [...ALL_PHRASE_PACKS];
    return {
      packs: packs.length ? packs : [...ALL_PHRASE_PACKS],
      includeWords: Array.isArray(data.includeWords)
        ? data.includeWords.map(String)
        : [],
      excludeWords: Array.isArray(data.excludeWords)
        ? data.excludeWords.map(String)
        : [],
    };
  } catch {
    return defaultPhraseSettings();
  }
}

export function savePhraseSettings(settings: PhraseSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
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
