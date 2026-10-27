import {
  ELITE_REWARD_POOL_IDS,
  LATER_ACT_ELITE_REWARD_POOL_IDS,
  LATER_ACT_REWARD_POOL_IDS,
  PRACTICE_BADGE_THRESHOLD,
  PRACTICE_CARD_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCardCastBinding,
  getCard,
  isCardId,
  resolveCard,
  canUpgradeCard,
  type CardDef,
} from '../data/cards';
import {
  type CardOffer,
  type DeckCard,
  type UpgradeLevel,
  nextCardUid,
} from './cardInstances';
import {
  getPlayableCharacter,
  isPlayableCharacterId,
  type PlayableCharacterDef,
  type PlayableCharacterId,
} from '../data/characters';
import {
  GOLD_ELITE_BASE,
  GOLD_ELITE_FLAT_BONUS,
  GOLD_FIGHT_BASE,
  GOLD_JITTER,
  GOLD_TREASURE_BASE,
  GOLD_TREASURE_JITTER,
  HERO_MAX_HP,
  MATH_WARMUP_STREAK,
  POTION_DROP_START,
  RELIC_POOL_EXHAUST_GOLD,
  restHealAmount,
  SHOP_POTION_PRICE,
  SHOP_REMOVE_PRICE,
} from '../data/balance';
import {
  REST_HEAL,
  SHOP_CARD_PRICES,
  availableNextNodes,
  findNode,
  generateRunMap,
  getActMap,
  type MapNode,
  type RewardTier,
  type RunMap,
} from '../data/map';
import { getEnemyDef } from '../data/enemies';
import { getRelic, rollRelicDrop, type RelicDef } from '../data/relics';
import {
  emptyPotionBelt,
  firstEmptyPotionSlot,
  getPotion,
  isKnownPotionId,
  potionNeedsEnemy,
  rollCombatPotion,
  rollShopPotions,
} from '../data/potions';
import {
  applyCombatPotion,
  beginPlay,
  combatPotionBlock,
  combatRulesForGate,
  createCombat,
  endTurn,
  healedAmount,
  livingEnemies,
  makeCard,
  pickRewardIds,
  resolveCastFizzle,
  resolveCastSuccess,
  selectEnemy,
  takePendingFx,
  type CombatFx,
  type CombatState,
} from './combat';
import {
  isCastAnswerCorrect,
  pickCastMode,
  buildCastPrompt,
  recordCastResult,
  type CastPrompt,
  type CueDifficulty,
} from './castCheck';
import type { CastingGateId } from './casting/types';
import { castStreamRng, createCastSeed, takeCastRandom } from './castRng';
import { cancelSpeech } from './speech';
import { clearSavedRun, saveRunCheckpoint } from './save';
import { getDebugSkipCast } from '../debug/debugFlags';
import {
  isTutorialComplete,
  loadGameSettings,
  markTutorialComplete,
} from './settings';
import {
  awardActiveCharacterScore,
  filterObtainableCardsForProfile,
  getActiveProfile,
  getMathCastingPreferences,
  updateActiveProfile,
} from './profiles';
import {
  calculateRunScore,
  createRunScoreStats,
  type RunScoreResult,
  type RunScoreStats,
} from './progression';
import { recordPlaytestEvent } from './playtestTelemetry';
import {
  beginEventChoice,
  cancelEventPending,
  clearActiveEvent,
  confirmEventPending,
  confirmEventPick,
  createEventTrack,
  decorateCombat,
  ensureUnknownResolution,
  finishEventFight,
  isEventFight,
  noteChoirVictory,
  noteShrineAnswer,
  openEvent,
  takeEventOffer,
  toggleEventPick,
  type EventStep,
  type EventTrack,
} from './eventEngine';
import { acquireRelic as grantOwnedRelic } from './relicOwnership';

export type Screen =
  | 'title'
  | 'relicPick'
  | 'map'
  | 'rest'
  | 'smith'
  | 'removeCard'
  | 'shop'
  | 'shopRemove'
  | 'combat'
  | 'castCheck'
  | 'practice'
  | 'reward'
  | 'actClear'
  | 'event'
  | 'eventCast'
  | 'defeat'
  | 'victory';

export interface ShopOffer extends CardOffer {
  price: number;
  sold: boolean;
}

export interface ShopPotionOffer {
  potionId: string;
  price: number;
  sold: boolean;
}

export type TutorialStep = 'shield' | 'endTurn' | 'attack' | 'free';

/** Ephemeral: deliberately omitted from run saves. */
export interface TutorialState {
  step: TutorialStep;
  wrongAttempts: number;
}

export interface RunState {
  screen: Screen;
  heroHp: number;
  heroMaxHp: number;
  deck: DeckCard[];
  nextCardUid: number;
  gold: number;
  characterId: PlayableCharacterId | null;
  /** Owned relics in acquisition order. The starter is first on a new run. */
  relicIds: string[];
  /** Relic just awarded on the reward screen. Already included in relicIds. */
  pendingRelicId: string | null;
  /** Unknown-room rolls and the event in progress. */
  eventTrack: EventTrack;
  /** Three belt slots. Null is an empty loop. Order stays put when one is discarded. */
  potions: (string | null)[];
  /** Percent chance the next eligible fight drops a potion. Resets each act. */
  potionDropChance: number;
  /** Bottle shown on the reward screen. In the belt unless the belt was full. */
  pendingPotionId: string | null;
  /** The reward stays until this bottle is swapped in or left behind. */
  pendingPotionUnplaced: boolean;
  shopPotionOffers: ShopPotionOffer[];
  /** Full 3-act branching map for this run */
  runMap: RunMap;
  /** 0 = Act I, 1 = Act II, 2 = Act III */
  actIndex: number;
  /** Last completed room (null = pick a start node) */
  currentNodeId: string | null;
  /** Room currently being played (set when entering) */
  activeNodeId: string | null;
  visitedIds: string[];
  pathIds: string[];
  combat: CombatState | null;
  cast: {
    prompt: CastPrompt;
    cardDef: CardDef;
  } | null;
  rewardOptions: CardOffer[];
  rewardTier: RewardTier;
  pendingGold: number;
  /** HP restored after last fight win (shown on reward) — unused if HEAL_AFTER_COMBAT is 0 */
  pendingHeal: number;
  /** Why reward screen is open: fight win vs treasure chest */
  rewardSource: 'fight' | 'treasure' | null;
  flash: string | null;
  listenSuccesses: number;
  floatText: string | null;
  shopOffers: ShopOffer[];
  /** One paid remove per shop visit */
  shopRemoveUsed: boolean;
  practiceStreak: number;
  practiceSessionCorrect: number;
  /** Which act was just cleared (for actClear screen) */
  lastClearedAct: number;
  /** Combat motion batch for UI (drained from combat.pendingFx) */
  lastCombatFx: CombatFx[];
  tutorial: TutorialState | null;
  /** Saved as an optional flag so pre-feature saves never gain a tutorial. */
  tutorialEligibleRun: boolean;
  scoreStats: RunScoreStats;
  scoreCommitted: boolean;
  /** Terminal-only result; intentionally not written into resumable saves. */
  scoreResult: RunScoreResult | null;
  /** Prompt-draw stream. Checkpoints persist the counter so a reload continues it. */
  castSeed: number;
  castCounter: number;
}

