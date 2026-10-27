/**
 * Mid-run save — stable checkpoints only (map / rest / shop / reward / …).
 * Not mid-combat or mid-cast. LocalStorage only.
 */

import { CARDS, isCardId } from '../data/cards';
import { CURSES } from '../data/curses';
import { EVENTS } from '../data/events';
import {
  FIRST_CHARACTER_ID,
  getPlayableCharacter,
  isPlayableCharacterId,
} from '../data/characters';
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
import { isKnownRelicId, RELICS } from '../data/relics';
import type { RunState, Screen, ShopOffer } from './state';
import {
  isDeckCard,
  nextCardUid,
  type CardOffer,
  type DeckCard,
} from './cardInstances';
import { createRunScoreStats, type RunScoreStats } from './progression';
import { getActiveProfileId, isLegacyOwnerProfile } from './profiles';
import { createEventTrack, type EventTrack } from './eventEngine';

const LEGACY_SAVE_KEY = 'zhuyin-spire-run-v1';
const SAVE_VERSION_V2 = 2 as const;
const SAVE_VERSION = 3 as const;
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
  'smith',
  'removeCard',
  'shop',
  'shopRemove',
  'reward',
  'actClear',
  'event',
  'eventCast',
];

export interface RunSnapshot {
  v: typeof SAVE_VERSION;
  screen: Screen;
  heroHp: number;
  heroMaxHp: number;
  deck: DeckCard[];
  nextCardUid: number;
  gold: number;
  /** Optional so v1 saves made before characters still load. */
  characterId?: string | null;
  /** Acquisition order. v1 and v2 stored this as a single relicId. */
  relicIds: string[];
  pendingRelicId?: string | null;
  /** Optional so checkpoints saved before treasure headers still load. */
  rewardSource?: 'fight' | 'treasure' | null;
  /** Absent on saves made before events. */
  eventTrack?: EventTrack;
  runMap: RunMap;
  actIndex: number;
  currentNodeId: string | null;
  activeNodeId: string | null;
  visitedIds: string[];
  pathIds: string[];
  rewardOptions: CardOffer[];
  rewardTier: RewardTier;
  pendingGold: number;
  pendingHeal?: number;
  shopOffers: ShopOffer[];
  shopRemoveUsed?: boolean;
  listenSuccesses: number;
  lastClearedAct: number;
  /** Optional keeps pre-tutorial saves ineligible without a version migration. */
  tutorialEligibleRun?: boolean;
  scoreStats?: RunScoreStats;
  scoreCommitted?: boolean;
}

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
export function snapshotRun(state: RunState): RunSnapshot | null {
  if (!isStableScreen(state.screen)) return null;
  return {
    v: SAVE_VERSION,
    screen: state.screen,
    heroHp: state.heroHp,
    heroMaxHp: state.heroMaxHp,
    deck: state.deck.map((card) => ({ ...card })),
    nextCardUid: state.nextCardUid,
    gold: state.gold,
    characterId: state.characterId,
    relicIds: [...state.relicIds],
    pendingRelicId: state.pendingRelicId,
    rewardSource: state.rewardSource,
    eventTrack: JSON.parse(JSON.stringify(state.eventTrack)) as EventTrack,
    runMap: JSON.parse(JSON.stringify(state.runMap)) as RunMap,
    actIndex: state.actIndex,
    currentNodeId: state.currentNodeId,
    activeNodeId: state.activeNodeId,
    visitedIds: [...state.visitedIds],
    pathIds: [...state.pathIds],
    rewardOptions: state.rewardOptions.map((card) => ({ ...card })),
    rewardTier: state.rewardTier,
    pendingGold: state.pendingGold,
    pendingHeal: state.pendingHeal,
    shopOffers: state.shopOffers.map((o) => ({ ...o })),
    shopRemoveUsed: state.shopRemoveUsed,
    listenSuccesses: state.listenSuccesses,
    lastClearedAct: state.lastClearedAct,
    tutorialEligibleRun: state.tutorialEligibleRun,
    scoreStats: { ...state.scoreStats },
    scoreCommitted: state.scoreCommitted,
  };
}

