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
  ACT_CLEAR_HEAL,
  GOLD_ELITE_BASE,
  GOLD_ELITE_FLAT_BONUS,
  GOLD_FIGHT_BASE,
  GOLD_JITTER,
  GOLD_TREASURE_BASE,
  GOLD_TREASURE_JITTER,
  HERO_MAX_HP,
  restHealAmount,
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
import { getRelic, type RelicDef } from '../data/relics';
import {
  beginPlay,
  createCombat,
  endTurn,
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
  buildCastPrompt,
  isCastAnswerCorrect,
  pickCastMode,
  recordCastResult,
  type CastPrompt,
} from './castCheck';
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
  filterUnlockedCardsForProfile,
  getActiveProfile,
  updateActiveProfile,
} from './profiles';
import {
  calculateRunScore,
  createRunScoreStats,
  type RunScoreResult,
  type RunScoreStats,
} from './progression';
import { recordPlaytestEvent } from './playtestTelemetry';

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
  | 'defeat'
  | 'victory';

export interface ShopOffer extends CardOffer {
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
  relicId: string | null;
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

function makeOffer(state: RunState, defId: string, source: 'reward' | 'shop'): CardOffer {
  const eligible =
    getActiveCharacter(state)?.upgradesEnabled === true &&
    getCard(defId).rarity !== 'basic' &&
    !!getCard(defId).upgrade;
  const upgradeLevel: UpgradeLevel =
    eligible && Math.random() < upgradedOfferChance(state) ? 1 : 0;
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

export function getActiveRelic(state: RunState): RelicDef | null {
  return state.relicId ? getRelic(state.relicId) : null;
}

export function getActiveCharacter(state: RunState): PlayableCharacterDef | null {
  return state.characterId ? getPlayableCharacter(state.characterId) : null;
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
    relicId: null,
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
  state.relicId = null;
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
  state.screen = 'relicPick';
  saveRunCheckpoint(state);
}

function rollPracticeCard(): CardDef {
  const id = PRACTICE_CARD_IDS[Math.floor(Math.random() * PRACTICE_CARD_IDS.length)] ?? 'bo';
  return getCard(id);
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
  const def = rollPracticeCard();
  const binding = getCardCastBinding(def, 'zhuyin');
  const mode = pickCastMode('early', Math.random, binding.lessonFamilyId);
  const prompt = buildCastPrompt(def, mode, Math.random, 'practice', 'zhuyin');
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
  state.relicId = relic.id;
  if (relic.startGold) state.gold += relic.startGold;
  state.screen = 'map';
  saveRunCheckpoint(state);
  return true;
}

export function isTutorialEligible(state: RunState, node: MapNode): boolean {
  return (
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
    getActiveRelic(state),
  );

  // This ordering is local to the tutorial combat. The player's saved deck is
  // never changed. drawPile.pop() draws from the end on later turns.
  const tutorialCard = (id: string) => makeCard({ uid: `tutorial-${id}-${crypto.randomUUID()}`, defId: id, upgradeLevel: 0 });
  combat.hand = ['mo', 'bo', 'bo', 'po', 'bo'].map(tutorialCard);
  combat.drawPile = ['mo', 'mo', 'mo', 'po', 'bo'].map(tutorialCard);
  combat.discardPile = [];
  combat.pending = null;
  combat.pendingTargetIds = [];
  combat.pendingFx = [{ type: 'draw', cards: [...combat.hand] }];
  combat.log = ['練習史萊姆來了！先看看牠要做什麼。'];
  return combat;
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
        getActiveRelic(state),
        node.encounterId,
      );
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
  state.shopRemoveUsed = false;
  state.screen = 'shop';
  saveRunCheckpoint(state);
}

/** Treasure chest: gold + pick 1 of 3 cards (reuse reward screen). */
function openTreasure(state: RunState): void {
  const gold =
    GOLD_TREASURE_BASE + secureRandomInt(GOLD_TREASURE_JITTER);
  state.gold += gold;
  state.pendingGold = gold;
  state.pendingHeal = 0;
  state.rewardSource = 'treasure';
  state.rewardTier = 'normal';
  state.rewardOptions = pickRewardIds(rewardPoolFor(state, 'normal'), 3)
    .map((id) => makeOffer(state, id, 'reward'));
  state.screen = 'reward';
  saveRunCheckpoint(state);
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
  state.rewardSource = null;

  if (nodeId) {
    if (!state.visitedIds.includes(nodeId)) state.visitedIds.push(nodeId);
    state.pathIds.push(nodeId);
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

  // Between acts: show only the *next* act map (fresh path state).
  // HP was already restored when the boss fight was cleared.
  state.flash = '❤️ 回滿';
  state.lastClearedAct = act;
  state.actIndex = act; // act 1 clear → index 1 (Act II)
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
): void {
  if (!state.combat || state.combat.status !== 'playing') return;
  if (!canTutorialPlayCard(state, uid)) {
    state.flash = '👆照著亮圈玩';
    return;
  }
  try {
    const def = beginPlay(state.combat, uid, targetIds);

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
    const binding = getCardCastBinding(def, gateId);
    const mode = pickCastMode(stage, Math.random, binding.lessonFamilyId);
    const prompt = buildCastPrompt(def, mode, Math.random, stage, gateId);
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
  state.combat = createCombat(
    state.deck,
    enemyId,
    state.heroHp,
    state.heroMaxHp,
    getActiveRelic(state),
    encounterId,
  );
  state.scoreStats.currentCombatHpLost = 0;
  drainCombatFx(state);
  state.screen = 'combat';
}

export function answerCast(state: RunState, attempt: string[]): void {
  if (!state.combat || !state.cast) return;
  cancelSpeech();
  const { prompt, cardDef } = state.cast;
  const correct = isCastAnswerCorrect(prompt, attempt);
  recordCastResult(prompt, correct);

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
    return;
  }
  if (state.combat.status === 'lost') {
    recordCombatTelemetry(state, false);
    commitRunScore(state, false);
    state.screen = 'defeat';
    clearSavedRun();
    return;
  }
  state.screen = 'combat';
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

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
  const max = Math.floor(maxExclusive);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= limit);
  return value % max;
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

function rewardPoolFor(
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
  return filterUnlockedCardsForProfile(profile, characterId, pool);
}

function finishFight(state: RunState): void {
  recordCombatTelemetry(state, true);
  if (!state.combat) return;
  if (state.tutorial) {
    markTutorialComplete();
    state.tutorial = null;
  }
  syncHeroHpFromCombat(state);
  // No ordinary post-combat heal — campfires restore 40% max HP.
  state.pendingHeal = 0;
  const node = getActiveNode(state);
  if (node?.kind === 'boss') {
    const before = state.heroHp;
    state.heroHp = state.heroMaxHp;
    state.pendingHeal = state.heroHp - before;
    state.scoreStats.bossWins += 1;
    if (state.scoreStats.currentCombatHpLost === 0) state.scoreStats.flawlessBosses += 1;
  } else if (node?.kind === 'elite') {
    state.scoreStats.eliteWins += 1;
    if (state.scoreStats.currentCombatHpLost === 0) state.scoreStats.flawlessElites += 1;
  } else if (node?.kind === 'fight') {
    state.scoreStats.normalWins += 1;
  }

  if (node?.kind === 'boss') {
    const gold = fightGold(state);
    state.gold += gold;
    state.pendingGold = gold;
    state.rewardSource = 'fight';
    state.rewardTier = 'elite';
    state.rewardOptions = pickRewardIds(rewardPoolFor(state, 'elite'), 3)
      .map((id) => makeOffer(state, id, 'reward'));
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

export function pickReward(state: RunState, cardId: string | null): void {
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
  ACT_CLEAR_HEAL,
  SHOP_REMOVE_PRICE,
};
