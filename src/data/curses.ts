import type { CardDef } from './cards';

/**
 * Persistent curses named by the event bible.
 * They are not part of the 75-card catalog and never enter reward pools.
 * Readings follow 《教育部重編國語辭典修訂本》 headwords for the first syllable.
 */
export const CURSES: Record<string, CardDef> = {
  cu_silence: {
    id: 'cu_silence',
    zhuyin: 'ㄕ',
    name: '失聲',
    type: 'skill',
    cost: 0,
    icon: '🤫',
    value: 0,
    rarity: 'special',
    curse: true,
    cues: [{ word: '失聲', emoji: '🤫', spell: 'ㄕ' }],
    description: '這張不能出。',
  },
  cu_heavy_beat: {
    id: 'cu_heavy_beat',
    zhuyin: 'ㄔ',
    name: '沉拍',
    type: 'skill',
    cost: 0,
    icon: '🥁',
    value: 0,
    rarity: 'special',
    curse: true,
    cues: [{ word: '沉拍', emoji: '🥁', spell: 'ㄔㄣˊ' }],
    description: '抽到後，下一回合少抽 1 張。',
  },
  cu_stage_fright: {
    id: 'cu_stage_fright',
    zhuyin: 'ㄑ',
    name: '怯場',
    type: 'skill',
    cost: 0,
    icon: '😟',
    value: 0,
    rarity: 'special',
    curse: true,
    cues: [{ word: '怯場', emoji: '😟', spell: 'ㄑㄧㄝˋ' }],
    description: '在手上時，這一回合第一下攻擊少 2 點。',
  },
};

export function isCurseId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CURSES, id);
}

export function curseName(id: string): string {
  return CURSES[id]?.name ?? id;
}
