import { MATH_CHOICE_COUNT } from '../../../data/balance';
import type { CastBinding, CastingTier } from '../types';
import {
  DEFAULT_MATH_PREFS,
  effectiveMathTier,
  type MathCastingPreferences,
  type MathFamilyId,
} from './prefs';

const GRADE_TWO = new Set<string>([
  'g2Column',
  'g2Times',
  'g2Cm',
  'g2ClockMin',
  'g2Money1000',
  'g2Missing',
  // Parked for a later grade-2 layer. No live card asks it.
  'length',
]);

const SUPPORTED: Record<string, readonly CastingTier[]> = {
  count: [1, 2, 3],
  make10: [1, 2, 3],
  add10: [1],
  sub10: [1],
  add20: [2, 3],
  sub20: [2, 3],
  placeValue: [2, 3],
  compare: [1, 2, 3],
  ordinal: [2, 3],
  add100: [3, 4],
  clock: [2, 3],
  calendar: [2],
  money: [3, 4],
  length: [5],
  shapes: [2],
  sort: [1, 2],
  word: [2, 3, 4],
  g2Column: [5],
  g2Times: [5],
  g2Cm: [5],
  g2ClockMin: [5],
  g2Money1000: [5],
  g2Missing: [5],
};

export interface MathTask {
  cardFamily: string;
  family: MathFamilyId;
  tier: CastingTier;
}

export interface MathQuestion {
  question: string;
  answer: string;
  choices: string[];
  emoji: string;
}

type Rng = () => number;

function irand(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = result[index]!;
    result[index] = result[swap]!;
    result[swap] = current;
  }
  return result;
}

function supports(family: string, tier: CastingTier): boolean {
  return SUPPORTED[family]?.includes(tier) ?? false;
}

function asTier(value: number): CastingTier {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  if (value >= 5) return 5;
  return 4;
}

/** Point a requested tier at a family that can actually ask it. */
export function redirectMathFamily(family: string, tier: CastingTier): { family: MathFamilyId; tier: CastingTier } {
  if (supports(family, tier)) return { family: family as MathFamilyId, tier };
  if (family === 'add20' && tier <= 1) return { family: 'add10', tier: 1 };
  if (family === 'add20' && tier >= 4) return { family: 'add100', tier: 4 };
  if (family === 'sub20' && tier <= 1) return { family: 'sub10', tier: 1 };
  if (family === 'sub20' && tier >= 4) return { family: 'add100', tier: 4 };
  if (family === 'ordinal' && tier < 2) return { family: 'make10', tier: 1 };
  if (family === 'shapes') return { family: 'shapes', tier: 2 };
  if (family === 'add10') return tier >= 4 ? { family: 'add100', tier: 4 } : { family: 'add20', tier: tier >= 3 ? 3 : 2 };
  if (family === 'sub10') return tier >= 4 ? { family: 'add100', tier: 4 } : { family: 'sub20', tier: tier >= 3 ? 3 : 2 };
  if (tier <= 1) return { family: 'add10', tier: 1 };
  const choices = SUPPORTED[family];
  if (choices && choices.length > 0) {
    let best: CastingTier = choices[0]!;
    for (const item of choices) {
      const closer = Math.abs(item - tier) < Math.abs(best - tier);
      const tieLower = Math.abs(item - tier) === Math.abs(best - tier) && item < best;
      if (closer || tieLower) best = item;
    }
    return { family: family as MathFamilyId, tier: best };
  }
  return { family: 'count', tier: 1 };
}

export function resolveMathTask(
  binding: CastBinding,
  prefs: MathCastingPreferences = DEFAULT_MATH_PREFS,
  drop = 0,
  tierOverride?: CastingTier,
): MathTask {
  const cardFamily = binding.adaptiveFamily ?? binding.lessonFamilyId.split('@')[0] ?? 'count';
  const nominal = binding.tier ?? 1;
  let tier = effectiveMathTier(nominal, prefs, drop, tierOverride);
  let family = cardFamily;
  if (GRADE_TWO.has(family) && tier < 5) family = binding.fallbackFamily ?? 'add100';
  const redirected = redirectMathFamily(family, tier);
  return { cardFamily, family: redirected.family, tier: redirected.tier };
}

function nearBandChoices(answer: number, rng: Rng, floor: number, ceiling: number): string[] {
  const picked = [String(answer)];
  let distance = 1;
  while (picked.length < MATH_CHOICE_COUNT && distance <= ceiling - floor) {
    for (const candidate of [answer + distance, answer - distance]) {
      if (candidate < floor || candidate > ceiling) continue;
      const text = String(candidate);
      if (!picked.includes(text)) picked.push(text);
      if (picked.length === MATH_CHOICE_COUNT) break;
    }
    distance += 1;
  }
  return shuffle(picked, rng);
}

