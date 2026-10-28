/**
 * Headless A2–A4 runner for both characters.
 *
 * Decisions come from `src/debug/childModel.ts`. This file only walks the
 * real run APIs and prints a summary. It does not copy the rates.
 *
 *   node scripts/simulate-resonance-pool.mjs --sample
 *   node scripts/simulate-resonance-pool.mjs --mode offer --runs 40000 --seed 1
 *   node scripts/simulate-resonance-pool.mjs --mode turns --character both --childModel firstGrader --runs 1
 *   node scripts/simulate-resonance-pool.mjs --mode turns --castSkip --character echoMage --zhuyinP 0.7,0.8,0.9
 */

import { SHOP_REMOVE_PRICE } from '../src/data/balance';
import { canUpgradeCard, getCard, resolveCard } from '../src/data/cards';
import {
  PLAYABLE_CHARACTER_IDS,
  getPlayableCharacter,
  type PlayableCharacterId,
} from '../src/data/characters';
import type { EventChoiceDef } from '../src/data/events';
import { findNode, type ActMap, type NodeKind } from '../src/data/map';
import { intentTotalDamage } from '../src/data/enemies';
import { getPotion } from '../src/data/potions';
import { getDebugSkipCast, setDebugSkipCast } from '../src/debug/debugFlags';
import {
  CHILD_PERSONA_IDS,
  CHILD_PERSONAS,
  ZHUYIN_P_SWEEP,
  childDecisionSeed,
  chooseCombatAction,
  chooseEventChoice,
  chooseMapNode,
  chooseReward,
  createChildRng,
  isChildPersonaId,
  planShopPurchases,
  printedCardScore,
  resolveModelCast,
  shouldDrinkPotion,
  shouldRest,
  withZhuyinP,
  type ChildPersona,
  type ChildPersonaId,
  type CombatCardView,
  type EventChoiceView,
  type MapOption,
  type ShopShelf,
} from '../src/debug/childModel';
import {
  canPlay,
  intentForUnit,
  isEligibleHandChoice,
  livingEnemies,
} from '../src/game/combat';
import { activeEventDef, choiceIsHidden, choiceReason, currentPickCards } from '../src/game/eventEngine';
import { getActiveProfile } from '../src/game/profiles';
import {
  PLAYTEST_STORAGE_KEY,
  clearSyntheticPlaytestMark,
  markSyntheticPlaytest,
  type ResponseBucket,
} from '../src/game/playtestTelemetry';
import { markTutorialComplete } from '../src/game/settings';
import {
  answerCast,
  answerEventShrine,
  applyRestHeal,
  beginShopRemove,
  beginSmith,
  buyShopCard,
  buyShopPotion,
  cancelEventChoice,
  cancelShopRemove,
  cancelSmith,
  chooseEventChoice as commitEventChoice,
  confirmEventCard,
  confirmEventChoice,
  confirmShopRemove,
  continueEventResult,
  createNewRun,
  declinePendingPotion,
  ensureEventCast,
  getAvailableMapNodes,
  getCurrentAct,
  leavePractice,
  leaveShop,
  pickCharacter,
  pickReward,
  playerEndTurn,
  potionOfferBlocksReward,
  selectMapNode,
  skipRemoveCard,
  smithCard,
  startEventCombat,
  startRun,
  takeEventOfferCard,
  toggleEventCard,
  tryPlayCard,
  usePotion,
  type RunState,
} from '../src/game/state';
import { installMemoryStorage, withSeed } from '../tests/support/saveReplayHarness';

const BUCKETS: ResponseBucket[] = ['<5s', '5-15s', '15-30s', '>30s'];

const OFFER_FOCI: Record<PlayableCharacterId, Array<{ name: string; direction: string }>> = {
  echoMage: [
    { name: '聽隙爆發', direction: 'tingxi' },
    { name: '百鍊連環', direction: 'bailian' },
    { name: '聽勁反擊', direction: 'tingjin' },
    { name: 'hybrid', direction: 'hybrid' },
  ],
  abacusFist: [
    { name: '湊十', direction: 'couShi' },
    { name: '存串', direction: 'cunChuan' },
    { name: '順招', direction: 'xuZhao' },
    { name: 'hybrid', direction: 'general' },
  ],
};

export interface ActRunOptions {
  characterId: PlayableCharacterId;
  personaId: ChildPersonaId;
  seed: number;
  zhuyinP?: number;
  castSkip?: boolean;
}

