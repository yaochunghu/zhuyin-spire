/**
 * Event rewards that put bottles into the live three-slot belt.
 *
 * The belt and the six bottles live in `src/data/potions.ts`. This helper only
 * fills empty slots. A full belt stays a visible, explained choice.
 */

import { firstEmptyPotionSlot, getPotion, POTION_POOL_IDS } from '../data/potions';

export function freePotionSlots(belt: readonly (string | null)[]): number {
  return belt.filter((id) => id === null).length;
}

export function potionBlockReason(belt: readonly (string | null)[], count: number): string | null {
  if (freePotionSlots(belt) < count) return '藥水格已滿';
  return null;
}

/** Places `count` pool bottles into empty slots. Returns their names. */
export function grantPotions(
  belt: (string | null)[],
  count: number,
  randomIndex: (exclusiveMax: number) => number,
): string[] {
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const slot = firstEmptyPotionSlot(belt);
    if (slot < 0) break;
    const id = POTION_POOL_IDS[randomIndex(POTION_POOL_IDS.length)];
    if (!id) break;
    belt[slot] = id;
    names.push(getPotion(id).name);
  }
  return names;
}