export type SaveStatus = 'idle' | 'saved' | 'unavailable';
let saveStatus: SaveStatus = 'idle';
export function getSaveStatus(): SaveStatus { return saveStatus; }
function publishSaveStatus(status: SaveStatus): void {
  if (saveStatus === status) return;
  saveStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zhuyin-save-status', { detail: status }));
  }
}

export function saveRunCheckpoint(state: RunState): void {
  const snap = snapshotRun(state);
  if (!snap) return;
  try {
    const serialized = JSON.stringify(snap);
    localStorage.setItem(activeRunSaveKey(), serialized);
    // Keep the original key as a migration mirror for the first profile only.
    if (isLegacyOwnerProfile()) localStorage.setItem(LEGACY_SAVE_KEY, serialized);
    publishSaveStatus('saved');
  } catch {
    publishSaveStatus('unavailable');
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

const NODE_KINDS = new Set<NodeKind>(['fight', 'elite', 'rest', 'shop', 'treasure', 'unknown', 'boss']);
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
    isDeckCard(value) &&
    value.defId in CARDS &&
    isIntIn(value.price, 0, 100_000) &&
    typeof value.sold === 'boolean'
  );
}

function isValidCardInstance(value: unknown): value is DeckCard {
  return isDeckCard(value) && isCardId(value.defId);
}

function isValidCardOffer(value: unknown): value is CardOffer {
  return isValidCardInstance(value);
}

const EVENT_IDS = new Set(EVENTS.map((event) => event.id));
const EVENT_PHASES = new Set(['choose', 'confirm', 'pick', 'offer', 'shrine', 'result', 'fight']);
const EFFECT_OPS = new Set([
  'loseHp', 'heal', 'healFull', 'healMissingPercent', 'gainMaxHp', 'loseMaxHp',
  'gainGold', 'payGold', 'upgrade', 'upgradePair', 'remove', 'transform', 'gainCard',
  'copy', 'gainRelic', 'gainRandomRelic', 'gainCurse', 'gainPotion', 'bind', 'fight',
  'bossEnergy', 'futureNormalHp', 'shrine', 'library',
]);
const CARD_GROUPS = new Set(['attack', 'skill', 'power']);
const RELIC_RARITIES = new Set(['common', 'uncommon', 'rare']);

function isValidEffect(value: unknown, depth = 0): boolean {
  if (depth > 3 || !isPlainObject(value) || typeof value.op !== 'string' || !EFFECT_OPS.has(value.op)) {
    return false;
  }
  const countOk = (n: unknown) => isIntIn(n, 0, 20);
  switch (value.op) {
    case 'loseHp':
    case 'heal':
    case 'gainMaxHp':
    case 'loseMaxHp':
    case 'gainGold':
    case 'payGold':
    case 'bossEnergy':
      return isIntIn(value.amount, 0, 999);
    case 'healFull':
    case 'upgradePair':
    case 'copy':
    case 'bind':
      return true;
    case 'healMissingPercent':
      return isIntIn(value.percent, 0, 100);
    case 'futureNormalHp':
      return isIntIn(value.percent, 0, 100) && isIntIn(value.fights, 0, 10);
    case 'upgrade':
      return countOk(value.count)
        && (value.cardType === undefined || CARD_GROUPS.has(String(value.cardType)))
        && (value.allBasics === undefined || typeof value.allBasics === 'boolean');
    case 'remove':
      return countOk(value.count) && (value.curseOnly === undefined || typeof value.curseOnly === 'boolean');
    case 'transform':
      return countOk(value.count) && (value.upgradeResult === undefined || typeof value.upgradeResult === 'boolean');
    case 'gainCard':
      return RELIC_RARITIES.has(String(value.rarity))
        && countOk(value.count)
        && (value.distinct === undefined || typeof value.distinct === 'boolean');
    case 'gainRelic':
      return typeof value.relicId === 'string' && value.relicId in RELICS;
    case 'gainRandomRelic':
      return RELIC_RARITIES.has(String(value.rarity));
    case 'gainCurse':
      return typeof value.curseId === 'string' && value.curseId in CURSES
        && (value.count === undefined || countOk(value.count));
    case 'gainPotion':
      return countOk(value.count);
    case 'fight':
      return typeof value.encounterId === 'string'
        && value.encounterId in ENCOUNTERS
        && Array.isArray(value.reward)
        && value.reward.length <= 8
        && value.reward.every((effect) => isValidEffect(effect, depth + 1));
    case 'shrine':
      return isIntIn(value.questions, 1, 10)
        && isIntIn(value.hpPerMiss, 0, 20)
        && Array.isArray(value.then)
        && value.then.length <= 8
        && value.then.every((effect) => isValidEffect(effect, depth + 1));
    case 'library':
      return typeof value.preferCommon === 'boolean';
    default:
      return false;
  }
}

