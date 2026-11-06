/**
 * Damage-stage and pose art for the hero and bosses (ruling 25A).
 *
 * Pure lookups only; the DOM swap lives in `heroPose.ts`. Regular and elite
 * enemies keep their single still. See docs/ART_INVENTORY.md.
 */

import { enemyArtKeyFor, type ArtAssetKey } from './assets';

export type DamageStage = 'fresh' | 'scuffed' | 'beaten';

/**
 * HP percent → stage. fresh above 66%, scuffed above 33% up to 66% inclusive,
 * beaten at 33% or below. Fractions between 33 and 34 count as scuffed
 * (33.5 → scuffed, 33 → beaten); 66 → scuffed, 66.01 → fresh. HP is clamped
 * to max; maxHp <= 0 or hp <= 0 is beaten.
 */
export function damageStageFor(hp: number, maxHp: number): DamageStage {
  if (!(maxHp > 0) || !(hp > 0)) return 'beaten';
  const pct = (Math.min(hp, maxHp) / maxHp) * 100;
  if (pct > 66) return 'fresh';
  if (pct > 33) return 'scuffed';
  return 'beaten';
}

/** Actors with damage-stage art. `boss` is the deprecated alias of boss1. */
export type StagedActorKey = 'hero' | 'abacusFist' | 'boss1' | 'boss2' | 'boss3' | 'boss' | 'tempoGolem';

type StageArt = Partial<Record<DamageStage, ArtAssetKey>>;

const STAGE_ART: Record<StagedActorKey, StageArt> = {
  hero: {
    fresh: 'heroMartialArtist',
    scuffed: 'heroMartialArtistScuffed',
    beaten: 'heroMartialArtistBeaten',
  },
  abacusFist: {
    fresh: 'heroBeadFighter',
    scuffed: 'heroBeadFighterScuffed',
    beaten: 'heroBeadFighterBeaten',
  },
  boss1: { fresh: 'enemyBoss1', scuffed: 'enemyBoss1Scuffed', beaten: 'enemyBoss1Beaten' },
  boss2: { fresh: 'enemyBoss2', scuffed: 'enemyBoss2Scuffed', beaten: 'enemyBoss2Beaten' },
  boss3: { fresh: 'enemyBoss3', scuffed: 'enemyBoss3Scuffed', beaten: 'enemyBoss3Beaten' },
  boss: { fresh: 'enemyBoss1', scuffed: 'enemyBoss1Scuffed', beaten: 'enemyBoss1Beaten' },
  // Dormant until a TempoGolem boss and its fresh idle land: no fresh still yet.
  tempoGolem: { scuffed: 'enemyTempoGolemScuffed', beaten: 'enemyTempoGolemBeaten' },
};

export function isStagedActor(key: string): key is StagedActorKey {
  return Object.prototype.hasOwnProperty.call(STAGE_ART, key);
}

/** The fresh still for an actor or enemy def id, or null when none exists. */
export function freshArtKeyFor(actorKey: string): ArtAssetKey | null {
  if (isStagedActor(actorKey)) return STAGE_ART[actorKey].fresh ?? null;
  return enemyArtKeyFor(actorKey);
}

/**
 * (actor, stage) → art. Hero and bosses get their stage still; everything
 * else, and any stage without art, falls back to the fresh still.
 */
export function stageArtKeyFor(actorKey: string, stage: DamageStage): ArtAssetKey | null {
  if (isStagedActor(actorKey)) {
    return STAGE_ART[actorKey][stage] ?? freshArtKeyFor(actorKey);
  }
  return freshArtKeyFor(actorKey);
}

/** Enemy portrait for the current HP. Non-boss enemies always get their one still. */
export function enemyArtKeyForHp(enemyDefId: string, hp: number, maxHp: number): ArtAssetKey | null {
  return stageArtKeyFor(enemyDefId, damageStageFor(hp, maxHp));
}

export type HeroPose = 'attack' | 'cast' | 'defend' | 'hurt' | 'faint';
/** Poses that flash and then return to the HP still. Faint is held instead. */
export type TransientHeroPose = Exclude<HeroPose, 'faint'>;

export const HERO_POSE_ART: Record<HeroPose, ArtAssetKey> = {
  attack: 'heroMartialArtistAttack',
  cast: 'heroMartialArtistCast',
  defend: 'heroMartialArtistDefend',
  hurt: 'heroMartialArtistHurt',
  faint: 'heroMartialArtistFaint',
};

/** How long a transient pose shows before the HP still returns (before speed scaling). */
export const HERO_POSE_MS = 600;

/** Resting hero still: HP stage, or faint at 0 HP when that hero has a faint pose. */
export function heroBaseArtKey(hp: number, maxHp: number, characterId?: string | null): ArtAssetKey {
  if (characterId === 'abacusFist') {
    return stageArtKeyFor('abacusFist', damageStageFor(hp, maxHp)) ?? 'heroBeadFighter';
  }
  if (!(hp > 0)) return HERO_POSE_ART.faint;
  return stageArtKeyFor('hero', damageStageFor(hp, maxHp)) ?? 'heroMartialArtist';
}

/** Heroes without pose frames keep their current damage-stage still. */
export function heroPoseArtKey(pose: HeroPose, baseKey: ArtAssetKey, characterId?: string | null): ArtAssetKey {
  return characterId === 'abacusFist' ? baseKey : HERO_POSE_ART[pose];
}

/** Every still the selected hero can show in a fight, for preloading. */
export function heroCombatArtKeys(characterId?: string | null): ArtAssetKey[] {
  if (characterId === 'abacusFist') return Object.values(STAGE_ART.abacusFist);
  const keys = Object.values(STAGE_ART.hero);
  return [...new Set([...keys, ...Object.values(HERO_POSE_ART)])];
}

/** Every stage still for one enemy def id (just the fresh one for non-bosses). */
export function enemyStageArtKeys(enemyDefId: string): ArtAssetKey[] {
  const keys = (['fresh', 'scuffed', 'beaten'] as const)
    .map((stage) => stageArtKeyFor(enemyDefId, stage))
    .filter((key): key is ArtAssetKey => key !== null);
  return [...new Set(keys)];
}
