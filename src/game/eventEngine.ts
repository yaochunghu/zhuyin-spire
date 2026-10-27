/**
 * Unknown-room rolls and event resolution.
 * Effects are data. The same seed and cursor reproduce the same rewards.
 */

import { canUpgradeCard, getCard, type CardDef } from '../data/cards';
import { isCurseId } from '../data/curses';
import { pickNormalFight } from '../data/encounters';
import {
  effectChips,
  effectsNeedConfirm,
  eventsForAct,
  getEvent,
  type EventChoiceDef,
  type EventCondition,
  type EventDef,
  type EventEffect,
  type CardTypeGroup,
  type EventRelicRarity,
} from '../data/events';
import type { MapNode, RunMap } from '../data/map';
import { getPlayableCharacter, type PlayableCharacterId } from '../data/characters';
import { getRelic, RELIC_POOL_IDS, rollRelicDrop } from '../data/relics';
import { nextCardUid, type DeckCard } from './cardInstances';
import { getActiveProfile, filterObtainableCardsForProfile } from './profiles';
import { grantPotions, potionBlockReason } from './potions';
import { acquireRelic, ownedRelicIds } from './relicOwnership';
import type { CombatState } from './battle/types';

export type EventPhase = 'choose' | 'confirm' | 'pick' | 'offer' | 'shrine' | 'result' | 'fight';

export type EventStep = EventPhase | 'done' | 'defeat';

export interface PickStep {
  kind: 'upgrade' | 'remove' | 'transform' | 'copy' | 'bind' | 'upgradePair';
  need: number;
  cardType?: CardTypeGroup;
  curseOnly?: boolean;
}

export interface EventRolls {
  cardOrder: string[];
  cursor: number;
  relics: Partial<Record<EventRelicRarity, string>>;
  libraryIds: string[];
}

export interface UnknownResolution {
  outcome: 'event' | 'fight' | 'shop' | 'treasure';
  eventId?: string;
  enemyId?: string;
  encounterId?: string;
  fallbackFight?: boolean;
}

export interface ActiveEvent {
  eventId: string;
  nodeId: string;
  phase: EventPhase;
  choiceId: string | null;
  resultLines: string[];
  rolls: EventRolls;
  queue: EventEffect[];
  queueIndex: number;
  confirmed: boolean;
  pickSteps: PickStep[];
  pickIndex: number;
  draftUids: string[];
  chosenUids: string[];
  uidCursor: number;
  shrineLeft: number;
  shrineHpPerMiss: number;
  shrineThen: EventEffect[];
  shrineCardId: string;
  fightEncounterId: string | null;
  fightReward: EventEffect[];
  offerIds: string[];
}

export interface EventTrack {
  seed: number;
  cursor: number;
  difficulty: number;
  nonEventUnknownStreak: number;
  seenEventIds: string[];
  recentEventIds: string[];
  resolutions: Record<string, UnknownResolution>;
  active: ActiveEvent | null;
  musicBoxUid: string | null;
  ribbonVictories: number;
  bossOpeningEnergy: number;
  normalHpBonusPercent: number;
  normalHpBonusFights: number;
}

export interface EventRun {
  heroHp: number;
  heroMaxHp: number;
  gold: number;
  deck: DeckCard[];
  nextCardUid: number;
  characterId: PlayableCharacterId | null;
  relicIds: string[];
  potions: (string | null)[];
  eventTrack: EventTrack;
  flash: string | null;
  runMap?: RunMap;
  visitedIds?: string[];
}

export function createEventTrack(seed: number): EventTrack {
  const cursor = seed >>> 0 || 1;
  return {
    seed: cursor,
    cursor,
    difficulty: 0,
    nonEventUnknownStreak: 0,
    seenEventIds: [],
    recentEventIds: [],
    resolutions: {},
    active: null,
    musicBoxUid: null,
    ribbonVictories: 0,
    bossOpeningEnergy: 0,
    normalHpBonusPercent: 0,
    normalHpBonusFights: 0,
  };
}

export function nextEventUnit(track: EventTrack): number {
  track.cursor = (Math.imul(track.cursor, 1_664_525) + 1_013_904_223) >>> 0;
  return track.cursor / 0x1_0000_0000;
}

export interface UnknownWeight {
  event: number;
  fight: number;
  shop: number;
  treasure: number;
}

/** Weights in thousandths of a percent so event 65 is 65000 of 100000. */
export function unknownWeights(
  streak: number,
  allowShop: boolean,
  allowTreasure: boolean,
): UnknownWeight {
  const event = Math.min(95, 65 + 10 * Math.max(0, Math.floor(streak)));
  const remain = 100 - event;
  const parts = [4, allowShop ? 2 : 0, allowTreasure ? 1 : 0];
  const sum = parts.reduce((total, part) => total + part, 0) || 1;
  const raw = parts.map((part) => Math.floor((remain * 1000 * part) / sum));
  const used = raw.reduce((total, part) => total + part, 0);
  raw[0] = (raw[0] ?? 0) + remain * 1000 - used;
  return {
    event: event * 1000,
    fight: raw[0] ?? 0,
    shop: raw[1] ?? 0,
    treasure: raw[2] ?? 0,
  };
}