function choiceNumbers(answer: number, rng: Rng, floor = 0): string[] {
  const picked = [String(answer)];
  const preferred = [answer + 1, answer - 1, answer - 10, answer + 10, answer + 2, answer - 2];
  for (const candidate of preferred) {
    if (candidate < floor || candidate === answer) continue;
    const text = String(candidate);
    if (!picked.includes(text)) picked.push(text);
    if (picked.length === MATH_CHOICE_COUNT) break;
  }
  let step = 3;
  while (picked.length < MATH_CHOICE_COUNT && step < 40) {
    const next = answer + step;
    if (next >= floor && !picked.includes(String(next))) picked.push(String(next));
    const prev = answer - step;
    if (picked.length < MATH_CHOICE_COUNT && prev >= floor && prev !== answer && !picked.includes(String(prev))) {
      picked.push(String(prev));
    }
    step += 1;
  }
  return shuffle(picked.slice(0, MATH_CHOICE_COUNT), rng);
}

function numeric(question: string, answer: number, rng: Rng, emoji = '🧮', floor = 0): MathQuestion {
  return { question, answer: String(answer), choices: choiceNumbers(answer, rng, floor), emoji };
}

function labeled(question: string, answer: string, pool: readonly string[], rng: Rng, emoji: string): MathQuestion {
  const picked = [answer];
  for (const item of pool) {
    if (!picked.includes(item)) picked.push(item);
    if (picked.length === MATH_CHOICE_COUNT) break;
  }
  let salt = 1;
  while (picked.length < MATH_CHOICE_COUNT && salt < 8) {
    const extra = `${answer}${salt}`;
    if (!picked.includes(extra)) picked.push(extra);
    salt += 1;
  }
  return { question, answer, choices: shuffle(picked, rng), emoji };
}

function kid(rng: Rng): string {
  return ['小明', '小華', '珠珠'][irand(rng, 0, 2)]!;
}

function wordSentence(rng: Rng, a: number, b: number, op: 'add' | 'sub'): string {
  const name = kid(rng);
  if (op === 'add') return `${name}有 ${a} 顆珠子，再拿到 ${b} 顆，一共有幾顆？`;
  return `${name}有 ${a} 顆珠子，送出 ${b} 顆，還剩幾顆？`;
}

function countQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  if (tier <= 2) {
    const count = tier === 1 ? irand(rng, 3, 10) : irand(rng, 11, 20);
    return numeric(`${'🍎'.repeat(count)} 有幾個？`, count, rng, '🍎');
  }
  const tens = irand(rng, 2, 9);
  if (rng() < 0.5) {
    const count = tens * 10 + irand(rng, 0, 9);
    return numeric(`${count} 有幾個十？`, tens, rng, '🍎');
  }
  const ones = irand(rng, 1, 9);
  return numeric(`${tens * 10 + ones} 有幾個一？`, ones, rng, '🍎');
}

function make10Question(rng: Rng, tier: CastingTier): MathQuestion {
  if (tier <= 1) {
    const part = irand(rng, 1, 9);
    return numeric(`10 可以分成 ${part} 和幾？`, 10 - part, rng);
  }
  if (tier === 2) {
    const left = irand(rng, 0, 10);
    let right = irand(rng, 0, 10 - left);
    // 「0 和 0」 is not a question. One zero stays allowed, so the total is 1..10.
    if (left === 0 && right === 0) right = 1;
    const total = left + right;
    return {
      question: `${left} 和 ${right} 合起來是幾？`,
      answer: String(total),
      choices: nearBandChoices(total, rng, 0, 10),
      emoji: '🧮',
    };
  }
  if (rng() < 0.5) {
    const front = irand(rng, 2, 9);
    const need = 10 - front;
    const back = irand(rng, need + 1, Math.min(9, 18 - front));
    return numeric(`${front} + ${back}：先從後面的數拿幾顆給前面，湊成 10？`, need, rng);
  }
  const ones = irand(rng, 1, 9);
  return numeric(`${10 + ones} 可以分成 10 和幾？`, ones, rng);
}

function add10Question(rng: Rng): MathQuestion {
  const useZero = rng() < 0.08;
  let left: number;
  let right: number;
  if (useZero) {
    if (rng() < 0.5) {
      left = 0;
      right = irand(rng, 1, 10);
    } else {
      left = irand(rng, 1, 10);
      right = 0;
    }
  } else {
    left = irand(rng, 1, 9);
    right = irand(rng, 1, 10 - left);
  }
  return numeric(`${left} + ${right} = ？`, left + right, rng);
}