export interface ActRunSummary {
  characterId: PlayableCharacterId;
  personaId: ChildPersonaId;
  zhuyinP: number;
  castSkip: boolean;
  seed: number;
  result: 'actClear' | 'defeat' | 'stuck' | 'stepCap';
  screen: string;
  hp: number;
  gold: number;
  rooms: number;
  eliteWins: number;
  steps: number;
  uncastEnds: number;
  shopBuys: number;
  rests: number;
  smiths: number;
  rewardSkips: number;
  casts: number;
  correctCasts: number;
  syntheticCasts: number;
  buckets: Record<ResponseBucket, number>;
  note: string;
}

interface Tally {
  uncastEnds: number;
  rests: number;
  shopBuys: number;
}

/** Plays this turn, including fizzles. `castsThisTurn` only counts successes. */
interface PlayMemory {
  key: string;
  count: number;
}

interface SimConfig {
  mode: 'offer' | 'turns' | 'sample';
  characters: PlayableCharacterId[];
  personas: ChildPersonaId[];
  zhuyinPs: number[] | null;
  runs: number;
  seed: number;
  castSkip: boolean;
}

export function runActI(options: ActRunOptions): ActRunSummary {
  const base = CHILD_PERSONAS[options.personaId];
  const persona = options.zhuyinP === undefined ? base : withZhuyinP(base, options.zhuyinP);
  const playing: ChildPersona = options.castSkip ? { ...persona, skipCastP: 0 } : persona;
  installMemoryStorage();
  localStorage.clear();
  getActiveProfile();
  markTutorialComplete();
  markSyntheticPlaytest();
  setDebugSkipCast(options.castSkip === true);
  if (options.castSkip && !getDebugSkipCast()) {
    throw new Error('cast skip did not arm. The sim must run in a debug-capable build.');
  }
  const rng = createChildRng(childDecisionSeed(options.seed));
  try {
    return withSeed(options.seed, () => playAct(options, playing, rng));
  } finally {
    setDebugSkipCast(false);
    clearSyntheticPlaytestMark();
  }
}

