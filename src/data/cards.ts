import type { CastBinding, CastingGateId } from '../game/casting/types';
import {
  RESONANCE_CARD_IDS,
  RESONANCE_CARDS,
  RESONANCE_INITIAL_REWARD_IDS,
} from './resonanceCards';

export type CardType = 'attack' | 'block' | 'skill' | 'power';
export type CardRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'special';
export type SignatureMechanic = 'vulnerable' | 'basic' | 'tempo' | 'jin';
export type CardDirection = 'tingxi' | 'bailian' | 'tingjin' | 'hybrid' | 'general';

/** Who the card may target in multi-enemy combat */
export type TargetType = 'self' | 'singleEnemy' | 'allEnemies';

/** The primary combat problem a card solves. */
export type CardJob =
  | 'frontload'
  | 'area'
  | 'defense'
  | 'scaling'
  | 'draw'
  | 'energy';

export interface EffectDef {
  kind:
    | 'damage'
    | 'block'
    | 'draw'
    | 'energy'
    | 'vulnerable'
    | 'weak'
    | 'training'
    | 'jin';
  amount: number;
  hits?: number;
}

export interface CardUpgradeDef {
  cost?: number;
  value?: number;
  hits?: number;
  bonusBlock?: number;
  draw?: number;
  effects?: EffectDef[];
  description: string;
}

/**
 * Teaching phrase for a card.
 * `spell` = full 注音 for the **first syllable** (聲母 + 介音/韻母 + 聲調符號).
 * 一聲通常不標調；二ˊ 三ˇ 四ˋ 輕˙ 要寫上。
 */
export interface Cue {
  word: string;
  emoji: string;
  /** e.g. ㄅㄚˋ · ㄆㄧㄥˊ · ㄇㄠ */
  spell: string;
}

export interface CardDef {
  id: string;
  zhuyin: string;
  name: string;
  type: CardType;
  cost: number;
  /** Stable combat illustration; cue emoji changes with the spelling prompt. */
  icon?: string;
  /** Main deck-building job, shown as a small readable card tag. */
  job?: CardJob;
  value: number;
  hits?: number;
  bonusBlock?: number;
  draw?: number;
  /** Optional modular effects; if omitted, derived from type/value */
  effects?: EffectDef[];
  /** Default: attack → singleEnemy, else self */
  target?: TargetType;
  cues: Cue[];
  description: string;
  rarity?: CardRarity;
  mechanics?: readonly SignatureMechanic[];
  direction?: CardDirection;
  /** Stable design-catalog key, separate from the runtime/casting ID. */
  designId?: string;
  /** 基礎攻擊 receives 練功 on every damage hit. */
  basicAttack?: boolean;
  exhaust?: boolean;
  retain?: boolean;
  upgrade?: CardUpgradeDef;
  /** Cumulative per-character score needed before this card enters run pools. */
  unlockScore?: 300 | 1000 | 2000;
}

export interface ResolvedCardDef extends CardDef {
  upgraded: boolean;
  upgradeLevel: 0 | 1;
}

/**
 * Teaching rule:
 * - word starts with card 注音
 * - emoji matches word
 * - spell is complete first-syllable 注音 **including tone mark (聲調符號)** when not 一聲
 */