const HERO_MAX = HERO_MAX_HP;

function addCardInstance(
  state: RunState,
  defId: string,
  upgradeLevel: UpgradeLevel = 0,
): DeckCard {
  const card: DeckCard = {
    uid: nextCardUid(state.nextCardUid),
    defId,
    upgradeLevel,
  };
  state.nextCardUid += 1;
  return card;
}

function upgradedOfferChance(state: RunState): number {
  if (state.actIndex <= 0) return 0;
  if (state.actIndex === 1) return 0.25;
  return 0.5;
}

function secureRandomUint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 0;
}

function secureRandomFloat(): number {
  return secureRandomUint32() / 0x1_0000_0000;
}

function secureRandomInt(maxExclusive: number): number {
  const max = Math.floor(maxExclusive);
  if (!Number.isFinite(max) || max <= 0) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  let value = secureRandomUint32();
  while (value >= limit) value = secureRandomUint32();
  return value % max;
}

function makeOffer(state: RunState, defId: string, source: 'reward' | 'shop'): CardOffer {
  const eligible =
    getActiveCharacter(state)?.upgradesEnabled === true &&
    getCard(defId).rarity !== 'basic' &&
    !!getCard(defId).upgrade;
  const upgradeLevel: UpgradeLevel =
    eligible && secureRandomFloat() < upgradedOfferChance(state) ? 1 : 0;
  const offer = addCardInstance(state, defId, upgradeLevel);
  recordPlaytestEvent({
    kind: 'offer',
    at: Date.now(),
    ...offer,
    act: state.actIndex + 1,
    source,
  });
  return offer;
}

function emptyRunMap(): RunMap {
  return generateRunMap(() => 0.5);
}

export function getOwnedRelics(state: RunState): RelicDef[] {
  return state.relicIds.map((id) => getRelic(id));
}

/** Adds a relic once. Start-of-run gold is applied here and is not repeated on load. */
export function acquireRelic(state: RunState, relicId: string, showPending = false): boolean {
  const goldBefore = state.gold;
  if (!grantOwnedRelic(state, relicId)) return false;
  if (showPending) {
    state.pendingGold += state.gold - goldBefore;
    state.pendingRelicId = relicId;
  }
  return true;
}

export function getActiveCharacter(state: RunState): PlayableCharacterDef | null {
  return state.characterId ? getPlayableCharacter(state.characterId) : null;
}

function combatRulesForRun(state: RunState): ReturnType<typeof combatRulesForGate> {
  return combatRulesForGate(getActiveCharacter(state)?.castingGateId ?? 'zhuyin');
}

export function getCurrentAct(state: RunState) {
  return getActMap(state.runMap, state.actIndex);
}

/** Nodes belonging only to the active act (never other acts). */
export function getCurrentActNodes(state: RunState): MapNode[] {
  const act = getCurrentAct(state);
  return act.nodes.filter((n) => n.act === act.act);
}

export function getActiveNode(state: RunState): MapNode | null {
  const node = findNode(state.runMap, state.activeNodeId);
  if (!node) return null;
  // Ignore stale ids from another act
  if (node.act !== getCurrentAct(state).act) return null;
  return node;
}

export function getAvailableMapNodes(state: RunState): MapNode[] {
  const act = getCurrentAct(state);
  // Only allow picking rooms on the current act graph
  let currentId = state.currentNodeId;
  if (currentId) {
    const cur = findNode(state.runMap, currentId);
    if (!cur || cur.act !== act.act) currentId = null;
  }
  return availableNextNodes(act, currentId);
}

export function createNewRun(): RunState {
  let initialUid = 1;
  return {
    screen: 'title',
    heroHp: HERO_MAX,
    heroMaxHp: HERO_MAX,
    deck: STARTER_DECK_IDS.map((defId) => ({
      uid: nextCardUid(initialUid++),
      defId,
      upgradeLevel: 0,
    })),
    nextCardUid: initialUid,
    gold: 0,
    characterId: null,
    relicIds: [],
    pendingRelicId: null,
    eventTrack: createEventTrack(1),
    potions: emptyPotionBelt(),
    potionDropChance: POTION_DROP_START,
    pendingPotionId: null,
    pendingPotionUnplaced: false,
    runMap: emptyRunMap(),
    actIndex: 0,
    currentNodeId: null,
    activeNodeId: null,
    visitedIds: [],
    pathIds: [],
    combat: null,
    cast: null,
    rewardOptions: [],
    rewardTier: 'normal',
    pendingGold: 0,
    rewardSource: null,
    pendingHeal: 0,
    flash: null,
    listenSuccesses: 0,
    floatText: null,
    shopOffers: [],
    shopPotionOffers: [],
    shopRemoveUsed: false,
    practiceStreak: 0,
    practiceSessionCorrect: 0,
    lastClearedAct: 0,
    lastCombatFx: [],
    tutorial: null,
    tutorialEligibleRun: false,
    scoreStats: createRunScoreStats(),
    scoreCommitted: false,
    scoreResult: null,
    castSeed: createCastSeed(),
    castCounter: 0,
  };
}

function drainCombatFx(state: RunState): void {
  if (!state.combat) {
    state.lastCombatFx = [];
    return;
  }
  state.lastCombatFx = takePendingFx(state.combat);
}

export function consumeCombatFx(state: RunState): CombatFx[] {
  const fx = state.lastCombatFx;
  state.lastCombatFx = [];
  return fx;
}

export function startRun(state: RunState): void {
  clearSavedRun();
  state.heroHp = HERO_MAX;
  state.heroMaxHp = HERO_MAX;
  state.nextCardUid = 1;
  state.deck = STARTER_DECK_IDS.map((id) => addCardInstance(state, id));
  state.gold = 0;
  state.characterId = null;
  state.relicIds = [];
  state.pendingRelicId = null;
  state.eventTrack = createEventTrack(secureRandomUint32() || 1);
  state.potions = emptyPotionBelt();
  state.potionDropChance = POTION_DROP_START;
  state.pendingPotionId = null;
  state.pendingPotionUnplaced = false;
  state.runMap = generateRunMap();
  state.actIndex = 0;
  state.currentNodeId = null;
  state.activeNodeId = null;
  state.visitedIds = [];
  state.pathIds = [];
  state.combat = null;
  state.cast = null;
  state.rewardOptions = [];
  state.rewardTier = 'normal';
  state.pendingGold = 0;
  state.pendingHeal = 0;
  state.rewardSource = null;
  state.flash = null;
  state.listenSuccesses = 0;
  state.floatText = null;
  state.shopOffers = [];
  state.shopPotionOffers = [];
  state.shopRemoveUsed = false;
  state.practiceStreak = 0;
  state.practiceSessionCorrect = 0;
  state.lastClearedAct = 0;
  state.lastCombatFx = [];
  state.tutorial = null;
  state.tutorialEligibleRun = true;
  state.scoreStats = createRunScoreStats();
  state.scoreCommitted = false;
  state.scoreResult = null;
  state.castSeed = createCastSeed();
  state.castCounter = 0;
  state.screen = 'relicPick';
  saveRunCheckpoint(state);
}