export function main(argv = readArgs()): void {
  const config = parseArgs(argv);
  const lines: string[] = [];
  lines.push('child-error model: src/debug/childModel.ts');
  lines.push(`mode=${config.mode} seed=${config.seed} runs=${config.runs} castSkip=${config.castSkip}`);
  if (config.mode === 'offer' || config.mode === 'sample') {
    lines.push(...offerReport(config.mode === 'sample' ? { ...config, runs: Math.max(config.runs, 40_000) } : config));
  }
  if (config.mode === 'turns' || config.mode === 'sample') {
    lines.push(...turnReport(config));
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function playAct(
  options: ActRunOptions,
  persona: ChildPersona,
  rng: () => number,
): ActRunSummary {
  const state = createNewRun();
  startRun(state);
  if (!pickCharacter(state, options.characterId)) {
    throw new Error(`Could not pick ${options.characterId}`);
  }
  let steps = 0;
  const tally: Tally = { uncastEnds: 0, rests: 0, shopBuys: 0 };
  const played: PlayMemory = { key: '', count: 0 };
  let previous = '';
  let repeats = 0;
  let note = '';
  const maxSteps = 4_000;
  while (steps < maxSteps) {
    if (state.screen === 'actClear' || state.screen === 'victory' || state.screen === 'defeat') break;
    const key = fingerprint(state);
    if (key === previous) repeats += 1;
    else {
      previous = key;
      repeats = 0;
    }
    if (repeats === 3) note = forceProgress(state, options.characterId);
    if (repeats > 10) {
      note = note || `stuck on ${state.screen}`;
      break;
    }
    stepRun(state, persona, rng, options.castSkip === true, options.characterId, tally, played);
    steps += 1;
  }
  const result = state.screen === 'actClear' || state.screen === 'victory'
    ? 'actClear'
    : state.screen === 'defeat'
      ? 'defeat'
      : steps >= maxSteps
        ? 'stepCap'
        : 'stuck';
  return {
    characterId: options.characterId,
    personaId: options.personaId,
    zhuyinP: persona.zhuyinP,
    castSkip: options.castSkip === true,
    seed: options.seed,
    result,
    screen: state.screen,
    hp: state.heroHp,
    gold: state.gold,
    rooms: state.scoreStats.roomsCompleted,
    eliteWins: state.scoreStats.eliteWins,
    steps,
    ...countEvents(),
    uncastEnds: tally.uncastEnds,
    rests: tally.rests,
    shopBuys: tally.shopBuys,
    note,
  };
}

function stepRun(
  state: RunState,
  persona: ChildPersona,
  rng: () => number,
  castSkip: boolean,
  characterId: PlayableCharacterId,
  tally: Tally,
  played: PlayMemory,
): void {
  switch (state.screen) {
    case 'combat':
      stepCombat(state, persona, rng, castSkip, tally, played);
      return;
    case 'castCheck':
    case 'eventCast':
      stepCast(state, persona, rng, castSkip);
      return;
    case 'map':
      stepMap(state, persona, rng);
      return;
    case 'shop':
    case 'shopRemove':
      stepShop(state, rng, tally);
      return;
    case 'reward':
      stepReward(state, rng);
      return;
    case 'rest':
    case 'smith':
    case 'removeCard':
      stepRest(state, tally);
      return;
    case 'event':
      stepEvent(state, rng);
      return;
    case 'relicPick':
      pickCharacter(state, characterId);
      return;
    case 'practice':
      leavePractice(state);
      return;
    default:
      return;
  }
}

function stepCombat(
  state: RunState,
  persona: ChildPersona,
  rng: () => number,
  castSkip: boolean,
  tally: Tally,
  played: PlayMemory,
): void {
  const combat = state.combat;
  if (!combat || combat.status !== 'playing') return;
  if (combat.turn > 36) {
    combat.heroHp = 0;
    playerEndTurn(state);
    return;
  }
  const incoming = incomingDamage(combat);
  maybeDrink(state, incoming);
  if (state.screen !== 'combat' || !state.combat || state.combat.status !== 'playing') return;
  const playable = state.combat.hand.filter((card) => canPlay(state.combat!, card.uid));
  const views: CombatCardView[] = playable.map((card) => {
    const def = resolveCard(card.defId, card.upgradeLevel);
    const hits = def.hits && def.hits > 0 ? def.hits : 1;
    return {
      uid: card.uid,
      type: def.type,
      damage: def.type === 'attack' ? def.value * hits : 0,
      block: def.type === 'block' ? def.value : def.bonusBlock ?? 0,
      draw: def.draw ?? 0,
    };
  });
  const action = chooseCombatAction(
    persona,
    views,
    incoming,
    state.combat.block,
    playsThisTurn(state, played),
    rng,
  );
  if (action.kind === 'end') {
    if (action.uncast) tally.uncastEnds += 1;
    playerEndTurn(state);
    return;
  }
  const card = state.combat.hand.find((entry) => entry.uid === action.uid);
  if (!card) {
    playerEndTurn(state);
    return;
  }
  const def = resolveCard(card.defId, card.upgradeLevel);
  const handChoice = def.handChoice
    ? state.combat.hand.find((entry) => entry.uid !== card.uid && isEligibleHandChoice(def, entry))?.uid
    : undefined;
  const target = livingEnemies(state.combat)[0]?.id;
  try {
    tryPlayCard(state, card.uid, target ? [target] : [], handChoice);
  } catch {
    playerEndTurn(state);
    return;
  }
  played.count += 1;
  if (!castSkip && (state.screen === 'castCheck' || state.screen === 'eventCast')) {
    stepCast(state, persona, rng, false);
  }
}

function stepCast(
  state: RunState,
  persona: ChildPersona,
  rng: () => number,
  castSkip: boolean,
): void {
  if (castSkip) {
    if (state.screen === 'eventCast') {
      ensureEventCast(state);
      answerEventShrine(state, true);
    }
    return;
  }
  if (state.screen === 'eventCast') ensureEventCast(state);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const screen = state.screen;
    if (screen !== 'castCheck' && screen !== 'eventCast') return;
    const result = resolveModelCast(state, persona, rng);
    if (result !== 'retry') return;
  }
}

function stepMap(state: RunState, _persona: ChildPersona, rng: () => number): void {
  const available = getAvailableMapNodes(state);
  if (available.length === 0) return;
  const act = getCurrentAct(state);
  const options: MapOption[] = available.map((node) => ({
    id: node.id,
    kind: node.kind,
    leadsToElite: reaches(act, node.id, 'elite'),
    leadsToRest: reaches(act, node.id, 'rest'),
    leadsToShop: reaches(act, node.id, 'shop'),
  }));
  const choice = chooseMapNode(options, {
    elitesFought: state.scoreStats.eliteWins,
    hpFraction: fraction(state.heroHp, state.heroMaxHp),
    gold: state.gold,
    shopsVisited: countKind(state, 'shop'),
  }, rng);
  if (choice) selectMapNode(state, choice);
}

function stepShop(state: RunState, rng: () => number, tally: Tally): void {
  if (state.screen === 'shopRemove') cancelShopRemove(state);
  if (state.screen !== 'shop') return;
  const shelf: ShopShelf = {
    cards: state.shopOffers.filter((offer) => !offer.sold).map((offer) => ({
      index: state.shopOffers.indexOf(offer),
      price: offer.price,
      score: printedCardScore(getCard(offer.defId)),
    })),
    potions: state.shopPotionOffers.filter((offer) => !offer.sold).map((offer) => ({
      index: state.shopPotionOffers.indexOf(offer),
      price: offer.price,
      score: 4,
    })),
    removePrice: state.shopRemoveUsed ? null : SHOP_REMOVE_PRICE,
  };
  const plan = planShopPurchases(shelf, state.gold, fraction(state.heroHp, state.heroMaxHp), rng);
  for (const buy of plan) {
    if (buy.kind === 'card') {
      const before = state.deck.length;
      buyShopCard(state, buy.index);
      if (state.deck.length > before) tally.shopBuys += 1;
    } else if (buy.kind === 'potion') {
      if (buyShopPotion(state, buy.index)) tally.shopBuys += 1;
    } else if (beginShopRemove(state) && confirmShopRemove(state, worstIndex(state))) {
      tally.shopBuys += 1;
    }
  }
  if (state.screen === 'shopRemove') cancelShopRemove(state);
  if (state.screen === 'shop') leaveShop(state);
}

function stepReward(state: RunState, rng: () => number): void {
  if (potionOfferBlocksReward(state)) declinePendingPotion(state);
  const options = state.rewardOptions.map((offer) => ({
    id: offer.uid,
    score: printedCardScore(getCard(offer.defId)),
  }));
  pickReward(state, chooseReward(options, rng));
}

function stepRest(state: RunState, tally: Tally): void {
  if (state.screen === 'removeCard') skipRemoveCard(state);
  if (state.screen === 'smith') {
    const uid = bestSmith(state);
    if (uid && smithCard(state, uid)) return;
    cancelSmith(state);
  }
  if (state.screen !== 'rest') return;
  const smith = bestSmith(state);
  const heal = shouldRest(fraction(state.heroHp, state.heroMaxHp), smith !== null) || smith === null;
  if (!heal && smith && beginSmith(state) && smithCard(state, smith)) return;
  if (state.screen === 'smith') cancelSmith(state);
  if (applyRestHeal(state)) tally.rests += 1;
}

function stepEvent(state: RunState, rng: () => number): void {
  const active = state.eventTrack.active;
  const event = activeEventDef(state);
  if (!active || !event) return;
  if (active.phase === 'choose') {
    const legal = event.choices.filter((choice) => !choiceIsHidden(state, choice) && !choiceReason(state, choice));
    const id = chooseEventChoice(legal.map(choiceView), fraction(state.heroHp, state.heroMaxHp), rng);
    if (id) commitEventChoice(state, id);
    if (state.screen === 'event' && state.eventTrack.active?.phase === 'choose') {
      commitEventChoice(state, 'leave');
    }
    return;
  }
  if (active.phase === 'confirm') {
    confirmEventChoice(state);
    return;
  }
  if (active.phase === 'pick') {
    for (let guard = 0; guard < 6 && state.eventTrack.active?.phase === 'pick'; guard += 1) {
      const card = currentPickCards(state)[0];
      if (!card) {
        cancelEventChoice(state);
        return;
      }
      toggleEventCard(state, card.uid);
      confirmEventCard(state);
    }
    return;
  }
  if (active.phase === 'offer') {
    takeEventOfferCard(state, active.offerIds[0] ?? null);
    return;
  }
  if (active.phase === 'fight') {
    startEventCombat(state);
    return;
  }
  if (active.phase === 'shrine') {
    ensureEventCast(state);
    return;
  }
  if (active.phase === 'result') continueEventResult(state);
}

function forceProgress(state: RunState, characterId: PlayableCharacterId): string {
  if (state.screen === 'combat') {
    playerEndTurn(state);
    return 'forced end turn';
  }
  if (state.screen === 'castCheck' && state.cast) {
    const tokens = state.cast.prompt.answerTokens.length > 0
      ? [...state.cast.prompt.answerTokens]
      : ['0'];
    // The model is the normal path. This only fires on the third identical frame.
    answerCast(state, tokens);
    return 'forced cast';
  }
  if (state.screen === 'eventCast') {
    answerEventShrine(state, true);
    return 'forced shrine';
  }
  if (state.screen === 'shop' || state.screen === 'shopRemove') {
    if (state.screen === 'shopRemove') cancelShopRemove(state);
    leaveShop(state);
    return 'forced leave shop';
  }
  if (state.screen === 'reward') {
    if (potionOfferBlocksReward(state)) declinePendingPotion(state);
    pickReward(state, null);
    return 'forced skip reward';
  }
  if (state.screen === 'rest' || state.screen === 'smith' || state.screen === 'removeCard') {
    if (state.screen === 'removeCard') skipRemoveCard(state);
    if (state.screen === 'smith') cancelSmith(state);
    applyRestHeal(state);
    return 'forced rest';
  }
  if (state.screen === 'map') {
    const node = getAvailableMapNodes(state)[0];
    if (node) selectMapNode(state, node.id);
    return 'forced map';
  }
  if (state.screen === 'relicPick') {
    pickCharacter(state, characterId);
    return 'forced character';
  }
  if (state.screen === 'practice') {
    leavePractice(state);
    return 'forced leave practice';
  }
  if (state.screen === 'event') {
    const active = state.eventTrack.active;
    if (active?.phase === 'confirm') confirmEventChoice(state);
    else if (active?.phase === 'result') continueEventResult(state);
    else if (active?.phase === 'fight') startEventCombat(state);
    else if (active?.phase === 'offer') takeEventOfferCard(state, active.offerIds[0] ?? null);
    else if (active?.phase === 'shrine') {
      ensureEventCast(state);
      if (state.screen === 'eventCast') answerEventShrine(state, true);
    } else if (active?.phase === 'pick') {
      const card = currentPickCards(state)[0];
      if (card) {
        toggleEventCard(state, card.uid);
        confirmEventCard(state);
      } else cancelEventChoice(state);
    } else {
      const event = activeEventDef(state);
      const legal = event?.choices.find((choice) => !choiceIsHidden(state, choice) && !choiceReason(state, choice));
      if (legal) commitEventChoice(state, legal.id);
      else continueEventResult(state);
    }
    return 'forced event';
  }
  return `no force for ${state.screen}`;
}

function maybeDrink(state: RunState, incoming: number): void {
  const combat = state.combat;
  if (!combat) return;
  const hpFraction = fraction(combat.heroHp, combat.heroMaxHp);
  for (let slot = 0; slot < state.potions.length; slot += 1) {
    const id = state.potions[slot];
    if (!id) continue;
    const potion = getPotion(id);
    const kind = potion.heal ? 'heal' : potion.block ? 'block' : 'other';
    if (!shouldDrinkPotion(kind, hpFraction, incoming, combat.block)) continue;
    const target = livingEnemies(combat)[0]?.id;
    const drank = usePotion(state, slot, target);
    if (drank.ok) return;
  }
}

function incomingDamage(combat: NonNullable<RunState['combat']>): number {
  return livingEnemies(combat).reduce((sum, enemy) => {
    return sum + intentTotalDamage(intentForUnit(enemy, combat), enemy.weakTurns > 0);
  }, 0);
}

function reaches(act: ActMap, startId: string, kind: NodeKind): boolean {
  const nodes = new Map(act.nodes.map((node) => [node.id, node]));
  const start = nodes.get(startId);
  if (!start) return false;
  const seen = new Set<string>([startId]);
  const queue = [...start.nextIds];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = nodes.get(id);
    if (!node) continue;
    if (node.kind === kind) return true;
    queue.push(...node.nextIds);
  }
  return false;
}