const CARD_CUE_OVERRIDES: Partial<Record<string, Cue[]>> = {
  bo: [
      { word: '爸爸', emoji: '👨', spell: 'ㄅㄚˋ' },
      { word: '寶寶', emoji: '👶', spell: 'ㄅㄠˇ' },
      { word: '筆', emoji: '✏️', spell: 'ㄅㄧˇ' },
      { word: '杯子', emoji: '🥤', spell: 'ㄅㄟ' }, // 家裡
  ],
  po: [
      { word: '跑步', emoji: '🏃', spell: 'ㄆㄠˇ' },
      { word: '蘋果', emoji: '🍎', spell: 'ㄆㄧㄥˊ' },
      { word: '泡泡', emoji: '💭', spell: 'ㄆㄠˋ' },
      { word: '朋友', emoji: '👫', spell: 'ㄆㄥˊ' }, // 公園
  ],
  mo: [
      { word: '貓咪', emoji: '🐱', spell: 'ㄇㄠ' },
      { word: '媽媽', emoji: '👩', spell: 'ㄇㄚ' },
      { word: '帽子', emoji: '🎩', spell: 'ㄇㄠˋ' },
      { word: '門', emoji: '🚪', spell: 'ㄇㄣˊ' }, // 家裡
  ],
  fo: [
      { word: '飛機', emoji: '✈️', spell: 'ㄈㄟ' },
      { word: '風', emoji: '🌬️', spell: 'ㄈㄥ' },
      { word: '飯', emoji: '🍚', spell: 'ㄈㄢˋ' },
      { word: '風扇', emoji: '🌀', spell: 'ㄈㄥ' }, // 家裡
  ],
  de: [
      { word: '動物園', emoji: '🏛️', spell: 'ㄉㄨㄥˋ' },
      { word: '大象', emoji: '🐘', spell: 'ㄉㄚˋ' },
      { word: '弟弟', emoji: '👦', spell: 'ㄉㄧˋ' },
      { word: '燈', emoji: '💡', spell: 'ㄉㄥ' }, // 家裡
  ],
  te: [
      { word: '兔子', emoji: '🐰', spell: 'ㄊㄨˋ' },
      { word: '太陽', emoji: '☀️', spell: 'ㄊㄞˋ' },
      { word: '糖果', emoji: '🍬', spell: 'ㄊㄤˊ' },
      { word: '拖鞋', emoji: '🩴', spell: 'ㄊㄨㄛ' }, // 家裡
  ],
  ne: [
      { word: '牛奶', emoji: '🥛', spell: 'ㄋㄧㄡˊ' },
      { word: '鳥', emoji: '🐦', spell: 'ㄋㄧㄠˇ' },
      { word: '女生', emoji: '👧', spell: 'ㄋㄩˇ' },
      { word: '奶奶', emoji: '👵', spell: 'ㄋㄞˇ' }, // 家裡
  ],
  le: [
      { word: '老虎', emoji: '🐯', spell: 'ㄌㄠˇ' },
      { word: '老鼠', emoji: '🐭', spell: 'ㄌㄠˇ' },
      { word: '籃球', emoji: '🏀', spell: 'ㄌㄢˊ' },
      { word: '溜滑梯', emoji: '🛝', spell: 'ㄌㄧㄡ' }, // 公園
  ],
  ge: [
      { word: '狗', emoji: '🐶', spell: 'ㄍㄡˇ' },
      { word: '哥哥', emoji: '🧒', spell: 'ㄍㄜ' },
      { word: '歌', emoji: '🎵', spell: 'ㄍㄜ' },
      { word: '公園', emoji: '🏞️', spell: 'ㄍㄨㄥ' }, // 公園
  ],
  ke: [
      { word: '褲子', emoji: '👖', spell: 'ㄎㄨˋ' },
      { word: '咳嗽', emoji: '😷', spell: 'ㄎㄜˊ' },
      { word: '可樂', emoji: '🥤', spell: 'ㄎㄜˇ' },
      { word: '客廳', emoji: '🛋️', spell: 'ㄎㄜˋ' }, // 家裡
  ],
  he: [
      { word: '猴子', emoji: '🐵', spell: 'ㄏㄡˊ' },
      { word: '火圈', emoji: '🔥', spell: 'ㄏㄨㄛˇ' },
      { word: '花', emoji: '🌸', spell: 'ㄏㄨㄚ' },
      { word: '花園', emoji: '🏡', spell: 'ㄏㄨㄚ' }, // 家裡／公園
  ],
  ji: [
      { word: '雞', emoji: '🐔', spell: 'ㄐㄧ' },
      { word: '家', emoji: '🏠', spell: 'ㄐㄧㄚ' },
      { word: '橘子', emoji: '🍊', spell: 'ㄐㄩˊ' },
  ],
  qi: [
      { word: '氣球', emoji: '🎈', spell: 'ㄑㄧˋ' },
      { word: '青蛙', emoji: '🐸', spell: 'ㄑㄧㄥ' },
      { word: '企鵝', emoji: '🐧', spell: 'ㄑㄧˇ' },
      { word: '鞦韆', emoji: '🎠', spell: 'ㄑㄧㄡ' }, // 公園
  ],
  xi: [
      { word: '西瓜', emoji: '🍉', spell: 'ㄒㄧ' },
      { word: '蝦', emoji: '🦐', spell: 'ㄒㄧㄚ' },
      { word: '星星', emoji: '⭐', spell: 'ㄒㄧㄥ' },
      { word: '鞋子', emoji: '👟', spell: 'ㄒㄧㄝˊ' }, // 家裡
  ],
  zhi: [
      { word: '蜘蛛', emoji: '🕷️', spell: 'ㄓ' },
      { word: '豬', emoji: '🐷', spell: 'ㄓㄨ' },
      { word: '鐘', emoji: '🔔', spell: 'ㄓㄨㄥ' },
      { word: '桌子', emoji: '🍽️', spell: 'ㄓㄨㄛ' }, // 家裡
  ],
  chi: [
      { word: '車', emoji: '🚗', spell: 'ㄔㄜ' },
      { word: '蟲', emoji: '🐛', spell: 'ㄔㄨㄥˊ' },
      { word: '尺', emoji: '📏', spell: 'ㄔˇ' },
      { word: '床', emoji: '🛏️', spell: 'ㄔㄨㄤˊ' }, // 家裡
  ],
  shi: [
      { word: '獅子', emoji: '🦁', spell: 'ㄕ' },
      { word: '石頭', emoji: '🪨', spell: 'ㄕˊ' },
      { word: '書', emoji: '📖', spell: 'ㄕㄨ' },
      { word: '樹', emoji: '🌳', spell: 'ㄕㄨˋ' }, // 公園
  ],
  ri: [
      { word: '熱鬧', emoji: '🎉', spell: 'ㄖㄜˋ' },
      { word: '熱', emoji: '🔥', spell: 'ㄖㄜˋ' },
      { word: '日', emoji: '🌞', spell: 'ㄖˋ' },
  ],
  zi: [
      { word: '走路', emoji: '🚶', spell: 'ㄗㄡˇ' },
      { word: '字母', emoji: '🔤', spell: 'ㄗˋ' },
      { word: '紫', emoji: '💜', spell: 'ㄗˇ' },
  ],
  ci: [
      { word: '草', emoji: '🌿', spell: 'ㄘㄠˇ' },
      { word: '彩虹', emoji: '🌈', spell: 'ㄘㄞˇ' },
      { word: '磁鐵', emoji: '🧲', spell: 'ㄘˊ' },
  ],
  si: [
      { word: '松鼠', emoji: '🐿️', spell: 'ㄙㄨㄥ' },
      { word: '三', emoji: '3️⃣', spell: 'ㄙㄢ' },
      { word: '絲', emoji: '🧵', spell: 'ㄙ' },
  ],
  yi: [
      { word: '衣服', emoji: '👕', spell: 'ㄧ' },
      { word: '椅子', emoji: '🪑', spell: 'ㄧˇ' },
      { word: '醫生', emoji: '🩺', spell: 'ㄧ' },
  ],
  wu: [
      { word: '烏雲', emoji: '☁️', spell: 'ㄨ' },
      { word: '屋子', emoji: '🏡', spell: 'ㄨ' },
      { word: '五', emoji: '5️⃣', spell: 'ㄨˇ' },
  ],
  yu: [
      { word: '魚', emoji: '🐟', spell: 'ㄩˊ' },
      { word: '雨', emoji: '🌧️', spell: 'ㄩˇ' },
      { word: '月亮', emoji: '🌙', spell: 'ㄩㄝˋ' },
  ],
  a: [
      { word: '阿姨', emoji: '👩', spell: 'ㄚ' },
      { word: '啊', emoji: '😮', spell: 'ㄚ' },
  ],
  o: [
      { word: '喔', emoji: '😲', spell: 'ㄛ' },
      { word: '喔喔', emoji: '😮', spell: 'ㄛ' },
  ],
  e: [
      { word: '鵝', emoji: '🦢', spell: 'ㄜˊ' },
      { word: '餓', emoji: '😋', spell: 'ㄜˋ' },
  ],
};