export function unknownAllows(row: number): { shop: boolean; treasure: boolean } {
  return {
    shop: 15 - row - 1 >= 2,
    treasure: row < 14,
  };
}

function typeGroup(def: CardDef): CardTypeGroup | null {
  if (def.curse) return null;
  if (def.type === 'attack') return 'attack';
  if (def.type === 'skill' || def.type === 'block') return 'skill';
  if (def.type === 'power') return 'power';
  return null;
}

function unlockedIds(state: EventRun): string[] {
  if (!state.characterId) return [];
  const character = getPlayableCharacter(state.characterId);
  return filterObtainableCardsForProfile(
    getActiveProfile(),
    state.characterId,
    character.cardPoolIds,
  );
}

function unlockedSet(state: EventRun): Set<string> {
  return new Set(unlockedIds(state));
}

export function activeEffects(state: EventRun, choice: EventChoiceDef): EventEffect[] {
  return state.eventTrack.difficulty >= 15 ? choice.a15 : choice.effects;
}

function conditionReason(state: EventRun, condition: EventCondition): string | null {
  switch (condition.op) {
    case 'damaged':
      return state.heroHp < state.heroMaxHp ? null : '心是滿的';
    case 'hpAtLeast':
      return state.heroHp >= condition.amount ? null : `要有至少 ${condition.amount} 顆心`;
    case 'goldAtLeast': {
      if (state.gold >= condition.amount) return null;
      return `還差 ${condition.amount - state.gold}🪙`;
    }
    case 'upgradeable': {
      const count = upgradeableCards(state, condition.cardType).length;
      if (count >= (condition.count ?? 1)) return null;
      if (condition.cardType === 'skill') return '沒有可升級的技能';
      if (condition.cardType === 'attack') return '沒有可升級的攻擊';
      if (condition.cardType === 'power') return '沒有可升級的能力';
      return '沒有可升級的牌';
    }
    case 'upgradeablePair':
      return upgradeableCards(state, 'attack').length > 0 && upgradeableCards(state, 'skill').length > 0
        ? null
        : '要有攻擊和技能可以升級';
    case 'removable':
      return state.deck.length >= (condition.count ?? 1) ? null : '沒有可拿掉的牌';
    case 'removableCurse':
      return state.deck.some((card) => getCard(card.defId).curse) ? null : '沒有詛咒牌';
    case 'nonBasic':
      return state.deck.some((card) => isNonBasic(card.defId)) ? null : '沒有可複製的牌';
    case 'unupgradedBasic':
      return state.deck.some((card) => isUnupgradedBasic(card)) ? null : '沒有可升級的基礎牌';
    case 'unlocked':
      return unlockedIds(state).filter((id) => (getCard(id).rarity ?? 'common') === condition.rarity).length
        >= (condition.count ?? 1)
        ? null
        : '還沒有這種牌';
    case 'libraryReady':
      return libraryTypesReady(state) ? null : '三種牌還不齊';
    case 'notOwned':
      return ownedRelicIds(state).includes(condition.relicId) ? '已經有了' : null;
    case 'relicAvailable':
      return RELIC_POOL_IDS.some((id) => !ownedRelicIds(state).includes(id))
        ? null
        : '沒有新的遺物';
    case 'potionSlots':
      return potionBlockReason(state.potions, condition.count);
    case 'bindable':
      return state.deck.some((card) => isBindable(card.defId)) ? null : '沒有可綁定的牌';
    default: {
      const neverCondition: never = condition;
      void neverCondition;
      return '現在不能選';
    }
  }
}

function upgradeableCards(state: EventRun, cardType?: CardTypeGroup): DeckCard[] {
  return state.deck.filter((card) => {
    if (!canUpgradeCard(card.defId, card.upgradeLevel)) return false;
    if (!cardType) return true;
    return typeGroup(getCard(card.defId)) === cardType;
  });
}

function isNonBasic(defId: string): boolean {
  const def = getCard(defId);
  return !def.curse && (def.rarity ?? 'common') !== 'basic';
}

function isUnupgradedBasic(card: DeckCard): boolean {
  const def = getCard(card.defId);
  return (def.rarity ?? 'common') === 'basic' && canUpgradeCard(card.defId, card.upgradeLevel);
}

function isBindable(defId: string): boolean {
  return typeGroup(getCard(defId)) !== null;
}

function libraryTypesReady(state: EventRun): boolean {
  const groups = new Set<CardTypeGroup>();
  for (const id of unlockedIds(state)) {
    const def = getCard(id);
    const rarity = def.rarity ?? 'common';
    if (rarity !== 'common' && rarity !== 'uncommon') continue;
    const group = typeGroup(def);
    if (group) groups.add(group);
  }
  return groups.size >= 3;
}

