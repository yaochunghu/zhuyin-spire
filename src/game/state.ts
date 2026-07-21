import {
  ELITE_REWARD_POOL_IDS,
  PRACTICE_BADGE_THRESHOLD,
  PRACTICE_CARD_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCard,
  type CardDef,
} from '../data/cards';
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
  clearRecentCastPhrases,
  isSpellCorrect,
  pickCastMode,
  type CastPrompt,
} from './castCheck';
import { cancelSpeech, isSpeechAvailable } from './speech';
import { clearSavedRun, saveRunCheckpoint } from './save';
import { getDebugSkipCast } from '../debug/debugFlags';

export type Screen =
  | 'title'
  | 'relicPick'
  | 'map'
  | 'rest'
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

const PRACTICE_CORRECT_KEY = 'zhuyin-spire-practice-correct';
const PRACTICE_BADGE_KEY = 'zhuyin-spire-practice-badge';

export interface ShopOffer {
  cardId: string;
  price: number;
  sold: boolean;
}

export interface RunState {
  screen: Screen;
  heroHp: number;
  heroMaxHp: number;
  deck: string[];
  gold: number;
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
  rewardOptions: string[];
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
}

const HERO_MAX = HERO_MAX_HP;

function emptyRunMap(): RunMap {
  return generateRunMap(() => 0.5);
}

