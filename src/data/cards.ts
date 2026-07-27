import type { CastBinding, CastingGateId } from '../game/casting/types';

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type CardRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardPool = 'starter' | 'resonanceWarrior' | 'shared' | 'status' | 'curse';
export type CardTag = 'basicAttack';
export type CardKeyword =
  | 'exhaust'
  | 'innate'
  | 'retain'
  | 'ethereal'
  | 'unplayable';

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

export type EffectDef =
  | { kind: 'damage'; amount: number; hits?: number; damageType?: 'attack' | 'direct' }
  | { kind: 'block'; amount: number }
  | { kind: 'draw'; amount: number }
  | { kind: 'energy'; amount: number }
  | { kind: 'applyVulnerable'; amount: number }
  | { kind: 'addBasicAttackDamage'; amount: number };

export interface CardUpgradeDef {
  cost?: number;
  effects?: EffectDef[];
  addTags?: CardTag[];
  removeTags?: CardTag[];
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
  rarity: CardRarity;
  pool: CardPool;
  cost: number;
  /** Stable combat illustration; cue emoji changes with the spelling prompt. */
  icon?: string;
  /** Main deck-building job, shown as a small readable card tag. */
  job?: CardJob;
  value: number;
  hits?: number;
  bonusBlock?: number;
  draw?: number;
  /** Ordered combat effects; this is the single source used by rules and previews. */
  effects: EffectDef[];
  tags: CardTag[];
  keywords: CardKeyword[];
  upgrade?: CardUpgradeDef;
  /** Adult-facing rationale shown in the designer catalog. */
  balanceNote: string;
  /** 0 means available immediately; later content may gate higher tiers. */
  unlockTier: number;
  /** Default: attack → singleEnemy, else self */
  target?: TargetType;
  cues: Cue[];
  description: string;
}

type CardSourceDef = Omit<
  CardDef,
  'rarity' | 'pool' | 'effects' | 'tags' | 'keywords' | 'balanceNote' | 'unlockTier'
> & {
  rarity?: CardRarity;
  pool?: CardPool;
  effects?: EffectDef[];
  tags?: CardTag[];
  keywords?: CardKeyword[];
  balanceNote?: string;
  unlockTier?: number;
};

/**
 * Teaching rule:
 * - word starts with card 注音
 * - emoji matches word
 * - spell is complete first-syllable 注音 **including tone mark (聲調符號)** when not 一聲
 */