function rollPracticeCard(state: RunState): CardDef {
  const index = Math.floor(takeCastRandom(state) * PRACTICE_CARD_IDS.length);
  const id = PRACTICE_CARD_IDS[index] ?? 'bo';
  return getCard(id);
}

function drawCastPrompt(
  state: RunState,
  def: CardDef,
  stage: CueDifficulty,
  gateId: CastingGateId,
): CastPrompt {
  const rng = castStreamRng(state);
  const binding = getCardCastBinding(def, gateId, gateId === 'math' ? getMathCastingPreferences() : undefined);
  const modeStage = stage === 'practice' ? 'early' : stage;
  const mode = pickCastMode(modeStage, rng, binding.lessonFamilyId, gateId);
  const tierOverride = gateId === 'math' && (state.combat?.mathMissStreak ?? 0) >= MATH_WARMUP_STREAK
    ? 1 as const
    : undefined;
  return buildCastPrompt(def, mode, rng, stage, gateId, tierOverride ? { tierOverride } : undefined);
}

export function enterPractice(state: RunState): void {
  cancelSpeech();
  state.combat = null;
  state.practiceStreak = 0;
  state.practiceSessionCorrect = 0;
  state.flash = null;
  state.floatText = null;
  nextPracticePrompt(state);
}

export function nextPracticePrompt(state: RunState): void {
  const def = rollPracticeCard(state);
  const prompt = drawCastPrompt(state, def, 'practice', 'zhuyin');
  state.cast = { prompt, cardDef: def };
  state.screen = 'practice';
}

export function answerPractice(state: RunState, attempt: string[]): boolean {
  if (!state.cast || state.screen !== 'practice') return false;
  cancelSpeech();
  const { prompt } = state.cast;
  const correct = isCastAnswerCorrect(prompt, attempt);
  recordCastResult(prompt, correct);
  if (correct) {
    state.practiceStreak += 1;
    state.practiceSessionCorrect += 1;
    state.flash = '✨';
    bumpPracticeCorrectLifetime();
  } else {
    state.practiceStreak = 0;
    state.flash = '💨';
  }
  return correct;
}

export function leavePractice(state: RunState): void {
  cancelSpeech();
  state.cast = null;
  state.flash = null;
  state.screen = 'title';
}

function bumpPracticeCorrectLifetime(): void {
  updateActiveProfile((profile) => ({
    ...profile,
    practiceCorrect: profile.practiceCorrect + 1,
  }));
}

export function getPracticeLifetimeCorrect(): number {
  return getActiveProfile().practiceCorrect;
}

export function hasPracticeBadge(): boolean {
  return getPracticeLifetimeCorrect() >= PRACTICE_BADGE_THRESHOLD;
}

export function pickCharacter(state: RunState, characterId: string): boolean {
  if (!isPlayableCharacterId(characterId)) return false;
  const character = getPlayableCharacter(characterId);
  const relic = getRelic(character.startingRelicId);
  state.characterId = characterId;
  state.nextCardUid = 1;
  state.deck = character.starterDeckIds.map((id) => addCardInstance(state, id));
  state.relicIds = [];
  state.pendingRelicId = null;
  acquireRelic(state, relic.id);
  state.screen = 'map';
  saveRunCheckpoint(state);
  return true;
}

export function isTutorialEligible(state: RunState, node: MapNode): boolean {
  return (
    state.characterId === 'echoMage' &&
    state.tutorialEligibleRun &&
    loadGameSettings().tutorialEnabled &&
    !isTutorialComplete() &&
    state.actIndex === 0 &&
    node.act === 1 &&
    node.row === 0 &&
    node.kind === 'fight' &&
    state.currentNodeId === null &&
    state.visitedIds.length === 0
  );
}

function createTutorialCombat(state: RunState): CombatState {
  const combat = createCombat(
    state.deck,
    'tutorialSlime',
    state.heroHp,
    state.heroMaxHp,
    getOwnedRelics(state),
    undefined,
    combatRulesForRun(state),
  );

  // This ordering is local to the tutorial combat. The player's saved deck is
  // never changed. drawPile.pop() draws from the end on later turns.
  let tutorialCopy = 0;
  const tutorialCard = (id: string) => makeCard({
    uid: `tutorial-${id}-${tutorialCopy++}`,
    defId: id,
    upgradeLevel: 0,
  });
  combat.hand = ['mo', 'bo', 'bo', 'po', 'bo'].map(tutorialCard);
  combat.drawPile = ['mo', 'mo', 'mo', 'po', 'bo'].map(tutorialCard);
  combat.discardPile = [];
  combat.pending = null;
  combat.pendingTargetIds = [];
  combat.pendingFx = [{ type: 'draw', cards: [...combat.hand] }];
  combat.log = ['練習史萊姆來了！先看看牠要做什麼。'];
  return combat;
}

function applyEventStep(state: RunState, step: EventStep): void {
  if (step === 'done') {
    completeNode(state);
    return;
  }
  if (step === 'defeat' || state.heroHp <= 0) {
    commitRunScore(state, false);
    state.screen = 'defeat';
    state.combat = null;
    state.cast = null;
    clearSavedRun();
    return;
  }
  if (step === 'shrine' || state.eventTrack.active?.phase === 'shrine') {
    state.cast = null;
    state.screen = 'eventCast';
    ensureEventCast(state);
    saveRunCheckpoint(state);
    return;
  }
  state.screen = 'event';
  saveRunCheckpoint(state);
}

function enterUnknownNode(state: RunState, node: MapNode): void {
  const resolution = ensureUnknownResolution(state, node);
  if (resolution.outcome === 'shop') {
    openShop(state);
    return;
  }
  if (resolution.outcome === 'treasure') {
    openTreasure(state);
    return;
  }
  if (resolution.outcome === 'event' && resolution.eventId) {
    openEvent(state, node.id, resolution.eventId);
    state.screen = 'event';
    saveRunCheckpoint(state);
    return;
  }
  // Persist the rolled fight before combat. Combat itself is not a save screen,
  // so a reload returns here and starts the same encounter again.
  saveRunCheckpoint(state);
  state.combat = createCombat(
    state.deck,
    resolution.enemyId ?? 'slime',
    state.heroHp,
    state.heroMaxHp,
    getOwnedRelics(state),
    resolution.encounterId,
    combatRulesForRun(state),
  );
  decorateCombat(state, state.combat, { normalFight: true, boss: false });
  state.tutorial = null;
  state.scoreStats.currentCombatHpLost = 0;
  drainCombatFx(state);
  state.screen = 'combat';
}

