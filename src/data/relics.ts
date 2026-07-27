/** Universal relic definitions; characters may choose one as their starter. */

export interface RelicDef {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  startBlock?: number;
  startGold?: number;
  maxEnergy?: number;
  firstTurnEnergy?: number;
  startDraw?: number;
  /** Added to the first resolved Attack hit of every player turn. */
  firstAttackBonusDamage?: number;
}

export const RELICS: Record<string, RelicDef> = {
  tuningFork: {
    id: 'tuningFork',
    emoji: '🎵',
    name: '初心音叉',
    blurb: '每回合第一次攻擊命中時，追加 1 點傷害',
    firstAttackBonusDamage: 1,
  },
  shieldCharm: {
    id: 'shieldCharm',
    emoji: '🛡️',
    name: '小盾符',
    blurb: '每場戰鬥開始 +2 護盾',
    startBlock: 2,
  },
  coinPouch: {
    id: 'coinPouch',
    emoji: '🪙',
    name: '零錢袋',
    blurb: '出發 +14 金幣（約半張商店牌）',
    startGold: 14,
  },
  morningSpark: {
    id: 'morningSpark',
    emoji: '🌅',
    name: '晨光火花',
    blurb: '每場只有第 1 回合有 4 能量，之後仍是 3',
    firstTurnEnergy: 4,
  },
  /** Extra opening hand size */
  luckyDraw: {
    id: 'luckyDraw',
    emoji: '🎴',
    name: '幸運抽',
    blurb: '每場戰鬥開始多抽 1 張牌',
    startDraw: 1,
  },
};

export function getRelic(id: string): RelicDef {
  const r = RELICS[id];
  if (!r) throw new Error(`Unknown relic ${id}`);
  return r;
}