function effectReason(state: EventRun, effect: EventEffect): string | null {
  switch (effect.op) {
    case 'loseHp':
      return state.heroHp - effect.amount >= 1 ? null : '要留至少 1 顆心';
    case 'payGold':
      return state.gold >= effect.amount ? null : `還差 ${effect.amount - state.gold}🪙`;
    case 'loseMaxHp':
      return state.heroMaxHp - effect.amount >= 1 ? null : '最大心會太少';
    case 'gainPotion':
      return potionBlockReason(state.potions, effect.count);
    case 'gainRelic':
      return ownedRelicIds(state).includes(effect.relicId) ? '已經有了' : null;
    case 'gainRandomRelic':
      return RELIC_POOL_IDS.some((id) => !ownedRelicIds(state).includes(id))
        ? null
        : '沒有新的遺物';
    case 'gainCard': {
      const matches = unlockedIds(state).filter((id) => (getCard(id).rarity ?? 'common') === effect.rarity);
      const unique = new Set(matches);
      return unique.size >= (effect.distinct ? effect.count : 1) && matches.length >= 1
        ? null
        : '沒有這種牌';
    }
    case 'upgrade':
      if (effect.allBasics) {
        return state.deck.some((card) => isUnupgradedBasic(card)) ? null : '沒有可升級的基礎牌';
      }
      return upgradeableCards(state, effect.cardType).length >= effect.count
        ? null
        : '沒有可升級的牌';
    case 'upgradePair':
      return conditionReason(state, { op: 'upgradeablePair' });
    case 'remove':
      if (effect.curseOnly) {
        const curses = state.deck.filter((card) => getCard(card.defId).curse).length;
        return curses >= effect.count ? null : '沒有詛咒牌';
      }
      return state.deck.length >= effect.count ? null : '沒有可拿掉的牌';
    case 'transform':
      return state.deck.length >= effect.count ? null : '沒有可改的牌';
    case 'copy':
      return state.deck.some((card) => isNonBasic(card.defId)) ? null : '沒有可複製的牌';
    case 'bind':
      return state.deck.some((card) => isBindable(card.defId)) ? null : '沒有可綁定的牌';
    case 'fight':
      return effect.reward.map((reward) => effectReason(state, reward)).find((reason) => reason) ?? null;
    case 'shrine':
      return effect.then.map((next) => effectReason(state, next)).find((reason) => reason) ?? null;
    case 'library':
      return libraryTypesReady(state) ? null : '三種牌還不齊';
    default:
      return null;
  }
}

export function choiceReason(state: EventRun, choice: EventChoiceDef): string | null {
  if (choice.id === 'leave') return null;
  for (const condition of choice.eligibility) {
    const reason = conditionReason(state, condition);
    if (reason) return reason;
  }
  for (const effect of activeEffects(state, choice)) {
    const reason = effectReason(state, effect);
    if (reason) return reason;
  }
  return null;
}

export function choiceIsHidden(state: EventRun, choice: EventChoiceDef): boolean {
  if (!choice.hideUnlessEligible) return false;
  return choice.eligibility.some((condition) => conditionReason(state, condition));
}

export function eventIsEligible(state: EventRun, event: EventDef, row: number, act: 1 | 2 | 3): boolean {
  if (event.act !== 'shared' && event.act !== act) return false;
  if (event.act === 1 && row === 0) return false;
  if (state.eventTrack.seenEventIds.includes(event.id)) return false;
  if (state.eventTrack.recentEventIds.includes(event.id)) return false;
  const groupOk = event.eligibility.some((group) =>
    group.every((condition) => !conditionReason(state, condition)),
  );
  if (!groupOk) return false;
  return event.choices.some((choice) => choice.id !== 'leave' && !choiceReason(state, choice));
}

function rememberEvent(track: EventTrack, eventId: string): void {
  if (!track.seenEventIds.includes(eventId)) track.seenEventIds.push(eventId);
  track.recentEventIds = [...track.recentEventIds, eventId].slice(-4);
}

function rollIndex(track: EventTrack, length: number): number {
  if (length <= 1) return 0;
  return Math.floor(nextEventUnit(track) * length);
}

function pickEventId(state: EventRun, node: MapNode): string | null {
  const act = node.act;
  if (act !== 1 && act !== 2 && act !== 3) return null;
  const eligible = eventsForAct(act).filter((event) => eventIsEligible(state, event, node.row, act));
  const specific = eligible.filter((event) => event.act === act);
  const shared = eligible.filter((event) => event.act === 'shared');
  let pool: EventDef[] = [];
  if (specific.length === 0) pool = shared;
  else if (shared.length === 0) pool = specific;
  else pool = nextEventUnit(state.eventTrack) < 2 / 3 ? specific : shared;
  if (pool.length === 0) return null;
  return pool[rollIndex(state.eventTrack, pool.length)]!.id;
}

function fightsAlreadySeen(state: EventRun, node: MapNode): { count: number; recent: string[] } {
  const actMap = state.runMap?.acts.find((act) => act.act === node.act);
  if (!actMap) return { count: 0, recent: [] };
  const nodes = new Map(actMap.nodes.map((entry) => [entry.id, entry]));
  const keys: string[] = [];
  for (const id of state.visitedIds ?? []) {
    const earlier = nodes.get(id);
    if (earlier?.kind !== 'fight') continue;
    const key = earlier.encounterId ?? earlier.enemyId;
    if (key) keys.push(key);
  }
  return { count: keys.length, recent: keys.slice(-2) };
}

/** A ? that becomes a fight uses the same easy/hard pick as a map fight. */
function rollNormalFight(state: EventRun, node: MapNode): Pick<UnknownResolution, 'enemyId' | 'encounterId'> {
  const act = node.act === 2 || node.act === 3 ? node.act : 1;
  const seen = fightsAlreadySeen(state, node);
  const pick = pickNormalFight(
    act,
    seen.count,
    seen.recent,
    () => nextEventUnit(state.eventTrack),
    node.row >= 4,
  );
  return { enemyId: pick.enemyId, encounterId: pick.encounterId };
}