/** Rebuild the shrine prompt when a save resumes mid-question. */
export function ensureEventCast(state: RunState): void {
  if (state.screen !== 'eventCast' || state.cast) return;
  const preferred = state.eventTrack.active?.shrineCardId;
  const fallback = state.deck.find((card) => !getCard(card.defId).curse)?.defId ?? 'bo';
  const cardId = preferred && isCardId(preferred) && !getCard(preferred).curse ? preferred : fallback;
  const cardDef = getCard(cardId);
  state.cast = {
    prompt: drawCastPrompt(state, cardDef, 'early', 'zhuyin'),
    cardDef,
  };
}

export function chooseEventChoice(state: RunState, choiceId: string): void {
  if (state.screen !== 'event') return;
  applyEventStep(state, beginEventChoice(state, choiceId));
}

export function confirmEventChoice(state: RunState): void {
  if (state.screen !== 'event') return;
  applyEventStep(state, confirmEventPending(state));
}

export function cancelEventChoice(state: RunState): void {
  if (state.screen !== 'event') return;
  cancelEventPending(state);
  saveRunCheckpoint(state);
}

export function toggleEventCard(state: RunState, uid: string): void {
  if (state.screen !== 'event') return;
  toggleEventPick(state, uid);
}

export function confirmEventCard(state: RunState): void {
  if (state.screen !== 'event') return;
  applyEventStep(state, confirmEventPick(state));
}

export function takeEventOfferCard(state: RunState, defId: string | null): void {
  if (state.screen !== 'event') return;
  applyEventStep(state, takeEventOffer(state, defId));
}

export function continueEventResult(state: RunState): void {
  if (state.screen !== 'event' || state.eventTrack.active?.phase !== 'result') return;
  completeNode(state);
}

/** Save the fight phase, then enter combat. A reload shows the same start. */
export function startEventCombat(state: RunState): void {
  const active = state.eventTrack.active;
  if (state.screen !== 'event' || !active?.fightEncounterId) return;
  saveRunCheckpoint(state);
  state.combat = createCombat(
    state.deck,
    'slime',
    state.heroHp,
    state.heroMaxHp,
    getOwnedRelics(state),
    active.fightEncounterId,
    combatRulesForRun(state),
  );
  decorateCombat(state, state.combat, { normalFight: false, boss: false });
  state.scoreStats.currentCombatHpLost = 0;
  drainCombatFx(state);
  state.screen = 'combat';
}

export function answerEventShrine(state: RunState, correct: boolean): void {
  if (state.screen !== 'eventCast') return;
  state.cast = null;
  const step = noteShrineAnswer(state, correct);
  if (step === 'shrine') {
    state.screen = 'eventCast';
    ensureEventCast(state);
    saveRunCheckpoint(state);
    return;
  }
  applyEventStep(state, step);
}

/** Player clicked a lit node on the map web. */
export function selectMapNode(state: RunState, nodeId: string): void {
  const available = getAvailableMapNodes(state);
  if (!available.some((n) => n.id === nodeId)) return;
  const node = findNode(state.runMap, nodeId);
  if (!node) return;
  // Never enter a room from another act
  if (node.act !== getCurrentAct(state).act) return;

  state.activeNodeId = nodeId;
  state.cast = null;
  state.floatText = null;
  state.rewardTier = node.rewardTier ?? (node.kind === 'elite' || node.kind === 'boss' ? 'elite' : 'normal');

  if (node.kind === 'rest') {
    state.screen = 'rest';
    saveRunCheckpoint(state);
    return;
  }

  if (node.kind === 'shop') {
    openShop(state);
    return;
  }

  if (node.kind === 'treasure') {
    openTreasure(state);
    return;
  }

  if (node.kind === 'unknown') {
    enterUnknownNode(state, node);
    return;
  }

  // fight / elite / boss
  if (!node.enemyId && !node.encounterId) {
    throw new Error(`Node ${node.id} missing enemyId/encounterId`);
  }

  const tutorial = isTutorialEligible(state, node);
  state.combat = tutorial
    ? createTutorialCombat(state)
    : createCombat(
        state.deck,
        node.enemyId ?? 'slime',
        state.heroHp,
        state.heroMaxHp,
        getOwnedRelics(state),
        node.encounterId,
        combatRulesForRun(state),
      );
  if (state.combat && !tutorial) {
    decorateCombat(state, state.combat, {
      normalFight: node.kind === 'fight',
      boss: node.kind === 'boss',
    });
  }
  state.tutorial = tutorial ? { step: 'shield', wrongAttempts: 0 } : null;
  state.scoreStats.currentCombatHpLost = 0;
  drainCombatFx(state);
  state.screen = 'combat';
}

function activeRestNode(state: RunState): MapNode | null {
  if (!state.activeNodeId) return null;
  const node = findNode(state.runMap, state.activeNodeId);
  if (!node || node.kind !== 'rest') return null;
  if (node.act !== getCurrentAct(state).act) return null;
  return node;
}

/** Heal once at campfire (40% max HP), then leave the node. */
export function applyRestHeal(state: RunState): boolean {
  if (state.screen !== 'rest') return false;
  if (!activeRestNode(state)) return false;

  const before = state.heroHp;
  const amount = restHealAmount(state.heroMaxHp);
  state.heroHp = Math.min(state.heroMaxHp, state.heroHp + amount);
  const gained = state.heroHp - before;
  state.flash = gained > 0 ? `❤️+${gained}` : '❤️MAX';
  completeNode(state);
  return true;
}

export function canSmith(state: RunState): boolean {
  if (getActiveCharacter(state)?.upgradesEnabled !== true) return false;
  return state.deck.some((card) => canUpgradeCard(card.defId, card.upgradeLevel));
}

export function beginSmith(state: RunState): boolean {
  if (state.screen !== 'rest' || !activeRestNode(state) || !canSmith(state)) {
    state.flash = '🔨×';
    return false;
  }
  state.screen = 'smith';
  saveRunCheckpoint(state);
  return true;
}

export function smithCard(state: RunState, uid: string): boolean {
  if (
    state.screen !== 'smith' ||
    !activeRestNode(state) ||
    getActiveCharacter(state)?.upgradesEnabled !== true
  ) return false;
  const card = state.deck.find((candidate) => candidate.uid === uid);
  if (!card || !canUpgradeCard(card.defId, card.upgradeLevel)) return false;
  card.upgradeLevel = 1;
  recordPlaytestEvent({ kind: 'smith', at: Date.now(), ...card });
  state.flash = '🔨✨';
  completeNode(state);
  return true;
}

export function cancelSmith(state: RunState): void {
  if (state.screen !== 'smith' || !activeRestNode(state)) return;
  state.screen = 'rest';
  state.flash = null;
  saveRunCheckpoint(state);
}

/** Open remove-card picker (still on this rest; not completed yet). */
export function beginRestRemove(state: RunState): boolean {
  if (state.screen !== 'rest') return false;
  if (!activeRestNode(state)) return false;
  if (state.deck.length <= 1) {
    state.flash = '🃏×';
    return false;
  }
  state.screen = 'removeCard';
  saveRunCheckpoint(state);
  return true;
}

