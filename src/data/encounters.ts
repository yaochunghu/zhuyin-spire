/**
 * Multi-enemy encounter recipes.
 * Prefer tank+fodder, buffer+tank, or listener+fodder — never dual full strikers in Act I.
 *
 * Map generation asks pickNormalFight / pickEliteFight so easy fights come first
 * and the same recipe does not sit on the next two fights of a path.
 */

import {
  ACT_EASY_SOLOS,
  ACT_ELITE_POOL,
  ACT_HARD_SOLOS,
} from './enemies';

export interface EncounterDef {
  id: string;
  /** Enemy def ids (1–3). Spawned left→right. */
  enemyDefIds: string[];
  label?: string;
  /** Design recipe for adults / future tooling */
  recipe?: string;
  act?: 1 | 2 | 3;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  // Act I teaching packs
  slimePair: {
    id: 'slimePair',
    enemyDefIds: ['slimeWeak', 'slimeWeak'],
    label: '史萊姆雙人組',
    recipe: 'fodder + fodder',
    act: 1,
  },
  tankFodder: {
    id: 'tankFodder',
    enemyDefIds: ['rock', 'slimeWeak'],
    label: '石怪小隊',
    recipe: 'tank + fodder',
    act: 1,
  },
  swarmFodder: {
    id: 'swarmFodder',
    enemyDefIds: ['bat', 'slimeWeak'],
    label: '蝠與黏液',
    recipe: 'swarm + fodder',
    act: 1,
  },
  strikerFodder: {
    id: 'strikerFodder',
    enemyDefIds: ['fangSoft', 'slimeWeak'],
    label: '尖牙前哨',
    recipe: 'striker + fodder',
    act: 1,
  },
  heavyFodder: {
    id: 'heavyFodder',
    enemyDefIds: ['ember', 'slimeWeak'],
    label: '火苗雙人',
    recipe: 'heavy + fodder',
    act: 1,
  },
  slimeTriple: {
    id: 'slimeTriple',
    enemyDefIds: ['slimeWeak', 'slimeWeak', 'slimeWeak'],
    label: '史萊姆小隊',
    recipe: 'fodder ×3 (rare)',
    act: 1,
  },
  // Legacy ids (map / saves) → soft packs
  fangPair: {
    id: 'fangPair',
    enemyDefIds: ['fangSoft', 'slimeWeak'],
    label: '尖牙搭檔',
    recipe: 'striker + fodder',
    act: 1,
  },
  earlyMix: {
    id: 'earlyMix',
    enemyDefIds: ['bat', 'slimeWeak'],
    label: '混合前哨',
    recipe: 'swarm + fodder',
    act: 1,
  },
  eliteDuo: {
    id: 'eliteDuo',
    enemyDefIds: ['eliteBee', 'slimeWeak'],
    label: '菁英雙人',
    recipe: 'elite + fodder',
    act: 1,
  },
  // Act II+
  midPair: {
    id: 'midPair',
    enemyDefIds: ['armor', 'toad'],
    label: '中層雙怪',
    recipe: 'tank + swarm',
    act: 2,
  },
  midStrike: {
    id: 'midStrike',
    enemyDefIds: ['spike', 'slime'],
    label: '刺與黏',
    recipe: 'striker + fodder',
    act: 2,
  },
  latePair: {
    id: 'latePair',
    enemyDefIds: ['crystal', 'owl'],
    label: '塔影雙怪',
    recipe: 'tank + heavy',
    act: 3,
  },
  lateMix: {
    id: 'lateMix',
    enemyDefIds: ['wraith', 'toad'],
    label: '影與蛙',
    recipe: 'striker + swarm',
    act: 3,
  },
  drumSquad: {
    id: 'drumSquad',
    enemyDefIds: ['drumlet', 'rock'],
    label: '鼓手與石怪',
    recipe: 'buffer + tank',
    act: 1,
  },
  echoPair: {
    id: 'echoPair',
    enemyDefIds: ['echoBug', 'slimeWeak'],
    label: '跟讀與史萊姆',
    recipe: 'listener + fodder',
    act: 1,
  },
  a2_armor_moth: {
    id: 'a2_armor_moth',
    enemyDefIds: ['armor', 'bellMoth'],
    label: '盔甲與鐘蛾',
    recipe: 'tank + listener',
    act: 2,
  },
  a2_drum_toad: {
    id: 'a2_drum_toad',
    enemyDefIds: ['dustDrum', 'toad'],
    label: '塵鼓與毒蛙',
    recipe: 'scaling + swarm',
    act: 2,
  },
  a3_crown_mirror: {
    id: 'a3_crown_mirror',
    enemyDefIds: ['crownBell', 'mirrorNote'],
    label: '冠鐘與鏡音',
    recipe: 'scaling + listener',
    act: 3,
  },
  a3_crystal_mirror: {
    id: 'a3_crystal_mirror',
    enemyDefIds: ['crystal', 'mirrorNote'],
    label: '晶盾與鏡音',
    recipe: 'tank + listener',
    act: 3,
  },
};

