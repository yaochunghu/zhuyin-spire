import type { CardJob } from './cards';
import {
  RESONANCE_INITIAL_REWARD_IDS,
} from './resonanceCards';
import type { CastingGateId } from '../game/casting/types';

export type CharacterStatus = 'playable' | 'inDesign';

export interface CharacterPreviewDef {
  id: string;
  status: CharacterStatus;
  emoji: string;
  name: string;
  title: string;
  theme: string;
  teachingNote: string;
}

/** Runtime dependencies required before a character may start a run. */
export interface PlayableCharacterDef extends CharacterPreviewDef {
  status: 'playable';
  starterDeckIds: readonly string[];
  starterSummary: ReadonlyArray<{ icon: string; label: string }>;
  startingRelicId: string;
  castingGateId: CastingGateId;
  actIRewardIds: readonly string[];
  /** Every unique implemented card design owned by this character. */
  cardPoolIds: readonly string[];
  /** Content flag: the physical-card schema may land before upgrades are released. */
  upgradesEnabled: boolean;
  featuredJobs: readonly CardJob[];
}

export interface InDesignCharacterDef extends CharacterPreviewDef {
  status: 'inDesign';
}

export type CharacterDef = PlayableCharacterDef | InDesignCharacterDef;

export const CHARACTERS = {
  echoMage: {
    id: 'echoMage',
    status: 'playable',
    emoji: '🥋',
    name: '共鳴武者',
    title: '以聲辨位，攻守換拍',
    theme: '完整防守累積「勁」，在「易傷」窗口用攻守換拍反擊。',
    teachingNote: '先讀意圖、完整防守，再把累積的力量化成反擊。',
    starterDeckIds: [
      'bo', 'bo', 'bo', 'bo', 'bo',
      'mo', 'mo', 'mo', 'mo',
      'po',
    ],
    starterSummary: [
      { icon: '⚔️', label: '1⚡ ×5' },
      { icon: '🛡️', label: '1⚡ ×4' },
      { icon: '🎯', label: '2⚡ ×1' },
    ],
    startingRelicId: 'tuningFork',
    castingGateId: 'zhuyin',
    actIRewardIds: [...RESONANCE_INITIAL_REWARD_IDS],
    cardPoolIds: [
      'bo',
      'mo',
      'po',
      ...RESONANCE_INITIAL_REWARD_IDS,
    ],
    upgradesEnabled: false,
    featuredJobs: ['frontload', 'defense', 'scaling', 'draw'],
  },
} as const satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof CHARACTERS;
export type PlayableCharacterId = 'echoMage';

export const FIRST_CHARACTER_ID: PlayableCharacterId = 'echoMage';
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
export const PLAYABLE_CHARACTER_IDS = CHARACTER_IDS.filter(
  (id): id is PlayableCharacterId => CHARACTERS[id].status === 'playable',
);

export function getCharacter(id: string): CharacterDef {
  const character = CHARACTERS[id as CharacterId];
  if (!character) throw new Error(`Unknown character ${id}`);
  return character;
}

export function getPlayableCharacter(id: string): PlayableCharacterDef {
  const character = getCharacter(id);
  if (character.status !== 'playable') throw new Error(`Character ${id} is not playable`);
  return character;
}

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && value in CHARACTERS;
}

export function isPlayableCharacterId(value: unknown): value is PlayableCharacterId {
  return isCharacterId(value) && CHARACTERS[value].status === 'playable';
}