/** Remove one card once, then leave the rest node. */
export function removeCardFromDeck(state: RunState, index: number): boolean {
  if (state.screen !== 'removeCard') return false;
  if (!activeRestNode(state)) return false;
  if (index < 0 || index >= state.deck.length) return false;
  if (state.deck.length <= 1) return false;

  const [removed] = state.deck.splice(index, 1);
  if (removed) recordPlaytestEvent({ kind: 'remove', at: Date.now(), ...removed });
  state.flash = '🗑️✨';
  completeNode(state);
  return true;
}

/** Cancel remove — return to campfire choices (heal still available). */
export function skipRemoveCard(state: RunState): void {
  if (state.screen !== 'removeCard') return;
  if (!activeRestNode(state)) return;
  state.screen = 'rest';
  state.flash = null;
  saveRunCheckpoint(state);
}

function openShop(state: RunState): void {
  const ids = pickRewardIds(rewardPoolFor(state, 'normal'), 3);
  state.shopOffers = ids.map((defId, i) => ({
    ...makeOffer(state, defId, 'shop'),
    price: SHOP_CARD_PRICES[i] ?? 45,
    sold: false,
  }));
  state.shopPotionOffers = rollShopPotions(secureRandomInt).map((potionId) => ({
    potionId,
    price: SHOP_POTION_PRICE,
    sold: false,
  }));
  state.shopRemoveUsed = false;
  state.screen = 'shop';
  saveRunCheckpoint(state);
}

/** One unowned pool relic, or exhaust gold when the pool is already owned. */
function grantRelicReward(state: RunState): void {
  const relicId = rollRelicDrop(state.relicIds, secureRandomInt, state.characterId);
  if (!relicId) {
    state.gold += RELIC_POOL_EXHAUST_GOLD;
    state.pendingGold += RELIC_POOL_EXHAUST_GOLD;
    state.pendingRelicId = null;
    return;
  }
  acquireRelic(state, relicId, true);
}

/** Treasure chest: gold plus one relic. Cards stay on fight rewards. */
function openTreasure(state: RunState): void {
  const gold = GOLD_TREASURE_BASE + secureRandomInt(GOLD_TREASURE_JITTER);
  state.gold += gold;
  state.pendingGold = gold;
  state.pendingHeal = 0;
  state.rewardSource = 'treasure';
  state.rewardTier = 'normal';
  state.rewardOptions = [];
  state.pendingRelicId = null;
  state.pendingPotionId = null;
  state.pendingPotionUnplaced = false;
  grantRelicReward(state);
  state.screen = 'reward';
  saveRunCheckpoint(state);
}

/** Debug: open an unvisited chest in this act, even when it is not the next room. */
export function debugOpenActTreasure(state: RunState): boolean {
  const treasures = getCurrentActNodes(state).filter((node) => node.kind === 'treasure');
  const treasure = treasures.find((node) => !state.visitedIds.includes(node.id)) ?? treasures[0];
  if (!treasure) return false;
  state.combat = null;
  state.cast = null;
  state.floatText = null;
  state.activeNodeId = treasure.id;
  state.rewardTier = treasure.rewardTier ?? 'normal';
  openTreasure(state);
  return true;
}

export function buyShopCard(state: RunState, offerIndex: number): void {
  const offer = state.shopOffers[offerIndex];
  if (!offer || offer.sold) return;
  if (state.gold < offer.price) {
    state.flash = '🪙×';
    return;
  }
  state.gold -= offer.price;
  state.deck.push({ uid: offer.uid, defId: offer.defId, upgradeLevel: offer.upgradeLevel });
  recordPlaytestEvent({ kind: 'pick', at: Date.now(), uid: offer.uid, defId: offer.defId, upgradeLevel: offer.upgradeLevel });
  offer.sold = true;
  state.flash = '🛒✨';
  saveRunCheckpoint(state);
}

export function buyShopPotion(state: RunState, offerIndex: number): boolean {
  if (state.screen !== 'shop') return false;
  const offer = state.shopPotionOffers[offerIndex];
  if (!offer || offer.sold) return false;
  if (state.gold < offer.price) {
    state.flash = '🪙×';
    return false;
  }
  const slot = firstEmptyPotionSlot(state.potions);
  if (slot < 0) {
    state.flash = '🧪滿';
    return false;
  }
  state.gold -= offer.price;
  state.potions[slot] = offer.potionId;
  offer.sold = true;
  state.flash = '🧪✨';
  saveRunCheckpoint(state);
  return true;
}

/** Open paid remove-card picker (once per shop). */
export function beginShopRemove(state: RunState): boolean {
  if (state.screen !== 'shop') return false;
  if (state.shopRemoveUsed) {
    state.flash = '🗑️×';
    return false;
  }
  if (state.deck.length <= 1) {
    state.flash = '🃏×';
    return false;
  }
  if (state.gold < SHOP_REMOVE_PRICE) {
    state.flash = '🪙×';
    return false;
  }
  state.screen = 'shopRemove';
  saveRunCheckpoint(state);
  return true;
}

/** Pay gold, remove one card, stay in shop. */
export function confirmShopRemove(state: RunState, index: number): boolean {
  if (state.screen !== 'shopRemove') return false;
  if (state.shopRemoveUsed) return false;
  if (index < 0 || index >= state.deck.length) return false;
  if (state.deck.length <= 1) return false;
  if (state.gold < SHOP_REMOVE_PRICE) {
    state.flash = '🪙×';
    state.screen = 'shop';
    return false;
  }
  state.gold -= SHOP_REMOVE_PRICE;
  const [removed] = state.deck.splice(index, 1);
  if (removed) recordPlaytestEvent({ kind: 'remove', at: Date.now(), ...removed });
  state.shopRemoveUsed = true;
  state.flash = '🗑️✨';
  state.screen = 'shop';
  saveRunCheckpoint(state);
  return true;
}

export function cancelShopRemove(state: RunState): void {
  if (state.screen !== 'shopRemove') return;
  state.screen = 'shop';
  state.flash = null;
  saveRunCheckpoint(state);
}

export function leaveShop(state: RunState): void {
  completeNode(state);
}

/** Mark active room done; return to map (or act clear / victory). */
function completeNode(state: RunState): void {
  const nodeId = state.activeNodeId;
  const node = findNode(state.runMap, nodeId);
  state.combat = null;
  state.rewardOptions = [];
  state.pendingGold = 0;
  state.pendingHeal = 0;
  state.pendingRelicId = null;
  state.pendingPotionId = null;
  state.pendingPotionUnplaced = false;
  state.rewardSource = null;

  clearActiveEvent(state);
  if (nodeId) {
    if (!state.visitedIds.includes(nodeId)) state.visitedIds.push(nodeId);
    if (!state.pathIds.includes(nodeId)) state.pathIds.push(nodeId);
    state.currentNodeId = nodeId;
    state.scoreStats.roomsCompleted += 1;
  }
  state.activeNodeId = null;

  if (node?.kind === 'boss') {
    finishBoss(state, node.act);
    return;
  }

  state.screen = 'map';
  saveRunCheckpoint(state);
}

