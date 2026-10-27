/**
 * Relics.
 *
 * The starter is always 初心音叉. Chests, elites, and bosses roll the small
 * 0.5 pool. The four legacy relics stay defined so v1 and v2 saves still load;
 * they are not offered. Nothing here skips or refunds a cast.
 */

export type RelicSource = 'starter' | 'pool' | 'legacy';

export interface RelicDef {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  /** Adult co-play line shown when the badge is inspected. */
  adultNote: string;
  source: RelicSource;
  startBlock?: number;
  startGold?: number;
  maxEnergy?: number;
  firstTurnEnergy?: number;
  startDraw?: number;
  /** Added once to the first Attack hit of each player turn, before 易傷. */
  firstAttackBonusDamage?: number;
  /** Added to the first 基礎攻擊 hit of each player turn, before 易傷. */
  firstBasicHitBonus?: number;
  /** Added to the first Attack hit each turn against an enemy that already has 易傷, before the multiplier. */
  firstVulnerableHitBonus?: number;
  /** Block gained the first 轉拍 of each player turn. */
  firstTempoBlock?: number;
  /** Block gained the first time this combat the player gains 勁. */
  firstJinBlock?: number;
  /** 練功 gained at combat start and removed when the second player turn begins. */
  firstTurnTraining?: number;
}

export const RELICS: Record<string, RelicDef> = {
  tuningFork: {
    id: 'tuningFork',
    emoji: '🎵',
    name: '初心音叉',
    blurb: '每回合第一次攻擊命中時，追加 1 點傷害',
    adultNote: '加在易傷之前。念錯不會用掉，護盾把傷害擋光也算打過這一記。',
    source: 'starter',
    firstAttackBonusDamage: 1,
  },
  gapThumb: {
    id: 'gapThumb',
    emoji: '🎯',
    name: '尋隙指套',
    blurb: '每回合第一次打中已經易傷的敵人，那一下多 2 點傷害',
    adultNote: '這 2 點加在易傷乘算之前。這一記才附上易傷時不會用掉它。',
    source: 'pool',
    firstVulnerableHitBonus: 2,
  },
  trainingWrap: {
    id: 'trainingWrap',
    emoji: '👊',
    name: '練功護腕',
    blurb: '每回合第一次基礎攻擊的第一下，多 1 點傷害',
    adultNote: '只加在基礎攻擊上。連打的牌只有第一下會加。易傷仍在之後結算。',
    source: 'pool',
    firstBasicHitBonus: 1,
  },
  tempoWood: {
    id: 'tempoWood',
    emoji: '🥁',
    name: '換拍木魚',
    blurb: '每回合第一次攻守換拍，獲得 2 點護盾',
    adultNote: '要成功打出攻擊再技能，或技能再攻擊。念錯的那張不算換拍，也不會拿到護盾。',
    source: 'pool',
    firstTempoBlock: 2,
  },
  listeningHeart: {
    id: 'listeningHeart',
    emoji: '💛',
    name: '聽勁護心',
    blurb: '每場戰鬥第一次得到勁時，再獲得 3 點護盾',
    adultNote: '擋住攻擊得到的勁，護盾下一回合才出現，不會因此再得到勁。破綻借力或剛柔並濟直接給的勁，會立刻多 3 點護盾。',
    source: 'pool',
    firstJinBlock: 3,
  },
  trainingStance: {
    id: 'trainingStance',
    emoji: '🥋',
    name: '練功起勢',
    blurb: '第 1 回合，練功 +1',
    adultNote: '這一點練功只留在第一回合。第二回合開始就收回。牌自己給的練功不會被收回。',
    source: 'pool',
    firstTurnTraining: 1,
  },
  shieldCharm: {
    id: 'shieldCharm',
    emoji: '🛡️',
    name: '小盾符',
    blurb: '每場戰鬥開始 +2 護盾',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    startBlock: 2,
  },
  coinPouch: {
    id: 'coinPouch',
    emoji: '🪙',
    name: '零錢袋',
    blurb: '出發 +14 金幣（約半張商店牌）',
    adultNote: '舊存檔遺物。金幣在拿到的那一次加入，讀檔不會再加一次。',
    source: 'legacy',
    startGold: 14,
  },
  morningSpark: {
    id: 'morningSpark',
    emoji: '🌅',
    name: '晨光火花',
    blurb: '每場只有第 1 回合有 4 能量，之後仍是 3',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    firstTurnEnergy: 4,
  },
  luckyDraw: {
    id: 'luckyDraw',
    emoji: '🎴',
    name: '幸運抽',
    blurb: '每場戰鬥開始多抽 1 張牌',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    startDraw: 1,
  },
};

