import { describe, expect, it } from 'vitest';
import {
  ART_ASSETS,
  ENEMY_ART_BY_DEF_ID,
  RELIC_ART,
  REQUIRED_ART_ASSET_KEYS,
  actTransitionArtKeyFor,
  enemyArtKeyFor,
  visualThemeFor,
} from '../../src/ui/assets';
import { ENEMIES } from '../../src/data/enemies';
import { RELICS } from '../../src/data/relics';

describe('magical toy-board art registry', () => {
  it('defines a local WebP source, fallback, and accessible label for every required asset', () => {
    expect(REQUIRED_ART_ASSET_KEYS).toHaveLength(49);
    expect(REQUIRED_ART_ASSET_KEYS).not.toContain('propStar');
    expect(new Set(REQUIRED_ART_ASSET_KEYS).size).toBe(
      REQUIRED_ART_ASSET_KEYS.length,
    );

    for (const key of REQUIRED_ART_ASSET_KEYS) {
      const asset = ART_ASSETS[key];
      expect(asset.src).toMatch(/\.webp(?:$|\?)/);
      expect(asset.fallback.trim().length).toBeGreaterThan(0);
      expect(asset.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it('maps the current run to one continuous three-section tower', () => {
    expect(visualThemeFor('map', 0)).toBe('garden');
    expect(visualThemeFor('combat', 1)).toBe('library');
    expect(visualThemeFor('reward', 2)).toBe('observatory');
    expect(visualThemeFor('victory', 0)).toBe('observatory');
  });

  it('keeps non-run learning and selection screens in the shared foyer', () => {
    expect(visualThemeFor('title', 2)).toBe('foyer');
    expect(visualThemeFor('relicPick', 1)).toBe('foyer');
    expect(visualThemeFor('practice', 0)).toBe('foyer');
  });

  it('resolves every enemy definition to a complete local-art registry entry', () => {
    expect(Object.keys(ENEMY_ART_BY_DEF_ID).sort()).toEqual(
      Object.keys(ENEMIES).sort(),
    );
    for (const enemyDefId of Object.keys(ENEMIES)) {
      const artKey = enemyArtKeyFor(enemyDefId);
      expect(artKey).not.toBeNull();
      expect(ART_ASSETS[artKey!]).toBeDefined();
      expect(ART_ASSETS[artKey!].fallback.trim().length).toBeGreaterThan(0);
    }
    expect(enemyArtKeyFor('not-a-real-enemy')).toBeNull();
  });

  it('shares slime art intentionally and maps the deprecated boss alias to boss1', () => {
    expect(enemyArtKeyFor('tutorialSlime')).toBe('enemySlime');
    expect(enemyArtKeyFor('slimeWeak')).toBe('enemySlime');
    expect(enemyArtKeyFor('slime')).toBe('enemySlime');
    expect(enemyArtKeyFor('boss')).toBe('enemyBoss1');
    expect(enemyArtKeyFor('boss1')).toBe('enemyBoss1');
  });

  it('paints the shipped relic icons and leaves the four legacy relics on emoji', () => {
    const painted = [
      'tuningFork',
      'gapThumb',
      'trainingWrap',
      'tempoWood',
      'listeningHeart',
      'trainingStance',
      'woodBeads',
      'beadPouch',
      'rulerCharm',
      'tenBell',
      'eraser',
      'pocketMetronome',
      'moonMusicBox',
      'rainSoundTube',
      'choirRibbon',
    ] as const;
    const legacy = ['shieldCharm', 'coinPouch', 'morningSpark', 'luckyDraw'] as const;

    expect(Object.keys(RELIC_ART).sort()).toEqual([...painted].sort());
    for (const id of painted) {
      const relic = RELICS[id];
      const asset = RELIC_ART[id];
      const file = id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      expect(relic.source).not.toBe('legacy');
      expect(asset.src).toMatch(new RegExp(`relic-${file}\\.webp(?:$|\\?)`));
      expect(asset.fallback).toBe(relic.emoji);
      expect(asset.alt).toBe(relic.name);
    }
    for (const id of legacy) {
      expect(RELICS[id].source).toBe('legacy');
      expect(Object.hasOwn(RELIC_ART, id)).toBe(false);
    }
  });

  it('selects the two controlled cross-act backdrops', () => {
    expect(actTransitionArtKeyFor(1)).toBe('transitionGardenLibrary');
    expect(actTransitionArtKeyFor(2)).toBe(
      'transitionLibraryObservatory',
    );
    expect(actTransitionArtKeyFor(3)).toBeNull();
  });
});
