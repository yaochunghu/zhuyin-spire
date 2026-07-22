/**
 * Card pile helpers: shuffle, draw, makeCard.
 */

import { MAX_HAND_SIZE } from '../../data/balance';
import { cloneDeckCard, createDeckCard, type DeckCardV2 } from '../cardInstances';
import type { CombatCard, CombatState } from './types';
import { pushFx } from './fx';

export function makeCard(card: string | DeckCardV2): CombatCard {
  return typeof card === 'string' ? createDeckCard(card) : cloneDeckCard(card);
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw up to n cards. StS-style: hand cannot exceed MAX_HAND_SIZE (10).
 */
export function drawCards(state: CombatState, n: number): CombatCard[] {
  const drawn: CombatCard[] = [];
  let skippedFull = false;
  for (let i = 0; i < n; i += 1) {
    if (state.hand.length >= MAX_HAND_SIZE) {
      skippedFull = true;
      break;
    }
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      const count = state.discardPile.length;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      state.log.push('洗牌！');
      pushFx(state, { type: 'shuffle', count });
    }
    const card = state.drawPile.pop();
    if (card) {
      state.hand.push(card);
      drawn.push(card);
    }
  }
  if (skippedFull && drawn.length < n) {
    state.log.push(`手牌已滿（${MAX_HAND_SIZE}）`);
  }
  if (drawn.length > 0) {
    pushFx(state, { type: 'draw', cards: drawn });
  }
  return drawn;
}

/** Pick unique reward card ids from a pool. */
export function pickRewardIds(
  pool: string[],
  count: number,
  rng = Math.random,
): string[] {
  const shuffled = shuffle([...pool], rng);
  const picked: string[] = [];
  for (const id of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}
