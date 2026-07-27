/**
 * Mid-run save — stable checkpoints only (map / rest / shop / reward / …).
 * Not mid-combat or mid-cast. LocalStorage only.
 */

import { CARDS } from '../data/cards';
import { FIRST_CHARACTER_ID, isCharacterId } from '../data/characters';
import { ENCOUNTERS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import {
  CLIMB_ROWS,
  MAP_COLS,
  allStartsReachBoss,
  type ActMap,
  type MapNode,
  type NodeKind,
  type RewardTier,
  type RunMap,
} from '../data/map';
import { RELICS } from '../data/relics';
import type { RunState, Screen, ShopOffer } from './state';
import { getActiveProfileId, isLegacyOwnerProfile } from './profiles';
import {
  cloneDeckCard,
  createDeck,
  isDeckCardV2,
  type DeckCardV2,
} from './cardInstances';

const LEGACY_SAVE_KEY = 'zhuyin-spire-run-v1';
const SAVE_VERSION = 2 as const;
const MAX_SAVE_BYTES = 1_000_000;
const LEGACY_BOSS_ROW = CLIMB_ROWS - 1;

export function activeRunSaveKey(): string {
  return `${LEGACY_SAVE_KEY}:${getActiveProfileId()}`;
}

function readActiveRaw(): string | null {
  const profileRaw = localStorage.getItem(activeRunSaveKey());
  if (profileRaw) return profileRaw;
  return isLegacyOwnerProfile() ? localStorage.getItem(LEGACY_SAVE_KEY) : null;
}

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
  v: 1;
  screen: Screen;
  heroHp: number;
  heroMaxHp: number;
  deck: string[];
  gold: number;
  /** Optional so v1 saves made before characters still load. */
  characterId?: string | null;
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
  /** Optional keeps pre-tutorial saves ineligible without a version migration. */
  tutorialEligibleRun?: boolean;
}

export interface RunSnapshotV2 extends Omit<RunSnapshotV1, 'v' | 'deck'> {
  v: typeof SAVE_VERSION;
  deck: DeckCardV2[];
}

export type RunSnapshot = RunSnapshotV2;

function isStableScreen(screen: Screen): boolean {
  return STABLE_SCREENS.includes(screen);
}