function isValidEventTrack(value: unknown, mapIds: Set<string>, screen: Screen): boolean {
  if (value === undefined) return screen !== 'event' && screen !== 'eventCast';
  if (!isPlainObject(value)) return false;
  if (!isIntIn(value.seed, 0, 0xffff_ffff) || !isIntIn(value.cursor, 0, 0xffff_ffff)) return false;
  if (!isIntIn(value.difficulty, 0, 30) || !isIntIn(value.nonEventUnknownStreak, 0, 100)) return false;
  if (!isBoundedStringArray(value.seenEventIds, 30, (id) => EVENT_IDS.has(id))) return false;
  if (!isBoundedStringArray(value.recentEventIds, 4, (id) => EVENT_IDS.has(id))) return false;
  if (!isPlainObject(value.resolutions)) return false;
  const resolutionEntries = Object.entries(value.resolutions);
  if (resolutionEntries.length > 80) return false;
  for (const [nodeId, resolution] of resolutionEntries) {
    if (!mapIds.has(nodeId) || !isPlainObject(resolution)) return false;
    if (!['event', 'fight', 'shop', 'treasure'].includes(String(resolution.outcome))) return false;
    if (resolution.eventId !== undefined && (typeof resolution.eventId !== 'string' || !EVENT_IDS.has(resolution.eventId))) {
      return false;
    }
    if (resolution.enemyId !== undefined && (typeof resolution.enemyId !== 'string' || !(resolution.enemyId in ENEMIES))) {
      return false;
    }
    if (
      resolution.encounterId !== undefined
      && (typeof resolution.encounterId !== 'string' || !(resolution.encounterId in ENCOUNTERS))
    ) return false;
    if (resolution.fallbackFight !== undefined && typeof resolution.fallbackFight !== 'boolean') return false;
  }
  if (value.musicBoxUid !== null && !isSafeId(value.musicBoxUid)) return false;
  if (!isIntIn(value.ribbonVictories, 0, 10) || !isIntIn(value.bossOpeningEnergy, 0, 10)) return false;
  if (!isIntIn(value.normalHpBonusPercent, 0, 100) || !isIntIn(value.normalHpBonusFights, 0, 10)) return false;
  if (value.active === null) return screen !== 'event' && screen !== 'eventCast';
  if (!isPlainObject(value.active)) return false;
  if (screen !== 'event' && screen !== 'eventCast') return false;
  const active = value.active;
  if (typeof active.eventId !== 'string' || !EVENT_IDS.has(active.eventId)) return false;
  if (typeof active.nodeId !== 'string' || !mapIds.has(active.nodeId)) return false;
  if (typeof active.phase !== 'string' || !EVENT_PHASES.has(active.phase)) return false;
  if (screen === 'eventCast' && active.phase !== 'shrine') return false;
  if (screen === 'event' && active.phase === 'shrine') return false;
  if (active.choiceId !== null && !isSafeId(active.choiceId)) return false;
  if (!Array.isArray(active.resultLines) || active.resultLines.length > 40) return false;
  if (!active.resultLines.every((line) => isSafeDisplay(line, 80))) return false;
  if (!isPlainObject(active.rolls)) return false;
  if (
    !isBoundedStringArray(active.rolls.cardOrder, 200, (id) => id in CARDS)
    || !isIntIn(active.rolls.cursor, 0, 200)
  ) return false;
  if (!isPlainObject(active.rolls.relics)) return false;
  for (const [rarity, relicId] of Object.entries(active.rolls.relics)) {
    if (!RELIC_RARITIES.has(rarity) || typeof relicId !== 'string' || !(relicId in RELICS)) return false;
  }
  if (!isBoundedStringArray(active.rolls.libraryIds, 3, (id) => id in CARDS)) return false;
  if (!Array.isArray(active.queue) || active.queue.length > 20 || !active.queue.every((effect) => isValidEffect(effect))) {
    return false;
  }
  if (!isIntIn(active.queueIndex, 0, active.queue.length)) return false;
  if (typeof active.confirmed !== 'boolean') return false;
  if (!Array.isArray(active.pickSteps) || active.pickSteps.length > 8) return false;
  if (!isIntIn(active.pickIndex, 0, 8)) return false;
  if (!isBoundedStringArray(active.draftUids, 8, isSafeId)) return false;
  if (!isBoundedStringArray(active.chosenUids, 8, isSafeId)) return false;
  if (!isIntIn(active.uidCursor, 0, 20)) return false;
  if (!isIntIn(active.shrineLeft, 0, 10) || !isIntIn(active.shrineHpPerMiss, 0, 20)) return false;
  if (!Array.isArray(active.shrineThen) || !active.shrineThen.every((effect) => isValidEffect(effect))) return false;
  if (typeof active.shrineCardId !== 'string' || !isCardId(active.shrineCardId)) return false;
  if (active.fightEncounterId !== null && (typeof active.fightEncounterId !== 'string' || !(active.fightEncounterId in ENCOUNTERS))) {
    return false;
  }
  if (!Array.isArray(active.fightReward) || !active.fightReward.every((effect) => isValidEffect(effect))) return false;
  if (!isBoundedStringArray(active.offerIds, 3, (id) => id in CARDS)) return false;
  return true;
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

function isValidRunScoreStats(value: unknown): value is RunScoreStats {
  if (!isPlainObject(value)) return false;
  return (
    isIntIn(value.roomsCompleted, 0, 1_000) &&
    isIntIn(value.normalWins, 0, 1_000) &&
    isIntIn(value.eliteWins, 0, 1_000) &&
    isIntIn(value.bossWins, 0, 100) &&
    isIntIn(value.flawlessElites, 0, 1_000) &&
    isIntIn(value.flawlessBosses, 0, 100) &&
    isIntIn(value.currentCombatHpLost, 0, 1_000_000)
  );
}

function isValidRelicIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 12 &&
    value.every((id) => typeof id === 'string' && isKnownRelicId(id)) &&
    new Set(value).size === value.length
  );
}