function sub10Question(rng: Rng): MathQuestion {
  const whole = irand(rng, 2, 10);
  const take = irand(rng, 1, whole - 1);
  return numeric(`${whole} - ${take} = ？`, whole - take, rng);
}

function add20Question(rng: Rng, tier: CastingTier, family: string): MathQuestion {
  let left: number;
  let right: number;
  if (tier <= 2) {
    left = irand(rng, 10, 18);
    right = irand(rng, 1, 9 - (left % 10));
  } else {
    left = irand(rng, 2, 9);
    right = irand(rng, Math.max(2, 11 - left), Math.min(9, 18 - left));
  }
  const plain = `${left} + ${right} = ？`;
  const question = family === 'word' || (tier >= 2 && tier <= 4 && rng() < 0.2)
    ? wordSentence(rng, left, right, 'add')
    : plain;
  return numeric(question, left + right, rng);
}

function sub20Question(rng: Rng, tier: CastingTier, family: string): MathQuestion {
  let whole: number;
  let take: number;
  if (tier <= 2) {
    whole = irand(rng, 11, 19);
    take = irand(rng, 1, whole % 10);
  } else {
    whole = irand(rng, 12, 18);
    const ones = whole % 10;
    take = irand(rng, ones + 1, Math.min(9, whole - 2));
  }
  const plain = `${whole} - ${take} = ？`;
  const question = family === 'word' || (tier >= 2 && tier <= 4 && rng() < 0.2)
    ? wordSentence(rng, whole, take, 'sub')
    : plain;
  return numeric(question, whole - take, rng);
}

function placeValueQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const number = irand(rng, tier >= 3 ? 20 : 10, 99);
  if (tier >= 3) return numeric(`${number} 的個位是幾？`, number % 10, rng);
  return numeric(`${number} 有幾個十？`, Math.floor(number / 10), rng);
}

function compareQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const cap = tier <= 1 ? 10 : tier === 2 ? 20 : 100;
  const left = irand(rng, 0, cap);
  const right = irand(rng, 0, cap);
  if (tier <= 1) {
    const answer = left === right ? '一樣' : left > right ? '左邊' : '右邊';
    return labeled(`左邊 ${left} 個，右邊 ${right} 個，哪邊比較多？`, answer, ['左邊', '右邊', '一樣'], rng, '⚖️');
  }
  const answer = left === right ? '=' : left > right ? '>' : '<';
  return labeled(`${left} 和 ${right} 中間要填什麼？`, answer, ['>', '<', '='], rng, '⚖️');
}

function ordinalQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const icons = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍑', '🥝', '🍉', '🍒', '🍐'];
  const length = tier >= 3 ? irand(rng, 8, 10) : irand(rng, 4, 7);
  const row = icons.slice(0, length);
  const index = irand(rng, 1, length);
  const target = row[index - 1]!;
  return numeric(`從左邊排好：${row.join('')}。${target} 是第幾個？`, index, rng, target, 1);
}

function add100Question(rng: Rng, tier: CastingTier): MathQuestion {
  if (tier <= 3) {
    if (rng() < 0.5) {
      const left = irand(rng, 1, 8) * 10;
      const right = irand(rng, 1, 9 - left / 10) * 10;
      return numeric(`${left} + ${right} = ？`, left + right, rng);
    }
    const left = irand(rng, 2, 9) * 10;
    const right = irand(rng, 1, left / 10 - 1) * 10;
    return numeric(`${left} - ${right} = ？`, left - right, rng);
  }
  const roll = rng();
  if (roll < 0.5) {
    const left = irand(rng, 10, 89);
    const room = 9 - (left % 10);
    if (room > 0 && rng() < 0.5) {
      const right = irand(rng, 1, room);
      return numeric(`${left} + ${right} = ？`, left + right, rng);
    }
    const tens = irand(rng, 1, Math.max(1, Math.floor((99 - left) / 10)));
    return numeric(`${left} + ${tens * 10} = ？`, left + tens * 10, rng);
  }
  const left = irand(rng, 1, 9) * 10 + irand(rng, 1, 9);
  const right = irand(rng, 1, left % 10);
  return numeric(`${left} - ${right} = ？`, left - right, rng);
}

const WHOLE_HOUR_FACES = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'] as const;
const HALF_HOUR_FACES = ['🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'] as const;

function clockFace(hour: number, half: boolean): string {
  const faces = half ? HALF_HOUR_FACES : WHOLE_HOUR_FACES;
  return faces[hour - 1] ?? faces[0];
}

function clockQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const hour = irand(rng, 1, 12);
  if (tier <= 2) {
    const answer = `${hour}點`;
    const neighbors = [`${hour === 1 ? 12 : hour - 1}點`, `${hour === 12 ? 1 : hour + 1}點`, `${hour}點半`];
    return labeled(`短針指著 ${hour}，長針指著 12。現在是幾點？`, answer, neighbors, rng, clockFace(hour, false));
  }
  const answer = `${hour}點半`;
  const neighbors = [`${hour}點`, `${hour === 12 ? 1 : hour + 1}點半`, `${hour === 1 ? 12 : hour - 1}點半`];
  return labeled(`短針在 ${hour} 和下一格中間，長針指著 6。現在是什麼時候？`, answer, neighbors, rng, clockFace(hour, true));
}

function calendarQuestion(rng: Rng): MathQuestion {
  if (rng() < 0.5) {
    const day = irand(rng, 1, 27);
    return numeric(`今天 ${day} 號，明天是幾號？`, day + 1, rng, '📅');
  }
  const scenes = [
    ['太陽剛出來', '上午'],
    ['要吃午飯了', '中午'],
    ['放學走路回家', '下午'],
    ['月亮出來了', '晚上'],
  ] as const;
  const scene = scenes[irand(rng, 0, scenes.length - 1)]!;
  return labeled(`${scene[0]}，是什麼時候？`, scene[1], ['上午', '中午', '下午', '晚上'], rng, '📅');
}

function moneyQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const denoms = tier >= 4 ? [1, 5, 10, 50, 100] : [1, 5, 10];
  const cap = tier >= 4 ? 100 : 50;
  const coins: number[] = [];
  let total = 0;
  const count = irand(rng, 2, 4);
  for (let index = 0; index < count; index += 1) {
    const options = denoms.filter((coin) => total + coin <= cap);
    if (options.length === 0) break;
    const coin = options[irand(rng, 0, options.length - 1)]!;
    coins.push(coin);
    total += coin;
  }
  return numeric(`${coins.join('、')} 元合起來是多少？`, total, rng, '🪙');
}

function lengthQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  // 公分 is N-2-11. Below tier 5, ask 比較 so a grade-1 call cannot name a length unit.
  if (tier < 5) return compareQuestion(rng, tier);
  const longer = irand(rng, 2, 20);
  const shorter = irand(rng, 1, longer - 1);
  return numeric(`紅筆 ${longer} 公分，藍筆 ${shorter} 公分，紅筆比藍筆長幾公分？`, longer - shorter, rng, '📏');
}

function shapesQuestion(rng: Rng): MathQuestion {
  const scenes = [
    ['球', '圓形', '⚽'],
    ['三角飯糰', '三角形', '🍙'],
    ['魔術方塊的一面', '正方形', '🟦'],
    ['書本', '長方形', '📘'],
  ] as const;
  const scene = scenes[irand(rng, 0, scenes.length - 1)]!;
  return labeled(`${scene[0]}是什麼形狀？`, scene[1], ['圓形', '三角形', '正方形', '長方形'], rng, scene[2]);
}

function sortQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  const cap = tier <= 1 ? 10 : 20;
  const values = new Set<number>();
  while (values.size < 3) values.add(irand(rng, 1, cap));
  const numbers = [...values];
  const askMax = tier >= 2 && rng() < 0.5;
  const answer = askMax ? Math.max(...numbers) : Math.min(...numbers);
  const question = `${numbers.join('、')}，${askMax ? '最大' : '最小'}的是幾？`;
  return { question, answer: String(answer), choices: shuffle(numbers.map(String), rng), emoji: '🔢' };
}

function wordQuestion(rng: Rng, tier: CastingTier): MathQuestion {
  if (tier <= 2) {
    if (rng() < 0.5) {
      const left = irand(rng, 1, 9);
      const right = irand(rng, 1, 10 - left);
      return numeric(wordSentence(rng, left, right, 'add'), left + right, rng);
    }
    const whole = irand(rng, 2, 10);
    const take = irand(rng, 1, whole - 1);
    return numeric(wordSentence(rng, whole, take, 'sub'), whole - take, rng);
  }
  if (tier === 3) return add20Question(rng, 3, 'word');
  const left = irand(rng, 10, 89);
  const right = irand(rng, 1, Math.max(1, Math.floor((99 - left) / 10))) * 10;
  return numeric(`${kid(rng)}有 ${left} 元，再拿到 ${right} 元，一共幾元？`, left + right, rng, '🪙');
}

