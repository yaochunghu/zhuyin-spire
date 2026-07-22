import type { CardJob } from './cards';
import type { CastingGateId } from '../game/casting/types';

/**
 * A character owns a starter deck, a starter relic, and one clear deck theme.
 * Keeping this data together prevents a future character from accidentally
 * receiving another character's cards or relic during new-run setup.
 */
export interface CharacterDef {
  id: string;
  emoji: string;
  name: string;
  title: string;
  theme: string;
  teachingNote: string;
  starterDeckIds: string[];
  startingRelicId: string;
  /** Educational gate used after this character commits a card. */
  castingGateId: CastingGateId;
  /** Character-themed cards available during Act I rewards and shops. */
  actIRewardIds: string[];
  featuredJobs: CardJob[];
}

export const CHARACTERS: Record<string, CharacterDef> = {
  echoMage: {
    id: 'echoMage',
    emoji: '🧙‍♂️',
    name: '回音法師',
    title: '用聲音守護大家',
    theme: '先讓怪物附上「回音」，再用每回合第一下攻擊發出加強音波。',
    teachingNote: '先防守、再標記、最後攻擊；每一步都有清楚用途。',
    starterDeckIds: [
      'bo',
      'bo',
      'bo',
      'bo',
      'bo',
      'mo',
      'mo',
      'mo',
      'mo',
      'po',
    ],
    startingRelicId: 'tuningFork',
    castingGateId: 'zhuyin',
    actIRewardIds: ['ge', 'ri', 'ke', 'te', 'he', 'shi', 'le', 'yi', 'fo'],
    featuredJobs: ['frontload', 'defense', 'scaling', 'draw'],
  },
};

export const FIRST_CHARACTER_ID = 'echoMage';
export const PLAYABLE_CHARACTER_IDS = [FIRST_CHARACTER_ID] as const;

export function getCharacter(id: string): CharacterDef {
  const character = CHARACTERS[id];
  if (!character) throw new Error(`Unknown character ${id}`);
  return character;
}

export function isCharacterId(value: unknown): value is string {
  return typeof value === 'string' && value in CHARACTERS;
}
