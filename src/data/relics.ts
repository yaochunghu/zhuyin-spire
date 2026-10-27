/**
 * Relics.
 *
 * Each character has its own starter and its own chest pool. Named event
 * relics are granted by id and are not in either roll. The four legacy relics
 * stay defined so v1 and v2 saves still load; they are not offered. Nothing
 * here skips or refunds a cast.
 */

import {
  BEAD_POUCH_START,
  ERASER_BEADS,
  RULER_CHARM_BLOCK,
  RULER_CHARM_CAST,
  TEN_BELL_ENERGY,
  WOOD_BEADS_DIRECT_DAMAGE,
} from './balance';
export type RelicSource = 'starter' | 'pool' | 'legacy' | 'event';

export interface RelicDef {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  /** Adult co-play line shown when the badge is inspected. */
  adultNote: string;
  source: RelicSource;
  /** Characters that can be offered or start with this relic. Legacy stays loadable for both. */
  characters: readonly string[];
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
  /** Direct damage on every 湊十. Skips Block and 易傷. */
  onMakeTenDirectDamage?: number;
  /** Beads added once, as their own add, when combat starts. */
  startBeads?: number;
  /** Successful casts in the turn before the ordinal block fires. */
  ordinalCast?: number;
  /** Block gained the first time this turn the ordinal cast count is reached. */
  ordinalBlock?: number;
  /** Energy the first 湊十 of the combat. */
  firstMakeTenEnergy?: number;
  /** Beads the first final fizzle of the combat. */
  fizzleBeads?: number;
}

