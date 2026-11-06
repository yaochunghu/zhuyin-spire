import { VOICE_EXTRAS } from '../../../data/voiceExtras';
import { speakableMathQuestion } from './speech';

const normalize = (text: string): string => speakableMathQuestion(text).replace(/[\p{P}\s]/gu, '');
const pieces = Object.entries(VOICE_EXTRAS)
  .filter(([key]) => key.startsWith('m.'))
  .map(([key, [, , text]]) => ({ key, text: normalize(text) }))
  .filter(({ text }) => text.length > 0)
  .sort((a, b) => b.text.length - a.text.length);

/** Only replace a question when recorded pieces cover its entire spoken text. */
export function mathQuestionVoiceKeys(question: string): string[] | null {
  const text = normalize(question);
  const memo = new Map<number, string[] | null>();
  function match(at: number): string[] | null {
    if (at === text.length) return [];
    if (memo.has(at)) return memo.get(at)!;
    for (const piece of pieces) {
      if (!text.startsWith(piece.text, at)) continue;
      const rest = match(at + piece.text.length);
      if (rest) {
        const keys = [piece.key, ...rest];
        memo.set(at, keys);
        return keys;
      }
    }
    memo.set(at, null);
    return null;
  }
  return text ? match(0) : null;
}
