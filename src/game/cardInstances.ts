import { getCard, resolveCard, type ResolvedCardDef } from '../data/cards';

export type UpgradeLevel = 0 | 1;

/** One physical collectible card. Duplicate definitions still have unique UIDs. */
export interface DeckCard {
  uid: string;
  defId: string;
  upgradeLevel: UpgradeLevel;
}

export interface CardOffer extends DeckCard {
  price?: number;
  sold?: boolean;
}

export function makeDeckCard(
  defId: string,
  uid: string,
  upgradeLevel: UpgradeLevel = 0,
): DeckCard {
  getCard(defId);
  return { uid, defId, upgradeLevel };
}

export function resolveDeckCard(card: DeckCard): ResolvedCardDef {
  return resolveCard(card.defId, card.upgradeLevel);
}

export function isDeckCard(value: unknown): value is DeckCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<DeckCard>;
  return (
    typeof card.uid === 'string' &&
    /^[A-Za-z0-9_-]{1,80}$/.test(card.uid) &&
    typeof card.defId === 'string' &&
    (card.upgradeLevel === 0 || card.upgradeLevel === 1)
  );
}

export function nextCardUid(counter: number): string {
  return `d${Math.max(1, Math.floor(counter))}`;
}