function isValidSnapshot(data: unknown): data is RunSnapshot {
  if (!isPlainObject(data)) return false;
  if (data.v !== SAVE_VERSION || typeof data.screen !== 'string' || !isStableScreen(data.screen as Screen)) return false;
  if (!isIntIn(data.heroMaxHp, 1, 999) || !isIntIn(data.heroHp, 0, data.heroMaxHp)) return false;
  if (!Array.isArray(data.deck) || data.deck.length > 200 || !data.deck.every(isValidCardInstance)) return false;
  if (new Set((data.deck as DeckCard[]).map((card) => card.uid)).size !== data.deck.length) return false;
  if (!isIntIn(data.nextCardUid, 1, 1_000_000)) return false;
  if (!isIntIn(data.gold, 0, 999_999)) return false;
  if (data.characterId !== undefined && data.characterId !== null && !isPlayableCharacterId(data.characterId)) return false;
  if (!isValidRelicIdList(data.relicIds)) return false;
  if (
    data.pendingRelicId !== undefined &&
    data.pendingRelicId !== null &&
    (typeof data.pendingRelicId !== 'string' ||
      !isKnownRelicId(data.pendingRelicId) ||
      !data.relicIds.includes(data.pendingRelicId))
  ) return false;
  if (
    data.rewardSource !== undefined &&
    data.rewardSource !== null &&
    data.rewardSource !== 'fight' &&
    data.rewardSource !== 'treasure'
  ) return false;
  if (!isValidRunMap(data.runMap)) return false;
  if (!isIntIn(data.actIndex, 0, 2)) return false;
  const mapIds = new Set(data.runMap.acts.flatMap((act) => act.nodes.map((node) => node.id)));
  const nullableMapId = (value: unknown) => value === null || (typeof value === 'string' && mapIds.has(value));
  if (!nullableMapId(data.currentNodeId) || !nullableMapId(data.activeNodeId)) return false;
  if (!isBoundedStringArray(data.visitedIds, 100, (id) => mapIds.has(id))) return false;
  if (!isBoundedStringArray(data.pathIds, 100, (id) => mapIds.has(id))) return false;
  if (!Array.isArray(data.rewardOptions) || data.rewardOptions.length > 3 || !data.rewardOptions.every(isValidCardOffer)) return false;
  if (data.rewardTier !== 'normal' && data.rewardTier !== 'elite') return false;
  if (!isIntIn(data.pendingGold, 0, 999_999)) return false;
  if (data.pendingHeal !== undefined && !isIntIn(data.pendingHeal, 0, data.heroMaxHp)) return false;
  if (!Array.isArray(data.shopOffers) || data.shopOffers.length > 10 || !data.shopOffers.every(isValidShopOffer)) return false;
  if (data.shopRemoveUsed !== undefined && typeof data.shopRemoveUsed !== 'boolean') return false;
  if (!isIntIn(data.listenSuccesses, 0, 1_000_000)) return false;
  if (!isIntIn(data.lastClearedAct, 0, 3)) return false;
  if (data.tutorialEligibleRun !== undefined && typeof data.tutorialEligibleRun !== 'boolean') return false;
  if (data.scoreStats !== undefined && !isValidRunScoreStats(data.scoreStats)) return false;
  if (data.scoreCommitted !== undefined && typeof data.scoreCommitted !== 'boolean') return false;
  if (data.relicIds !== undefined && !isBoundedStringArray(data.relicIds, 12, (id) => id in RELICS)) return false;
  if (!isValidEventTrack(data.eventTrack, mapIds, data.screen as Screen)) return false;
  return true;
}

