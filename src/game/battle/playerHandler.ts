/**
 * Player actions: play card (begin), cast resolve, canPlay.
 */

import { resolveCard, type CardDef } from '../../data/cards';
import {
  cardNeedsEnemyTarget,
  cardTargetType,
  executeEffects,
  isEligibleHandChoice,
  livingEnemies,
} from './effects';
import { pushFx } from './fx';
import { drawCards } from './piles';
import { noteSuccessfulCast, syncPrimaryEnemy } from './enemyHandler';
import type { CombatState } from './types';

export function canPlay(state: CombatState, uid: string): boolean {
  if (state.status !== 'playing') return false;
  if (state.phase !== 'playerAction' && state.phase !== 'playerStart') return false;
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return false;
  const def = resolveCard(card.defId, card.upgradeLevel);
  if (def.curse) return false;
  const cost = effectiveCost(state, card, def);
  const requiredJin = def.designId === 'B077' || def.designId === 'B084' || def.designId === 'B087'
    ? 1
    : 0;
  return state.energy >= cost && state.jin >= requiredJin;
}

/**
 * Begin playing a card. targetIds required for single-enemy attacks when multiple live.
 * If omitted, uses selectedEnemyId / first living / all.
 */
export function beginPlay(
  state: CombatState,
  uid: string,
  targetIds: string[] = [],
  chosenHandUid?: string,
): CardDef {
  if (!canPlay(state, uid)) throw new Error('Cannot play card');
  const idx = state.hand.findIndex((c) => c.uid === uid);
  const candidate = state.hand[idx]!;
  const def = resolveCard(candidate.defId, candidate.upgradeLevel);
  if (def.handChoice) {
    const eligible = state.hand.filter((entry) => entry.uid !== uid &&
      isEligibleHandChoice(def, entry));
    if ((eligible.length > 0 || chosenHandUid !== undefined) &&
        !eligible.some((entry) => entry.uid === chosenHandUid)) {
      throw new Error('Choose a valid card before casting');
    }
  }
  const [card] = state.hand.splice(idx, 1);
  card!.chosenHandUid = def.handChoice ? chosenHandUid : undefined;
  state.energy -= effectiveCost(state, card, def);
  state.pending = card;
  if ((def.basicAttack || card.basicOverride) && state.freeBasicsRemaining > 0) {
    state.freeBasicsRemaining -= 1;
  }

  let ids = [...targetIds];
  const need = cardNeedsEnemyTarget(def);
  if (need) {
    const living = livingEnemies(state);
    if (cardTargetType(def) === 'allEnemies') {
      ids = living.map((e) => e.id);
    } else if (!ids.length) {
      if (state.selectedEnemyId && living.some((e) => e.id === state.selectedEnemyId)) {
        ids = [state.selectedEnemyId];
      } else if (living[0]) {
        ids = [living[0].id];
      }
    }
  }
  state.pendingTargetIds = ids;
  return def;
}

export function effectiveCost(
  state: CombatState,
  card: CombatState['hand'][number],
  def: CardDef,
): number {
  if ((def.basicAttack || card.basicOverride) && state.freeBasicsRemaining > 0) return 0;
  let cost = def.cost;
  if (def.designId === 'B065' && state.lastPlayedType === 'skill') cost = Math.min(1, cost);
  else if (def.designId === 'B132') cost = Math.max(0, def.cost - state.tempoCount);
  return Math.max(0, cost - card.temporaryCostReduction);
}

export function resolveCastSuccess(state: CombatState, def: CardDef): void {
  const card = state.pending;
  const isTempo =
    (def.type === 'attack' && state.lastPlayedType === 'skill') ||
    (def.type === 'skill' && state.lastPlayedType === 'attack');
  if (isTempo) {
    state.tempoCount += 1;
    pushFx(state, { type: 'playerTempo', count: state.tempoCount });
    if (state.tempoRelicReady && state.tempoRelicBlock > 0) {
      state.tempoRelicReady = false;
      state.block += state.tempoRelicBlock;
      pushFx(state, { type: 'playerBlock', amount: state.tempoRelicBlock });
      state.log.push(`換拍木魚：護盾 +${state.tempoRelicBlock}`);
    }
  }
  if (def.type === 'attack' || def.type === 'skill') state.lastPlayedType = def.type;

  if (state.pending) {
    state.pending = null;
  }

  const targets = [...state.pendingTargetIds];
  state.pendingTargetIds = [];

  executeEffects(state, def, targets, (fx) => pushFx(state, fx), drawCards, card, isTempo);
  state.metronomePlayed = (state.metronomePlayed ?? 0) + 1;
  if (state.relicMetronome && !state.metronomeUsed && state.metronomePlayed === 3) {
    state.metronomeUsed = true;
    drawCards(state, 1);
    state.log.push('口袋節拍器：抽 1 張');
  }
  if (
    state.musicBoxSourceUid
    && card?.sourceUid === state.musicBoxSourceUid
    && !state.musicBoxUsed
  ) {
    state.musicBoxUsed = true;
    drawCards(state, 1);
    state.log.push('月光音樂盒：抽 1 張');
  }
  if (card) {
    delete card.chosenHandUid;
    if (def.type === 'power') {
      const powerId = def.designId ?? def.id;
      if (!state.activePowerIds.includes(powerId)) state.activePowerIds.push(powerId);
      const installed = state.activePowerLevels[powerId] ?? 0;
      state.activePowerLevels[powerId] = Math.max(installed, card.upgradeLevel) as 0 | 1;
    } else if (def.exhaust) {
      state.exhaustPile.push(card);
    } else {
      card.temporaryCostReduction = 0;
      state.discardPile.push(card);
      pushFx(state, { type: 'discard', cards: [card], reason: 'play' });
    }
  }
  noteSuccessfulCast(state);
  syncPrimaryEnemy(state);
}

export function resolveCastFizzle(state: CombatState, def: CardDef): void {
  if (state.pending) {
    const card = state.pending;
    card.temporaryCostReduction = 0;
    delete card.chosenHandUid;
    state.discardPile.push(card);
    state.pending = null;
    pushFx(state, { type: 'discard', cards: [card], reason: 'fizzle' });
  }
  state.pendingTargetIds = [];
  state.log.push(`${def.zhuyin} 失敗了…法術消散！`);
}

/** Discard remaining hand at end of player turn. */
export function discardHandEndTurn(state: CombatState): void {
  const retained = state.hand.filter((card) => resolveCard(card.defId, card.upgradeLevel).retain);
  const discarded = state.hand.filter((card) => !resolveCard(card.defId, card.upgradeLevel).retain);
  if (discarded.length > 0) {
    state.discardPile.push(...discarded);
    state.hand = retained;
    pushFx(state, { type: 'discard', cards: discarded, reason: 'endTurn' });
  } else {
    state.hand = retained;
  }
  // "This turn" discounts end with the turn, including retained cards and anything discarded.
  for (const card of [...state.hand, ...state.discardPile, ...state.drawPile, ...state.exhaustPile]) {
    card.temporaryCostReduction = 0;
  }
}
