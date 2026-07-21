/**
 * Combat FX queue — handlers push; UI drains via takePendingFx.
 */

import type { CombatFx, CombatState } from './types';

export function pushFx(state: CombatState, fx: CombatFx): void {
  state.pendingFx.push(fx);
}

export function takePendingFx(state: CombatState): CombatFx[] {
  const fx = state.pendingFx;
  state.pendingFx = [];
  return fx;
}