function finishBoss(state: RunState, act: number): void {
  // act is 1|2|3
  if (act >= 3) {
    commitRunScore(state, true);
    state.screen = 'victory';
    clearSavedRun();
    updateActiveProfile((profile) => ({
      ...profile,
      cleared: true,
      earBadge: profile.earBadge || state.listenSuccesses > 0,
      completedRuns: profile.completedRuns + 1,
    }));
    return;
  }

  // HP is restored as soon as the boss is cleared, before its reward screen.
  state.flash = '❤️ 回滿';
  state.lastClearedAct = act;
  state.actIndex = act; // act 1 clear → index 1 (Act II)
  state.potionDropChance = POTION_DROP_START;
  state.currentNodeId = null;
  state.activeNodeId = null;
  // Drop prior-act path so the map never paints old rooms
  state.visitedIds = [];
  state.pathIds = [];
  state.screen = 'actClear';
  saveRunCheckpoint(state);
}

export function continueAfterActClear(state: RunState): void {
  state.screen = 'map';
  saveRunCheckpoint(state);
}

function currentCastStage(state: RunState) {
  const node = getActiveNode(state);
  return node?.castStage ?? 'early';
}

function requiredTutorialCardId(step: TutorialStep): string | null {
  if (step === 'shield') return 'mo';
  if (step === 'attack') return 'bo';
  return null;
}

export function canTutorialPlayCard(state: RunState, uid: string): boolean {
  if (!state.tutorial || !state.combat) return true;
  if (state.tutorial.step === 'free') return true;
  // End Turn is the recommended next lesson, not a hard action lock. Keeping
  // affordable cards playable makes the remaining energy behave normally.
  if (state.tutorial.step === 'endTurn') return true;
  const card = state.combat.hand.find((item) => item.uid === uid);
  if (!card) return false;
  return card.defId === requiredTutorialCardId(state.tutorial.step);
}

function tutorialRequiredCardAvailable(state: RunState): boolean {
  if (!state.tutorial || !state.combat) return false;
  const requiredId = requiredTutorialCardId(state.tutorial.step);
  if (!requiredId) return false;
  return state.combat.hand.some((card) => {
    const def = getCard(card.defId);
    return card.defId === requiredId && def.cost <= state.combat!.energy;
  });
}

export function canTutorialEndTurn(state: RunState): boolean {
  if (!state.tutorial) return true;
  if (state.tutorial.step === 'free' || state.tutorial.step === 'endTurn') return true;
  // Recovery route: a wrong cast can consume the required card/energy.
  return !tutorialRequiredCardAvailable(state);
}

function advanceTutorialAfterCast(
  state: RunState,
  def: CardDef,
  correct: boolean,
): void {
  if (!state.tutorial) return;
  if (!correct) {
    state.tutorial.wrongAttempts += 1;
    return;
  }
  if (state.tutorial.step === 'shield' && def.id === 'mo') {
    state.tutorial.step = 'endTurn';
  } else if (state.tutorial.step === 'attack' && def.id === 'bo') {
    state.tutorial.step = 'free';
  }
}

/**
 * Play a card. Optional targetIds from drag-drop; otherwise selected/first enemy.
 * Debug: when skip-cast is on, resolve success immediately (no 注音 screen).
 */
export function tryPlayCard(
  state: RunState,
  uid: string,
  targetIds: string[] = [],
  chosenHandUid?: string,
): void {
  if (!state.combat || state.combat.status !== 'playing') return;
  if (!canTutorialPlayCard(state, uid)) {
    state.flash = '👆照著亮圈玩';
    return;
  }
  try {
    const def = beginPlay(state.combat, uid, targetIds, chosenHandUid);

    if (getDebugSkipCast()) {
      const combat = state.combat;
      resolveCastSuccess(combat, def);
      advanceTutorialAfterCast(state, def, true);
      state.flash = '✨';
      state.floatText = null;
      state.cast = null;
      syncHeroHpFromCombat(state);
      drainCombatFx(state);
      // status may change inside resolveCastSuccess (TS doesn't re-narrow)
      if ((combat.status as CombatState['status']) === 'won') {
        finishFight(state);
        return;
      }
      state.screen = 'combat';
      return;
    }

    const stage = currentCastStage(state);
    const gateId = getActiveCharacter(state)?.castingGateId ?? 'zhuyin';
    const prompt = drawCastPrompt(state, def, stage, gateId);
    state.cast = { prompt, cardDef: def };
    state.screen = 'castCheck';
  } catch {
    state.flash = '⚡×';
  }
}

export function selectCombatEnemy(state: RunState, enemyInstanceId: string): void {
  if (!state.combat) return;
  selectEnemy(state.combat, enemyInstanceId);
}

/** Debug: force win current combat and open reward flow. */
export function debugFinishFight(state: RunState): void {
  if (!state.combat) return;
  for (const e of state.combat.enemies) {
    e.hp = 0;
    e.alive = false;
  }
  state.combat.status = 'won';
  syncHeroHpFromCombat(state);
  drainCombatFx(state);
  finishFight(state);
}

/** Debug: start a fight without a map node. */
export function debugStartEncounter(
  state: RunState,
  enemyId: string,
  encounterId?: string,
): void {
  state.cast = null;
  state.tutorial = null;
  state.activeNodeId = null;
  state.combat = createCombat(
    state.deck,
    enemyId,
    state.heroHp,
    state.heroMaxHp,
    getOwnedRelics(state),
    encounterId,
    combatRulesForRun(state),
  );
  decorateCombat(state, state.combat, {
    normalFight: false,
    boss: !!getEnemyDef(enemyId).isBoss,
  });
  state.scoreStats.currentCombatHpLost = 0;
  drainCombatFx(state);
  state.screen = 'combat';
}

export function answerCast(state: RunState, attempt: string[]): 'success' | 'fizzle' | 'retry' {
  if (!state.combat || !state.cast) return 'fizzle';
  cancelSpeech();
  const { prompt, cardDef } = state.cast;
  const correct = isCastAnswerCorrect(prompt, attempt);
  const mathRetry = prompt.gateId === 'math'
    && !correct
    && !prompt.retry
    && !state.combat.mathRetryUsed
    && !state.combat.parentHintUsed
    && getMathCastingPreferences().scaffoldedRetry;
  if (mathRetry) {
    state.combat.mathRetryUsed = true;
    state.cast = { prompt: { ...prompt, retry: true }, cardDef };
    state.screen = 'castCheck';
    return 'retry';
  }
  recordCastResult(prompt, correct);
  if (prompt.gateId === 'math') {
    state.combat.mathMissStreak = correct ? 0 : state.combat.mathMissStreak + 1;
  }

  if (correct) {
    resolveCastSuccess(state.combat, cardDef);
    advanceTutorialAfterCast(state, cardDef, true);
    state.flash = '✨';
    if (prompt.mode === 'listen' || prompt.mode === 'listenHard') {
      state.listenSuccesses += 1;
    }
    state.floatText = null;
  } else {
    resolveCastFizzle(state.combat, cardDef);
    advanceTutorialAfterCast(state, cardDef, false);
    state.flash = '💨';
    state.floatText = null;
  }

  state.cast = null;
  syncHeroHpFromCombat(state);
  drainCombatFx(state);

  if (state.combat.status === 'won') {
    // Still play discard FX before leaving combat if UI wants; keep batch
    finishFight(state);
    return correct ? 'success' : 'fizzle';
  }
  if (state.combat.status === 'lost') {
    recordCombatTelemetry(state, false);
    commitRunScore(state, false);
    state.screen = 'defeat';
    clearSavedRun();
    return 'fizzle';
  }
  state.screen = 'combat';
  return correct ? 'success' : 'fizzle';
}

