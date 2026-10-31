import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { EVENTS } from '../../src/data/events';
import { VOICE_LINES } from '../../src/data/voiceLines';
import { resolveVoiceLine } from '../../src/game/voiceClips';
import { mathQuestionVoiceKey } from '../../src/ui/voiceDirector';

const VOICE_DIR = join(process.cwd(), 'src/assets/audio/voice');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const clipFiles = filesUnder(VOICE_DIR).map((path) => relative(VOICE_DIR, path));
const entries = Object.entries(VOICE_LINES);
const keysIn = (dir: string) => entries.filter(([, [, file]]) => file.startsWith(`${dir}/`)).map(([key]) => key);
const filesIn = (dir: string) => clipFiles.filter((file) => file.startsWith(`${dir}/`));

/** The 離開 choice is recorded once (whispering_door c3) and reused by 28 other choice ids. */
const LEAVE_FILE = 'teacher/events/ev.event_a1_whispering_door.c3.mp3';
const LEAVE_REUSERS = [
  'ev.event_a1_tuning_fountain.c3', 'ev.event_a1_lost_metronome.c3', 'ev.event_a1_bell_rope.c3',
  'ev.event_a1_dusty_score.c3', 'ev.event_a1_sleeping_chime.c3', 'ev.event_a1_lantern_choir.c3',
  'ev.event_a2_heated_organ.c3', 'ev.event_a2_echo_market.c3', 'ev.event_a2_moth_rehearsal.c3',
  'ev.event_a2_glass_fork.c3', 'ev.event_a2_dripping_rhythm.c3', 'ev.event_a2_silent_classroom.c4',
  'ev.event_a3_static_crown.c3', 'ev.event_a3_mirror_stage.c3', 'ev.event_a3_last_rehearsal.c3',
  'ev.event_a3_star_bell.c3', 'ev.event_a3_backward_song.c3', 'ev.event_a3_empty_audience.c3',
  'ev.event_a3_roof_wind.c3', 'ev.event_shared_phonetic_shrine.c3', 'ev.event_shared_humming_well.c3',
  'ev.event_shared_traveling_luthier.c3', 'ev.event_shared_memory_album.c3', 'ev.event_shared_three_doors.c4',
  'ev.event_shared_tiny_conductor.c3', 'ev.event_shared_moon_gong.c3', 'ev.event_shared_resonant_anvil.c3',
  'ev.event_shared_quiet_library.c3',
];