export function hasSavedRun(): boolean {
  try {
    const raw = readActiveRaw();
    if (!raw) return false;
    if (raw.length > MAX_SAVE_BYTES) return false;
    return parseSnapshot(JSON.parse(raw) as unknown) !== null;
  } catch {
    return false;
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(activeRunSaveKey());
    if (isLegacyOwnerProfile()) localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Build a checkpoint from current run (ephemeral combat/cast stripped). */
export function snapshotRun(state: RunState): RunSnapshotV2 | null {
  if (!isStableScreen(state.screen)) return null;
  return {
    v: SAVE_VERSION,
    screen: state.screen,
    heroHp: state.heroHp,
    heroMaxHp: state.heroMaxHp,
    deck: state.deck.map(cloneDeckCard),
    gold: state.gold,
    characterId: state.characterId,
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
    tutorialEligibleRun: state.tutorialEligibleRun,
  };
}

export function saveRunCheckpoint(state: RunState): void {
  const snap = snapshotRun(state);
  if (!snap) return;
  try {
    const serialized = JSON.stringify(snap);
    localStorage.setItem(activeRunSaveKey(), serialized);
    // Keep the original key as a migration mirror for the first profile only.
    if (isLegacyOwnerProfile()) localStorage.setItem(LEGACY_SAVE_KEY, serialized);
  } catch {
    /* quota / private mode */
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIntIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number.isFinite(value) && Number(value) >= min && Number(value) <= max;
}

function isFiniteIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isSafeDisplay(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    Array.from(value).length <= maxLength &&
    !/[<>&"']/.test(value)
  );
}

function isBoundedStringArray(
  value: unknown,
  maxLength: number,
  itemCheck: (item: string) => boolean,
  requireUnique = true,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every((item) => typeof item === 'string' && itemCheck(item)) &&
    (!requireUnique || new Set(value).size === value.length)
  );
}

const NODE_KINDS = new Set<NodeKind>(['fight', 'elite', 'rest', 'shop', 'treasure', 'boss']);
const CAST_STAGES = new Set(['early', 'mid', 'elite', 'boss']);

function isValidMapNode(value: unknown, actNumber: 1 | 2 | 3): value is MapNode {
  if (!isPlainObject(value)) return false;
  const row = value.row;
  const col = value.col;
  if (!isIntIn(row, 0, CLIMB_ROWS) || !isIntIn(col, 0, MAP_COLS - 1)) return false;
  const expectedId = row === CLIMB_ROWS
    ? `a${actNumber}-boss`
    : `a${actNumber}-r${row}-c${col}`;
  if (value.id !== expectedId || value.act !== actNumber) return false;
  if (typeof value.kind !== 'string' || !NODE_KINDS.has(value.kind as NodeKind)) return false;
  if (!isSafeDisplay(value.emoji, 8) || !isSafeDisplay(value.label, 40)) return false;
  if (typeof value.castStage !== 'string' || !CAST_STAGES.has(value.castStage)) return false;
  if (!isBoundedStringArray(value.nextIds, MAP_COLS, (id) => id.length <= 24)) return false;
  if (value.enemyId !== undefined && (typeof value.enemyId !== 'string' || !(value.enemyId in ENEMIES))) return false;
  if (value.encounterId !== undefined && (typeof value.encounterId !== 'string' || !(value.encounterId in ENCOUNTERS))) return false;
  if (value.rewardTier !== undefined && value.rewardTier !== 'normal' && value.rewardTier !== 'elite') return false;
  if (value.goldBonus !== undefined && !isIntIn(value.goldBonus, 0, 10_000)) return false;
  if (value.layoutX !== undefined && !isFiniteIn(value.layoutX, -100, 100)) return false;
  if (value.layoutY !== undefined && !isFiniteIn(value.layoutY, -100, 100)) return false;
  return true;
}

function isValidActMap(value: unknown, actNumber: 1 | 2 | 3): value is ActMap {
  if (!isPlainObject(value)) return false;
  if (value.act !== actNumber || value.cols !== MAP_COLS || value.maxRow !== CLIMB_ROWS) return false;
  if (!isSafeDisplay(value.title, 40) || !isSafeDisplay(value.emoji, 8)) return false;
  if (!Array.isArray(value.nodes) || value.nodes.length < 2 || value.nodes.length > 100) return false;
  if (!value.nodes.every((node) => isValidMapNode(node, actNumber))) return false;
  const nodes = value.nodes as MapNode[];
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) return false;
  const bossId = `a${actNumber}-boss`;
  if (value.bossId !== bossId || !ids.has(bossId)) return false;
  if (!isBoundedStringArray(value.startIds, MAP_COLS, (id) => ids.has(id))) return false;
  if (!(value.startIds as string[]).every((id) => nodes.find((node) => node.id === id)?.row === 0)) return false;
  for (const node of nodes) {
    for (const nextId of node.nextIds) {
      const next = nodes.find((candidate) => candidate.id === nextId);
      if (!next || next.row !== node.row + 1) return false;
    }
    if (node.row === CLIMB_ROWS && node.nextIds.length > 0) return false;
  }
  return allStartsReachBoss(value as unknown as ActMap);
}

function isValidRunMap(value: unknown): value is RunMap {
  if (!isPlainObject(value) || !Array.isArray(value.acts) || value.acts.length !== 3) return false;
  return (
    isValidActMap(value.acts[0], 1) &&
    isValidActMap(value.acts[1], 2) &&
    isValidActMap(value.acts[2], 3)
  );
}

function isValidShopOffer(value: unknown): value is ShopOffer {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.cardId === 'string' &&
    value.cardId in CARDS &&
    isIntIn(value.price, 0, 100_000) &&
    typeof value.sold === 'boolean'
  );
}