function migrateLegacySnapshot(data: unknown): unknown {
  if (!isPlainObject(data) || data.v !== 1) return data;
  if (!Array.isArray(data.deck) || !data.deck.every((id) => typeof id === 'string' && id in CARDS)) {
    return null;
  }
  let counter = 1;
  const make = (defId: string): DeckCard => ({
    uid: nextCardUid(counter++),
    defId,
    upgradeLevel: 0,
  });
  const deck = (data.deck as string[]).map(make);
  const rewards = Array.isArray(data.rewardOptions) &&
    data.rewardOptions.every((id) => typeof id === 'string' && id in CARDS)
    ? (data.rewardOptions as string[]).map(make)
    : data.rewardOptions;
  const shops = Array.isArray(data.shopOffers)
    ? data.shopOffers.map((offer) => {
        if (!isPlainObject(offer) || typeof offer.cardId !== 'string') return offer;
        return {
          ...make(offer.cardId),
          price: offer.price,
          sold: offer.sold,
        };
      })
    : data.shopOffers;
  return {
    ...data,
    v: SAVE_VERSION_V2,
    screen: data.screen === 'removeCard' ? 'rest' : data.screen,
    deck,
    nextCardUid: counter,
    rewardOptions: rewards,
    shopOffers: shops,
  };
}