export const RELICS: Record<string, RelicDef> = {
  tuningFork: {
    id: 'tuningFork',
    emoji: '🎵',
    name: '初心音叉',
    blurb: '每回合第一次攻擊命中時，追加 1 點傷害',
    adultNote: '加在易傷之前。念錯不會用掉，護盾把傷害擋光也算打過這一記。',
    source: 'starter',
    characters: ['echoMage'],
    firstAttackBonusDamage: 1,
  },
  gapThumb: {
    id: 'gapThumb',
    emoji: '🎯',
    name: '尋隙指套',
    blurb: '每回合第一次打中已經易傷的敵人，那一下多 2 點傷害',
    adultNote: '這 2 點加在易傷乘算之前。這一記才附上易傷時不會用掉它。',
    source: 'pool',
    characters: ['echoMage'],
    firstVulnerableHitBonus: 2,
  },
  trainingWrap: {
    id: 'trainingWrap',
    emoji: '👊',
    name: '練功護腕',
    blurb: '每回合第一次基礎攻擊的第一下，多 1 點傷害',
    adultNote: '只加在基礎攻擊上。連打的牌只有第一下會加。易傷仍在之後結算。',
    source: 'pool',
    characters: ['echoMage'],
    firstBasicHitBonus: 1,
  },
  tempoWood: {
    id: 'tempoWood',
    emoji: '🥁',
    name: '換拍木魚',
    blurb: '每回合第一次攻守換拍，獲得 2 點護盾',
    adultNote: '要成功打出攻擊再技能，或技能再攻擊。念錯的那張不算換拍，也不會拿到護盾。',
    source: 'pool',
    characters: ['echoMage'],
    firstTempoBlock: 2,
  },
  listeningHeart: {
    id: 'listeningHeart',
    emoji: '💛',
    name: '聽勁護心',
    blurb: '每場戰鬥第一次得到勁時，再獲得 3 點護盾',
    adultNote: '擋住攻擊得到的勁，護盾下一回合才出現，不會因此再得到勁。破綻借力或剛柔並濟直接給的勁，會立刻多 3 點護盾。',
    source: 'pool',
    characters: ['echoMage'],
    firstJinBlock: 3,
  },
  trainingStance: {
    id: 'trainingStance',
    emoji: '🥋',
    name: '練功起勢',
    blurb: '第 1 回合，練功 +1',
    adultNote: '這一點練功只留在第一回合。第二回合開始就收回。牌自己給的練功不會被收回。',
    source: 'pool',
    characters: ['echoMage'],
    firstTurnTraining: 1,
  },
  shieldCharm: {
    id: 'shieldCharm',
    emoji: '🛡️',
    name: '小盾符',
    blurb: '每場戰鬥開始 +2 護盾',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    characters: ['echoMage', 'abacusFist'],
    startBlock: 2,
  },
  coinPouch: {
    id: 'coinPouch',
    emoji: '🪙',
    name: '零錢袋',
    blurb: '出發 +14 金幣（約半張商店牌）',
    adultNote: '舊存檔遺物。金幣在拿到的那一次加入，讀檔不會再加一次。',
    source: 'legacy',
    characters: ['echoMage', 'abacusFist'],
    startGold: 14,
  },
  morningSpark: {
    id: 'morningSpark',
    emoji: '🌅',
    name: '晨光火花',
    blurb: '每場只有第 1 回合有 4 能量，之後仍是 3',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    characters: ['echoMage', 'abacusFist'],
    firstTurnEnergy: 4,
  },
  luckyDraw: {
    id: 'luckyDraw',
    emoji: '🎴',
    name: '幸運抽',
    blurb: '每場戰鬥開始多抽 1 張牌',
    adultNote: '舊存檔遺物。新的寶箱、菁英和 Boss 不會再掉這一件。',
    source: 'legacy',
    characters: ['echoMage', 'abacusFist'],
    startDraw: 1,
  },
  pocketMetronome: {
    id: 'pocketMetronome',
    emoji: '⏱️',
    name: '口袋節拍器',
    blurb: '一回合成功打出第 3 張牌時，抽 1 張',
    adultNote: '要這一回合成功打出第三張牌才抽。念錯的牌不算。',
    source: 'event',
    characters: ['echoMage', 'abacusFist'],
  },
  moonMusicBox: {
    id: 'moonMusicBox',
    emoji: '🌙',
    name: '月光音樂盒',
    blurb: '綁定的那張牌，每場第一次拼對時抽 1 張',
    adultNote: '只認綁定的那一張牌。每場第一次拼對才抽。拿掉那張牌之後就不會再抽。',
    source: 'event',
    characters: ['echoMage', 'abacusFist'],
  },
  rainSoundTube: {
    id: 'rainSoundTube',
    emoji: '🌧️',
    name: '雨聲筒',
    blurb: '怪物行動前，如果沒有護盾，先獲得 2 點護盾',
    adultNote: '怪物行動前，身上沒有護盾才先給 2 點。已經有護盾就不會再加。',
    source: 'event',
    characters: ['echoMage', 'abacusFist'],
  },
  choirRibbon: {
    id: 'choirRibbon',
    emoji: '🎀',
    name: '合唱緞帶',
    blurb: '每贏 3 場戰鬥，回復 5 點生命',
    adultNote: '每贏三場戰鬥回 5 點心。沒打完的戰鬥不算。',
    source: 'event',
    characters: ['echoMage', 'abacusFist'],
  },
  woodBeads: {
    id: 'woodBeads',
    emoji: '📿',
    name: '木珠串',
    blurb: '每次湊十時，對這張牌的目標造成 2 點直傷（無視護盾與易傷）',
    adultNote: '起始遺物。直傷不看護盾，也不乘易傷。沒有活著的怪物就跳過。不能跳過答題。',
    source: 'starter',
    characters: ['abacusFist'],
    onMakeTenDirectDamage: WOOD_BEADS_DIRECT_DAMAGE,
  },
  beadPouch: {
    id: 'beadPouch',
    emoji: '🫘',
    name: '算珠袋',
    blurb: '每場戰鬥開始撥 4 珠',
    adultNote: '這 4 珠自己算一次，不會和湊十訣併成同一撥。不能跳過答題。',
    source: 'pool',
    characters: ['abacusFist'],
    startBeads: BEAD_POUCH_START,
  },
  rulerCharm: {
    id: 'rulerCharm',
    emoji: '📏',
    name: '小尺子',
    blurb: '每回合第 3 招成功時，獲得 3 點護盾',
    adultNote: '要這一回合成功打出第三張牌。念錯不算一招，也不會拿到護盾。',
    source: 'pool',
    characters: ['abacusFist'],
    ordinalCast: RULER_CHARM_CAST,
    ordinalBlock: RULER_CHARM_BLOCK,
  },
  tenBell: {
    id: 'tenBell',
    emoji: '🔔',
    name: '十響鈴',
    blurb: '每場戰鬥第一次湊十時，獲得 1 能量',
    adultNote: '一場只響一次。之後的湊十不再給能量。不能跳過答題。',
    source: 'pool',
    characters: ['abacusFist'],
    firstMakeTenEnergy: TEN_BELL_ENERGY,
  },
  eraser: {
    id: 'eraser',
    emoji: '🧽',
    name: '橡皮擦',
    blurb: '每場戰鬥第一次真正答錯時，撥 2 珠',
    adultNote: '再算一次的第一次答錯不算。法術消散才撥珠，而且一場只有一次。故意答錯仍然少一張牌和能量。',
    source: 'pool',
    characters: ['abacusFist'],
    fizzleBeads: ERASER_BEADS,
  },
};

