import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHRASE_CLIPS } from '../../src/data/phraseClips';
import { PHRASES_BY_INITIAL } from '../../src/data/phrases';
import { VOICE_LINES } from '../../src/data/voiceLines';

const VOICE_DIR = join(process.cwd(), 'src/assets/audio/voice');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const clipFiles = filesUnder(VOICE_DIR).map((path) => relative(VOICE_DIR, path));
const clips = Object.entries(PHRASE_CLIPS);

/** Words cut by Design on 2026-11-01. No pool entry and no clip may come back for them. */
const CUT_WORDS = '搞 扔 煞 幹 篩 腎 審 婦 儒 億 亦 翼 氧 宴 括 款 府 史 恨 罵 傻'.split(' ');
/** Their batch 3 recordings, which are left out of the import. */
const CUT_FILES = [
  'core/core.058.mp3', 'core/core.147.mp3', 'core/core.202.mp3', 'core/core.309.mp3',
  'core/core.488.mp3', 'core/core.500.mp3', 'core/core.501.mp3', 'core/core.518.mp3',
  'core/core.619.mp3', 'nature/nature.192.mp3', 'nature/nature.502.mp3', 'nature/nature.571.mp3',
  'park/park.255.mp3', 'body/body.490.mp3', 'numbers/numbers.517.mp3', 'animals/animals.521.mp3',
  'food/food.563.mp3', 'family/family.624.mp3', 'school/school.263.mp3', 'school/school.315.mp3',
  'school/school.432.mp3',
];

describe('batch 3 phrase clips', () => {
  it('imports 604 Act I phrase clips plus the n.lore.ry narrator pick-up', () => {
    expect(clips).toHaveLength(604);
    expect(clipFiles.filter((file) => file.startsWith('teacher/phrases_act1/'))).toHaveLength(604);
    expect(VOICE_LINES['n.lore.ry']?.[1]).toBe('narrator/batch1b/n.lore.ry.mp3');
    expect(clipFiles.filter((file) => file.startsWith('narrator/batch1b/'))).toEqual(['narrator/batch1b/n.lore.ry.mp3']);
  });

  it('registers each phrase clip as a 老師 voice line that says the same word', () => {
    for (const [key, [, word]] of clips) {
      const line = VOICE_LINES[key];
      expect(line, key).toBeDefined();
      expect(line[0], key).toBe('teacher');
      expect(line[1], key).toMatch(/^teacher\/phrases_act1\/[a-z]+\/[a-z]+\.\d{3}\.mp3$/);
      expect(line[2], key).toBe(word);
    }
  });

  it('matches every clipped pool entry in character and 注音', () => {
    for (const [key, [initial, word, zhuyin]] of clips) {
      const matches = (PHRASES_BY_INITIAL[initial] ?? []).filter((phrase) => phrase.word === word);
      expect(matches, `${key} ${word}`).toHaveLength(1);
      // spell is the phrase's first syllable; the clip's 注音 covers the whole word.
      expect(matches[0].spell, `${key} ${word}`).toBe(zhuyin.split(' ')[0]);
    }
  });

  it('applies the Design 11-01 fixes to body.016 and core.387', () => {
    const find = (initial: string, word: string) =>
      PHRASES_BY_INITIAL[initial].filter((phrase) => phrase.word === word);
    expect(PHRASE_CLIPS['w.body.016']).toEqual(['ㄅ', '背', 'ㄅㄟˋ']);
    expect(find('ㄅ', '背').map((phrase) => phrase.spell)).toEqual(['ㄅㄟˋ']);
    // core.387 stays 里 (neighborhood, 🏘️): Design reverted the 裡 change on 11-01 after QA.
    expect(PHRASE_CLIPS['w.core.387']).toEqual(['ㄌ', '里', 'ㄌㄧˇ']);
    expect(find('ㄌ', '里').map((phrase) => [phrase.emoji, phrase.spell])).toEqual([['🏘️', 'ㄌㄧˇ']]);
    expect(Object.values(PHRASES_BY_INITIAL).flat().filter((phrase) => phrase.word === '裡')).toEqual([]);
  });

  it('keeps the 21 cut words out of the pool and the audio', () => {
    expect(CUT_WORDS).toHaveLength(21);
    expect(CUT_FILES).toHaveLength(21);
    const poolWords = new Set(Object.values(PHRASES_BY_INITIAL).flat().map((phrase) => phrase.word));
    for (const word of CUT_WORDS) {
      expect(poolWords.has(word), word).toBe(false);
      expect(clips.filter(([, [, clipWord]]) => clipWord === word), word).toEqual([]);
      expect(Object.entries(VOICE_LINES).filter(([key, [, , text]]) => key.startsWith('w.') && text === word), word).toEqual([]);
    }
    for (const file of CUT_FILES) {
      expect(clipFiles, file).not.toContain(`teacher/phrases_act1/${file}`);
      const key = `w.${file.split('/')[1].replace(/\.mp3$/, '')}`;
      expect(PHRASE_CLIPS[key], key).toBeUndefined();
      expect(VOICE_LINES[key], key).toBeUndefined();
    }
  });
});