describe('voice-line registry', () => {
  it('resolves every key to a clip file that exists', () => {
    for (const [key, [, file, text]] of entries) {
      expect(existsSync(join(VOICE_DIR, file)), key).toBe(true);
      expect(text.length, key).toBeGreaterThan(0);
      const resolved = resolveVoiceLine(key);
      expect(resolved?.url, key).toBeTruthy();
      expect(resolved?.url).toMatch(/\.mp3$/u);
    }
    expect(resolveVoiceLine('no.such.line')).toBeNull();
  });

  it('ships every clip file it has, and nothing else', () => {
    const referenced = new Set(entries.map(([, [, file]]) => file));
    expect(clipFiles.filter((file) => !referenced.has(file))).toEqual([]);
    expect(clipFiles.every((file) => file.endsWith('.mp3'))).toBe(true);
  });

  it('never ships or registers u.notnow (held pending a decision by Yao, Q100)', () => {
    expect(VOICE_LINES['u.notnow']).toBeUndefined();
    expect(resolveVoiceLine('u.notnow')).toBeNull();
    const repoClips = filesUnder(join(process.cwd(), 'src')).filter((path) => /notnow/iu.test(path));
    expect(repoClips).toEqual([]);
  });

  it('maps all 29 離開 choices to the one shared clip', () => {
    expect(VOICE_LINES['ev.event_a1_whispering_door.c3']?.[1]).toBe(LEAVE_FILE);
    for (const key of LEAVE_REUSERS) {
      expect(VOICE_LINES[key]?.[1], key).toBe(LEAVE_FILE);
      expect(VOICE_LINES[key]?.[2], key).toBe('離開');
    }
    expect(entries.filter(([, [, file]]) => file === LEAVE_FILE)).toHaveLength(29);
    // Shipped once: no per-event copy of the 離開 clip.
    for (const key of LEAVE_REUSERS) expect(clipFiles, key).not.toContain(`teacher/events/${key}.mp3`);
  });

  it('matches the batch counts in the manifests', () => {
    // batch2_teacher: 169 clips listed, u.notnow held → 168.
    expect(keysIn('teacher/batch2')).toHaveLength(168);
    expect(filesIn('teacher/batch2')).toHaveLength(168);
    // batch2b: 75 + 27 cards × name/desc, 30 events: 124 files, 152 ids (28 reuse 離開).
    expect(keysIn('teacher/cards_rk')).toHaveLength(150);
    expect(filesIn('teacher/cards_rk')).toHaveLength(150);
    expect(keysIn('teacher/cards_ry')).toHaveLength(54);
    expect(filesIn('teacher/cards_ry')).toHaveLength(54);
    expect(keysIn('teacher/events')).toHaveLength(152);
    expect(filesIn('teacher/events')).toHaveLength(124);
    // batch1_narrator: 54 live lines.
    expect(keysIn('narrator/batch1')).toHaveLength(54);
    expect(filesIn('narrator/batch1')).toHaveLength(54);
    expect(entries.every(([key, [speaker]]) => (speaker === 'narrator') === key.startsWith('n.'))).toBe(true);
  });

  it('names real cards: a name and a desc line for each recorded card', () => {
    const cardKeys = entries.map(([key]) => key).filter((key) => key.startsWith('c.'));
    for (const key of cardKeys) {
      const match = /^c\.(.+)\.(name|desc)$/u.exec(key);
      expect(match, key).toBeTruthy();
      expect(CARDS[match![1]!], key).toBeDefined();
      expect(VOICE_LINES[`c.${match![1]}.${match![2] === 'name' ? 'desc' : 'name'}`], key).toBeDefined();
    }
    // Spoken names drop separators such as the · in 第二招·守.
    const spoken = (text: string) => text.replace(/[·・\s]/gu, '');
    for (const key of cardKeys.filter((k) => k.endsWith('.name'))) {
      const id = key.slice(2, -5);
      expect(spoken(VOICE_LINES[key]![2]), key).toBe(spoken(CARDS[id]!.name));
    }
  });

  it('reads each event exactly as the event screen shows it', () => {
    // Design's copy fix 趁近聽 → 湊近聽 was recorded before it shipped on screen.
    const pendingCopy = new Set(['ev.event_shared_humming_well.c2']);
    for (const event of EVENTS) {
      expect(VOICE_LINES[`ev.${event.id}.title`]?.[2], event.id).toBe(event.title);
      expect(VOICE_LINES[`ev.${event.id}.text`]?.[2], event.id).toBe(event.presentation);
      event.choices.forEach((choice, index) => {
        const key = `ev.${event.id}.c${index + 1}`;
        if (pendingCopy.has(key)) expect(VOICE_LINES[key]).toBeDefined();
        else expect(VOICE_LINES[key]?.[2], key).toBe(choice.label);
      });
      expect(VOICE_LINES[`ev.${event.id}.c${event.choices.length + 1}`], event.id).toBeUndefined();
    }
  });

  it('maps every generated 湊十 question to its whole-sentence clip', () => {
    expect(mathQuestionVoiceKey('3 和 4 合起來是幾？')).toBe('m.make10.sum.3_4');
    expect(mathQuestionVoiceKey('0 和 7 合起來是幾？')).toBe('m.make10.sum.0_7');
    expect(mathQuestionVoiceKey('10 可以分成 6 和幾？')).toBe('m.make10.split.6');
    expect(mathQuestionVoiceKey('14 可以分成 10 和幾？')).toBe('m.teen.split.14');
    expect(mathQuestionVoiceKey('2 + 3 = ？')).toBeNull();
    for (let left = 0; left <= 9; left += 1) {
      for (let right = 0; right <= 9; right += 1) {
        if (left + right > 10 || left + right === 0) continue;
        expect(VOICE_LINES[mathQuestionVoiceKey(`${left} 和 ${right} 合起來是幾？`)!], `${left}+${right}`).toBeDefined();
      }
    }
    // 10 和 0 has no clip; the question keeps Web Speech.
    expect(VOICE_LINES[mathQuestionVoiceKey('10 和 0 合起來是幾？')!]).toBeUndefined();
    for (let n = 0; n <= 20; n += 1) expect(VOICE_LINES[`m.answer.${n}`]).toBeDefined();
  });
});
