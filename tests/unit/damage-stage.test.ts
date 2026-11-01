import { describe, expect, it } from 'vitest';
import { ART_ASSETS } from '../../src/ui/assets';
import { heroPoseForFx } from '../../src/ui/cardFx';
import {
  HERO_POSE_ART,
  damageStageFor,
  enemyArtKeyForHp,
  enemyStageArtKeys,
  freshArtKeyFor,
  heroBaseArtKey,
  stageArtKeyFor,
} from '../../src/ui/damageStage';
import { heroPoseForCardType } from '../../src/ui/heroPose';

describe('damage stage thresholds (ruling 25A)', () => {
  it.each([
    [100, 'fresh'],
    [67, 'fresh'],
    [66.01, 'fresh'],
    [66, 'scuffed'],
    [50, 'scuffed'],
    [34, 'scuffed'],
    [33.5, 'scuffed'],
    [33, 'beaten'],
    [1, 'beaten'],
    [0, 'beaten'],
  ] as const)('%s%% HP is %s', (pct, stage) => {
    expect(damageStageFor(pct, 100)).toBe(stage);
  });

  it('uses the HP fraction, not raw HP', () => {
    expect(damageStageFor(40, 60)).toBe('fresh'); // 66.67%
    expect(damageStageFor(20, 60)).toBe('scuffed'); // 33.33% is above 33
    expect(damageStageFor(19, 60)).toBe('beaten'); // 31.67%
    expect(damageStageFor(21, 60)).toBe('scuffed'); // 35%
  });

  it('clamps overheal and guards empty or broken HP', () => {
    expect(damageStageFor(150, 100)).toBe('fresh');
    expect(damageStageFor(10, 0)).toBe('beaten');
    expect(damageStageFor(10, -5)).toBe('beaten');
    expect(damageStageFor(-3, 100)).toBe('beaten');
    expect(damageStageFor(Number.NaN, 100)).toBe('beaten');
  });
});

describe('damage-stage art resolver', () => {
  it('gives the hero and every boss key their stage stills', () => {
    expect(stageArtKeyFor('hero', 'fresh')).toBe('heroMartialArtist');
    expect(stageArtKeyFor('hero', 'scuffed')).toBe('heroMartialArtistScuffed');
    expect(stageArtKeyFor('hero', 'beaten')).toBe('heroMartialArtistBeaten');
    for (const [id, n] of [['boss1', 1], ['boss2', 2], ['boss3', 3], ['boss', 1]] as const) {
      expect(stageArtKeyFor(id, 'fresh')).toBe(`enemyBoss${n}`);
      expect(stageArtKeyFor(id, 'scuffed')).toBe(`enemyBoss${n}Scuffed`);
      expect(stageArtKeyFor(id, 'beaten')).toBe(`enemyBoss${n}Beaten`);
    }
    expect(enemyArtKeyForHp('boss2', 50, 100)).toBe('enemyBoss2Scuffed');
    expect(enemyArtKeyForHp('boss3', 10, 100)).toBe('enemyBoss3Beaten');
  });

  it('keeps regular and elite enemies on their single still', () => {
    for (const stage of ['fresh', 'scuffed', 'beaten'] as const) {
      expect(stageArtKeyFor('slime', stage)).toBe('enemySlime');
      expect(stageArtKeyFor('eliteArmor', stage)).toBe('enemyEliteArmor');
    }
    expect(enemyArtKeyForHp('rock', 1, 100)).toBe('enemyRock');
    expect(enemyStageArtKeys('bat')).toEqual(['enemyBat']);
    expect(stageArtKeyFor('not-a-real-enemy', 'beaten')).toBeNull();
  });

  it('resolves the dormant tempoGolem stages and falls back when a stage is missing', () => {
    expect(stageArtKeyFor('tempoGolem', 'scuffed')).toBe('enemyTempoGolemScuffed');
    expect(stageArtKeyFor('tempoGolem', 'beaten')).toBe('enemyTempoGolemBeaten');
    // No fresh TempoGolem idle ships yet, so there is nothing to fall back to.
    expect(freshArtKeyFor('tempoGolem')).toBeNull();
    expect(stageArtKeyFor('tempoGolem', 'fresh')).toBeNull();
  });

  it('holds the faint still at 0 HP and the stage still otherwise', () => {
    expect(heroBaseArtKey(80, 80)).toBe('heroMartialArtist');
    expect(heroBaseArtKey(40, 80)).toBe('heroMartialArtistScuffed');
    expect(heroBaseArtKey(10, 80)).toBe('heroMartialArtistBeaten');
    expect(heroBaseArtKey(0, 80)).toBe('heroMartialArtistFaint');
  });

  it('points every pose at a registered WebP', () => {
    for (const key of Object.values(HERO_POSE_ART)) {
      expect(ART_ASSETS[key].src).toMatch(/hero-martial-artist-[a-z]+\.webp/);
    }
  });
});

describe('hero pose triggers', () => {
  it('maps card types and FX beats to poses', () => {
    expect(heroPoseForCardType('attack')).toBe('attack');
    expect(heroPoseForCardType('block')).toBe('defend');
    expect(heroPoseForCardType('skill')).toBe('cast');
    expect(heroPoseForCardType('power')).toBe('cast');
    expect(heroPoseForFx({ type: 'playerStrike', impacts: [] })).toBe('attack');
    expect(heroPoseForFx({ type: 'playerBlock', amount: 5 })).toBe('defend');
    expect(heroPoseForFx({ type: 'playerTempo', count: 1 })).toBe('cast');
    expect(heroPoseForFx({ type: 'enemyStrike', blockBefore: 0, blocked: 0, damage: 4 })).toBe('hurt');
    expect(heroPoseForFx({ type: 'enemyStrike', blockBefore: 5, blocked: 5, damage: 0 })).toBe('defend');
    expect(heroPoseForFx({ type: 'shuffle', count: 3 })).toBeNull();
  });
});
