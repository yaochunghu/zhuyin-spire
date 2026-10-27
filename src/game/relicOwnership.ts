import { getRelic } from '../data/relics';

/** The smallest surface events need in order to grant a relic once. */
export interface RelicCarrier {
  relicId: string | null;
  relicIds: string[];
  gold: number;
}

export function ownedRelicIds(state: RelicCarrier): string[] {
  const ids = state.relicIds.length > 0
    ? [...state.relicIds]
    : state.relicId
      ? [state.relicId]
      : [];
  if (state.relicId && !ids.includes(state.relicId)) ids.unshift(state.relicId);
  return ids;
}

/** Adds a relic once. Start-of-run gold is applied here and is not repeated on load. */
export function acquireRelic(state: RelicCarrier, relicId: string): boolean {
  if (ownedRelicIds(state).includes(relicId)) return false;
  const relic = getRelic(relicId);
  if (!state.relicIds.includes(relicId)) state.relicIds.push(relicId);
  if (!state.relicId) state.relicId = relicId;
  if (relic.startGold) state.gold += relic.startGold;
  return true;
}
