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
    | 'jin'
    | 'echo'
    | 'echoGuard';
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
export const LEGACY_CARDS: Record<string, CardDef> = {
  bo: {
    id: 'bo',
    zhuyin: 'ㄅ',
    name: '音波擊',
    type: 'attack',
    cost: 1,
    icon: '💫',
    job: 'frontload',
    value: 3,
    cues: [
      { word: '爸爸', emoji: '👨', spell: 'ㄅㄚˋ' },
      { word: '寶寶', emoji: '👶', spell: 'ㄅㄠˇ' },
      { word: '筆', emoji: '✏️', spell: 'ㄅㄧˇ' },
      { word: '杯子', emoji: '🥤', spell: 'ㄅㄟ' }, // 家裡
    ],
    effects: [{ kind: 'damage', amount: 3 }],
    description: '造成 3 點傷害。',
  },
  po: {
    id: 'po',
    zhuyin: 'ㄆ',
    name: '共鳴震',
    type: 'attack',
    cost: 2,
    icon: '🔔',
    job: 'scaling',
    value: 5,
    effects: [
      { kind: 'damage', amount: 5 },
      { kind: 'echo', amount: 2 },
    ],
    cues: [
      { word: '跑步', emoji: '🏃', spell: 'ㄆㄠˇ' },
      { word: '蘋果', emoji: '🍎', spell: 'ㄆㄧㄥˊ' },
      { word: '泡泡', emoji: '💭', spell: 'ㄆㄠˋ' },
      { word: '朋友', emoji: '👫', spell: 'ㄆㄥˊ' }, // 公園
    ],
    description: '造成 5 點傷害。附上 2 回合回音。',
  },
  mo: {
    id: 'mo',
    zhuyin: 'ㄇ',
    name: '音波盾',
    type: 'block',
    cost: 1,
    icon: '🛡️',
    job: 'defense',
    value: 4,
    cues: [
      { word: '貓咪', emoji: '🐱', spell: 'ㄇㄠ' },
      { word: '媽媽', emoji: '👩', spell: 'ㄇㄚ' },
      { word: '帽子', emoji: '🎩', spell: 'ㄇㄠˋ' },
      { word: '門', emoji: '🚪', spell: 'ㄇㄣˊ' }, // 家裡
    ],
    effects: [{ kind: 'block', amount: 4 }],
    description: '獲得 4 點護盾。',
  },
  fo: {
    id: 'fo',
    zhuyin: 'ㄈ',
    name: '邊擋邊唱',
    type: 'skill',
    cost: 1,
    icon: '🎶',
    job: 'draw',
    value: 3,
    draw: 1,
    effects: [
      { kind: 'block', amount: 3 },
      { kind: 'draw', amount: 1 },
    ],
    cues: [
      { word: '飛機', emoji: '✈️', spell: 'ㄈㄟ' },
      { word: '風', emoji: '🌬️', spell: 'ㄈㄥ' },
      { word: '飯', emoji: '🍚', spell: 'ㄈㄢˋ' },
      { word: '風扇', emoji: '🌀', spell: 'ㄈㄥ' }, // 家裡
    ],
    description: '獲得 3 點護盾。抽 1 張牌。',
  },
  de: {
    id: 'de',
    zhuyin: 'ㄉ',
    name: '動物園衝',
    type: 'attack',
    cost: 2,
    value: 6,
    cues: [
      { word: '動物園', emoji: '🏛️', spell: 'ㄉㄨㄥˋ' },
      { word: '大象', emoji: '🐘', spell: 'ㄉㄚˋ' },
      { word: '弟弟', emoji: '👦', spell: 'ㄉㄧˋ' },
      { word: '燈', emoji: '💡', spell: 'ㄉㄥ' }, // 家裡
    ],
    description: '造成 6 點傷害',
  },
  te: {
    id: 'te',
    zhuyin: 'ㄊ',
    name: '雙拍連擊',
    type: 'attack',
    cost: 1,
    icon: '🥁',
    job: 'frontload',
    value: 2,
    hits: 2,
    cues: [
      { word: '兔子', emoji: '🐰', spell: 'ㄊㄨˋ' },
      { word: '太陽', emoji: '☀️', spell: 'ㄊㄞˋ' },
      { word: '糖果', emoji: '🍬', spell: 'ㄊㄤˊ' },
      { word: '拖鞋', emoji: '🩴', spell: 'ㄊㄨㄛ' }, // 家裡
    ],
    effects: [{ kind: 'damage', amount: 2, hits: 2 }],
    description: '造成 2 點傷害，兩次。',
  },
  ne: {
    id: 'ne',
    zhuyin: 'ㄋ',
    name: '牛奶盾',
    type: 'block',
    cost: 2,
    value: 6,
    cues: [
      { word: '牛奶', emoji: '🥛', spell: 'ㄋㄧㄡˊ' },
      { word: '鳥', emoji: '🐦', spell: 'ㄋㄧㄠˇ' },
      { word: '女生', emoji: '👧', spell: 'ㄋㄩˇ' },
      { word: '奶奶', emoji: '👵', spell: 'ㄋㄞˇ' }, // 家裡
    ],
    description: '獲得 6 點護盾',
  },
  le: {
    id: 'le',
    zhuyin: 'ㄌ',
    name: '翻譜',
    type: 'skill',
    cost: 1,
    icon: '📖',
    job: 'draw',
    value: 0,
    draw: 2,
    effects: [{ kind: 'draw', amount: 2 }],
    cues: [
      { word: '老虎', emoji: '🐯', spell: 'ㄌㄠˇ' },
      { word: '老鼠', emoji: '🐭', spell: 'ㄌㄠˇ' },
      { word: '籃球', emoji: '🏀', spell: 'ㄌㄢˊ' },
      { word: '溜滑梯', emoji: '🛝', spell: 'ㄌㄧㄡ' }, // 公園
    ],
    description: '抽 2 張牌。',
  },
  ge: {
    id: 'ge',
    zhuyin: 'ㄍ',
    name: '響亮一擊',
    type: 'attack',
    cost: 1,
    icon: '💥',
    job: 'frontload',
    value: 6,
    effects: [{ kind: 'damage', amount: 6 }],
    cues: [
      { word: '狗', emoji: '🐶', spell: 'ㄍㄡˇ' },
      { word: '哥哥', emoji: '🧒', spell: 'ㄍㄜ' },
      { word: '歌', emoji: '🎵', spell: 'ㄍㄜ' },
      { word: '公園', emoji: '🏞️', spell: 'ㄍㄨㄥ' }, // 公園
    ],
    description: '造成 6 點傷害。',
  },
  ke: {
    id: 'ke',
    zhuyin: 'ㄎ',
    name: '厚實音牆',
    type: 'block',
    cost: 1,
    icon: '🧱',
    job: 'defense',
    value: 7,
    effects: [{ kind: 'block', amount: 7 }],
    cues: [
      { word: '褲子', emoji: '👖', spell: 'ㄎㄨˋ' },
      { word: '咳嗽', emoji: '😷', spell: 'ㄎㄜˊ' },
      { word: '可樂', emoji: '🥤', spell: 'ㄎㄜˇ' },
      { word: '客廳', emoji: '🛋️', spell: 'ㄎㄜˋ' }, // 家裡
    ],
    description: '獲得 7 點護盾。',
  },
  he: {
    id: 'he',
    zhuyin: 'ㄏ',
    name: '回音針',
    type: 'attack',
    cost: 1,
    icon: '📍',
    job: 'scaling',
    value: 2,
    effects: [
      { kind: 'damage', amount: 2 },
      { kind: 'echo', amount: 2 },
    ],
    cues: [
      { word: '猴子', emoji: '🐵', spell: 'ㄏㄡˊ' },
      { word: '火圈', emoji: '🔥', spell: 'ㄏㄨㄛˇ' },
      { word: '花', emoji: '🌸', spell: 'ㄏㄨㄚ' },
      { word: '花園', emoji: '🏡', spell: 'ㄏㄨㄚ' }, // 家裡／公園
    ],
    description: '造成 2 點傷害。附上 2 回合回音。',
  },
  ji: {
    id: 'ji',
    zhuyin: 'ㄐ',
    name: '雞飛踢',
    type: 'attack',
    cost: 1,
    value: 4,
    cues: [
      { word: '雞', emoji: '🐔', spell: 'ㄐㄧ' },
      { word: '家', emoji: '🏠', spell: 'ㄐㄧㄚ' },
      { word: '橘子', emoji: '🍊', spell: 'ㄐㄩˊ' },
    ],
    description: '造成 4 點傷害',
    unlockScore: 300,
  },
  qi: {
    id: 'qi',
    zhuyin: 'ㄑ',
    name: '氣球盾',
    type: 'block',
    cost: 1,
    value: 4,
    cues: [
      { word: '氣球', emoji: '🎈', spell: 'ㄑㄧˋ' },
      { word: '青蛙', emoji: '🐸', spell: 'ㄑㄧㄥ' },
      { word: '企鵝', emoji: '🐧', spell: 'ㄑㄧˇ' },
      { word: '鞦韆', emoji: '🎠', spell: 'ㄑㄧㄡ' }, // 公園
    ],
    description: '獲得 4 點護盾',
  },
  xi: {
    id: 'xi',
    zhuyin: 'ㄒ',
    name: '西瓜砸',
    type: 'attack',
    cost: 2,
    value: 6,
    cues: [
      { word: '西瓜', emoji: '🍉', spell: 'ㄒㄧ' },
      { word: '蝦', emoji: '🦐', spell: 'ㄒㄧㄚ' },
      { word: '星星', emoji: '⭐', spell: 'ㄒㄧㄥ' },
      { word: '鞋子', emoji: '👟', spell: 'ㄒㄧㄝˊ' }, // 家裡
    ],
    description: '造成 6 點傷害',
  },
  zhi: {
    id: 'zhi',
    zhuyin: 'ㄓ',
    name: '蜘蛛網',
    type: 'block',
    cost: 1,
    value: 5,
    cues: [
      { word: '蜘蛛', emoji: '🕷️', spell: 'ㄓ' },
      { word: '豬', emoji: '🐷', spell: 'ㄓㄨ' },
      { word: '鐘', emoji: '🔔', spell: 'ㄓㄨㄥ' },
      { word: '桌子', emoji: '🍽️', spell: 'ㄓㄨㄛ' }, // 家裡
    ],
    description: '獲得 5 點護盾',
  },
  chi: {
    id: 'chi',
    zhuyin: 'ㄔ',
    name: '車子衝',
    type: 'attack',
    cost: 1,
    value: 4,
    cues: [
      { word: '車', emoji: '🚗', spell: 'ㄔㄜ' },
      { word: '蟲', emoji: '🐛', spell: 'ㄔㄨㄥˊ' },
      { word: '尺', emoji: '📏', spell: 'ㄔˇ' },
      { word: '床', emoji: '🛏️', spell: 'ㄔㄨㄤˊ' }, // 家裡
    ],
    description: '造成 4 點傷害',
  },
  shi: {
    id: 'shi',
    zhuyin: 'ㄕ',
    name: '共鳴護唱',
    type: 'skill',
    cost: 1,
    icon: '🌱',
    job: 'scaling',
    value: 0,
    effects: [{ kind: 'echoGuard', amount: 2 }],
    cues: [
      { word: '獅子', emoji: '🦁', spell: 'ㄕ' },
      { word: '石頭', emoji: '🪨', spell: 'ㄕˊ' },
      { word: '書', emoji: '📖', spell: 'ㄕㄨ' },
      { word: '樹', emoji: '🌳', spell: 'ㄕㄨˋ' }, // 公園
    ],
    description: '這場戰鬥：每當回音響起，獲得 2 點護盾。',
  },
  ri: {
    id: 'ri',
    zhuyin: 'ㄖ',
    name: '日光音波',
    type: 'attack',
    cost: 1,
    icon: '☀️',
    job: 'area',
    value: 3,
    target: 'allEnemies',
    effects: [{ kind: 'damage', amount: 3 }],
    cues: [
      { word: '熱鬧', emoji: '🎉', spell: 'ㄖㄜˋ' },
      { word: '熱', emoji: '🔥', spell: 'ㄖㄜˋ' },
      { word: '日', emoji: '🌞', spell: 'ㄖˋ' },
    ],
    description: '對所有怪物造成 3 點傷害。',
  },
  zi: {
    id: 'zi',
    zhuyin: 'ㄗ',
    name: '走路刺',
    type: 'attack',
    cost: 0,
    value: 2,
    cues: [
      { word: '走路', emoji: '🚶', spell: 'ㄗㄡˇ' },
      { word: '字母', emoji: '🔤', spell: 'ㄗˋ' },
      { word: '紫', emoji: '💜', spell: 'ㄗˇ' },
    ],
    description: '造成 2 點傷害',
  },
  ci: {
    id: 'ci',
    zhuyin: 'ㄘ',
    name: '草葉盾',
    type: 'block',
    cost: 1,
    value: 4,
    cues: [
      { word: '草', emoji: '🌿', spell: 'ㄘㄠˇ' },
      { word: '彩虹', emoji: '🌈', spell: 'ㄘㄞˇ' },
      { word: '磁鐵', emoji: '🧲', spell: 'ㄘˊ' },
    ],
    description: '獲得 4 點護盾',
    unlockScore: 300,
  },
  si: {
    id: 'si',
    zhuyin: 'ㄙ',
    name: '松鼠擊',
    type: 'attack',
    cost: 1,
    value: 4,
    cues: [
      { word: '松鼠', emoji: '🐿️', spell: 'ㄙㄨㄥ' },
      { word: '三', emoji: '3️⃣', spell: 'ㄙㄢ' },
      { word: '絲', emoji: '🧵', spell: 'ㄙ' },
    ],
    description: '造成 4 點傷害',
  },
  yi: {
    id: 'yi',
    zhuyin: 'ㄧ',
    name: '深呼吸',
    type: 'skill',
    cost: 0,
    icon: '🌬️',
    job: 'energy',
    value: 0,
    target: 'self',
    effects: [{ kind: 'energy', amount: 1 }],
    cues: [
      { word: '衣服', emoji: '👕', spell: 'ㄧ' },
      { word: '椅子', emoji: '🪑', spell: 'ㄧˇ' },
      { word: '醫生', emoji: '🩺', spell: 'ㄧ' },
    ],
    description: '獲得 1 點能量。',
  },
  wu: {
    id: 'wu',
    zhuyin: 'ㄨ',
    name: '烏雲盾',
    type: 'block',
    cost: 0,
    value: 2,
    cues: [
      { word: '烏雲', emoji: '☁️', spell: 'ㄨ' },
      { word: '屋子', emoji: '🏡', spell: 'ㄨ' },
      { word: '五', emoji: '5️⃣', spell: 'ㄨˇ' },
    ],
    description: '獲得 2 點護盾',
  },
  yu: {
    id: 'yu',
    zhuyin: 'ㄩ',
    name: '魚躍斬',
    type: 'attack',
    cost: 1,
    value: 3,
    cues: [
      { word: '魚', emoji: '🐟', spell: 'ㄩˊ' },
      { word: '雨', emoji: '🌧️', spell: 'ㄩˇ' },
      { word: '月亮', emoji: '🌙', spell: 'ㄩㄝˋ' },
    ],
    description: '造成 3 點傷害',
  },
  a: {
    id: 'a',
    zhuyin: 'ㄚ',
    name: '阿姨擊',
    type: 'attack',
    cost: 1,
    value: 3,
    cues: [
      { word: '阿姨', emoji: '👩', spell: 'ㄚ' },
      { word: '啊', emoji: '😮', spell: 'ㄚ' },
    ],
    description: '造成 3 點傷害',
  },
  o: {
    id: 'o',
    zhuyin: 'ㄛ',
    name: '喔喔盾',
    type: 'block',
    cost: 1,
    value: 3,
    cues: [
      { word: '喔', emoji: '😲', spell: 'ㄛ' },
      { word: '喔喔', emoji: '😮', spell: 'ㄛ' },
    ],
    description: '獲得 3 點護盾',
  },
  e: {
    id: 'e',
    zhuyin: 'ㄜ',
    name: '鵝大力',
    type: 'attack',
    cost: 2,
    value: 6,
    cues: [
      { word: '鵝', emoji: '🦢', spell: 'ㄜˊ' },
      { word: '餓', emoji: '😋', spell: 'ㄜˋ' },
    ],
    description: '造成 6 點傷害',
  },
};