function hasValidSnapshotBody(data: Record<string, unknown>): boolean {
  if (typeof data.screen !== 'string' || !isStableScreen(data.screen as Screen)) return false;
  if (!isIntIn(data.heroMaxHp, 1, 999) || !isIntIn(data.heroHp, 0, data.heroMaxHp)) return false;
  if (!isIntIn(data.gold, 0, 999_999)) return false;
  if (data.characterId !== undefined && data.characterId !== null && !isCharacterId(data.characterId)) return false;
  if (data.relicId !== null && (typeof data.relicId !== 'string' || !(data.relicId in RELICS))) return false;
  if (!isValidRunMap(data.runMap)) return false;
  if (!isIntIn(data.actIndex, 0, 2)) return false;
  const mapIds = new Set(data.runMap.acts.flatMap((act) => act.nodes.map((node) => node.id)));
  const nullableMapId = (value: unknown) => value === null || (typeof value === 'string' && mapIds.has(value));
  if (!nullableMapId(data.currentNodeId) || !nullableMapId(data.activeNodeId)) return false;
  if (!isBoundedStringArray(data.visitedIds, 100, (id) => mapIds.has(id))) return false;
  if (!isBoundedStringArray(data.pathIds, 100, (id) => mapIds.has(id))) return false;
  if (!isBoundedStringArray(data.rewardOptions, 3, (id) => id in CARDS)) return false;
  if (data.rewardTier !== 'normal' && data.rewardTier !== 'elite') return false;
  if (!isIntIn(data.pendingGold, 0, 999_999)) return false;
  if (data.pendingHeal !== undefined && !isIntIn(data.pendingHeal, 0, data.heroMaxHp)) return false;
  if (!Array.isArray(data.shopOffers) || data.shopOffers.length > 10 || !data.shopOffers.every(isValidShopOffer)) return false;
  if (data.shopRemoveUsed !== undefined && typeof data.shopRemoveUsed !== 'boolean') return false;
  if (!isIntIn(data.listenSuccesses, 0, 1_000_000)) return false;
  if (!isIntIn(data.lastClearedAct, 0, 3)) return false;
  if (data.tutorialEligibleRun !== undefined && typeof data.tutorialEligibleRun !== 'boolean') return false;
  return true;
}

function isValidSnapshotV1(data: unknown): data is RunSnapshotV1 {
  if (!isPlainObject(data)) return false;
  if (data.v !== 1 || !hasValidSnapshotBody(data)) return false;
  if (!isBoundedStringArray(data.deck, 200, (id) => id in CARDS, false)) return false;
  return true;
}

function isValidSnapshotV2(data: unknown): data is RunSnapshotV2 {
  if (!isPlainObject(data)) return false;
  if (data.v !== SAVE_VERSION || !hasValidSnapshotBody(data)) return false;
  if (!Array.isArray(data.deck) || data.deck.length > 200 || !data.deck.every(isDeckCardV2)) {
    return false;
  }
  const deck = data.deck as DeckCardV2[];
  if (new Set(deck.map((card) => card.uid)).size !== deck.length) return false;
  return deck.every((card) => {
    const def = CARDS[card.defId];
    if (!def) return false;
    return card.upgradeLevel === 0 || (card.upgradeLevel === 1 && !!def.upgrade);
  });
}

function migrateSnapshotV1(snapshot: RunSnapshotV1): RunSnapshotV2 {
  return {
    ...snapshot,
    v: SAVE_VERSION,
    deck: createDeck(snapshot.deck),
  };
}

/**
 * Preserve valid saves made when the boss occupied row 14 by inserting the
 * guaranteed pre-boss Rest layer and moving the boss to row 15.
 */