/**
 * Preserve valid saves made when the boss occupied the previous final row by
 * inserting the guaranteed pre-boss Rest layer and moving the boss upward.
 */
function migrateLegacyMapFloors(data: unknown): unknown {
  if (
    !isPlainObject(data) ||
    (data.v !== SAVE_VERSION_V2 && data.v !== SAVE_VERSION) ||
    !isPlainObject(data.runMap)
  ) {
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

/** v2 stored one relicId. v3 stores that relic, if any, as the owned list. */
function migrateRelicCollection(data: unknown): unknown {
  if (!isPlainObject(data) || data.v !== SAVE_VERSION_V2) return data;
  let relicIds: string[];
  if (Array.isArray(data.relicIds)) {
    if (!data.relicIds.every((id) => typeof id === 'string')) return null;
    relicIds = [...data.relicIds];
  } else if (typeof data.relicId === 'string') {
    relicIds = [data.relicId];
  } else if (data.relicId === null || data.relicId === undefined) {
    relicIds = [];
  } else {
    return null;
  }
  return {
    ...data,
    v: SAVE_VERSION,
    relicIds,
  };
}

export function parseSnapshot(data: unknown): RunSnapshot | null {
  const withCards = migrateLegacySnapshot(data);
  const withMap = migrateLegacyMapFloors(withCards);
  const migrated = migrateRelicCollection(withMap);
  return isValidSnapshot(migrated) ? migrated : null;
}

export function loadSnapshot(): RunSnapshot | null {
  try {
    const raw = readActiveRaw();
    if (!raw) return null;
    if (raw.length > MAX_SAVE_BYTES) {
      clearSavedRun();
      return null;
    }
    const data = parseSnapshot(JSON.parse(raw) as unknown);
    if (!data) {
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
export function applySnapshot(state: RunState, snap: RunSnapshot): void {
  state.screen = snap.screen;
  state.heroHp = snap.heroHp;
  state.heroMaxHp = snap.heroMaxHp;
  state.deck = snap.deck.map((card) => ({ ...card }));
  state.nextCardUid = snap.nextCardUid;
  state.gold = snap.gold;
  state.characterId = isPlayableCharacterId(snap.characterId)
    ? snap.characterId
    : snap.screen === 'relicPick'
      ? null
      : FIRST_CHARACTER_ID;
  if (
    state.screen === 'smith' &&
    (!state.characterId || !getPlayableCharacter(state.characterId).upgradesEnabled)
  ) {
    state.screen = 'rest';
  }
  state.relicIds = [...snap.relicIds];
  state.pendingRelicId = snap.pendingRelicId ?? null;
  state.rewardSource = snap.rewardSource ?? null;
  state.eventTrack = snap.eventTrack
    ? JSON.parse(JSON.stringify(snap.eventTrack)) as EventTrack
    : createEventTrack(1);
  state.runMap = JSON.parse(JSON.stringify(snap.runMap)) as RunMap;
  state.actIndex = snap.actIndex;
  state.currentNodeId = snap.currentNodeId;
  state.activeNodeId = snap.activeNodeId;
  state.visitedIds = [...snap.visitedIds];
  state.pathIds = [...snap.pathIds];
  state.rewardOptions = snap.rewardOptions.map((card) => ({ ...card }));
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
  state.scoreStats = snap.scoreStats ? { ...snap.scoreStats } : createRunScoreStats();
  state.scoreCommitted = snap.scoreCommitted ?? false;
  state.scoreResult = null;
}

export function resumeSavedRun(state: RunState): boolean {
  const snap = loadSnapshot();
  if (!snap) return false;
  applySnapshot(state, snap);
  return true;
}
