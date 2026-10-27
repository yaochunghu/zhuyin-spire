/** Character-bound starter relics plus legacy definitions kept for v1 saves. */

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'event';

export interface RelicDef {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  /** Starter and event relics stay out of the chest roll. */
  rarity?: RelicRarity;
  startBlock?: number;
  startGold?: number;
  maxEnergy?: number;
  firstTurnEnergy?: number;
  startDraw?: number;
  /** Added once to the first damaging Attack hit of each player turn. */
  firstAttackBonusDamage?: number;
}

export const RELICS: Record<string, RelicDef> = {
  tuningFork: {
    id: 'tuningFork',
    emoji: '🎵',
    name: '初心音叉',
    blurb: '每回合第一次攻擊命中時，追加 1 點傷害',
    rarity: 'starter',
    firstAttackBonusDamage: 1,
  },
  shieldCharm: {
    id: 'shieldCharm',
    emoji: '🛡️',
    name: '小盾符',
    blurb: '每場戰鬥開始 +2 護盾',
    rarity: 'common',
    startBlock: 2,
  },
  coinPouch: {
    id: 'coinPouch',
    emoji: '🪙',
    name: '零錢袋',
    blurb: '出發 +14 金幣（約半張商店牌）',
    rarity: 'common',
    startGold: 14,
  },
  morningSpark: {
    id: 'morningSpark',
    emoji: '🌅',
    name: '晨光火花',
    blurb: '每場只有第 1 回合有 4 能量，之後仍是 3',
    rarity: 'common',
    firstTurnEnergy: 4,
  },
  /** Extra opening hand size */
  luckyDraw: {
    id: 'luckyDraw',
    emoji: '🎴',
    name: '幸運抽',
    blurb: '每場戰鬥開始多抽 1 張牌',
    rarity: 'common',
    startDraw: 1,
  },
  pocketMetronome: {
    id: 'pocketMetronome',
    emoji: '⏱️',
    name: '口袋節拍器',
    blurb: '一回合成功打出第 3 張牌時，抽 1 張',
    rarity: 'common',
  },
  moonMusicBox: {
    id: 'moonMusicBox',
    emoji: '🌙',
    name: '月光音樂盒',
    blurb: '綁定的那張牌，每場第一次拼對時抽 1 張',
    rarity: 'event',
  },
  rainSoundTube: {
    id: 'rainSoundTube',
    emoji: '🌧️',
    name: '雨聲筒',
    blurb: '怪物行動前，如果沒有護盾，先獲得 2 點護盾',
    rarity: 'event',
  },
  choirRibbon: {
    id: 'choirRibbon',
    emoji: '🎀',
    name: '合唱緞帶',
    blurb: '每贏 3 場戰鬥，回復 5 點生命',
    rarity: 'event',
  },
};

/** Common relics an event may roll, including the metronome. */
export const COMMON_RELIC_IDS = [
  'shieldCharm',
  'coinPouch',
  'morningSpark',
  'luckyDraw',
  'pocketMetronome',
] as const;

/** Uncommon and rare random relics are not in the live pool yet. */
export const UNCOMMON_RELIC_IDS = [] as const;
export const RARE_RELIC_IDS = [] as const;

export const EVENT_RELIC_IDS = [
  'pocketMetronome',
  'moonMusicBox',
  'rainSoundTube',
  'choirRibbon',
] as const;

export function relicIdsForRarity(rarity: 'common' | 'uncommon' | 'rare'): readonly string[] {
  if (rarity === 'common') return COMMON_RELIC_IDS;
  if (rarity === 'uncommon') return UNCOMMON_RELIC_IDS;
  return RARE_RELIC_IDS;
}

export function getRelic(id: string): RelicDef {
  const r = RELICS[id];
  if (!r) throw new Error(`Unknown relic ${id}`);
  return r;
}