export function useParentHint(state: RunState): string | null {
  if (!state.cast) return null;
  if (state.screen === 'practice') {
    return state.cast.prompt.correctionText;
  }
  if (!state.combat) return null;
  // The first-run lesson is allowed to help on every guided spelling.
  if (state.tutorial) return state.cast.prompt.correctionText;
  if (state.combat.parentHintUsed) return null;
  state.combat.parentHintUsed = true;
  return state.cast.prompt.correctionText;
}

export function playerEndTurn(state: RunState): void {
  if (!state.combat || state.combat.status !== 'playing') return;
  if (!canTutorialEndTurn(state)) {
    state.flash = '👆先完成亮起來的步驟';
    return;
  }
  const tutorialStep = state.tutorial?.step ?? null;
  const status = endTurn(state.combat);
  syncHeroHpFromCombat(state);
  drainCombatFx(state);
  state.floatText = null;
  if (status === 'lost') {
    recordCombatTelemetry(state, false);
    commitRunScore(state, false);
    state.screen = 'defeat';
    clearSavedRun();
    return;
  }
  if (state.tutorial && tutorialStep === 'endTurn') {
    state.tutorial.step = 'attack';
  }
}

function fightGold(state: RunState): number {
  const node = getActiveNode(state);
  let base = GOLD_FIGHT_BASE;
  if (node?.kind === 'elite' || node?.kind === 'boss') base = GOLD_ELITE_BASE;
  const jitter = secureRandomInt(GOLD_JITTER);
  let bonus = node?.goldBonus ?? 0;
  if (node?.kind === 'elite') bonus += GOLD_ELITE_FLAT_BONUS;
  return base + jitter + bonus;
}

export function rewardPoolFor(
  state: RunState,
  tier: RewardTier,
): string[] {
  const character = getActiveCharacter(state);
  const characterPool = state.actIndex === 0
    ? character?.actIRewardIds
    : character?.cardPoolIds;
  const pool = characterPool && characterPool.length > 0
    ? [...characterPool]
    : state.actIndex === 0
      ? tier === 'elite' ? ELITE_REWARD_POOL_IDS : REWARD_POOL_IDS
      : tier === 'elite'
        ? LATER_ACT_ELITE_REWARD_POOL_IDS
        : LATER_ACT_REWARD_POOL_IDS;
  const characterId = state.characterId;
  if (!characterId) return [...pool];
  const profile = getActiveProfile();
  return filterObtainableCardsForProfile(profile, characterId, pool);
}

function finishFight(state: RunState): void {
  recordCombatTelemetry(state, true);
  if (!state.combat) return;
  if (state.tutorial) {
    markTutorialComplete();
    state.tutorial = null;
  }
  syncHeroHpFromCombat(state);
  const ribbon = noteChoirVictory(state);
  if (isEventFight(state)) {
    const step = finishEventFight(state);
    if (ribbon && state.eventTrack.active) state.eventTrack.active.resultLines.push(ribbon);
    state.combat = null;
    state.pendingHeal = 0;
    applyEventStep(state, step);
    return;
  }
  if (ribbon) state.flash = ribbon;
  // No ordinary post-combat heal — campfires restore 40% max HP.
  state.pendingHeal = 0;
  state.pendingRelicId = null;
  const node = getActiveNode(state);
  if (node?.kind === 'boss') {
    state.scoreStats.bossWins += 1;
    if (state.scoreStats.currentCombatHpLost === 0) state.scoreStats.flawlessBosses += 1;
  } else if (node?.kind === 'elite') {
    state.scoreStats.eliteWins += 1;
    if (state.scoreStats.currentCombatHpLost === 0) state.scoreStats.flawlessElites += 1;
  } else if (node?.kind === 'fight' || node?.kind === 'unknown') {
    state.scoreStats.normalWins += 1;
  }

  if (node?.kind === 'boss') {
    const before = state.heroHp;
    state.heroHp = state.heroMaxHp;
    state.pendingHeal = state.heroHp - before;
    const gold = fightGold(state);
    state.gold += gold;
    state.pendingGold = gold;
    state.rewardSource = 'fight';
    state.rewardTier = 'elite';
    state.rewardOptions = pickRewardIds(rewardPoolFor(state, 'elite'), 3)
      .map((id) => makeOffer(state, id, 'reward'));
    grantRelicReward(state);
    resolvePotionDrop(state, secureRandomInt);
    state.screen = 'reward';
    saveRunCheckpoint(state);
    return;
  }

  const gold = fightGold(state);
  state.gold += gold;
  state.pendingGold = gold;
  state.rewardSource = 'fight';

  const tier: RewardTier =
    node?.rewardTier ?? (node?.kind === 'elite' ? 'elite' : 'normal');

  const pool = rewardPoolFor(state, tier);
  state.rewardTier = tier;
  state.rewardOptions = pickRewardIds(pool, 3).map((id) => makeOffer(state, id, 'reward'));
  if (node?.kind === 'elite') grantRelicReward(state);
  resolvePotionDrop(state, secureRandomInt);
  state.screen = 'reward';
  saveRunCheckpoint(state);
}

function recordCombatTelemetry(state: RunState, won: boolean): void {
  recordPlaytestEvent({
    kind: 'combatEnd',
    at: Date.now(),
    won,
    hpLost: state.scoreStats.currentCombatHpLost,
    act: state.actIndex + 1,
    deck: state.deck.map(({ defId, upgradeLevel }) => ({ defId, upgradeLevel })),
  });
}

function syncHeroHpFromCombat(state: RunState): void {
  if (!state.combat) return;
  const nextHp = state.combat.heroHp;
  if (nextHp < state.heroHp) {
    state.scoreStats.currentCombatHpLost += state.heroHp - nextHp;
  }
  state.heroHp = nextHp;
}

export function commitRunScore(state: RunState, victory: boolean): void {
  if (state.scoreCommitted || !state.characterId) return;
  const calculated = calculateRunScore(state.scoreStats, victory);
  const award = awardActiveCharacterScore(state.characterId, calculated.total);
  state.scoreResult = {
    breakdown: calculated.breakdown,
    gained: calculated.total,
    cumulativeScore: award.score,
    newlyUnlockedCardIds: award.newlyUnlockedCardIds,
  };
  state.scoreCommitted = true;
}

export function potionOfferBlocksReward(state: RunState): boolean {
  return state.pendingPotionUnplaced && !!state.pendingPotionId;
}

/** One fight's potion roll. Treasure does not call this. */
export function resolvePotionDrop(
  state: RunState,
  randomIndex: (exclusiveMax: number) => number,
): void {
  const roll = rollCombatPotion(state.potionDropChance, randomIndex);
  state.potionDropChance = roll.nextChance;
  state.pendingPotionId = roll.potionId;
  state.pendingPotionUnplaced = false;
  if (!roll.potionId) return;
  const slot = firstEmptyPotionSlot(state.potions);
  if (slot >= 0) {
    state.potions[slot] = roll.potionId;
    return;
  }
  state.pendingPotionUnplaced = true;
}