function columnQuestion(rng: Rng): MathQuestion {
  if (rng() < 0.5) {
    const leftOnes = irand(rng, 1, 9);
    const rightOnes = irand(rng, 10 - leftOnes, 9);
    const left = irand(rng, 1, 8) * 10 + leftOnes;
    const right = irand(rng, 1, 8) * 10 + rightOnes;
    return numeric(`${left} + ${right} = ？`, left + right, rng);
  }
  const leftOnes = irand(rng, 0, 8);
  const rightOnes = irand(rng, leftOnes + 1, 9);
  const leftTens = irand(rng, 2, 9);
  const rightTens = irand(rng, 1, leftTens - 1);
  const left = leftTens * 10 + leftOnes;
  const right = rightTens * 10 + rightOnes;
  return numeric(`${left} - ${right} = ？`, left - right, rng);
}

function timesQuestion(rng: Rng): MathQuestion {
  const size = [2, 5, 10][irand(rng, 0, 2)]!;
  const groups = irand(rng, 2, 9);
  const answer = groups * size;
  const other = size === 5 ? 2 : 5;
  const pool = [(groups - 1) * size, (groups + 1) * size, groups * other, (groups + 1) * other];
  const picked = [String(answer)];
  for (const value of pool) {
    if (value <= 0 || value === answer) continue;
    const text = String(value);
    if (!picked.includes(text)) picked.push(text);
    if (picked.length === MATH_CHOICE_COUNT) break;
  }
  return {
    question: `有 ${groups} 組，每組 ${size} 個，一共有幾個？`,
    answer: String(answer),
    choices: shuffle(picked, rng),
    emoji: '🧮',
  };
}

function cmQuestion(rng: Rng): MathQuestion {
  const left = irand(rng, 1, 14);
  const right = irand(rng, 1, 15 - left);
  return numeric(`紅繩 ${left} 公分，藍繩 ${right} 公分，合起來幾公分？`, left + right, rng, '📏');
}

function clockMinQuestion(rng: Rng): MathQuestion {
  const mark = irand(rng, 0, 11);
  const minutes = mark * 5;
  const hand = mark === 0 ? 12 : mark;
  return numeric(`長針指著 ${hand}，現在是幾分？`, minutes, rng, '🕐');
}

function money1000Question(rng: Rng): MathQuestion {
  const hundreds = irand(rng, 1, 4);
  const bill = rng() < 0.5;
  const total = (bill ? 500 : 0) + hundreds * 100;
  const question = bill
    ? `一張 500 元，再加 ${hundreds} 張 100 元，一共幾元？`
    : `${hundreds} 張 100 元，一共幾元？`;
  return numeric(question, total, rng, '💵');
}

function missingQuestion(rng: Rng): MathQuestion {
  const known = irand(rng, 1, 9);
  const answer = irand(rng, 1, 9);
  return numeric(`□ + ${known} = ${known + answer}`, answer, rng);
}

export function generateMathQuestion(family: string, tier: CastingTier, rng: Rng): MathQuestion {
  const asked = asTier(tier);
  switch (family) {
    case 'count':
      return countQuestion(rng, asked);
    case 'make10':
      return make10Question(rng, asked);
    case 'add10':
      return add10Question(rng);
    case 'sub10':
      return sub10Question(rng);
    case 'add20':
      return add20Question(rng, asked, family);
    case 'sub20':
      return sub20Question(rng, asked, family);
    case 'placeValue':
      return placeValueQuestion(rng, asked);
    case 'compare':
      return compareQuestion(rng, asked);
    case 'ordinal':
      return ordinalQuestion(rng, asked);
    case 'add100':
      return add100Question(rng, asked);
    case 'clock':
      return clockQuestion(rng, asked);
    case 'calendar':
      return calendarQuestion(rng);
    case 'money':
      return moneyQuestion(rng, asked);
    case 'length':
      return lengthQuestion(rng, asked);
    case 'shapes':
      return shapesQuestion(rng);
    case 'sort':
      return sortQuestion(rng, asked);
    case 'word':
      return wordQuestion(rng, asked);
    case 'g2Column':
      return columnQuestion(rng);
    case 'g2Times':
      return timesQuestion(rng);
    case 'g2Cm':
      return asked >= 5 ? cmQuestion(rng) : compareQuestion(rng, asked);
    case 'g2ClockMin':
      return clockMinQuestion(rng);
    case 'g2Money1000':
      return money1000Question(rng);
    case 'g2Missing':
      return missingQuestion(rng);
    default:
      return countQuestion(rng, 1);
  }
}
