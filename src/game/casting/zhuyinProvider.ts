import {
  PHRASES_BY_INITIAL,
  type Phrase,
} from '../../data/phrases';
import {
  CARDS,
  ZHUYIN_SYMBOL_POOL,
  getCardCastBinding,
  splitSpell,
} from '../../data/cards';
import { isSpeechAvailable } from '../speech';
import {
  getCastingPreferences,
  getLessonProgress,
  saveLessonProgress,
} from '../profiles';
import type {
  AmbientManaCue,
  CastMode,
  CastingGateProvider,
  CastingPreferences,
  CastingPrompt,
  CastingPromptContext,
  ToneClass,
} from './types';

interface PromptItem {
  id: string;
  word: string;
  emoji: string;
  spell: string;
  speechText: string;
  packs: string[];
  vocabulary: 'core' | 'broad';
  tone: ToneClass;
  parts: string[];
}

const HISTORY_PREFIX = 'zhuyin:';

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

function toneClass(spell: string): ToneClass {
  if (spell.endsWith('ˊ')) return 2;
  if (spell.endsWith('ˇ')) return 3;
  if (spell.endsWith('ˋ')) return 4;
  if (spell.endsWith('˙')) return 5;
  return 1;
}

function contentId(family: string, word: string, spell: string): string {
  return `zh:${family}:${encodeURIComponent(word)}:${encodeURIComponent(spell)}`;
}

function asItem(family: string, phrase: Phrase): PromptItem {
  return {
    id: contentId(family, phrase.word, phrase.spell),
    word: phrase.word,
    emoji: phrase.emoji,
    spell: phrase.spell.normalize('NFC'),
    speechText: phrase.word,
    packs: phrase.packs,
    vocabulary: phrase.vocabulary ?? (phrase.packs.includes('core') ? 'core' : 'broad'),
    tone: toneClass(phrase.spell),
    parts: splitSpell(phrase.spell),
  };
}

function phrasesForFamily(family: string): Phrase[] {
  const [kind, glyph] = family.split(':', 2);
  if (!glyph) return [];
  if (kind === 'initial') return PHRASES_BY_INITIAL[glyph] ?? [];
  if (kind === 'vowel') {
    return Object.values(PHRASES_BY_INITIAL)
      .flat()
      .filter((phrase) => splitSpell(phrase.spell).includes(glyph));
  }
  return [];
}

function fallbackPhrases(
  cues: CastingPromptContext['fallbackCues'],
): Phrase[] {
  return cues.map((cue) => ({
    ...cue,
    packs: ['core'],
    vocabulary: 'core',
  }));
}