export function ensureUnknownResolution(state: EventRun, node: MapNode): UnknownResolution {
  const existing = state.eventTrack.resolutions[node.id];
  if (existing) return existing;
  const allows = unknownAllows(node.row);
  const weights = unknownWeights(
    state.eventTrack.nonEventUnknownStreak,
    allows.shop,
    allows.treasure,
  );
  const roll = Math.floor(nextEventUnit(state.eventTrack) * 100_000);
  let outcome: UnknownResolution['outcome'];
  if (roll < weights.event) outcome = 'event';
  else if (roll < weights.event + weights.fight) outcome = 'fight';
  else if (roll < weights.event + weights.fight + weights.shop) outcome = 'shop';
  else outcome = 'treasure';

  const act = node.act;
  let resolution: UnknownResolution;
  if (outcome === 'event' && (act === 1 || act === 2 || act === 3)) {
    const eventId = pickEventId(state, node);
    if (eventId) {
      resolution = { outcome: 'event', eventId };
      rememberEvent(state.eventTrack, eventId);
      state.eventTrack.nonEventUnknownStreak = 0;
    } else {
      resolution = { outcome: 'fight', fallbackFight: true, ...rollNormalFight(state, node) };
      state.eventTrack.nonEventUnknownStreak += 1;
    }
  } else if (outcome === 'fight' && (act === 1 || act === 2 || act === 3)) {
    resolution = { outcome: 'fight', ...rollNormalFight(state, node) };
    state.eventTrack.nonEventUnknownStreak += 1;
  } else if (outcome === 'shop') {
    resolution = { outcome: 'shop' };
    state.eventTrack.nonEventUnknownStreak += 1;
  } else if (outcome === 'treasure') {
    resolution = { outcome: 'treasure' };
    state.eventTrack.nonEventUnknownStreak += 1;
  } else {
    resolution = { outcome: 'fight', fallbackFight: true, enemyId: 'slime' };
    state.eventTrack.nonEventUnknownStreak += 1;
  }
  state.eventTrack.resolutions[node.id] = resolution;
  return resolution;
}