/**
 * Reused stable ids keep their full pronunciation cue families and localized
 * presentation so the character migration does not shrink a learner's
 * curriculum. Character score is the sole obtainability gate.
 */
const RESONANCE_LIVE_PRESENTATION: Record<string, Partial<CardDef>> = {
  bo: {
    icon: '💫',
    description: '造成 3 點傷害。這是基礎攻擊。',
    upgrade: { description: '造成 5 點傷害。這是基礎攻擊。' },
  },
  mo: {
    icon: '🛡️',
    description: '獲得 4 點護盾。',
    upgrade: { description: '獲得 6 點護盾。' },
  },
  po: {
    icon: '🎯',
    description: '造成 5 點傷害。附上 2 層易傷。',
    upgrade: { description: '造成 7 點傷害。附上 2 層易傷。' },
  },
  he: {
    icon: '📍',
    description: '造成 2 點傷害。附上 2 層易傷。',
    upgrade: { description: '造成 4 點傷害。附上 2 層易傷。' },
  },
  ge: {
    icon: '💥',
    description: '造成 6 點傷害。',
    upgrade: { description: '造成 8 點傷害。' },
  },
  ri: {
    icon: '☀️',
    description: '對所有怪物造成 3 點傷害。',
    upgrade: { description: '對所有怪物造成 5 點傷害。' },
  },
  ke: {
    icon: '🧱',
    description: '獲得 7 點護盾。',
    upgrade: { description: '獲得 9 點護盾。' },
  },
  te: {
    icon: '🥁',
    description: '造成 2 點傷害，兩次。這是基礎攻擊。',
    upgrade: { description: '造成 3 點傷害，兩次。這是基礎攻擊。' },
  },
  le: {
    icon: '📖',
    description: '抽 2 張牌。',
    upgrade: { description: '抽 3 張牌。' },
  },
  shi: {
    icon: '🥋',
    description: '這場戰鬥：練功 2。',
    upgrade: { description: '這場戰鬥：練功 3。' },
  },
  yi: {
    icon: '🔄',
    description: '造成 4 點傷害。轉拍：獲得 3 點護盾。',
    upgrade: { description: '造成 6 點傷害。轉拍：獲得 3 點護盾。' },
  },
  fo: {
    icon: '👊',
    description: '消耗 1 勁，造成 8 點傷害。沒有勁時不能使用。',
    upgrade: { description: '消耗 1 勁，造成 10 點傷害。沒有勁時不能使用。' },
  },
  de: {
    icon: '🌬️',
    description: '獲得 1 點能量。消耗。',
    upgrade: { description: '獲得 1 點能量。抽 1 張牌。消耗。' },
  },
  ne: {
    icon: '🎤',
    description: '獲得 3 點護盾。抽 1 張牌。',
    upgrade: { description: '獲得 5 點護盾。抽 1 張牌。' },
  },
  ji: {
    icon: '👉',
    description: '造成 2 點傷害。若目標有易傷，抽 1 張牌。消耗。',
    upgrade: { description: '造成 4 點傷害。若目標有易傷，抽 1 張牌。消耗。' },
  },
  qi: {
    icon: '🪟',
    description: '造成 4 點傷害。若目標沒有易傷，附上 1 層易傷。',
    upgrade: { description: '造成 6 點傷害。若目標沒有易傷，附上 1 層易傷。' },
  },
  xi: {
    icon: '🗡️',
    description: '造成 4 點傷害。若目標有易傷，再造成 3 點傷害。',
    upgrade: { description: '造成 6 點傷害。若目標有易傷，再造成 3 點傷害。' },
  },
  zhi: {
    icon: '🌀',
    description: '對所有怪物造成 5 點傷害。沒有易傷的再附上 1 層易傷。',
    upgrade: { description: '對所有怪物造成 7 點傷害。沒有易傷的再附上 1 層易傷。' },
  },
  chi: {
    icon: '💪',
    description: '練功 1。消耗。',
    upgrade: { description: '練功 2。消耗。' },
  },
  zi: {
    icon: '👟',
    description: '從抽牌堆拿出 1 張基礎攻擊到手牌。消耗。',
    upgrade: { description: '從抽牌堆拿出 1 張基礎攻擊到手牌。抽 1 張牌。消耗。' },
  },
  ci: {
    icon: '🪵',
    description: '造成 4 點傷害，獲得 2 點護盾。這是基礎攻擊。',
    upgrade: { description: '造成 6 點傷害，獲得 2 點護盾。這是基礎攻擊。' },
  },
  wu: {
    icon: '🌊',
    description: '對所有怪物造成 5 點傷害。這是基礎攻擊。',
    upgrade: { description: '對所有怪物造成 7 點傷害。這是基礎攻擊。' },
  },
  yu: {
    icon: '♻️',
    description: '從棄牌堆把 1 張基礎攻擊拿回手牌。本回合花費 0。',
    upgrade: { description: '花費 0。從棄牌堆把 1 張基礎攻擊拿回手牌。本回合花費 0。' },
  },
  si: {
    icon: '🏯',
    description: '獲得 5 點護盾。若本回合打過基礎攻擊，再獲得 2 點。',
    upgrade: { description: '獲得 7 點護盾。若本回合打過基礎攻擊，再獲得 2 點。' },
  },
  a: {
    icon: '🔀',
    description: '獲得 5 點護盾。轉拍：對選定怪物造成 3 點直傷。',
    upgrade: { description: '獲得 7 點護盾。轉拍：對選定怪物造成 3 點直傷。' },
  },
  o: {
    icon: '😲',
    description: '造成 7 點傷害。若目標有易傷，再造成 7 點傷害。',
    upgrade: { description: '造成 9 點傷害。若目標有易傷，再造成 7 點傷害。' },
  },
  e: {
    icon: '🦢',
    description: '造成 3 點傷害。移除目標全部易傷，每移除 1 層再造成 2 點直傷。',
    upgrade: { description: '造成 5 點傷害。移除目標全部易傷，每移除 1 層再造成 2 點直傷。' },
  },
  rw_b019: {
    icon: '😲',
    description: '獲得 4 點護盾。對選定怪物附上 1 層易傷。',
    upgrade: { description: '獲得 6 點護盾。對選定怪物附上 1 層易傷。' },
  },
  rw_b024: {
    icon: '🦢',
    description: '每回合第一次附上易傷時，抽 1 張牌。',
    upgrade: { description: '每回合第一次附上易傷時，抽 2 張牌。' },
  },
  rw_b028: {
    icon: '👨',
    description: '獲得 4 點護盾，場上每個有易傷的怪物再獲得 2 點。',
    upgrade: { description: '獲得 6 點護盾，場上每個有易傷的怪物再獲得 2 點。' },
  },
  rw_b030: {
    icon: '🏃',
    description: '每回合第一次對有易傷的怪物成功打出攻擊牌時，獲得 1 點能量。',
    upgrade: {
      description: '花費 0。每回合第一次對有易傷的怪物成功打出攻擊牌時，獲得 1 點能量。',
    },
  },
  rw_b040: {
    icon: '✈️',
    description: '打出 3 張基礎攻擊後，練功 1，並重算次數。',
    upgrade: { description: '打出 3 張基礎攻擊後，練功 2，並重算次數。' },
  },
  rw_b041: {
    icon: '🐘',
    description: '選手牌中 1 張攻擊牌，這場戰鬥變成基礎攻擊。抽 1 張牌。',
    upgrade: { description: '選手牌中 1 張攻擊牌，這場戰鬥變成基礎攻擊。抽 2 張牌。' },
  },
  rw_b042: {
    icon: '🐰',
    description: '抽牌堆、手牌、棄牌堆每有 1 張基礎攻擊，造成 2 點傷害 1 次，最多 6 次。',
    upgrade: {
      description: '抽牌堆、手牌、棄牌堆每有 1 張基礎攻擊，造成 4 點傷害 1 次，最多 6 次。',
    },
  },
  rw_b049: {
    icon: '🥛',
    description: '本回合接下來 2 張基礎攻擊花費 0。消耗。',
    upgrade: { description: '花費 0。本回合接下來 2 張基礎攻擊花費 0。消耗。' },
  },
  rw_b053: {
    icon: '🐯',
    description: '抽 1 張牌。轉拍：獲得 1 點能量。',
    upgrade: { description: '抽 2 張牌。轉拍：獲得 1 點能量。' },
  },
  rw_b055: {
    icon: '🐶',
    description: '造成 2 點傷害，兩次。轉拍：附上 1 層易傷。',
    upgrade: { description: '造成 3 點傷害，兩次。轉拍：附上 1 層易傷。' },
  },
  rw_b059: {
    icon: '👖',
    description: '每回合第一次轉拍時，抽 1 張牌。',
    upgrade: { description: '每回合第一次轉拍時，抽 2 張牌。' },
  },
  rw_b060: {
    icon: '🐵',
    description: '每回合第一次完成第二次轉拍時，獲得 1 點能量和 3 點護盾。',
    upgrade: {
      description: '花費 0。每回合第一次完成第二次轉拍時，獲得 1 點能量和 3 點護盾。',
    },
  },
  rw_b061: {
    icon: '🐔',
    description: '造成 2 點傷害，三次。本回合每完成 1 次轉拍（含此牌），每次命中多造成 1 點傷害。',
    upgrade: {
      description: '造成 3 點傷害，三次。本回合每完成 1 次轉拍（含此牌），每次命中多造成 1 點傷害。',
    },
  },
  rw_b064: {
    icon: '🎈',
    description: '獲得 5 點護盾。轉拍：手牌最左邊的攻擊牌本回合花費減 1，最少 0。',
    upgrade: { description: '獲得 7 點護盾。轉拍：手牌最左邊的攻擊牌本回合花費減 1，最少 0。' },
  },
  rw_b063: {
    icon: '🍉',
    description: '抽 2 張牌。若此牌未觸發轉拍，棄 1 張牌。',
    upgrade: { description: '抽 3 張牌。若此牌未觸發轉拍，棄 1 張牌。' },
  },
  rw_b065: {
    icon: '🐷',
    description: '若本回合上一張成功打出的牌是技能牌，花費改為 1。對所有怪物造成 7 點傷害。',
    upgrade: { description: '若本回合上一張成功打出的牌是技能牌，花費改為 1。對所有怪物造成 9 點傷害。' },
  },
  rw_b070: {
    icon: '🚗',
    description: '每次轉拍時，對所有怪物造成 2 點直傷並獲得 2 點護盾，每回合最多 3 次。',
    upgrade: {
      description: '花費 2。每次轉拍時，對所有怪物造成 2 點直傷並獲得 2 點護盾，每回合最多 3 次。',
    },
  },
  rw_b071: {
    icon: '🦁',
    description: '造成 8 點傷害。本回合在此牌之前每完成 1 次轉拍，再造成 1 次，最多共 3 次。',
    upgrade: {
      description: '造成 10 點傷害。本回合在此牌之前每完成 1 次轉拍，再造成 1 次，最多共 3 次。',
    },
  },
  rw_b076: {
    icon: '🌞',
    description: '獲得 6 點護盾。若下個怪物階段獲得勁，下回合多抽 1 張牌。',
    upgrade: { description: '獲得 8 點護盾。若下個怪物階段獲得勁，下回合多抽 1 張牌。' },
  },
  rw_b078: {
    icon: '🌿',
    description: '獲得 5 點護盾。若有勁，消耗 1 勁並再獲得 4 點護盾。',
    upgrade: { description: '獲得 7 點護盾。若有勁，消耗 1 勁並再獲得 4 點護盾。' },
  },
  rw_b080: {
    icon: '🐿️',
    description: '造成 4 點傷害。若有勁，消耗 1 勁並附上 1 層易傷。',
    upgrade: { description: '造成 6 點傷害。若有勁，消耗 1 勁並附上 1 層易傷。' },
  },
  rw_b082: {
    icon: '👕',
    description: '自動消耗最多 3 勁。造成 5 點傷害，每消耗 1 勁再多造成 3 點。',
    upgrade: { description: '自動消耗最多 3 勁。造成 7 點傷害，每消耗 1 勁再多造成 3 點。' },
  },
  rw_b084: {
    icon: '☁️',
    description: '消耗 1 勁，獲得 9 點護盾。沒有勁時不能使用。',
    upgrade: { description: '消耗 1 勁，獲得 11 點護盾。沒有勁時不能使用。' },
  },
  rw_b085: {
    icon: '🐟',
    description: '造成 5 點傷害。若上個怪物階段獲得勁，再造成 5 點傷害。',
    upgrade: { description: '造成 7 點傷害。若上個怪物階段獲得勁，再造成 5 點傷害。' },
  },
  rw_b087: {
    icon: '👩',
    description: '消耗 1 勁。本回合下一張攻擊牌多造成 8 點傷害。沒有勁時不能使用。',
    upgrade: {
      description: '花費 0。消耗 1 勁。本回合下一張攻擊牌多造成 8 點傷害。沒有勁時不能使用。',
    },
  },
  rw_b089: {
    icon: '😲',
    description: '對所有怪物造成 6 點傷害。若有勁，消耗 1 勁並對所有怪物再造成 3 點傷害。',
    upgrade: {
      description: '對所有怪物造成 8 點傷害。若有勁，消耗 1 勁並對所有怪物再造成 3 點傷害。',
    },
  },
  rw_b090: {
    icon: '🦢',
    description: '每個怪物階段一次：攻擊將破盾前，若可以就自動消耗 1 勁並獲得 5 點護盾。',
    upgrade: {
      description: '花費 1。每個怪物階段一次：攻擊將破盾前，若可以就自動消耗 1 勁並獲得 5 點護盾。',
    },
  },
  rw_b093: {
    icon: '👨',
    description: '每當一張牌消耗勁，獲得 2 點護盾並抽 1 張牌，每張牌各一次。',
    upgrade: { description: '每當一張牌消耗勁，獲得 2 點護盾並抽 2 張牌，每張牌各一次。' },
  },
  rw_b097: {
    icon: '🏃',
    description: '獲得 5 點護盾。下個怪物階段，第一次完整擋住的攻擊動作額外獲得 1 勁。消耗。',
    upgrade: {
      description: '獲得 7 點護盾。下個怪物階段，第一次完整擋住的攻擊動作額外獲得 1 勁。消耗。',
    },
  },
  rw_b102: {
    icon: '🐱',
    description: '造成 3 點傷害。這是基礎攻擊。若目標有易傷，再造成 2 點傷害。',
    upgrade: { description: '造成 5 點傷害。這是基礎攻擊。若目標有易傷，再造成 2 點傷害。' },
  },
  rw_b107: {
    icon: '✈️',
    description: '附上 1 層易傷。本回合下一張基礎攻擊花費 0。',
    upgrade: { description: '附上 2 層易傷。本回合下一張基礎攻擊花費 0。' },
  },
  rw_b108: {
    icon: '🐘',
    description: '造成 3 點傷害。這是基礎攻擊。轉拍：抽 1 張牌。',
    upgrade: { description: '造成 5 點傷害。這是基礎攻擊。轉拍：抽 1 張牌。' },
  },
  rw_b113: {
    icon: '🐰',
    description: '獲得 3 點護盾。轉拍：練功 1。消耗。',
    upgrade: { description: '獲得 5 點護盾。轉拍：練功 1。消耗。' },
  },
  rw_b114: {
    icon: '🥛',
    description: '基礎攻擊打中有易傷的怪物時，延長該易傷 1 層，每張牌各一次，最多 9 層。',
    upgrade: {
      description: '花費 0。基礎攻擊打中有易傷的怪物時，延長該易傷 1 層，每張牌各一次，最多 9 層。',
    },
  },
  rw_b115: {
    icon: '🐯',
    description: '每回合第一次用基礎攻擊完成轉拍時，把最近棄掉的技能牌放到抽牌堆頂。',
    upgrade: {
      description: '花費 1。每回合第一次用基礎攻擊完成轉拍時，把最近棄掉的技能牌放到抽牌堆頂。',
    },
  },
  rw_b119: {
    icon: '🐶',
    description: '獲得 5 點護盾。若上個怪物階段獲得勁，從棄牌堆拿 1 張基礎攻擊到手牌，本回合花費 0。',
    upgrade: {
      description: '獲得 7 點護盾。若上個怪物階段獲得勁，從棄牌堆拿 1 張基礎攻擊到手牌，本回合花費 0。',
    },
  },
  rw_b120: {
    icon: '👖',
    description: '造成 6 點傷害。若有勁，消耗 1 勁並附上 2 層易傷。',
    upgrade: { description: '造成 8 點傷害。若有勁，消耗 1 勁並附上 2 層易傷。' },
  },
  rw_b122: {
    icon: '🐵',
    description: '抽 2 張牌。若抽到的牌剛好 1 張是攻擊牌，附上 1 層易傷。',
    upgrade: { description: '抽 3 張牌。若抽到的牌剛好 1 張是攻擊牌，附上 1 層易傷。' },
  },
  rw_b123: {
    icon: '🐔',
    description: '造成 2 點傷害，兩次。若此牌觸發轉拍，每次命中再加一次練功加成。',
    upgrade: { description: '造成 3 點傷害，兩次。若此牌觸發轉拍，每次命中再加一次練功加成。' },
  },
  rw_b124: {
    icon: '🎈',
    description: '從一個怪物移除最多 2 層易傷。每移除 1 層獲得 1 勁。',
    upgrade: { description: '從一個怪物移除最多 3 層易傷。每移除 1 層獲得 1 勁。' },
  },
  rw_b127: {
    icon: '🍉',
    description: '每回合第一次打出第二張基礎攻擊時，再造成一次該牌傷害並抽 1 張牌。',
    upgrade: { description: '每回合第一次打出第二張基礎攻擊時，再造成一次該牌傷害並抽 2 張牌。' },
  },
  rw_b128: {
    icon: '🐷',
    description: '獲得 10 點護盾。若下個怪物階段沒扣生命，練功 1。消耗。',
    upgrade: { description: '獲得 12 點護盾。若下個怪物階段沒扣生命，練功 1。消耗。' },
  },
  rw_b129: {
    icon: '🚗',
    description: '每回合開始時，若有怪物打算攻擊就抽 1 張技能牌，否則抽 1 張攻擊牌。',
    upgrade: {
      description: '花費 1。每回合開始時，若有怪物打算攻擊就抽 1 張技能牌，否則抽 1 張攻擊牌。',
    },
  },
  rw_b131: {
    icon: '🦁',
    description: '每回合第一次轉拍：練功 1；第二次轉拍：獲得 1 勁。',
    upgrade: { description: '每回合第一次轉拍：練功 2；第二次轉拍：獲得 1 勁。' },
  },
  rw_b132: {
    icon: '🌞',
    description: '本回合在此牌之前每完成 1 次轉拍，花費減 1，最少 0。造成 4 點傷害，四次。',
    upgrade: {
      description: '本回合在此牌之前每完成 1 次轉拍，花費減 1，最少 0。造成 5 點傷害，四次。',
    },
  },
  rw_b100: {
    icon: '🚶',
    description: '每個怪物階段第一次獲得勁時，對給你勁的那個怪物附上 1 層易傷。',
    upgrade: { description: '每個怪物階段第一次獲得勁時，對給你勁的那個怪物附上 2 層易傷。' },
  },
  rw_b144: {
    icon: '🌿',
    description: '附上 2 層虛弱。若目標有易傷，獲得 5 點護盾。',
    upgrade: { description: '花費 0。附上 2 層虛弱。若目標有易傷，獲得 5 點護盾。' },
  },
  rw_b149: {
    icon: '🐿️',
    description: '保留。造成 7 點傷害。若上個怪物階段獲得勁，再造成 8 點傷害。',
    upgrade: { description: '保留。造成 9 點傷害。若上個怪物階段獲得勁，再造成 8 點傷害。' },
  },
};

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  Object.entries(RESONANCE_CARDS).map(([id, def]) => {
    const cueOverride = CARD_CUE_OVERRIDES[id];
    const presentation = RESONANCE_LIVE_PRESENTATION[id];
    const { upgrade: presentationUpgrade, ...presentationRest } = presentation ?? {};
    const upgrade = def.upgrade
      ? { ...def.upgrade, ...presentationUpgrade }
      : def.upgrade;
    return [
      id,
      {
        ...def,
        ...(cueOverride
          ? { cues: cueOverride.map((cue) => ({ ...cue })) }
          : {}),
        ...presentationRest,
        ...(upgrade ? { upgrade } : {}),
      },
    ];
  }),
);