/** Easy multis. Act I's first fight stays a solo; the pair can appear after that. */
export const ACT_EASY_MULTIS: Record<1 | 2 | 3, string[]> = {
  1: ['slimePair'],
  2: [],
  3: [],
};

/** Hard multis. Legacy fangPair, earlyMix, eliteDuo, and midStrike stay loadable but are not rolled. */
export const ACT_HARD_MULTIS: Record<1 | 2 | 3, string[]> = {
  1: ['tankFodder', 'swarmFodder', 'strikerFodder', 'heavyFodder', 'drumSquad', 'echoPair'],
  2: ['midPair', 'a2_armor_moth', 'a2_drum_toad'],
  3: ['latePair', 'lateMix', 'a3_crown_mirror', 'a3_crystal_mirror'],
};

/** Generated multis, easy then hard. slimeTriple is a rare Act I hard extra. */
export const ACT_MULTI_ENCOUNTERS: Record<1 | 2 | 3, string[]> = {
  1: [...ACT_EASY_MULTIS[1], ...ACT_HARD_MULTIS[1], 'slimeTriple'],
  2: [...ACT_EASY_MULTIS[2], ...ACT_HARD_MULTIS[2]],
  3: [...ACT_EASY_MULTIS[3], ...ACT_HARD_MULTIS[3]],
};

/** Completed normal fights before an act leaves its easy pool. */
export const EASY_NORMAL_QUOTA: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 2,
  3: 2,
};

export interface FightPick {
  enemyId?: string;
  encounterId?: string;
  key: string;
}

function filterRecent(pool: readonly string[], recentOldestFirst: readonly string[]): string[] {
  let blocked = [...recentOldestFirst];
  while (true) {
    const open = pool.filter((id) => !blocked.includes(id));
    if (open.length > 0 || blocked.length === 0) return open.length > 0 ? open : [...pool];
    blocked = blocked.slice(1);
  }
}

function pickKey(pool: readonly string[], rng: () => number): string {
  return pool[Math.floor(rng() * pool.length)]!;
}

/**
 * Easy fights fill the opening quota. Hard fights are about 40% multi.
 * `recentKeysOldestFirst` holds up to two earlier normal-fight keys.
 * The first Act I fight is always a solo.
 */
export function pickNormalFight(
  act: 1 | 2 | 3,
  priorNormalFights: number,
  recentKeysOldestFirst: readonly string[],
  rng: () => number,
  allowTriple = false,
): FightPick {
  const easy = priorNormalFights < EASY_NORMAL_QUOTA[act];
  if (
    !easy &&
    act === 1 &&
    allowTriple &&
    rng() < 0.08 &&
    !recentKeysOldestFirst.includes('slimeTriple')
  ) {
    return { encounterId: 'slimeTriple', key: 'slimeTriple' };
  }
  const solos = easy ? ACT_EASY_SOLOS[act] : ACT_HARD_SOLOS[act];
  const multis = easy
    ? (priorNormalFights === 0 ? [] : ACT_EASY_MULTIS[act])
    : ACT_HARD_MULTIS[act];
  const multiChance = multis.length === 0 ? 0 : easy ? 0.25 : 0.4;
  const useMulti = rng() < multiChance;
  const key = pickKey(filterRecent(useMulti ? multis : solos, recentKeysOldestFirst), rng);
  return useMulti ? { encounterId: key, key } : { enemyId: key, key };
}

/** The nearest earlier elite is excluded. A one-elite pool can still repeat. */
export function pickEliteFight(
  act: 1 | 2 | 3,
  recentEliteKeysOldestFirst: readonly string[],
  rng: () => number,
): FightPick {
  const key = pickKey(filterRecent(ACT_ELITE_POOL[act], recentEliteKeysOldestFirst), rng);
  return { enemyId: key, key };
}

export function isEasyFightKey(act: 1 | 2 | 3, key: string): boolean {
  return ACT_EASY_SOLOS[act].includes(key) || ACT_EASY_MULTIS[act].includes(key);
}

/** @deprecated use ACT_MULTI_ENCOUNTERS */
export const ACT_FIGHT_ENCOUNTERS = ACT_MULTI_ENCOUNTERS;

export function getEncounter(id: string): EncounterDef | null {
  return ENCOUNTERS[id] ?? null;
}

export function resolveEnemyDefIds(
  enemyId?: string,
  encounterId?: string,
): string[] {
  if (encounterId) {
    const enc = ENCOUNTERS[encounterId];
    if (enc) return [...enc.enemyDefIds];
  }
  if (enemyId) return [enemyId];
  return ['slime'];
}