/** Chest, elite, and boss drops, in roll order. The starter and legacy relics are excluded. */
export const RELIC_POOL_IDS = ['gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'] as const;

export type RelicPoolId = (typeof RELIC_POOL_IDS)[number];

export function getRelic(id: string): RelicDef {
  const relic = RELICS[id];
  if (!relic) throw new Error(`Unknown relic ${id}`);
  return relic;
}

export function isKnownRelicId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(RELICS, id);
}

/** Uniform pick among pool relics the run does not already own. */
export function rollRelicDrop(
  ownedIds: readonly string[],
  randomIndex: (exclusiveMax: number) => number,
): string | null {
  const owned = new Set(ownedIds);
  const available = RELIC_POOL_IDS.filter((id) => !owned.has(id));
  if (available.length === 0) return null;
  const index = randomIndex(available.length);
  return available[index] ?? null;
}

export interface RelicCombatMods {
  startBlock: number;
  maxEnergy: number;
  firstTurnEnergy: number;
  startDraw: number;
  firstAttackBonusDamage: number;
  firstBasicHitBonus: number;
  firstVulnerableHitBonus: number;
  firstTempoBlock: number;
  firstJinBlock: number;
  firstTurnTraining: number;
}

export function combatModsFor(relics: readonly RelicDef[]): RelicCombatMods {
  const mods: RelicCombatMods = {
    startBlock: 0,
    maxEnergy: 3,
    firstTurnEnergy: 0,
    startDraw: 0,
    firstAttackBonusDamage: 0,
    firstBasicHitBonus: 0,
    firstVulnerableHitBonus: 0,
    firstTempoBlock: 0,
    firstJinBlock: 0,
    firstTurnTraining: 0,
  };
  const seen = new Set<string>();
  for (const relic of relics) {
    if (seen.has(relic.id)) continue;
    seen.add(relic.id);
    mods.startBlock += relic.startBlock ?? 0;
    mods.startDraw += relic.startDraw ?? 0;
    mods.firstAttackBonusDamage += relic.firstAttackBonusDamage ?? 0;
    mods.firstBasicHitBonus += relic.firstBasicHitBonus ?? 0;
    mods.firstVulnerableHitBonus += relic.firstVulnerableHitBonus ?? 0;
    mods.firstTempoBlock += relic.firstTempoBlock ?? 0;
    mods.firstJinBlock += relic.firstJinBlock ?? 0;
    mods.firstTurnTraining += relic.firstTurnTraining ?? 0;
    if (relic.maxEnergy) mods.maxEnergy = Math.max(mods.maxEnergy, relic.maxEnergy);
    if (relic.firstTurnEnergy) {
      mods.firstTurnEnergy = Math.max(mods.firstTurnEnergy, relic.firstTurnEnergy);
    }
  }
  if (mods.firstTurnEnergy === 0) mods.firstTurnEnergy = mods.maxEnergy;
  return mods;
}

function isRelicDef(value: RelicDef | readonly RelicDef[]): value is RelicDef {
  return !Array.isArray(value);
}

export function listRelics(relics?: RelicDef | readonly RelicDef[] | null): RelicDef[] {
  if (!relics) return [];
  return isRelicDef(relics) ? [relics] : [...relics];
}