function migrateLegacyMapFloors(data: unknown): unknown {
  if (!isPlainObject(data) || data.v !== SAVE_VERSION || !isPlainObject(data.runMap)) {
    return data;
  }
  const acts = data.runMap.acts;
  if (!Array.isArray(acts)) return data;
  if (acts.every((act) => isPlainObject(act) && act.maxRow === CLIMB_ROWS)) return data;
  if (!acts.every((act) => isPlainObject(act) && act.maxRow === LEGACY_BOSS_ROW)) return data;

  let migrated: Record<string, unknown>;
  try {
    migrated = structuredClone(data);
  } catch {
    return null;
  }
  const runMap = migrated.runMap;
  if (!isPlainObject(runMap) || !Array.isArray(runMap.acts)) return null;

  for (const rawAct of runMap.acts) {
    if (!isPlainObject(rawAct) || !Array.isArray(rawAct.nodes)) return null;
    if (!isIntIn(rawAct.act, 1, 3) || typeof rawAct.bossId !== 'string') return null;
    const boss = rawAct.nodes.find(
      (node) => isPlainObject(node) && node.id === rawAct.bossId && node.row === LEGACY_BOSS_ROW,
    );
    if (!isPlainObject(boss)) return null;
    const preBossNodes = rawAct.nodes.filter(
      (node) =>
        isPlainObject(node) &&
        node.row === LEGACY_BOSS_ROW - 1 &&
        Array.isArray(node.nextIds) &&
        node.nextIds.includes(rawAct.bossId),
    );
    if (preBossNodes.length === 0) return null;

    boss.row = CLIMB_ROWS;
    for (const preBoss of preBossNodes) {
      if (
        !isIntIn(preBoss.col, 0, MAP_COLS - 1) ||
        !Array.isArray(preBoss.nextIds) ||
        !preBoss.nextIds.every((id: unknown) => typeof id === 'string')
      ) return null;
      const restId = `a${rawAct.act}-r${LEGACY_BOSS_ROW}-c${preBoss.col}`;
      preBoss.nextIds = [...new Set((preBoss.nextIds as string[]).map((id) =>
        id === rawAct.bossId ? restId : id,
      ))];
      rawAct.nodes.push({
        id: restId,
        act: rawAct.act,
        row: LEGACY_BOSS_ROW,
        col: preBoss.col,
        kind: 'rest',
        emoji: '🔥',
        label: '營火',
        castStage: boss.castStage,
        nextIds: [rawAct.bossId],
        layoutX: preBoss.layoutX,
        layoutY: 0,
      });
    }
    rawAct.maxRow = CLIMB_ROWS;
  }
  return migrated;
}

export function parseSnapshot(data: unknown): RunSnapshotV2 | null {
  const migrated = migrateLegacyMapFloors(data);
  if (isValidSnapshotV2(migrated)) {
    return { ...migrated, deck: migrated.deck.map(cloneDeckCard) };
  }
  return isValidSnapshotV1(migrated) ? migrateSnapshotV1(migrated) : null;
}

export function loadSnapshot(): RunSnapshotV2 | null {
  try {
    const raw = readActiveRaw();
    if (!raw) return null;
    if (raw.length > MAX_SAVE_BYTES) {
      clearSavedRun();
      return null;
    }
    const source = JSON.parse(raw) as unknown;
    const data = parseSnapshot(source);
    if (!data) {
      clearSavedRun();
      return null;
    }
    if (isPlainObject(source) && source.v === 1) {
      const serialized = JSON.stringify(data);
      localStorage.setItem(activeRunSaveKey(), serialized);
      if (isLegacyOwnerProfile()) localStorage.setItem(LEGACY_SAVE_KEY, serialized);
    }
    return data;
  } catch {
    clearSavedRun();
    return null;
  }
}

/** Apply a validated snapshot onto an existing RunState (mutates). */
export function applySnapshot(state: RunState, snap: RunSnapshotV2): void {
  state.screen = snap.screen;
  state.heroHp = snap.heroHp;
  state.heroMaxHp = snap.heroMaxHp;
  state.deck = snap.deck.map(cloneDeckCard);
  state.gold = snap.gold;
  state.characterId = isCharacterId(snap.characterId)
    ? snap.characterId
    : snap.screen === 'relicPick'
      ? null
      : FIRST_CHARACTER_ID;
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
  state.tutorial = null;
  state.tutorialEligibleRun = snap.tutorialEligibleRun ?? false;
}

export function resumeSavedRun(state: RunState): boolean {
  const snap = loadSnapshot();
  if (!snap) return false;
  applySnapshot(state, snap);
  return true;
}
