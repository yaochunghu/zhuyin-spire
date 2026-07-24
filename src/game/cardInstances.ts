import { getCard, type CardDef } from '../data/cards';

/** One owned physical card. Duplicate definitions remain separate objects. */
export interface DeckCardV2 {
  uid: string;
  defId: string;
  upgradeLevel: number;
}

let fallbackUid = 0;

function randomUid(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `card-${uuid}`;
  fallbackUid += 1;
  return `card-${Date.now().toString(36)}-${fallbackUid.toString(36)}`;
}

export function createDeckCard(defId: string, upgradeLevel = 0): DeckCardV2 {
  getCard(defId);
  return { uid: randomUid(), defId, upgradeLevel };
}

export function createDeck(defIds: readonly string[]): DeckCardV2[] {
  return defIds.map((defId) => createDeckCard(defId));
}

export function cloneDeckCard(card: DeckCardV2): DeckCardV2 {
  return { ...card };
}

export function isDeckCardV2(value: unknown): value is DeckCardV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const card = value as Partial<DeckCardV2>;
  return (
    typeof card.uid === 'string' &&
    card.uid.length >= 1 &&
    card.uid.length <= 100 &&
    typeof card.defId === 'string' &&
    Number.isInteger(card.upgradeLevel) &&
    Number(card.upgradeLevel) >= 0 &&
    Number(card.upgradeLevel) <= 99
  );
}

export function cardDefinition(card: DeckCardV2): CardDef {
  return getCard(card.defId);
}