export function replacePendingPotion(state: RunState, slot: number): boolean {
  if (!potionOfferBlocksReward(state)) return false;
  if (slot < 0 || slot >= state.potions.length) return false;
  state.potions[slot] = state.pendingPotionId;
  state.pendingPotionUnplaced = false;
  state.flash = '🧪✨';
  saveRunCheckpoint(state);
  return true;
}

export function declinePendingPotion(state: RunState): boolean {
  if (!potionOfferBlocksReward(state)) return false;
  state.pendingPotionId = null;
  state.pendingPotionUnplaced = false;
  state.flash = '🧪↩';
  saveRunCheckpoint(state);
  return true;
}

/** A hole opened while a reward bottle was waiting. Put that bottle in the hole. */
function settlePendingPotion(state: RunState): void {
  if (!state.pendingPotionUnplaced || !state.pendingPotionId) return;
  const slot = firstEmptyPotionSlot(state.potions);
  if (slot < 0) return;
  state.potions[slot] = state.pendingPotionId;
  state.pendingPotionUnplaced = false;
}

const POTION_BELT_SCREENS = new Set<Screen>(['map', 'rest', 'shop', 'reward']);

export function potionChangeBlock(state: RunState): 'tutorial' | 'phase' | 'screen' | null {
  if (state.tutorial && (state.screen === 'combat' || state.screen === 'castCheck')) return 'tutorial';
  if (state.screen === 'combat') {
    const combat = state.combat;
    if (!combat || combat.status !== 'playing') return 'phase';
    if (combat.phase !== 'playerAction' && combat.phase !== 'playerStart') return 'phase';
    return null;
  }
  if (state.screen === 'castCheck') return 'screen';
  return POTION_BELT_SCREENS.has(state.screen) ? null : 'screen';
}

function beltCanChange(state: RunState): boolean {
  return potionChangeBlock(state) === null;
}

/** Why 使用 is unavailable. `aim` means the bottle still needs a monster. */
export function previewPotionUse(
  state: RunState,
  slot: number,
): 'aim' | 'empty' | 'tutorial' | 'screen' | 'phase' | 'full-hp' | 'no-draw' | 'target' | null {
  const potionId = state.potions[slot];
  if (!potionId || !isKnownPotionId(potionId)) return 'empty';
  const change = potionChangeBlock(state);
  if (change) return change;
  const potion = getPotion(potionId);
  if (state.screen === 'combat' && state.combat) {
    const reason = combatPotionBlock(state.combat, potion, null);
    if (reason === 'target' && potionNeedsEnemy(potion) && livingEnemies(state.combat).length > 0) {
      return 'aim';
    }
    return reason;
  }
  if (potion.where !== 'anywhere') return 'screen';
  if (potion.heal && healedAmount(state.heroHp, state.heroMaxHp, potion.heal) <= 0) return 'full-hp';
  return null;
}

export type PotionUseResult =
  | { ok: true; endedFight: boolean }
  | { ok: false; reason: 'empty' | 'tutorial' | 'screen' | 'phase' | 'full-hp' | 'no-draw' | 'target' };

export function usePotion(state: RunState, slot: number, targetId?: string): PotionUseResult {
  const potionId = state.potions[slot];
  if (!potionId || !isKnownPotionId(potionId)) return { ok: false, reason: 'empty' };
  if (state.tutorial && (state.screen === 'combat' || state.screen === 'castCheck')) {
    return { ok: false, reason: 'tutorial' };
  }
  const potion = getPotion(potionId);
  const inCombat = state.screen === 'combat' && !!state.combat;
  if (!inCombat && !(potion.where === 'anywhere' && POTION_BELT_SCREENS.has(state.screen))) {
    return { ok: false, reason: 'screen' };
  }
  if (inCombat && state.combat) {
    const applied = applyCombatPotion(state.combat, potion, targetId);
    if (!applied.ok) return { ok: false, reason: applied.reason ?? 'phase' };
    state.potions[slot] = null;
    settlePendingPotion(state);
    state.flash = potion.emoji;
    drainCombatFx(state);
    syncHeroHpFromCombat(state);
    if (applied.endedFight) {
      finishFight(state);
      return { ok: true, endedFight: true };
    }
    return { ok: true, endedFight: false };
  }
  const gained = potion.heal ? healedAmount(state.heroHp, state.heroMaxHp, potion.heal) : 0;
  if (!potion.heal || gained <= 0) return { ok: false, reason: potion.heal ? 'full-hp' : 'screen' };
  state.heroHp += gained;
  state.potions[slot] = null;
  settlePendingPotion(state);
  state.flash = potion.emoji;
  saveRunCheckpoint(state);
  return { ok: true, endedFight: false };
}

export function discardPotion(state: RunState, slot: number): boolean {
  if (!beltCanChange(state)) return false;
  if (!state.potions[slot]) return false;
  state.potions[slot] = null;
  settlePendingPotion(state);
  state.flash = '🗑️';
  if (state.screen !== 'combat') saveRunCheckpoint(state);
  return true;
}

export function pickReward(state: RunState, cardId: string | null): void {
  if (potionOfferBlocksReward(state)) {
    state.flash = '🧪先選';
    return;
  }
  const offer = cardId ? state.rewardOptions.find((candidate) => candidate.uid === cardId) : null;
  if (offer) {
    state.deck.push({ uid: offer.uid, defId: offer.defId, upgradeLevel: offer.upgradeLevel });
    recordPlaytestEvent({ kind: 'pick', at: Date.now(), uid: offer.uid, defId: offer.defId, upgradeLevel: offer.upgradeLevel });
  } else {
    recordPlaytestEvent({
      kind: 'skip',
      at: Date.now(),
      offeredUids: state.rewardOptions.map((candidate) => candidate.uid),
      act: state.actIndex + 1,
    });
  }
  completeNode(state);
}

/** Re-export for title UI */
export { hasSavedRun, resumeSavedRun, clearSavedRun } from './save';

export function hasClearedOnce(): boolean {
  return getActiveProfile().cleared;
}

export function hasEarBadge(): boolean {
  return getActiveProfile().earBadge;
}

/** Deck counts for map viewer: id → { def, count } */
export function deckCounts(state: RunState): { id: string; count: number; def: CardDef }[] {
  const map = new Map<string, number>();
  for (const card of state.deck) {
    const key = `${card.defId}:${card.upgradeLevel}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [id, rawLevel] = key.split(':');
      return { id, count, def: resolveCard(id, rawLevel === '1' ? 1 : 0) };
    })
    .sort((a, b) => a.def.zhuyin.localeCompare(b.def.zhuyin, 'zh-Hant'));
}

export {
  REST_HEAL,
  restHealAmount,
  PRACTICE_BADGE_THRESHOLD,
  SHOP_REMOVE_PRICE,
};
