/**
 * Turns a written math question into text Web Speech can read.
 * The on-screen question stays as authored. This does not add question frames.
 */

const DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/** Classifiers that take 兩, not 二, when the amount is exactly two. */
const MEASURE = /^(?:公分|顆|個|元|張|組|點|分)/;

function speakNumber(value: number): string {
  if (value === 0) return '零';
  if (value < 10) return DIGIT[value] ?? String(value);
  if (value < 20) return `十${value === 10 ? '' : DIGIT[value - 10]}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${DIGIT[tens]}十${ones === 0 ? '' : DIGIT[ones]}`;
  }
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    const head = `${DIGIT[hundreds]}百`;
    if (rest === 0) return head;
    if (rest < 10) return `${head}零${DIGIT[rest]}`;
    if (rest < 20) return `${head}一${speakNumber(rest)}`;
    return `${head}${speakNumber(rest)}`;
  }
  if (value < 10000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const head = `${DIGIT[thousands]}千`;
    if (rest === 0) return head;
    if (rest < 100) {
      const small = rest >= 10 && rest < 20 ? `一${speakNumber(rest)}` : speakNumber(rest);
      return `${head}零${small}`;
    }
    return `${head}${speakNumber(rest)}`;
  }
  return String(value);
}

function speakAmount(value: number, beforeMeasure: boolean): string {
  if (value === 2 && beforeMeasure) return '兩';
  return speakNumber(value);
}

/** Speakable form of a math question: no emoji, operators as words, numbers in Chinese. */
export function speakableMathQuestion(question: string): string {
  let text = question
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D]/g, '');
  text = text.replace(/\s*=\s*[?？]/g, '是多少');
  text = text.replace(/\+/g, '加');
  text = text.replace(/-/g, '減');
  text = text.replace(/=/g, '等於');
  text = text.replace(/[?？]/g, '');
  text = text.replace(/□/g, '多少');
  text = text.replace(/\d+/g, (digits, offset: number) => {
    const amount = Number(digits);
    const after = text.slice(offset + digits.length).replace(/^\s+/, '');
    return speakAmount(amount, MEASURE.test(after));
  });
  return text.replace(/\s+/g, '').replace(/：。/g, '。');
}
