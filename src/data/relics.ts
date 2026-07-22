/** Character-bound starter relics plus legacy definitions kept for v1 saves. */

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
  /** Added once to the first damaging hit of each combat. */
  firstAttackBonusDamage?: number;
}

export const RELICS: Record<string, RelicDef> = {
  tuningFork: {
    id: 'tuningFork',
    emoji: '🎵',
    name: '初心音叉',
    blurb: '每場戰鬥的第一次攻擊，追加 2 點回音傷害',
    firstAttackBonusDamage: 2,
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