function dedupe(items: PromptItem[]): PromptItem[] {
  const merged = new Map<string, PromptItem>();
  for (const item of items) {
    const key = `${item.word}|${item.spell}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    // Card-local verified cues may duplicate a themed bank entry. Preserve all
    // topics and the friendlier tier rather than discarding either metadata set.
    existing.packs = [...new Set([...existing.packs, ...item.packs])];
    if (item.vocabulary === 'core') existing.vocabulary = 'core';
  }
  return [...merged.values()];
}

function strictFilteredItems(
  context: CastingPromptContext,
  preferences: CastingPreferences = getCastingPreferences(),
): PromptItem[] {
  const family = context.binding.lessonFamilyId;
  const combined = [
    ...phrasesForFamily(family),
    ...fallbackPhrases(context.fallbackCues),
  ];
  const packSet = new Set(preferences.packs);
  const toneSet = new Set(preferences.tones);
  const include = new Set(preferences.includeWords);
  const exclude = new Set(preferences.excludeWords);
  const all = dedupe(combined.map((phrase) => asItem(family, phrase)));
  return all.filter((item) => {
    if (!item.packs.some((pack) => packSet.has(pack))) return false;
    if (preferences.vocabulary === 'coreOnly' && item.vocabulary !== 'core') return false;
    if (!toneSet.has(item.tone)) return false;
    if (item.parts.length > preferences.maxAnswerParts) return false;
    if (include.size && !include.has(item.word)) return false;
    if (exclude.has(item.word)) return false;
    return true;
  });
}

function filteredItems(
  context: CastingPromptContext,
  preferences: CastingPreferences = getCastingPreferences(),
): PromptItem[] {
  const family = context.binding.lessonFamilyId;
  let eligible = strictFilteredItems(context, preferences);

  const history = getLessonProgress(`${HISTORY_PREFIX}${family}`);
  const struggling =
    preferences.adaptive &&
    history.recentResults.slice(-5).filter((result) => !result).length >= 2;
  if (struggling) {
    const easier = eligible.filter(
      (item) => item.vocabulary === 'core' && item.parts.length <= 3,
    );
    if (easier.length >= 2) eligible = easier;
  }

  if (eligible.length) return eligible;

  // Last-resort verified card cues prevent an impossible profile from
  // soft-locking combat. The settings UI normally prevents this route.
  const fallback = dedupe(
    fallbackPhrases(context.fallbackCues).map((phrase) => asItem(family, phrase)),
  );
  if (fallback.length) return fallback;
  return [
    asItem(family, {
      word: context.binding.displayGlyph,
      emoji: '🔤',
      spell: context.binding.displayGlyph,
      packs: ['core'],
      vocabulary: 'core',
    }),
  ];
}

function avoidFirstRepeat(values: string[], previous: string | null): void {
  if (values.length < 2 || !previous || values[0] !== previous) return;
  [values[0], values[1]] = [values[1]!, values[0]!];
}

function drawItem(
  context: CastingPromptContext,
  items: PromptItem[],
): PromptItem {
  const historyKey = `${HISTORY_PREFIX}${context.binding.lessonFamilyId}`;
  const progress = getLessonProgress(historyKey);
  const byAnswer = new Map<string, PromptItem[]>();
  for (const item of items) {
    const group = byAnswer.get(item.spell) ?? [];
    group.push(item);
    byAnswer.set(item.spell, group);
  }
  const answerKeys = [...byAnswer.keys()];
  progress.remainingAnswerKeys = progress.remainingAnswerKeys.filter((answer) =>
    byAnswer.has(answer),
  );
  if (!progress.remainingAnswerKeys.length) {
    progress.remainingAnswerKeys = shuffle(answerKeys, context.rng);
    avoidFirstRepeat(progress.remainingAnswerKeys, progress.lastAnswerKey);
  }
  const answer = progress.remainingAnswerKeys.shift() ?? answerKeys[0]!;
  const group = byAnswer.get(answer) ?? items;
  let promptQueue = (progress.remainingPromptIdsByAnswer[answer] ?? []).filter((id) =>
    group.some((item) => item.id === id),
  );
  if (!promptQueue.length) {
    promptQueue = shuffle(group.map((item) => item.id), context.rng);
    avoidFirstRepeat(promptQueue, progress.lastPromptId);
  }
  const promptId = promptQueue.shift() ?? group[0]!.id;
  progress.remainingPromptIdsByAnswer[answer] = promptQueue;
  progress.lastAnswerKey = answer;
  progress.lastPromptId = promptId;
  saveLessonProgress(historyKey, progress);
  return group.find((item) => item.id === promptId) ?? group[0]!;
}

function isTone(symbol: string): boolean {
  return symbol === 'ˊ' || symbol === 'ˇ' || symbol === 'ˋ' || symbol === '˙';
}

export function buildZhuyinTokenBank(
  correct: string[],
  distractorCount: number,
  rng: () => number,
): string[] {
  const distractors: string[] = [];
  const tones = shuffle(['ˊ', 'ˇ', 'ˋ', '˙'], rng);
  for (const tone of tones) {
    if (distractors.length >= Math.min(2, distractorCount)) break;
    if (!correct.includes(tone)) distractors.push(tone);
  }
  for (const symbol of shuffle(ZHUYIN_SYMBOL_POOL, rng)) {
    if (distractors.length >= distractorCount) break;
    if (correct.includes(symbol) || distractors.includes(symbol)) continue;
    if (isTone(symbol) && distractors.filter(isTone).length >= 2) continue;
    distractors.push(symbol);
  }
  return shuffle([...correct, ...distractors], rng).sort(
    (a, b) => Number(isTone(a)) - Number(isTone(b)),
  );
}

export function ambientManaForMode(mode: CastMode): AmbientManaCue {
  if (mode === 'listenHard') return { id: 'misty', icon: '🌫️', label: '魔力朦朧' };
  if (mode === 'listen') return { id: 'echoing', icon: '🔊', label: '魔力迴響' };
  return { id: 'clear', icon: '✨', label: '魔力清澈' };
}

export function chooseZhuyinMode(
  lessonFamilyId: string,
  rng: () => number,
): CastMode {
  const preferences = getCastingPreferences();
  const progress = getLessonProgress(`${HISTORY_PREFIX}${lessonFamilyId}`);
  const struggling =
    preferences.adaptive &&
    progress.recentResults.slice(-5).filter((result) => !result).length >= 2;
  const weights = { ...preferences.modeWeights };
  if (struggling) {
    if (weights.listenHard > 0) weights.listenHard *= 0.25;
    if (weights.listen > 0) weights.listen *= 0.65;
  }
  const total = weights.recognize + weights.listen + weights.listenHard;
  if (total <= 0) return 'recognize';
  const roll = rng() * total;
  if (roll < weights.recognize) return 'recognize';
  if (roll < weights.recognize + weights.listen) return 'listen';
  return 'listenHard';
}

export function countEligibleZhuyinPhrases(
  preferences: CastingPreferences = getCastingPreferences(),
): number {
  const packSet = new Set(preferences.packs);
  const toneSet = new Set(preferences.tones);
  const include = new Set(preferences.includeWords);
  const exclude = new Set(preferences.excludeWords);
  const seen = new Set<string>();
  for (const phrase of Object.values(PHRASES_BY_INITIAL).flat()) {
    const parts = splitSpell(phrase.spell);
    if (!phrase.packs.some((pack) => packSet.has(pack))) continue;
    if (preferences.vocabulary === 'coreOnly' && phrase.vocabulary !== 'core') continue;
    if (!toneSet.has(toneClass(phrase.spell))) continue;
    if (parts.length > preferences.maxAnswerParts) continue;
    if (include.size && !include.has(phrase.word)) continue;
    if (exclude.has(phrase.word)) continue;
    seen.add(`${phrase.word}|${phrase.spell}`);
  }
  return seen.size;
}

export interface ZhuyinCardCoverage {
  cardId: string;
  cardName: string;
  displayGlyph: string;
  lessonFamilyId: string;
  promptCount: number;
  distinctAnswerCount: number;
}

/**
 * Strict curriculum coverage. Unlike live prompt creation, this does not use
 * the emergency fallback that ignores parent filters, so Options can reject a
 * configuration before it makes a card impossible to cast.
 */
export function getZhuyinCardCoverage(
  preferences: CastingPreferences = getCastingPreferences(),
): ZhuyinCardCoverage[] {
  return Object.values(CARDS).map((card) => {
    const binding = getCardCastBinding(card, 'zhuyin');
    const items = strictFilteredItems(
      {
        binding,
        mode: 'recognize',
        fallbackCues: card.cues,
        rng: Math.random,
      },
      preferences,
    );
    return {
      cardId: card.id,
      cardName: card.name,
      displayGlyph: binding.displayGlyph,
      lessonFamilyId: binding.lessonFamilyId,
      promptCount: items.length,
      distinctAnswerCount: new Set(items.map((item) => item.spell)).size,
    };
  });
}

export function findUnavailableZhuyinCards(
  preferences: CastingPreferences = getCastingPreferences(),
): ZhuyinCardCoverage[] {
  return getZhuyinCardCoverage(preferences).filter((item) => item.promptCount === 0);
}

export const zhuyinProvider: CastingGateProvider = {
  id: 'zhuyin',
  createPrompt(context): CastingPrompt {
    let mode = context.mode;
    let speechFallback = false;
    if ((mode === 'listen' || mode === 'listenHard') && !isSpeechAvailable()) {
      mode = 'recognize';
      speechFallback = true;
    }
    const item = drawItem(context, filteredItems(context));
    const preferences = getCastingPreferences();
    const bank = buildZhuyinTokenBank(
      item.parts,
      preferences.distractorCount,
      context.rng,
    );
    return {
      id: `${item.id}:${Date.now().toString(36)}`,
      contentId: item.id,
      gateId: 'zhuyin',
      lessonFamilyId: context.binding.lessonFamilyId,
      focusGlyph: context.binding.displayGlyph,
      inputMode: 'sequence',
      mode,
      cue: {
        text: item.word,
        word: item.word,
        emoji: item.emoji,
        speechText: item.speechText,
        spell: item.spell,
      },
      answerTokens: [...item.parts],
      choiceTokens: bank,
      correctSpell: item.spell,
      correctParts: [...item.parts],
      symbolBank: bank,
      correctionText: item.spell,
      ambientMana: ambientManaForMode(mode),
      speechFallback,
      createdAt: Date.now(),
    };
  },
  validate(prompt, attempt): boolean {
    return (
      attempt.length === prompt.answerTokens.length &&
      attempt.every((token, index) => token === prompt.answerTokens[index])
    );
  },
};