const RAW_CARDS: Record<string, CardSourceDef> = {
  bo: {
    id: 'bo',
    zhuyin: 'ㄅ',
    name: '音波擊',
    type: 'attack',
    cost: 1,
    icon: '💫',
    job: 'frontload',
    tags: ['basicAttack'],
    balanceNote: '一能量基礎攻擊下限；架式強化的主要載體。',
    value: 3,
    cues: [
      { word: '爸爸', emoji: '👨', spell: 'ㄅㄚˋ' },
      { word: '寶寶', emoji: '👶', spell: 'ㄅㄠˇ' },
      { word: '筆', emoji: '✏️', spell: 'ㄅㄧˇ' },
      { word: '杯子', emoji: '🥤', spell: 'ㄅㄟ' }, // 家裡
    ],
    effects: [{ kind: 'damage', amount: 3 }],
    upgrade: {
      effects: [{ kind: 'damage', amount: 5 }],
      description: '造成 5 點傷害。',
    },
    description: '造成 3 點傷害。',
  },
  po: {
    id: 'po',
    zhuyin: 'ㄆ',
    name: '破綻震',
    type: 'attack',
    cost: 2,
    icon: '🔔',
    job: 'scaling',
    balanceNote: '兩能量的起始牌：先造成傷害，再建立易傷窗口。',
    value: 5,
    effects: [
      { kind: 'damage', amount: 5 },
      { kind: 'applyVulnerable', amount: 2 },
    ],
    upgrade: {
      effects: [
        { kind: 'damage', amount: 7 },
        { kind: 'applyVulnerable', amount: 2 },
      ],
      description: '造成 7 點傷害。施加 2 回合易傷。',
    },
    cues: [
      { word: '跑步', emoji: '🏃', spell: 'ㄆㄠˇ' },
      { word: '蘋果', emoji: '🍎', spell: 'ㄆㄧㄥˊ' },
      { word: '泡泡', emoji: '💭', spell: 'ㄆㄠˋ' },
      { word: '朋友', emoji: '👫', spell: 'ㄆㄥˊ' }, // 公園
    ],
    description: '造成 5 點傷害。施加 2 回合易傷。',
  },
  mo: {
    id: 'mo',
    zhuyin: 'ㄇ',
    name: '音波盾',
    type: 'skill',
    cost: 1,
    icon: '🛡️',
    job: 'defense',
    balanceNote: '一能量基礎防守下限，規則簡單且適合教學。',
    value: 4,
    cues: [
      { word: '貓咪', emoji: '🐱', spell: 'ㄇㄠ' },
      { word: '媽媽', emoji: '👩', spell: 'ㄇㄚ' },
      { word: '帽子', emoji: '🎩', spell: 'ㄇㄠˋ' },
      { word: '門', emoji: '🚪', spell: 'ㄇㄣˊ' }, // 家裡
    ],
    effects: [{ kind: 'block', amount: 4 }],
    upgrade: {
      effects: [{ kind: 'block', amount: 6 }],
      description: '獲得 6 點護盾。',
    },
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
    type: 'skill',
    cost: 2,
    value: 6,
    effects: [{ kind: 'block', amount: 6 }],
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
    type: 'skill',
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
    name: '弱點標記',
    type: 'attack',
    cost: 1,
    icon: '📍',
    job: 'scaling',
    balanceNote: '低前置傷害換取便宜的易傷來源。',
    value: 2,
    effects: [
      { kind: 'damage', amount: 2 },
      { kind: 'applyVulnerable', amount: 2 },
    ],
    upgrade: {
      effects: [
        { kind: 'damage', amount: 3 },
        { kind: 'applyVulnerable', amount: 3 },
      ],
      description: '造成 3 點傷害。施加 3 回合易傷。',
    },
    cues: [
      { word: '猴子', emoji: '🐵', spell: 'ㄏㄡˊ' },
      { word: '火圈', emoji: '🔥', spell: 'ㄏㄨㄛˇ' },
      { word: '花', emoji: '🌸', spell: 'ㄏㄨㄚ' },
      { word: '花園', emoji: '🏡', spell: 'ㄏㄨㄚ' }, // 家裡／公園
    ],
    description: '造成 2 點傷害。施加 2 回合易傷。',
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
  },
  qi: {
    id: 'qi',
    zhuyin: 'ㄑ',
    name: '氣球盾',
    type: 'skill',
    cost: 1,
    value: 4,
    effects: [{ kind: 'block', amount: 4 }],
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
    type: 'skill',
    cost: 1,
    value: 5,
    effects: [{ kind: 'block', amount: 5 }],
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
    name: '聲波架式',
    type: 'power',
    cost: 1,
    icon: '🌱',
    job: 'scaling',
    balanceNote: '戰鬥長度越長越有價值；只強化標記為基礎攻擊的牌。',
    value: 0,
    effects: [{ kind: 'addBasicAttackDamage', amount: 2 }],
    upgrade: {
      effects: [{ kind: 'addBasicAttackDamage', amount: 3 }],
      description: '這場戰鬥：基礎攻擊每一下追加 3 點傷害。',
    },
    cues: [
      { word: '獅子', emoji: '🦁', spell: 'ㄕ' },
      { word: '石頭', emoji: '🪨', spell: 'ㄕˊ' },
      { word: '書', emoji: '📖', spell: 'ㄕㄨ' },
      { word: '樹', emoji: '🌳', spell: 'ㄕㄨˋ' }, // 公園
    ],
    description: '這場戰鬥：基礎攻擊每一下追加 2 點傷害。',
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
    type: 'skill',
    cost: 1,
    value: 4,
    effects: [{ kind: 'block', amount: 4 }],
    cues: [
      { word: '草', emoji: '🌿', spell: 'ㄘㄠˇ' },
      { word: '彩虹', emoji: '🌈', spell: 'ㄘㄞˇ' },
      { word: '磁鐵', emoji: '🧲', spell: 'ㄘˊ' },
    ],
    description: '獲得 4 點護盾',
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
    type: 'skill',
    cost: 0,
    value: 2,
    effects: [{ kind: 'block', amount: 2 }],
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
    type: 'skill',
    cost: 1,
    value: 3,
    effects: [{ kind: 'block', amount: 3 }],
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

const BASIC_IDS = new Set(['bo', 'mo', 'po']);
const UNCOMMON_IDS = new Set(['xi', 'e', 'yu', 'ne', 'wu', 'zhi', 'shi']);

function sourceEffects(def: CardSourceDef): EffectDef[] {
  if (def.effects) return def.effects.map((effect) => ({ ...effect }));
  if (def.type === 'attack') {
    const effects: EffectDef[] = [
      { kind: 'damage', amount: def.value, hits: def.hits ?? 1 },
    ];
    if (def.bonusBlock) effects.push({ kind: 'block', amount: def.bonusBlock });
    return effects;
  }
  if (def.draw) return [{ kind: 'draw', amount: def.draw }];
  return [];
}

function finalizeCardDefinitions(
  source: Record<string, CardSourceDef>,
): Record<string, CardDef> {
  return Object.fromEntries(
    Object.entries(source).map(([id, def]) => {
      const rarity: CardRarity = def.rarity ?? (
        BASIC_IDS.has(id) ? 'basic' : UNCOMMON_IDS.has(id) ? 'uncommon' : 'common'
      );
      const pool: CardPool = def.pool ?? (rarity === 'basic' ? 'starter' : 'resonanceWarrior');
      return [
        id,
        {
          ...def,
          rarity,
          pool,
          effects: sourceEffects(def),
          tags: [...(def.tags ?? [])],
          keywords: [...(def.keywords ?? [])],
          balanceNote: def.balanceNote ?? '原型內容：等待後續牌池波次評估。',
          unlockTier: def.unlockTier ?? 0,
        } satisfies CardDef,
      ];
    }),
  );
}

/** Runtime catalog after the legacy prototype rows are normalized once. */
export const CARDS: Record<string, CardDef> = finalizeCardDefinitions(RAW_CARDS);

function validEffect(effect: EffectDef): boolean {
  if (!Number.isInteger(effect.amount) || effect.amount < 0 || effect.amount > 999) {
    return false;
  }
  if (effect.kind === 'damage') {
    return effect.hits === undefined || (
      Number.isInteger(effect.hits) && effect.hits >= 1 && effect.hits <= 20
    );
  }
  return true;
}

/** Content validation used by tests and designer tooling. */
export function validateCardDefinitions(
  cards: Record<string, CardDef> = CARDS,
): string[] {
  const errors: string[] = [];
  for (const [key, card] of Object.entries(cards)) {
    const at = (message: string) => errors.push(`${key}: ${message}`);
    if (card.id !== key) at('id must match its catalog key');
    if (!Number.isInteger(card.cost) || card.cost < 0 || card.cost > 9) at('invalid cost');
    if (!card.name.trim() || !card.zhuyin.trim()) at('missing display identity');
    if (!card.description.trim()) at('missing description');
    if (!Array.isArray(card.effects) || card.effects.length === 0) at('requires ordered effects');
    if (!card.effects.every(validEffect)) at('contains an invalid effect');
    if (!Array.isArray(card.cues) || card.cues.length === 0) at('requires at least one casting cue');
    if (card.cues.some((cue) => !cue.word.trim() || !cue.emoji.trim() || !cue.spell.trim())) {
      at('contains an incomplete casting cue');
    }
    if (card.type === 'attack' && !card.effects.some((effect) => effect.kind === 'damage')) {
      at('Attack cards require a damage effect');
    }
    if (card.type === 'power' && card.target && card.target !== 'self') {
      at('Power cards must target self');
    }
    if (card.upgrade) {
      if (!card.upgrade.description.trim()) at('upgrade requires a description');
      if (card.upgrade.cost !== undefined && (
        !Number.isInteger(card.upgrade.cost) || card.upgrade.cost < 0 || card.upgrade.cost > card.cost
      )) at('upgrade cost must be legal and may not increase');
      if (card.upgrade.effects && !card.upgrade.effects.every(validEffect)) {
        at('upgrade contains an invalid effect');
      }
    }
  }
  return errors;
}

const CARD_VALIDATION_ERRORS = validateCardDefinitions();
if (CARD_VALIDATION_ERRORS.length > 0) {
  throw new Error(`Invalid card catalog:\n${CARD_VALIDATION_ERRORS.join('\n')}`);
}

/** Resolve one physical card face. Upgrade faces keep the same definition id. */
export function resolveCard(def: CardDef, upgradeLevel = 0): CardDef {
  if (upgradeLevel <= 0 || !def.upgrade) {
    return {
      ...def,
      effects: def.effects.map((effect) => ({ ...effect })),
      tags: [...def.tags],
      keywords: [...def.keywords],
    };
  }
  const addTags = def.upgrade.addTags ?? [];
  const removeTags = new Set(def.upgrade.removeTags ?? []);
  const tags = [...new Set([...def.tags, ...addTags])].filter((tag) => !removeTags.has(tag));
  const effects = (def.upgrade.effects ?? def.effects).map((effect) => ({ ...effect }));
  const primaryDamage = effects.find((effect) => effect.kind === 'damage');
  const primaryBlock = effects.find((effect) => effect.kind === 'block');
  const primaryDraw = effects.find((effect) => effect.kind === 'draw');
  return {
    ...def,
    cost: def.upgrade.cost ?? def.cost,
    description: def.upgrade.description,
    effects,
    tags,
    value: primaryDamage?.amount ?? primaryBlock?.amount ?? def.value,
    hits: primaryDamage?.kind === 'damage' ? primaryDamage.hits : def.hits,
    draw: primaryDraw?.kind === 'draw' ? primaryDraw.amount : def.draw,
  };
}

export function getCardAtUpgrade(id: string, upgradeLevel = 0): CardDef {
  return resolveCard(getCard(id), upgradeLevel);
}

/** Resonance Warrior starter: three designs, deliberately repetitive for onboarding. */
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
  'ge', // loud single-target hit
  'ri', // all-enemy answer
  'ke', // efficient defense
  'te', // multi-hit
  'he', // cheaper Vulnerable setup
  'shi', // combat-long basic-attack scaling
  'le', // draw
  'yi', // energy smoothing
  'fo', // defend + draw hybrid
];

export const ELITE_REWARD_POOL_IDS: string[] = [...REWARD_POOL_IDS];

/** Existing placeholder content remains available after Act I. */
export const LATER_ACT_REWARD_POOL_IDS: string[] = [
  'de', 'shi', 'ri', 'he', 'po', 'te', 'ne', 'le', 'ge', 'ke', 'yu',
  'bo', 'mo', 'ji', 'qi', 'xi', 'zhi', 'chi', 'zi', 'ci', 'si', 'a',
  'o', 'e', 'fo', 'yi', 'wu',
];

export const LATER_ACT_ELITE_REWARD_POOL_IDS: string[] = [
  'de', 'shi', 'he', 'ri', 'ge', 'ke', 'te', 'ne', 'le', 'xi', 'e',
  'ji', 'chi', 'yu', 'zhi', 'si',
];

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
