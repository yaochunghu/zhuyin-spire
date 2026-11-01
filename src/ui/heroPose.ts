/**
 * Hero pose flashes during combat FX. Swaps the hero img src in place (never
 * remounts combat mid-FX), then returns to the HP still in `data-base-src`.
 */

import { gameplayMs } from '../game/settings';
import type { CardType } from '../data/cards';
import { ART_ASSETS, type ArtAssetKey } from './assets';
import { HERO_POSE_ART, HERO_POSE_MS, type TransientHeroPose } from './damageStage';

const HERO_ART_SELECTOR = '.hero-actor [data-hero-art]';

let poseTimer: number | undefined;
let queuedPose: TransientHeroPose | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function heroPoseForCardType(type: CardType): TransientHeroPose {
  if (type === 'attack') return 'attack';
  if (type === 'block') return 'defend';
  return 'cast';
}

/** Remember the pose for the card just cast; the next FX batch opens with it. */
export function queueHeroPose(pose: TransientHeroPose): void {
  queuedPose = pose;
}

export function takeQueuedHeroPose(): TransientHeroPose | null {
  const pose = queuedPose;
  queuedPose = null;
  return pose;
}

/**
 * Show a pose for ~600ms (scaled by game speed). Skipped under reduced motion,
 * and while the hero is fainted (faint is the held 0 HP still).
 */
export function flashHeroPose(pose: TransientHeroPose, root: ParentNode = document): void {
  if (prefersReducedMotion()) return;
  const wrapper = root.querySelector<HTMLElement>(HERO_ART_SELECTOR);
  const image = wrapper?.querySelector<HTMLImageElement>('img');
  if (!wrapper || !image || wrapper.dataset.heroBase === 'faint') return;

  window.clearTimeout(poseTimer);
  wrapper.dataset.heroPose = pose;
  image.src = ART_ASSETS[HERO_POSE_ART[pose]].src;
  poseTimer = window.setTimeout(() => {
    if (wrapper.dataset.heroPose !== pose) return;
    delete wrapper.dataset.heroPose;
    const base = wrapper.dataset.baseSrc;
    if (base) image.src = base;
  }, gameplayMs(HERO_POSE_MS));
}

const preloaded = new Set<string>();

/** Warm the cache so pose and stage swaps do not flicker. */
export function preloadArt(keys: readonly ArtAssetKey[]): void {
  if (typeof Image === 'undefined') return;
  for (const key of keys) {
    const src = ART_ASSETS[key].src;
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  }
}
