/**
 * Which 注音 cast words have a recorded 老師 clip (batch 3, src/data/phraseClips.ts).
 *
 * A cast prompt carries its pool entry's word and spell (the first syllable).
 * A clip matches when both agree: the word alone is not enough for a 破音字,
 * and the spell alone is shared by many words.
 */
import { PHRASE_CLIPS } from '../data/phraseClips';

function lookupKey(word: string, spell: string): string {
  return `${word.normalize('NFC')}|${spell.normalize('NFC')}`;
}

let byWord: Map<string, string> | null = null;

function table(): Map<string, string> {
  if (byWord) return byWord;
  byWord = new Map();
  for (const [key, [, word, zhuyin]] of Object.entries(PHRASE_CLIPS)) {
    const spell = zhuyin.split(' ')[0] ?? '';
    const id = lookupKey(word, spell);
    if (!byWord.has(id)) byWord.set(id, key);
  }
  return byWord;
}

/** The voice key (w.<pack>.<nnn>) for a pool word and its spell, or null without a clip. */
export function phraseClipKey(word: string, spell: string): string | null {
  if (!word || !spell) return null;
  return table().get(lookupKey(word, spell)) ?? null;
}
