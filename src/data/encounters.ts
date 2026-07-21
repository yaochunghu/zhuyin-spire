/**
 * Multi-enemy encounter recipes.
 * Prefer tank+fodder or striker+fodder — never dual full strikers in Act I.
 *
 * Map uses ACT_MULTI_ENCOUNTERS + single pools from enemies.ts (one content table).
 */

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
};

/** Weighted multi-enemy packs by act (map ~35% multi). */
export const ACT_MULTI_ENCOUNTERS: Record<1 | 2 | 3, string[]> = {
  1: [
    'slimePair',
    'slimePair',
    'tankFodder',
    'swarmFodder',
    'strikerFodder',
    'heavyFodder',
  ],
  2: ['midPair', 'midStrike', 'fangPair', 'eliteDuo'],
  3: ['latePair', 'lateMix', 'midPair', 'eliteDuo'],
};

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
