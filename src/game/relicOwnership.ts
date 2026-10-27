import { getRelic } from '../data/relics';

/** The smallest surface events need in order to grant a relic once. */
export interface RelicCarrier {
  relicIds: string[];
  gold: number;
}

export function ownedRelicIds(state: RelicCarrier): string[] {
  return [...state.relicIds];
}

/**
 * Adds a relic to the end of the owned list. The starter stays where it is.
 * Start-of-run gold is applied here and is not repeated on load.
 */
export function acquireRelic(state: RelicCarrier, relicId: string): boolean {
  if (state.relicIds.includes(relicId)) return false;
  const relic = getRelic(relicId);
  state.relicIds.push(relicId);
  if (relic.startGold) state.gold += relic.startGold;
  return true;
}
