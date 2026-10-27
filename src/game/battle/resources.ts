/**
 * Shared 勁 gains so 聽勁護心 sees every source once.
 * Enemy-phase block waits until the next player turn, after leftover block
 * expires, so it cannot turn a later attack into extra 勁.
 */

import { pushFx } from './fx';
import type { CombatState } from './types';

export function gainJin(
  state: CombatState,
  amount: number,
  when: 'now' | 'afterEnemies' = 'now',
): number {
  if (amount <= 0 || state.jin >= 9) return 0;
  const before = state.jin;
  state.jin = Math.min(9, state.jin + amount);
  const gained = state.jin - before;
  if (gained > 0) armListeningHeart(state, when);
  return gained;
}

function armListeningHeart(state: CombatState, when: 'now' | 'afterEnemies'): void {
  if (!state.jinGuardReady || state.jinGuardBlock <= 0) return;
  state.jinGuardReady = false;
  if (when === 'afterEnemies') {
    state.jinGuardBlockPending = state.jinGuardBlock;
    return;
  }
  state.jinGuardBlockImmediate = state.jinGuardBlock;
}

/** Card-granted 勁: add the shield before this card's block feedback is emitted. */
export function applyImmediateListeningHeart(state: CombatState): void {
  if (state.jinGuardBlockImmediate <= 0) return;
  const amount = state.jinGuardBlockImmediate;
  state.jinGuardBlockImmediate = 0;
  state.block += amount;
  state.log.push(`聽勁護心：護盾 +${amount}`);
}

/** Apply the shield earned by a full block, after this turn's block has expired. */
export function applyPendingListeningHeart(state: CombatState): void {
  if (state.jinGuardBlockPending <= 0) return;
  const amount = state.jinGuardBlockPending;
  state.jinGuardBlockPending = 0;
  state.block += amount;
  pushFx(state, { type: 'playerBlock', amount });
  state.log.push(`聽勁護心：護盾 +${amount}`);
}