function countKind(state: RunState, kind: NodeKind): number {
  return state.pathIds.filter((id) => findNode(state.runMap, id)?.kind === kind).length;
}

function choiceView(choice: EventChoiceDef): EventChoiceView {
  let losesHp = 0;
  let heals = false;
  let gainsGold = 0;
  for (const effect of choice.effects) {
    if (effect.op === 'loseHp') losesHp += effect.amount;
    if (effect.op === 'heal' || effect.op === 'healFull' || effect.op === 'healMissingPercent') heals = true;
    if (effect.op === 'gainGold') gainsGold += effect.amount;
  }
  return { id: choice.id, losesHp, heals, gainsGold, isLeave: choice.id === 'leave' };
}

function bestSmith(state: RunState): string | null {
  let best: { uid: string; gain: number } | null = null;
  for (const card of state.deck) {
    if (!canUpgradeCard(card.defId, card.upgradeLevel)) continue;
    const gain = printedCardScore(resolveCard(card.defId, 1)) - printedCardScore(resolveCard(card.defId, 0));
    if (!best || gain > best.gain) best = { uid: card.uid, gain };
  }
  return best?.uid ?? null;
}

function worstIndex(state: RunState): number {
  let index = 0;
  let score = Number.POSITIVE_INFINITY;
  state.deck.forEach((card, cardIndex) => {
    const def = getCard(card.defId);
    const next = def.curse ? -1 : printedCardScore(def);
    if (next < score) {
      score = next;
      index = cardIndex;
    }
  });
  return index;
}