export function getActiveRelic(state: RunState): RelicDef | null {
  return state.relicId ? getRelic(state.relicId) : null;
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
  return {
    screen: 'title',
    heroHp: HERO_MAX,
    heroMaxHp: HERO_MAX,
    deck: [...STARTER_DECK_IDS],
    gold: 0,
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
  clearRecentCastPhrases();
  state.heroHp = HERO_MAX;
  state.heroMaxHp = HERO_MAX;
  state.deck = [...STARTER_DECK_IDS];
  state.gold = 0;
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
  let mode: 'recognize' | 'listen' = 'recognize';
  if (isSpeechAvailable() && Math.random() < 0.28) mode = 'listen';
  const prompt = buildCastPrompt(def, mode, Math.random, 'practice');
  state.cast = { prompt, cardDef: def };
  state.screen = 'practice';
}

export function answerPractice(state: RunState, attempt: string[]): boolean {
  if (!state.cast || state.screen !== 'practice') return false;
  cancelSpeech();
  const { prompt } = state.cast;
  const correct = isSpellCorrect(attempt, prompt.correctParts);
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
  try {
    const n = (Number(localStorage.getItem(PRACTICE_CORRECT_KEY) || '0') || 0) + 1;
    localStorage.setItem(PRACTICE_CORRECT_KEY, String(n));
    if (n >= PRACTICE_BADGE_THRESHOLD) {
      localStorage.setItem(PRACTICE_BADGE_KEY, '1');
    }
  } catch {
    /* ignore */
  }
}

export function getPracticeLifetimeCorrect(): number {
  try {
    return Number(localStorage.getItem(PRACTICE_CORRECT_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

export function hasPracticeBadge(): boolean {
  try {
    return localStorage.getItem(PRACTICE_BADGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function pickRelic(state: RunState, relicId: string): void {
  state.relicId = relicId;
  const relic = getRelic(relicId);
  if (relic.startGold) state.gold += relic.startGold;
  state.screen = 'map';
  saveRunCheckpoint(state);
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

  state.combat = createCombat(
    state.deck,
    node.enemyId ?? 'slime',
    state.heroHp,
    state.heroMaxHp,
    getActiveRelic(state),
    node.encounterId,
  );
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

  state.deck.splice(index, 1);
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
  const ids = pickRewardIds(REWARD_POOL_IDS, 3);
  state.shopOffers = ids.map((cardId, i) => ({
    cardId,
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
    GOLD_TREASURE_BASE + Math.floor(Math.random() * GOLD_TREASURE_JITTER);
  state.gold += gold;
  state.pendingGold = gold;
  state.pendingHeal = 0;
  state.rewardSource = 'treasure';
  state.rewardTier = 'normal';
  state.rewardOptions = pickRewardIds(REWARD_POOL_IDS, 3);
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
  state.deck.push(offer.cardId);
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
  state.deck.splice(index, 1);
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
    state.screen = 'victory';
    clearSavedRun();
    try {
      localStorage.setItem('zhuyin-spire-cleared', '1');
      if (state.listenSuccesses > 0) {
        localStorage.setItem('zhuyin-spire-ear-badge', '1');
      }
      const n = Number(localStorage.getItem('zhuyin-spire-run-count') || '0') || 0;
      localStorage.setItem('zhuyin-spire-run-count', String(n + 1));
    } catch {
      /* ignore */
    }
    return;
  }

  // Between acts: heal, show only the *next* act map (fresh path state)
  const before = state.heroHp;
  state.heroHp = Math.min(state.heroMaxHp, state.heroHp + ACT_CLEAR_HEAL);
  state.flash = `❤️+${state.heroHp - before}`;
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

function totalEnemyHp(combat: CombatState): number {
  return combat.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0);
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
  try {
    const def = beginPlay(state.combat, uid, targetIds);

    if (getDebugSkipCast()) {
      const combat = state.combat;
      const hpBefore = totalEnemyHp(combat);
      const blockBefore = combat.block;
      resolveCastSuccess(combat, def);
      state.flash = '✨';
      const dmg = hpBefore - totalEnemyHp(combat);
      const blk = combat.block - blockBefore;
      if (dmg > 0) state.floatText = `-${dmg}`;
      else if (blk > 0) state.floatText = `+${blk}🛡`;
      else state.floatText = '✨';
      state.cast = null;
      state.heroHp = combat.heroHp;
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
    const mode = pickCastMode(stage);
    const prompt = buildCastPrompt(def, mode, Math.random, stage);
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
  state.heroHp = state.combat.heroHp;
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
  state.combat = createCombat(
    state.deck,
    enemyId,
    state.heroHp,
    state.heroMaxHp,
    getActiveRelic(state),
    encounterId,
  );
  drainCombatFx(state);
  state.screen = 'combat';
}

export function answerCast(state: RunState, attempt: string[]): void {
  if (!state.combat || !state.cast) return;
  cancelSpeech();
  const { prompt, cardDef } = state.cast;
  const correct = isSpellCorrect(attempt, prompt.correctParts);

  if (correct) {
    const hpBefore = totalEnemyHp(state.combat);
    const blockBefore = state.combat.block;
    resolveCastSuccess(state.combat, cardDef);
    state.flash = '✨';
    if (prompt.mode === 'listen' || prompt.mode === 'listenHard') {
      state.listenSuccesses += 1;
    }
    const dmg = hpBefore - totalEnemyHp(state.combat);
    const blk = state.combat.block - blockBefore;
    if (dmg > 0) state.floatText = `-${dmg}`;
    else if (blk > 0) state.floatText = `+${blk}🛡`;
    else state.floatText = '✨';
  } else {
    resolveCastFizzle(state.combat, cardDef);
    state.flash = '💨';
    state.floatText = '💨';
  }

  state.cast = null;
  state.heroHp = state.combat.heroHp;
  drainCombatFx(state);

  if (state.combat.status === 'won') {
    // Still play discard FX before leaving combat if UI wants; keep batch
    finishFight(state);
    return;
  }
  if (state.combat.status === 'lost') {
    state.screen = 'defeat';
    clearSavedRun();
    return;
  }
  state.screen = 'combat';
}

export function useParentHint(state: RunState): string | null {
  if (!state.cast) return null;
  if (state.screen === 'practice') {
    return state.cast.prompt.correctSpell;
  }
  if (!state.combat) return null;
  if (state.combat.parentHintUsed) return null;
  state.combat.parentHintUsed = true;
  return state.cast.prompt.correctSpell;
}

export function playerEndTurn(state: RunState): void {
  if (!state.combat || state.combat.status !== 'playing') return;
  const hpBefore = state.combat.heroHp;
  const status = endTurn(state.combat);
  state.heroHp = state.combat.heroHp;
  drainCombatFx(state);
  if (state.combat.heroHp < hpBefore) {
    state.floatText = `-${hpBefore - state.combat.heroHp}`;
  }
  if (status === 'lost') {
    state.screen = 'defeat';
    clearSavedRun();
  }
}

function fightGold(state: RunState): number {
  const node = getActiveNode(state);
  let base = GOLD_FIGHT_BASE;
  if (node?.kind === 'elite' || node?.kind === 'boss') base = GOLD_ELITE_BASE;
  const jitter = Math.floor(Math.random() * GOLD_JITTER);
  let bonus = node?.goldBonus ?? 0;
  if (node?.kind === 'elite') bonus += GOLD_ELITE_FLAT_BONUS;
  return base + jitter + bonus;
}

function finishFight(state: RunState): void {
  if (!state.combat) return;
  state.heroHp = state.combat.heroHp;
  // No post-combat heal — campfires restore 40% max HP
  state.pendingHeal = 0;
  const node = getActiveNode(state);

  if (node?.kind === 'boss') {
    const gold = fightGold(state);
    state.gold += gold;
    state.pendingGold = gold;
    state.rewardSource = 'fight';
    state.rewardTier = 'elite';
    state.rewardOptions = pickRewardIds(ELITE_REWARD_POOL_IDS, 3);
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

  const pool = tier === 'elite' ? ELITE_REWARD_POOL_IDS : REWARD_POOL_IDS;
  state.rewardTier = tier;
  state.rewardOptions = pickRewardIds(pool, 3);
  state.screen = 'reward';
  saveRunCheckpoint(state);
}

export function pickReward(state: RunState, cardId: string | null): void {
  if (cardId) state.deck.push(cardId);
  completeNode(state);
}

/** Re-export for title UI */
export { hasSavedRun, resumeSavedRun, clearSavedRun } from './save';

export function hasClearedOnce(): boolean {
  try {
    return localStorage.getItem('zhuyin-spire-cleared') === '1';
  } catch {
    return false;
  }
}

export function hasEarBadge(): boolean {
  try {
    return localStorage.getItem('zhuyin-spire-ear-badge') === '1';
  } catch {
    return false;
  }
}

/** Deck counts for map viewer: id → { def, count } */
export function deckCounts(state: RunState): { id: string; count: number; def: CardDef }[] {
  const map = new Map<string, number>();
  for (const id of state.deck) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, count]) => ({ id, count, def: getCard(id) }))
    .sort((a, b) => a.def.zhuyin.localeCompare(b.def.zhuyin, 'zh-Hant'));
}

export {
  REST_HEAL,
  restHealAmount,
  PRACTICE_BADGE_THRESHOLD,
  ACT_CLEAR_HEAL,
  SHOP_REMOVE_PRICE,
};
