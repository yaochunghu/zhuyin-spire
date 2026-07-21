/**
 * Mid-run save — stable checkpoints only (map / rest / shop / reward / …).
 * Not mid-combat or mid-cast. LocalStorage only.
 */

import type { RunMap } from '../data/map';
import type { RewardTier } from '../data/map';
import type { RunState, Screen, ShopOffer } from './state';

const SAVE_KEY = 'zhuyin-spire-run-v1';
const SAVE_VERSION = 1 as const;

/** Screens we are willing to resume into */
const STABLE_SCREENS: Screen[] = [
  'relicPick',
  'map',
  'rest',
  'removeCard',
  'shop',
  'shopRemove',
  'reward',
  'actClear',
];

export interface RunSnapshotV1 {
  v: typeof SAVE_VERSION;
  screen: Screen;
  heroHp: number;
  heroMaxHp: number;
  deck: string[];
  gold: number;
  relicId: string | null;
  runMap: RunMap;
  actIndex: number;
  currentNodeId: string | null;
  activeNodeId: string | null;
  visitedIds: string[];
  pathIds: string[];
  rewardOptions: string[];
  rewardTier: RewardTier;
  pendingGold: number;
  pendingHeal?: number;
  shopOffers: ShopOffer[];
  shopRemoveUsed?: boolean;
  listenSuccesses: number;
  lastClearedAct: number;
}

function isStableScreen(screen: Screen): boolean {
  return STABLE_SCREENS.includes(screen);
}

export function hasSavedRun(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Partial<RunSnapshotV1>;
    return data?.v === SAVE_VERSION && typeof data.screen === 'string';
  } catch {
    return false;
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Build a checkpoint from current run (ephemeral combat/cast stripped). */
export function snapshotRun(state: RunState): RunSnapshotV1 | null {
  if (!isStableScreen(state.screen)) return null;
  return {
    v: SAVE_VERSION,
    screen: state.screen,
    heroHp: state.heroHp,
    heroMaxHp: state.heroMaxHp,
    deck: [...state.deck],
    gold: state.gold,
    relicId: state.relicId,
    runMap: JSON.parse(JSON.stringify(state.runMap)) as RunMap,
    actIndex: state.actIndex,
    currentNodeId: state.currentNodeId,
    activeNodeId: state.activeNodeId,
    visitedIds: [...state.visitedIds],
    pathIds: [...state.pathIds],
    rewardOptions: [...state.rewardOptions],
    rewardTier: state.rewardTier,
    pendingGold: state.pendingGold,
    pendingHeal: state.pendingHeal,
    shopOffers: state.shopOffers.map((o) => ({ ...o })),
    shopRemoveUsed: state.shopRemoveUsed,
    listenSuccesses: state.listenSuccesses,
    lastClearedAct: state.lastClearedAct,
  };
}

export function saveRunCheckpoint(state: RunState): void {
  const snap = snapshotRun(state);
  if (!snap) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

function validateSnapshot(data: unknown): data is RunSnapshotV1 {
  if (!data || typeof data !== 'object') return false;
  const d = data as RunSnapshotV1;
  if (d.v !== SAVE_VERSION) return false;
  if (!isStableScreen(d.screen)) return false;
  if (!Array.isArray(d.deck) || typeof d.heroHp !== 'number') return false;
  if (!d.runMap || !Array.isArray(d.runMap.acts) || d.runMap.acts.length < 1) return false;
  if (typeof d.actIndex !== 'number' || d.actIndex < 0 || d.actIndex > 2) return false;
  if (!Array.isArray(d.visitedIds) || !Array.isArray(d.pathIds)) return false;
  return true;
}

export function loadSnapshot(): RunSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!validateSnapshot(data)) {
      clearSavedRun();
      return null;
    }
    return data;
  } catch {
    clearSavedRun();
    return null;
  }
}

/** Apply a validated snapshot onto an existing RunState (mutates). */
export function applySnapshot(state: RunState, snap: RunSnapshotV1): void {
  state.screen = snap.screen;
  state.heroHp = snap.heroHp;
  state.heroMaxHp = snap.heroMaxHp;
  state.deck = [...snap.deck];
  state.gold = snap.gold;
  state.relicId = snap.relicId;
  state.runMap = JSON.parse(JSON.stringify(snap.runMap)) as RunMap;
  state.actIndex = snap.actIndex;
  state.currentNodeId = snap.currentNodeId;
  state.activeNodeId = snap.activeNodeId;
  state.visitedIds = [...snap.visitedIds];
  state.pathIds = [...snap.pathIds];
  state.rewardOptions = [...snap.rewardOptions];
  state.rewardTier = snap.rewardTier;
  state.pendingGold = snap.pendingGold;
  state.pendingHeal = snap.pendingHeal ?? 0;
  state.shopOffers = snap.shopOffers.map((o) => ({ ...o }));
  state.shopRemoveUsed = snap.shopRemoveUsed ?? false;
  state.listenSuccesses = snap.listenSuccesses;
  state.lastClearedAct = snap.lastClearedAct;
  // Always clear ephemeral combat / UI juice
  state.combat = null;
  state.cast = null;
  state.flash = null;
  state.floatText = null;
  state.lastCombatFx = [];
  state.practiceStreak = 0;
  state.practiceSessionCorrect = 0;
}

export function resumeSavedRun(state: RunState): boolean {
  const snap = loadSnapshot();
  if (!snap) return false;
  applySnapshot(state, snap);
  return true;
}