/** 共鳴武者 chest, elite, boss, and random event rewards, in roll order. */
export const RELIC_POOL_IDS = ['gapThumb', 'trainingWrap', 'tempoWood', 'listeningHeart', 'trainingStance'] as const;

/** 珠算武者 drop pool. 木珠串 is the starter and is not offered here. */
export const ABACUS_RELIC_POOL_IDS = ['beadPouch', 'rulerCharm', 'tenBell', 'eraser'] as const;

export type RelicPoolId = (typeof RELIC_POOL_IDS)[number];

/** Missing or unknown characters keep the 共鳴武者 pool, matching a resumed old save. */
export function relicPoolIdsFor(characterId?: string | null): readonly string[] {
  return characterId === 'abacusFist' ? ABACUS_RELIC_POOL_IDS : RELIC_POOL_IDS;
}

/** Granted by a named event choice. Never offered by the chest roll. */
export const EVENT_RELIC_IDS = [
  'pocketMetronome',
  'moonMusicBox',
  'rainSoundTube',
  'choirRibbon',
] as const;

export function getRelic(id: string): RelicDef {
  const relic = RELICS[id];
  if (!relic) throw new Error(`Unknown relic ${id}`);
  return relic;
}

export function isKnownRelicId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(RELICS, id);
}

/** Uniform pick among the current character's pool relics the run does not already own. */
export function rollRelicDrop(
  ownedIds: readonly string[],
  randomIndex: (exclusiveMax: number) => number,
  characterId?: string | null,
): string | null {
  const owned = new Set(ownedIds);
  const available = relicPoolIdsFor(characterId).filter((id) => !owned.has(id));
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
  startBeads: number;
  makeTenDirectDamage: number;
  rulerCharmCast: number;
  rulerCharmBlock: number;
  firstMakeTenEnergy: number;
  fizzleBeads: number;
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
    startBeads: 0,
    makeTenDirectDamage: 0,
    rulerCharmCast: 0,
    rulerCharmBlock: 0,
    firstMakeTenEnergy: 0,
    fizzleBeads: 0,
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
    mods.startBeads += relic.startBeads ?? 0;
    mods.makeTenDirectDamage += relic.onMakeTenDirectDamage ?? 0;
    mods.rulerCharmBlock += relic.ordinalBlock ?? 0;
    mods.firstMakeTenEnergy += relic.firstMakeTenEnergy ?? 0;
    mods.fizzleBeads += relic.fizzleBeads ?? 0;
    if (relic.ordinalCast) mods.rulerCharmCast = Math.max(mods.rulerCharmCast, relic.ordinalCast);
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