function fingerprint(state: RunState): string {
  const combat = state.combat;
  return [
    state.screen,
    state.eventTrack.active?.phase ?? '',
    combat?.status ?? '',
    combat?.turn ?? '',
    combat?.energy ?? '',
    combat?.heroHp ?? '',
    combat?.hand.length ?? '',
    state.cast?.prompt.retry ? 'retry' : '',
    state.cast?.prompt.lessonFamilyId ?? '',
    state.eventTrack.active?.shrineLeft ?? '',
    state.gold,
    state.heroHp,
    state.pathIds.length,
  ].join('|');
}

function playsThisTurn(state: RunState, played: PlayMemory): number {
  const key = `${state.activeNodeId ?? ''}:${state.combat?.turn ?? 0}`;
  if (played.key !== key) {
    played.key = key;
    played.count = 0;
  }
  return played.count;
}

function fraction(hp: number, max: number): number {
  if (max <= 0) return 0;
  return hp / max;
}

function countEvents(): Pick<
  ActRunSummary,
  'shopBuys' | 'rests' | 'smiths' | 'rewardSkips' | 'casts' | 'correctCasts' | 'syntheticCasts' | 'buckets'
> {
  const buckets: Record<ResponseBucket, number> = { '<5s': 0, '5-15s': 0, '15-30s': 0, '>30s': 0 };
  const counts = {
    shopBuys: 0,
    rests: 0,
    smiths: 0,
    rewardSkips: 0,
    casts: 0,
    correctCasts: 0,
    syntheticCasts: 0,
    buckets,
  };
  let events: Array<Record<string, unknown>> = [];
  try {
    const raw = localStorage.getItem(PLAYTEST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    events = Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
  } catch {
    return counts;
  }
  for (const event of events) {
    if (event.kind === 'cast') {
      counts.casts += 1;
      if (event.correct === true) counts.correctCasts += 1;
      if (event.synthetic === true) counts.syntheticCasts += 1;
      const bucket = event.responseBucket;
      if (bucket === '<5s' || bucket === '5-15s' || bucket === '15-30s' || bucket === '>30s') {
        counts.buckets[bucket] += 1;
      }
    } else if (event.kind === 'smith') counts.smiths += 1;
    else if (event.kind === 'skip') counts.rewardSkips += 1;
  }
  return counts;
}

function offerReport(config: SimConfig): string[] {
  const lines = ['A2 OFFER / PICK'];
  for (const characterId of config.characters) {
    lines.push(...offerCharacter(characterId, config.runs, config.seed));
  }
  return lines;
}

function offerCharacter(characterId: PlayableCharacterId, runs: number, seed: number): string[] {
  const character = getPlayableCharacter(characterId);
  const cards = character.cardPoolIds
    .map((id) => getCard(id))
    .filter((card) => card.rarity !== 'basic' && !card.curse);
  const byDirection = new Map<string, typeof cards>();
  for (const card of cards) {
    const key = card.direction ?? 'general';
    const list = byDirection.get(key) ?? [];
    list.push(card);
    byDirection.set(key, list);
  }
  const foci = OFFER_FOCI[characterId];
  const rng = createChildRng(seed);
  const stats = new Map(cards.map((card) => [card.id, { offered: 0, picked: 0 }]));
  const cohorts = foci.map((focus) => ({ ...focus, runs: 0, score: 0 }));
  for (let run = 0; run < runs; run += 1) {
    const focus = foci[run % foci.length]!;
    const deckScores: number[] = [];
    for (let draft = 0; draft < 15; draft += 1) {
      const offer = offerThree(cards, byDirection, rng, draft);
      for (const card of offer) {
        const stat = stats.get(card.id);
        if (stat) stat.offered += 1;
      }
      const ranked = offer
        .map((card) => ({
          card,
          score: printedCardScore(card, focus.direction) + (rng() - 0.5) * 0.35,
        }))
        .sort((left, right) => right.score - left.score);
      const picked = ranked[0]?.card;
      if (!picked) continue;
      const stat = stats.get(picked.id);
      if (stat) stat.picked += 1;
      deckScores.push(printedCardScore(picked, focus.direction));
    }
    const cohort = cohorts.find((item) => item.name === focus.name);
    if (cohort) {
      cohort.runs += 1;
      cohort.score += deckScores.reduce((sum, score) => sum + score, 0) / Math.max(1, deckScores.length);
    }
  }
  const rows = [...stats.entries()]
    .map(([id, stat]) => ({
      id,
      name: getCard(id).name,
      pickRate: stat.offered ? stat.picked / stat.offered : 0,
      offered: stat.offered,
    }))
    .filter((row) => row.offered > 0)
    .sort((left, right) => left.pickRate - right.pickRate);
  const lines = [`${character.name} drafts=${runs} cards=${cards.length}`];
  const outside = rows.filter((row) => row.pickRate > 0.8 || row.pickRate < 0.03);
  lines.push(`outside 3–80%: ${outside.length === 0 ? 'none' : outside.map((row) => `${row.id} ${(row.pickRate * 100).toFixed(1)}%`).join(', ')}`);
  lines.push('LOW');
  for (const row of rows.slice(0, 5)) {
    lines.push(`  ${row.id} ${row.name} ${(row.pickRate * 100).toFixed(1)}%`);
  }
  lines.push('HIGH');
  for (const row of rows.slice(-5).reverse()) {
    lines.push(`  ${row.id} ${row.name} ${(row.pickRate * 100).toFixed(1)}%`);
  }
  const scores = cohorts.map((cohort) => cohort.score / Math.max(1, cohort.runs));
  const spread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  lines.push(`cohort score spread=${spread.toFixed(3)}`);
  for (const cohort of cohorts) {
    lines.push(`  ${cohort.name} meanScore=${(cohort.score / Math.max(1, cohort.runs)).toFixed(3)}`);
  }
  return lines;
}

function offerThree(
  cards: ReturnType<typeof getCard>[],
  byDirection: Map<string, ReturnType<typeof getCard>[]>,
  rng: () => number,
  draft: number,
): ReturnType<typeof getCard>[] {
  const rarity = sampleRarity(rng, draft);
  const pool = cards.filter((card) => (card.rarity ?? 'common') === rarity.toLowerCase());
  const source = pool.length > 0 ? pool : cards;
  void byDirection;
  const offer: ReturnType<typeof getCard>[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (offer.length < 3 && guard < 40) {
    guard += 1;
    const card = source[Math.floor(rng() * source.length)];
    if (!card || seen.has(card.id)) continue;
    seen.add(card.id);
    offer.push(card);
  }
  return offer;
}

function sampleRarity(rng: () => number, draft: number): 'Common' | 'Uncommon' | 'Rare' {
  if (draft === 11 || draft === 14) return 'Rare';
  const roll = rng();
  if (roll < 0.08) return 'Rare';
  if (roll < 0.43) return 'Uncommon';
  return 'Common';
}

function turnReport(config: SimConfig): string[] {
  const jobs = config.mode === 'sample' ? sampleJobs(config.seed) : turnJobs(config);
  const lines = ['A3/A4 TURNS'];
  lines.push('character persona zhuyinP mode result hp gold rooms elites casts correct synthetic buckets uncast skips shop rests smith');
  for (const job of jobs) {
    const summary = runActI(job);
    const bucketText = BUCKETS.map((bucket) => `${bucket}:${summary.buckets[bucket]}`).join('/');
    const correct = summary.casts ? `${((summary.correctCasts / summary.casts) * 100).toFixed(0)}%` : 'n/a';
    lines.push(
      [
        summary.characterId,
        summary.personaId,
        summary.zhuyinP.toFixed(2),
        summary.castSkip ? 'castSkip' : 'castOn',
        summary.result,
        `hp=${summary.hp}`,
        `gold=${summary.gold}`,
        `rooms=${summary.rooms}`,
        `elites=${summary.eliteWins}`,
        `casts=${summary.casts}`,
        `correct=${correct}`,
        `syntheticCasts=${summary.syntheticCasts}`,
        bucketText,
        `uncast=${summary.uncastEnds}`,
        `skips=${summary.rewardSkips}`,
        `shop=${summary.shopBuys}`,
        `rests=${summary.rests}`,
        `smith=${summary.smiths}`,
        summary.note,
      ].join(' '),
    );
  }
  return lines;
}

function sampleJobs(seed: number): ActRunOptions[] {
  const jobs: ActRunOptions[] = [];
  for (const characterId of PLAYABLE_CHARACTER_IDS) {
    for (const personaId of CHILD_PERSONA_IDS) {
      jobs.push({ characterId, personaId, seed, castSkip: false });
    }
  }
  for (const zhuyinP of ZHUYIN_P_SWEEP) {
    if (zhuyinP === CHILD_PERSONAS.firstGrader.zhuyinP) continue;
    jobs.push({
      characterId: 'echoMage',
      personaId: 'firstGrader',
      seed,
      zhuyinP,
      castSkip: false,
    });
  }
  for (const characterId of PLAYABLE_CHARACTER_IDS) {
    jobs.push({ characterId, personaId: 'firstGrader', seed, castSkip: true });
  }
  return jobs;
}

function turnJobs(config: SimConfig): ActRunOptions[] {
  const jobs: ActRunOptions[] = [];
  for (let index = 0; index < config.runs; index += 1) {
    for (const characterId of config.characters) {
      for (const personaId of config.personas) {
        const sweep = characterId === 'echoMage' ? config.zhuyinPs : null;
        if (sweep && sweep.length > 0) {
          for (const zhuyinP of sweep) {
            jobs.push({
              characterId,
              personaId,
              seed: config.seed + index,
              zhuyinP,
              castSkip: config.castSkip,
            });
          }
        } else {
          jobs.push({
            characterId,
            personaId,
            seed: config.seed + index,
            castSkip: config.castSkip,
          });
        }
      }
    }
  }
  return jobs;
}

function parseArgs(argv: string[]): SimConfig {
  const config: SimConfig = {
    mode: 'turns',
    characters: [...PLAYABLE_CHARACTER_IDS],
    personas: [...CHILD_PERSONA_IDS],
    zhuyinPs: null,
    runs: 1,
    seed: 17_665,
    castSkip: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sample') config.mode = 'sample';
    else if (arg === '--castSkip') config.castSkip = true;
    else if (arg === '--mode' && next) {
      if (next === 'offer' || next === 'turns' || next === 'sample') config.mode = next;
      index += 1;
    } else if (arg === '--character' && next) {
      config.characters = next === 'both'
        ? [...PLAYABLE_CHARACTER_IDS]
        : next.split(',').filter((id): id is PlayableCharacterId => isCharacter(id));
      index += 1;
    } else if ((arg === '--childModel' || arg === '--personas') && next) {
      config.personas = next.split(',').filter(isChildPersonaId);
      index += 1;
    } else if (arg === '--zhuyinP' && next) {
      config.zhuyinPs = next.split(',').map(Number).filter((value) => Number.isFinite(value));
      index += 1;
    } else if (arg === '--runs' && next) {
      config.runs = Math.max(1, Math.trunc(Number(next)) || 1);
      index += 1;
    } else if (arg === '--seed' && next) {
      config.seed = Math.trunc(Number(next)) || 1;
      index += 1;
    }
  }
  if (config.characters.length === 0) config.characters = [...PLAYABLE_CHARACTER_IDS];
  if (config.personas.length === 0) config.personas = [...CHILD_PERSONA_IDS];
  return config;
}

function isCharacter(value: string): value is PlayableCharacterId {
  return (PLAYABLE_CHARACTER_IDS as readonly string[]).includes(value);
}

function readArgs(): string[] {
  const raw = process.env.ZS_SIM_ARGS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