/** 共鳴武者 starter: three designs, deliberately repetitive for onboarding. */
export const STARTER_DECK_IDS: string[] = [
  'bo', 'bo', 'bo', 'bo', 'bo',
  'mo', 'mo', 'mo', 'mo',
  'po',
];

/**
 * Practice room pool — starter symbols + a few easy extras.
 * Prefer cards with short / common preschool cues.
 */
export const PRACTICE_CARD_IDS: string[] = [
  ...new Set([
    ...STARTER_DECK_IDS,
    'ge',
    'ji',
    'yi',
    'wu',
    'zi',
    'chi',
    'si',
    'a',
    'he',
    'qi',
    'shi',
    'ne',
    'te',
    'le',
  ]),
];

/** Lifetime correct practice spells needed for 📚 badge */
export const PRACTICE_BADGE_THRESHOLD = 10;

/** The first character's complete Act I reward pool: exactly nine designs. */
export const REWARD_POOL_IDS: string[] = [
  ...RESONANCE_INITIAL_REWARD_IDS,
];

export const ELITE_REWARD_POOL_IDS: string[] = [...REWARD_POOL_IDS];

/** Later acts draw from the complete catalog, then apply character-score unlocks. */
export const LATER_ACT_REWARD_POOL_IDS: string[] = [...RESONANCE_CARD_IDS];

