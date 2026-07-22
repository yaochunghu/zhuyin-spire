/**
 * Player actions: play card (begin), cast resolve, canPlay.
 */

import { getCardAtUpgrade, type CardDef } from '../../data/cards';
import {
  cardNeedsEnemyTarget,
  cardTargetType,
  executeEffects,
  livingEnemies,
} from './effects';
import { pushFx } from './fx';
import { drawCards } from './piles';
import { syncPrimaryEnemy } from './enemyHandler';
import type { CombatState } from './types';

export function canPlay(state: CombatState, uid: string): boolean {
  if (state.status !== 'playing') return false;
  if (state.phase !== 'playerAction' && state.phase !== 'playerStart') return false;
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return false;
  const def = getCardAtUpgrade(card.defId, card.upgradeLevel);
  return state.energy >= def.cost;
}

/**
 * Begin playing a card. targetIds required for single-enemy attacks when multiple live.
 * If omitted, uses selectedEnemyId / first living / all.
 */
export function beginPlay(
  state: CombatState,
  uid: string,
  targetIds: string[] = [],
): CardDef {
  if (!canPlay(state, uid)) throw new Error('Cannot play card');
  const idx = state.hand.findIndex((c) => c.uid === uid);
  const [card] = state.hand.splice(idx, 1);
  const def = getCardAtUpgrade(card.defId, card.upgradeLevel);
  state.energy -= def.cost;
  state.pending = card;

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

export function resolveCastSuccess(state: CombatState, def: CardDef): void {
  if (state.pending) {
    const card = state.pending;
    if (def.type === 'power') {
      state.powerPile.push(card);
    } else {
      state.discardPile.push(card);
      pushFx(state, { type: 'discard', cards: [card], reason: 'play' });
    }
    state.pending = null;
  }

  const targets = [...state.pendingTargetIds];
  state.pendingTargetIds = [];

  executeEffects(state, def, targets, (fx) => pushFx(state, fx), drawCards);
  syncPrimaryEnemy(state);
}

export function resolveCastFizzle(state: CombatState, def: CardDef): void {
  if (state.pending) {
    const card = state.pending;
    state.discardPile.push(card);
    state.pending = null;
    pushFx(state, { type: 'discard', cards: [card], reason: 'fizzle' });
  }
  state.pendingTargetIds = [];
  state.log.push(`${def.zhuyin} 失敗了…法術消散！`);
}

/** Discard remaining hand at end of player turn. */
export function discardHandEndTurn(state: CombatState): void {
  const discarded = [...state.hand];
  if (discarded.length > 0) {
    state.discardPile.push(...discarded);
    state.hand = [];
    pushFx(state, { type: 'discard', cards: discarded, reason: 'endTurn' });
  } else {
    state.hand = [];
  }
}