/**
 * The generated mature catalog stays available for static review, but only the
 * authored wave-one ids below are obtainable in live runs. Reused stable ids
 * keep their full pronunciation cue families so the character migration does
 * not shrink a learner's casting curriculum.
 */
const RESONANCE_WAVE_ONE_PRESENTATION: Record<string, Partial<CardDef>> = {
  bo: {
    icon: '💫',
    description: '造成 3 點傷害。這是基礎攻擊。',
  },
  mo: {
    icon: '🛡️',
    description: '獲得 4 點護盾。',
  },
  po: {
    icon: '🎯',
    description: '造成 5 點傷害。附上 2 層易傷。',
  },
  he: {
    icon: '📍',
    description: '造成 2 點傷害。附上 2 層易傷。',
  },
  ge: {
    icon: '💥',
    description: '造成 6 點傷害。',
  },
  ri: {
    icon: '☀️',
    description: '對所有怪物造成 3 點傷害。',
  },
  ke: {
    icon: '🧱',
    description: '獲得 7 點護盾。',
  },
  te: {
    icon: '🥁',
    description: '造成 2 點傷害，兩次。這是基礎攻擊。',
  },
  le: {
    icon: '📖',
    description: '抽 2 張牌。',
  },
  shi: {
    icon: '🥋',
    description: '這場戰鬥：練功 2。',
  },
  yi: {
    icon: '🔄',
    description: '造成 4 點傷害。轉拍：獲得 3 點護盾。',
  },
  fo: {
    icon: '👊',
    description: '消耗 1 勁，造成 8 點傷害。沒有勁時不能使用。',
  },
};

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  Object.entries(RESONANCE_CARDS).map(([id, def]) => {
    const legacy = LEGACY_CARDS[id];
    const presentation = RESONANCE_WAVE_ONE_PRESENTATION[id];
    return [
      id,
      {
        ...def,
        ...(legacy
          ? { cues: legacy.cues.map((cue) => ({ ...cue })) }
          : {}),
        ...presentation,
      },
    ];
  }),
);

/** Echo Mage starter: three designs, deliberately repetitive for onboarding. */
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

/** Later acts draw from the complete progression-gated character catalog. */
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