export const LATER_ACT_ELITE_REWARD_POOL_IDS: string[] = [...RESONANCE_CARD_IDS];

/** Common symbols for spell-bank distractors */
export const ZHUYIN_SYMBOL_POOL = [
  'ㄅ',
  'ㄆ',
  'ㄇ',
  'ㄈ',
  'ㄉ',
  'ㄊ',
  'ㄋ',
  'ㄌ',
  'ㄍ',
  'ㄎ',
  'ㄏ',
  'ㄐ',
  'ㄑ',
  'ㄒ',
  'ㄓ',
  'ㄔ',
  'ㄕ',
  'ㄖ',
  'ㄗ',
  'ㄘ',
  'ㄙ',
  'ㄧ',
  'ㄨ',
  'ㄩ',
  'ㄚ',
  'ㄛ',
  'ㄜ',
  'ㄝ',
  'ㄞ',
  'ㄟ',
  'ㄠ',
  'ㄡ',
  'ㄢ',
  'ㄣ',
  'ㄤ',
  'ㄥ',
  'ㄦ',
  'ˊ',
  'ˇ',
  'ˋ',
  '˙',
];

export function getCard(id: string): CardDef {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export function resolveCard(id: string, upgradeLevel: 0 | 1 = 0): ResolvedCardDef {
  const base = getCard(id);
  const upgrade = upgradeLevel === 1 ? base.upgrade : undefined;
  return {
    ...base,
    ...(upgrade?.cost !== undefined ? { cost: upgrade.cost } : {}),
    ...(upgrade?.value !== undefined ? { value: upgrade.value } : {}),
    ...(upgrade?.hits !== undefined ? { hits: upgrade.hits } : {}),
    ...(upgrade?.bonusBlock !== undefined ? { bonusBlock: upgrade.bonusBlock } : {}),
    ...(upgrade?.draw !== undefined ? { draw: upgrade.draw } : {}),
    ...(upgrade?.effects ? { effects: upgrade.effects.map((effect) => ({ ...effect })) } : {}),
    ...(upgrade ? { description: upgrade.description } : {}),
    upgraded: upgradeLevel === 1,
    upgradeLevel,
  };
}

export function canUpgradeCard(id: string, level: 0 | 1): boolean {
  return level === 0 && !!getCard(id).upgrade;
}

/**
 * Current cards retain `zhuyin` for display compatibility while casting uses a
 * provider-neutral lesson binding. Pure vowels teach their whole rime family.
 */
export function getCardCastBinding(
  def: CardDef,
  gateId: CastingGateId = 'zhuyin',
): CastBinding {
  if (gateId !== 'zhuyin') {
    throw new Error(`Card ${def.id} has no ${gateId} casting binding`);
  }
  const vowelFamily = def.zhuyin === 'ㄚ' || def.zhuyin === 'ㄛ' || def.zhuyin === 'ㄜ';
  return {
    gateId,
    lessonFamilyId: vowelFamily ? `vowel:${def.zhuyin}` : `initial:${def.zhuyin}`,
    displayGlyph: def.zhuyin,
  };
}

export function pickCue(def: CardDef, rng: () => number = Math.random): Cue {
  const i = Math.floor(rng() * def.cues.length);
  return def.cues[Math.max(0, Math.min(i, def.cues.length - 1))];
}

export function allZhuyin(): string[] {
  return [...new Set(Object.values(CARDS).map((c) => c.zhuyin))];
}

/** Split a spell string into tappable symbols (注音 + 聲調). */
export function splitSpell(spell: string): string[] {
  return Array.from(spell.normalize('NFC'));
}