function shuffleIds(ids: string[], track: EventTrack): string[] {
  const copy = [...ids];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(nextEventUnit(track) * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

function rollLibrary(state: EventRun, preferCommon: boolean): string[] {
  const ids = unlockedIds(state).filter((id) => {
    const def = getCard(id);
    const rarity = def.rarity ?? 'common';
    return (rarity === 'common' || rarity === 'uncommon') && typeGroup(def) !== null;
  });
  const picked: string[] = [];
  for (const group of ['attack', 'skill', 'power'] as const) {
    let pool = ids.filter((id) => typeGroup(getCard(id)) === group && !picked.includes(id));
    const commons = pool.filter((id) => (getCard(id).rarity ?? 'common') === 'common');
    if (preferCommon && commons.length > 0) pool = commons;
    if (pool.length === 0) continue;
    picked.push(pool[rollIndex(state.eventTrack, pool.length)]!);
  }
  return picked;
}

function prepareRolls(state: EventRun, event: EventDef): EventRolls {
  const owned = ownedRelicIds(state);
  const relics: EventRolls['relics'] = {};
  // The bible still names a rarity. The live pool has no tiers, so one roll
  // is stored for every rarity word and the event cursor only advances once.
  const rolled = rollRelicDrop(owned, (max) => rollIndex(state.eventTrack, max));
  if (rolled) {
    relics.common = rolled;
    relics.uncommon = rolled;
    relics.rare = rolled;
  }
  const libraryChoice = event.choices.find((choice) =>
    [...choice.effects, ...choice.a15].some((effect) => effect.op === 'library'),
  );
  let libraryIds: string[] = [];
  if (libraryChoice) {
    const library = activeEffects(state, libraryChoice).find((effect) => effect.op === 'library');
    if (library && library.op === 'library') libraryIds = rollLibrary(state, library.preferCommon);
  }
  return {
    cardOrder: shuffleIds(unlockedIds(state), state.eventTrack),
    cursor: 0,
    relics,
    libraryIds,
  };
}

function blankActive(eventId: string, nodeId: string, rolls: EventRolls): ActiveEvent {
  return {
    eventId,
    nodeId,
    phase: 'choose',
    choiceId: null,
    resultLines: [],
    rolls,
    queue: [],
    queueIndex: 0,
    confirmed: false,
    pickSteps: [],
    pickIndex: 0,
    draftUids: [],
    chosenUids: [],
    uidCursor: 0,
    shrineLeft: 0,
    shrineHpPerMiss: 0,
    shrineThen: [],
    shrineCardId: 'bo',
    fightEncounterId: null,
    fightReward: [],
    offerIds: rolls.libraryIds,
  };
}

export function openEvent(state: EventRun, nodeId: string, eventId: string): void {
  const event = getEvent(eventId);
  state.eventTrack.active = blankActive(eventId, nodeId, prepareRolls(state, event));
}

export function activeEventDef(state: EventRun): EventDef | null {
  const id = state.eventTrack.active?.eventId;
  return id ? getEvent(id) : null;
}

function upfrontPicks(effects: readonly EventEffect[]): PickStep[] {
  const steps: PickStep[] = [];
  for (const effect of effects) {
    if (effect.op === 'upgrade' && !effect.allBasics) {
      steps.push({ kind: 'upgrade', need: effect.count, cardType: effect.cardType });
    } else if (effect.op === 'upgradePair') {
      steps.push({ kind: 'upgradePair', need: 2 });
    } else if (effect.op === 'remove') {
      steps.push({ kind: 'remove', need: effect.count, curseOnly: effect.curseOnly });
    } else if (effect.op === 'transform') {
      steps.push({ kind: 'transform', need: effect.count });
    } else if (effect.op === 'copy') {
      steps.push({ kind: 'copy', need: 1 });
    } else if (effect.op === 'bind') {
      steps.push({ kind: 'bind', need: 1 });
    }
  }
  return steps;
}

function currentChoice(state: EventRun): EventChoiceDef | null {
  const active = state.eventTrack.active;
  if (!active?.choiceId) return null;
  return getEvent(active.eventId).choices.find((choice) => choice.id === active.choiceId) ?? null;
}

export function beginEventChoice(state: EventRun, choiceId: string): EventStep {
  const active = state.eventTrack.active;
  if (!active || active.phase !== 'choose') return active?.phase ?? 'choose';
  const choice = getEvent(active.eventId).choices.find((item) => item.id === choiceId);
  if (!choice || choiceIsHidden(state, choice) || choiceReason(state, choice)) return 'choose';
  if (choice.id === 'leave') return 'done';
  const effects = activeEffects(state, choice);
  active.choiceId = choice.id;
  active.queue = effects.map((effect) => ({ ...effect }));
  active.queueIndex = 0;
  active.pickSteps = upfrontPicks(effects);
  active.pickIndex = 0;
  active.draftUids = [];
  active.chosenUids = [];
  active.uidCursor = 0;
  active.resultLines = [];
  if (active.pickSteps.length > 0) {
    active.phase = 'pick';
    return 'pick';
  }
  if (effectsNeedConfirm(effects)) {
    active.phase = 'confirm';
    return 'confirm';
  }
  return continueQueue(state);
}

export function cancelEventPending(state: EventRun): void {
  const active = state.eventTrack.active;
  if (!active) return;
  if (active.phase !== 'confirm' && active.phase !== 'pick') return;
  active.phase = 'choose';
  active.choiceId = null;
  active.queue = [];
  active.pickSteps = [];
  active.draftUids = [];
  active.chosenUids = [];
  active.resultLines = [];
}

export function confirmEventPending(state: EventRun): EventStep {
  const active = state.eventTrack.active;
  if (!active || active.phase !== 'confirm') return active?.phase ?? 'choose';
  active.confirmed = true;
  return continueQueue(state);
}

function currentStep(active: ActiveEvent): PickStep | null {
  return active.pickSteps[active.pickIndex] ?? null;
}

export function currentPickPrompt(state: EventRun): string {
  const active = state.eventTrack.active;
  const step = active ? currentStep(active) : null;
  if (!step) return '點一張牌';
  if (step.kind === 'upgradePair') {
    return active!.draftUids.length === 0 ? '先點一張攻擊' : '再點一張技能';
  }
  if (step.kind === 'upgrade') {
    return step.cardType === 'skill' ? '點一張技能來升級' : `點 ${step.need} 張牌來升級`;
  }
  if (step.kind === 'remove') return step.curseOnly ? '點一張詛咒' : '點要拿掉的牌';
  if (step.kind === 'transform') return '點要改寫的牌';
  if (step.kind === 'copy') return '點要記住的牌';
  if (step.kind === 'bind') return '點要綁住的牌';
  return '點一張牌';
}

function matchesPick(card: DeckCard, step: PickStep, draft: string[]): boolean {
  if (draft.includes(card.uid)) return false;
  const def = getCard(card.defId);
  if (step.kind === 'upgrade') {
    return canUpgradeCard(card.defId, card.upgradeLevel)
      && (!step.cardType || typeGroup(def) === step.cardType);
  }
  if (step.kind === 'upgradePair') {
    const slot: CardTypeGroup = draft.length === 0 ? 'attack' : 'skill';
    return canUpgradeCard(card.defId, card.upgradeLevel) && typeGroup(def) === slot;
  }
  if (step.kind === 'remove') return step.curseOnly ? !!def.curse : true;
  if (step.kind === 'transform') return true;
  if (step.kind === 'copy') return isNonBasic(card.defId);
  if (step.kind === 'bind') return isBindable(card.defId);
  return false;
}

export function currentPickCards(state: EventRun): DeckCard[] {
  const active = state.eventTrack.active;
  const step = active ? currentStep(active) : null;
  if (!active || !step) return [];
  return state.deck.filter((card) => matchesPick(card, step, active.draftUids));
}

export function toggleEventPick(state: EventRun, uid: string): void {
  const active = state.eventTrack.active;
  const step = active ? currentStep(active) : null;
  if (!active || !step) return;
  const card = state.deck.find((item) => item.uid === uid);
  if (!card || !matchesPick(card, step, active.draftUids.filter((id) => id !== uid))) return;
  if (active.draftUids.includes(uid)) {
    active.draftUids = active.draftUids.filter((id) => id !== uid);
    return;
  }
  if (step.kind === 'upgradePair') {
    if (active.draftUids.length >= 2) return;
    active.draftUids = [...active.draftUids, uid];
    return;
  }
  if (active.draftUids.length >= step.need) {
    active.draftUids = [...active.draftUids.slice(0, step.need - 1), uid];
    return;
  }
  active.draftUids = [...active.draftUids, uid];
}

export function confirmEventPick(state: EventRun): EventStep {
  const active = state.eventTrack.active;
  const step = active ? currentStep(active) : null;
  if (!active || active.phase !== 'pick' || !step) return active?.phase ?? 'choose';
  if (active.draftUids.length < step.need) return 'pick';
  active.chosenUids = [...active.chosenUids, ...active.draftUids];
  active.draftUids = [];
  active.pickIndex += 1;
  if (active.pickIndex < active.pickSteps.length) return 'pick';
  const choice = currentChoice(state);
  if (!active.confirmed && choice && effectsNeedConfirm(activeEffects(state, choice))) {
    active.phase = 'confirm';
    return 'confirm';
  }
  return continueQueue(state);
}

function healBy(state: EventRun, amount: number): number {
  const before = state.heroHp;
  state.heroHp = Math.min(state.heroMaxHp, state.heroHp + Math.max(0, amount));
  return state.heroHp - before;
}

function addCard(state: EventRun, defId: string, upgradeLevel: 0 | 1 = 0): DeckCard {
  const card: DeckCard = {
    uid: nextCardUid(state.nextCardUid),
    defId,
    upgradeLevel,
  };
  state.nextCardUid += 1;
  state.deck.push(card);
  return card;
}

function takeUid(active: ActiveEvent): string | null {
  const uid = active.chosenUids[active.uidCursor] ?? null;
  if (uid) active.uidCursor += 1;
  return uid;
}

function takeRolledCard(
  active: ActiveEvent,
  rarity: EventRelicRarity,
  distinct: Set<string>,
): string | null {
  const order = active.rolls.cardOrder;
  for (let index = active.rolls.cursor; index < order.length; index += 1) {
    const id = order[index]!;
    if ((getCard(id).rarity ?? 'common') !== rarity) continue;
    if (distinct.has(id)) continue;
    active.rolls.cursor = index + 1;
    return id;
  }
  return null;
}

function rollTransform(active: ActiveEvent, removedId: string, unlocked: Set<string>): string | null {
  const start = (getCard(removedId).rarity ?? 'common');
  const ladder = [...new Set([start, 'common', 'uncommon', 'rare'])];
  const order = active.rolls.cardOrder;
  for (const rarity of ladder) {
    for (let index = 0; index < order.length; index += 1) {
      const cursor = (active.rolls.cursor + index) % order.length;
      const id = order[cursor]!;
      if (id === removedId || !unlocked.has(id)) continue;
      if ((getCard(id).rarity ?? 'common') !== rarity) continue;
      if (isCurseId(id)) continue;
      active.rolls.cursor = (cursor + 1) % Math.max(1, order.length);
      return id;
    }
  }
  return null;
}

function applyEffect(state: EventRun, effect: EventEffect): void {
  const active = state.eventTrack.active;
  if (!active) return;
  const lines = active.resultLines;
  switch (effect.op) {
    case 'loseHp':
      state.heroHp = Math.max(0, state.heroHp - effect.amount);
      lines.push(`少了 ${effect.amount} 顆心`);
      break;
    case 'heal': {
      const gained = healBy(state, effect.amount);
      lines.push(gained > 0 ? `補了 ${gained} 顆心` : '心已經滿了');
      break;
    }
    case 'healFull': {
      const gained = healBy(state, state.heroMaxHp - state.heroHp);
      lines.push(gained > 0 ? `補了 ${gained} 顆心` : '心已經滿了');
      break;
    }
    case 'healMissingPercent': {
      const missing = state.heroMaxHp - state.heroHp;
      const gained = healBy(state, Math.floor(missing * effect.percent / 100));
      lines.push(gained > 0 ? `補了 ${gained} 顆心` : '心已經滿了');
      break;
    }
    case 'gainMaxHp':
      state.heroMaxHp += effect.amount;
      healBy(state, effect.amount);
      lines.push(`最大心變成 ${state.heroMaxHp}`);
      break;
    case 'loseMaxHp':
      state.heroMaxHp = Math.max(1, state.heroMaxHp - effect.amount);
      if (state.heroHp > state.heroMaxHp) state.heroHp = state.heroMaxHp;
      lines.push(`最大心變成 ${state.heroMaxHp}`);
      break;
    case 'gainGold':
      state.gold += effect.amount;
      lines.push(`拿到 ${effect.amount} 金幣`);
      break;
    case 'payGold':
      state.gold = Math.max(0, state.gold - effect.amount);
      lines.push(`花了 ${effect.amount} 金幣`);
      break;
    case 'upgrade':
      if (effect.allBasics) {
        const names: string[] = [];
        for (const card of state.deck) {
          if (!isUnupgradedBasic(card)) continue;
          card.upgradeLevel = 1;
          names.push(getCard(card.defId).name);
        }
        lines.push(names.length ? `升級了 ${names.join('、')}` : '沒有基礎牌要升級');
      } else {
        for (let count = 0; count < effect.count; count += 1) {
          const uid = takeUid(active);
          const card = state.deck.find((item) => item.uid === uid);
          if (!card || !canUpgradeCard(card.defId, card.upgradeLevel)) continue;
          card.upgradeLevel = 1;
          lines.push(`升級了 ${getCard(card.defId).name}`);
        }
      }
      break;
    case 'upgradePair':
      for (const label of ['攻擊', '技能']) {
        const uid = takeUid(active);
        const card = state.deck.find((item) => item.uid === uid);
        if (!card || !canUpgradeCard(card.defId, card.upgradeLevel)) continue;
        card.upgradeLevel = 1;
        lines.push(`${label}升級了 ${getCard(card.defId).name}`);
      }
      break;
    case 'remove':
      for (let count = 0; count < effect.count; count += 1) {
        const uid = takeUid(active);
        const index = state.deck.findIndex((card) => card.uid === uid);
        if (index < 0) continue;
        const [removed] = state.deck.splice(index, 1);
        if (removed) lines.push(`拿掉了 ${getCard(removed.defId).name}`);
      }
      break;
    case 'transform':
      for (let count = 0; count < effect.count; count += 1) {
        const uid = takeUid(active);
        const index = state.deck.findIndex((card) => card.uid === uid);
        if (index < 0) continue;
        const removed = state.deck[index]!;
        const nextId = rollTransform(active, removed.defId, unlockedSet(state));
        if (!nextId) {
          lines.push('沒有可以換成的牌');
          continue;
        }
        state.deck.splice(index, 1);
        const upgradeLevel: 0 | 1 = effect.upgradeResult && canUpgradeCard(nextId, 0) ? 1 : 0;
        addCard(state, nextId, upgradeLevel);
        lines.push(`${getCard(removed.defId).name} 變成 ${getCard(nextId).name}`);
      }
      break;
    case 'gainCard': {
      const distinct = new Set<string>();
      for (let count = 0; count < effect.count; count += 1) {
        const id = takeRolledCard(active, effect.rarity, effect.distinct ? distinct : new Set());
        if (!id) continue;
        distinct.add(id);
        const card = addCard(state, id, 0);
        lines.push(`得到 ${getCard(card.defId).name}`);
      }
      break;
    }
    case 'copy': {
      const uid = takeUid(active);
      const card = state.deck.find((item) => item.uid === uid);
      if (!card) break;
      addCard(state, card.defId, 0);
      lines.push(`多了一張 ${getCard(card.defId).name}`);
      break;
    }
    case 'gainRelic':
      if (acquireRelic(state, effect.relicId)) lines.push(`得到 ${getRelic(effect.relicId).name}`);
      break;
    case 'gainRandomRelic': {
      const rolled = active.rolls.relics[effect.rarity];
      const owned = ownedRelicIds(state);
      const id = rolled && !owned.includes(rolled)
        ? rolled
        : rollRelicDrop(owned, () => 0);
      if (id && acquireRelic(state, id)) lines.push(`得到 ${getRelic(id).name}`);
      break;
    }
    case 'gainCurse': {
      const count = effect.count ?? 1;
      for (let index = 0; index < count; index += 1) addCard(state, effect.curseId, 0);
      lines.push(count > 1 ? `得到 ${count} 張${getCard(effect.curseId).name}` : `得到 ${getCard(effect.curseId).name}`);
      break;
    }
    case 'gainPotion': {
      const names = grantPotions(
        state.potions,
        effect.count,
        (max) => rollIndex(state.eventTrack, max),
      );
      lines.push(names.length > 0 ? `得到 ${names.join('、')}` : '藥水格已滿');
      break;
    }
    case 'bind': {
      const uid = takeUid(active);
      const card = uid ? state.deck.find((item) => item.uid === uid) : undefined;
      if (!card) break;
      state.eventTrack.musicBoxUid = card.uid;
      lines.push(`綁住了 ${getCard(card.defId).name}`);
      break;
    }
    case 'bossEnergy':
      state.eventTrack.bossOpeningEnergy += effect.amount;
      lines.push('Boss 第一回合多 1 點能量');
      break;
    case 'futureNormalHp':
      state.eventTrack.normalHpBonusPercent = effect.percent;
      state.eventTrack.normalHpBonusFights = effect.fights;
      lines.push(`接下來 ${effect.fights} 場怪物的心會多 ${effect.percent}%`);
      break;
    case 'fight':
    case 'shrine':
    case 'library':
      break;
    default: {
      const neverEffect: never = effect;
      void neverEffect;
    }
  }
}

function continueQueue(state: EventRun): EventStep {
  const active = state.eventTrack.active;
  if (!active) return 'choose';
  while (active.queueIndex < active.queue.length) {
    const effect = active.queue[active.queueIndex]!;
    if (effect.op === 'shrine') {
      active.shrineLeft = effect.questions;
      active.shrineHpPerMiss = effect.hpPerMiss;
      active.shrineThen = effect.then;
      active.shrineCardId = state.deck.find((card) => !getCard(card.defId).curse)?.defId ?? 'bo';
      active.queueIndex += 1;
      active.phase = 'shrine';
      return 'shrine';
    }
    if (effect.op === 'fight') {
      active.fightEncounterId = effect.encounterId;
      active.fightReward = effect.reward;
      active.queueIndex += 1;
      active.phase = 'fight';
      return 'fight';
    }
    if (effect.op === 'library') {
      active.offerIds = active.rolls.libraryIds;
      active.queueIndex += 1;
      active.phase = 'offer';
      return 'offer';
    }
    applyEffect(state, effect);
    active.queueIndex += 1;
    if (state.heroHp <= 0) {
      active.phase = 'result';
      return 'defeat';
    }
  }
  active.phase = 'result';
  if (active.resultLines.length === 0) active.resultLines.push('好了');
  return 'result';
}

export function resumeAfterShrine(state: EventRun): EventStep {
  const active = state.eventTrack.active;
  if (!active) return 'choose';
  const steps = upfrontPicks(active.shrineThen);
  if (steps.length > 0) {
    active.queue = [...active.shrineThen, ...active.queue.slice(active.queueIndex)];
    active.queueIndex = 0;
    active.pickSteps = steps;
    active.pickIndex = 0;
    active.draftUids = [];
    active.chosenUids = [];
    active.uidCursor = 0;
    active.shrineThen = [];
    active.phase = 'pick';
    return 'pick';
  }
  for (const effect of active.shrineThen) applyEffect(state, effect);
  active.shrineThen = [];
  if (state.heroHp <= 0) return 'defeat';
  return continueQueue(state);
}

export function noteShrineAnswer(state: EventRun, correct: boolean): EventStep {
  const active = state.eventTrack.active;
  if (!active || active.phase !== 'shrine') return active?.phase ?? 'choose';
  if (!correct) {
    state.heroHp = Math.max(0, state.heroHp - active.shrineHpPerMiss);
    state.flash = `-${active.shrineHpPerMiss}❤️`;
    if (state.heroHp <= 0) return 'defeat';
  } else {
    state.flash = '✨';
  }
  active.shrineLeft -= 1;
  if (active.shrineLeft > 0) return 'shrine';
  active.resultLines.push('三題都拼完了');
  return resumeAfterShrine(state);
}

export function takeEventOffer(state: EventRun, defId: string | null): EventStep {
  const active = state.eventTrack.active;
  if (!active || active.phase !== 'offer') return active?.phase ?? 'choose';
  if (defId) {
    if (!active.offerIds.includes(defId)) return 'offer';
    addCard(state, defId, 0);
    active.resultLines.push(`得到 ${getCard(defId).name}`);
  } else {
    active.resultLines.push('不拿也很好');
  }
  return continueQueue(state);
}

export function finishEventFight(state: EventRun): EventStep {
  const active = state.eventTrack.active;
  if (!active || active.phase !== 'fight') return active?.phase ?? 'choose';
  for (const effect of active.fightReward) applyEffect(state, effect);
  active.fightEncounterId = null;
  active.fightReward = [];
  return continueQueue(state);
}

export function isEventFight(state: EventRun): boolean {
  const active = state.eventTrack.active;
  return active?.phase === 'fight' && !!active.fightEncounterId;
}

export function choiceChips(state: EventRun, choice: EventChoiceDef): string[] {
  return effectChips(activeEffects(state, choice));
}

export function decorateCombat(
  state: EventRun,
  combat: CombatState,
  opts: { normalFight: boolean; boss: boolean },
): void {
  const ids = ownedRelicIds(state);
  if (ids.includes('rainSoundTube')) combat.relicRainBlock = 2;
  if (ids.includes('pocketMetronome')) combat.relicMetronome = true;
  if (ids.includes('moonMusicBox') && state.eventTrack.musicBoxUid) {
    combat.musicBoxSourceUid = state.eventTrack.musicBoxUid;
  }
  if (opts.boss && state.eventTrack.bossOpeningEnergy > 0) {
    combat.energy += state.eventTrack.bossOpeningEnergy;
  }
  if (
    opts.normalFight
    && state.eventTrack.normalHpBonusFights > 0
    && state.eventTrack.normalHpBonusPercent > 0
  ) {
    for (const enemy of combat.enemies) {
      const bonus = Math.ceil(enemy.maxHp * state.eventTrack.normalHpBonusPercent / 100);
      enemy.maxHp += bonus;
      enemy.hp += bonus;
    }
    const primary = combat.enemies[0];
    if (primary) {
      combat.enemyHp = primary.hp;
      combat.enemyMaxHp = primary.maxHp;
    }
    state.eventTrack.normalHpBonusFights -= 1;
  }
}

export function noteChoirVictory(state: EventRun): string | null {
  if (!ownedRelicIds(state).includes('choirRibbon')) return null;
  state.eventTrack.ribbonVictories += 1;
  if (state.eventTrack.ribbonVictories < 3) return null;
  state.eventTrack.ribbonVictories = 0;
  const gained = healBy(state, 5);
  return gained > 0 ? `合唱緞帶補了 ${gained} 顆心` : '合唱緞帶想補心，心已經滿了';
}

export function clearActiveEvent(state: EventRun): void {
  state.eventTrack.active = null;
}
