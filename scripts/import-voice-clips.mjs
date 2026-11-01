// Copies Spire Audio's QA-passed voice batches into src/assets/audio/voice/
// and regenerates src/data/voiceLines.ts from their MANIFEST.md files.
//
//   node scripts/import-voice-clips.mjs <audio-root>
//
// <audio-root> holds batch2_teacher/, batch2b_teacher_cards/, batch1_narrator/,
// batch1b_narrator/ and batch3_phrases_act1/. Every clip is PLACEHOLDER audio
// for the first playtest. u.notnow is held pending Yao's decision (Q100) and is
// never imported.
//
// batch3_phrases_act1 (老師 reading Act I phrase-pool words) ships exactly the
// files in its HANDOFF_LIST.txt, byte for byte. Its CUT rows (Design 11-01) stay
// out, and the words they read are no longer in src/data/phrases.ts. The
// script also regenerates src/data/phraseClips.ts (clip → word and 注音).
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('usage: node scripts/import-voice-clips.mjs <audio-root>');

const EXCLUDED = new Set(['u.notnow']);
const OUT_DIR = 'src/assets/audio/voice';

/** Cells of a markdown table row, without the outer pipes. */
function cells(line) {
  return line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|').map((cell) => cell.trim());
}
const unquote = (cell) => cell.replace(/^`|`$/gu, '');

/** @type {Map<string, { speaker: 'teacher' | 'narrator'; file: string; text: string }>} */
const lines = new Map();
/** @type {Map<string, string>} source path → repo path under OUT_DIR */
const copies = new Map();
/** @type {Map<string, { initial: string; word: string; zhuyin: string }>} batch 3 key → pool entry it reads */
const phraseClips = new Map();
/** Batch 3 source files that are deliberately not shipped (MANIFEST status CUT). */
const cutPhraseFiles = new Set();

function add(key, speaker, file, text) {
  if (EXCLUDED.has(key)) return;
  if (lines.has(key)) throw new Error(`duplicate voice key ${key}`);
  lines.set(key, { speaker, file, text });
}

// 老師 batch 2: prompts, feedback, praise, buttons.
{
  const dir = join(root, 'batch2_teacher');
  const manifest = await readFile(join(dir, 'MANIFEST.md'), 'utf8');
  for (const line of manifest.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const row = cells(line);
    const key = unquote(row[0]);
    if (!/^[a-z]+\./u.test(key) || row.length < 14) continue;
    const file = `teacher/batch2/${key}.mp3`;
    add(key, 'teacher', file, row[4]);
    if (!EXCLUDED.has(key)) copies.set(join(dir, `${key}.mp3`), file);
  }
}

// 老師 batch 2b: card names and descs, event titles, texts and choices.
{
  const dir = join(root, 'batch2b_teacher_cards');
  const manifest = await readFile(join(dir, 'MANIFEST.md'), 'utf8');
  const textByFile = new Map();
  for (const line of manifest.split('\n')) {
    const row = cells(line);
    if (!/^(?:cards_rk|cards_ry|events)\/.+\.mp3$/u.test(row[0] ?? '')) continue;
    // Main tables: file | `id` | text | … ; the later fix tables: file | text | ….
    // A later row for the same file is a re-recording and replaces the text.
    const text = row[1]?.startsWith('`') ? row[2] : row[1];
    textByFile.set(row[0], text.replace(/\s*[（(]§6.*$/u, '').replace(/\s*\(was .*\)$/u, ''));
  }
  for (const [rel, text] of textByFile) {
    const key = rel.replace(/^.*\//u, '').replace(/\.mp3$/u, '');
    const file = `teacher/${rel}`;
    add(key, 'teacher', file, text);
    copies.set(join(dir, rel), file);
  }
  // 離開 is recorded once and shared by every other 離開 choice.
  const reuse = manifest.match(/離開 is recorded once as `([^`]+)`\. The other \d+ 離開 choice ids reuse that file: (.+)\n/u);
  if (!reuse) throw new Error('batch2b manifest: 離開 reuse list not found');
  const shared = lines.get(reuse[1]);
  if (!shared) throw new Error(`batch2b manifest: ${reuse[1]} missing`);
  for (const id of reuse[2].matchAll(/`([^`]+)`/gu)) add(id[1], 'teacher', shared.file, shared.text);
}

// 點燈人 batch 1: story lines.
{
  const dir = join(root, 'batch1_narrator');
  const manifest = await readFile(join(dir, 'MANIFEST.md'), 'utf8');
  for (const line of manifest.split('\n')) {
    const row = cells(line);
    if (!/^\d+$/u.test(row[0] ?? '') || !/^n\..+\.mp3$/u.test(row[1] ?? '')) continue;
    const key = unquote(row[2]);
    const file = `narrator/batch1/${key}.mp3`;
    add(key, 'narrator', file, row[3]);
    copies.set(join(dir, row[1]), file);
  }
}

// 點燈人 batch 1b: the 琉 lore pick-up line.
{
  const dir = join(root, 'batch1b_narrator');
  const manifest = await readFile(join(dir, 'MANIFEST.md'), 'utf8');
  for (const line of manifest.split('\n')) {
    const row = cells(line);
    if (!/^n\..+\.mp3$/u.test(row[0] ?? '') || !(row[1] ?? '').startsWith('`')) continue;
    const key = unquote(row[1]);
    const file = `narrator/batch1b/${key}.mp3`;
    // Text cell: 她的小星盤，是誰給的呢？ (注音 reading) — keep the words only.
    add(key, 'narrator', file, row[2].replace(/\s*\([^)]*\)$/u, ''));
    copies.set(join(dir, row[0]), file);
  }
}

// 老師 batch 3: Act I phrase-pool words, one clip per word.
// Per-clip word overrides (none now: Design reverted core.387 to 里 on 11-01).
const PHRASE_WORD_FIXES = new Map();
{
  const dir = join(root, 'batch3_phrases_act1');
  const manifest = await readFile(join(dir, 'MANIFEST.md'), 'utf8');
  /** MANIFEST Files table: file | pack | other packs | word | 注音 | length | format | voice | source | status */
  const rows = new Map();
  for (const line of manifest.split('\n')) {
    const row = cells(line);
    if (!/^[a-z]+\/[a-z]+\.\d{3}\.mp3$/u.test(row[0] ?? '') || row.length < 10) continue;
    rows.set(row[0], row);
  }
  for (const [rel, row] of rows) if (row[9].startsWith('CUT')) cutPhraseFiles.add(rel);
  const handoff = (await readFile(join(dir, 'HANDOFF_LIST.txt'), 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean);
  if (new Set(handoff).size !== handoff.length) throw new Error('batch3: duplicate HANDOFF_LIST rows');
  const indexes = new Map();
  for (const rel of handoff) {
    if (rel.startsWith('../')) {
      // Pick-ups from other batches ride along in the handoff; they must be imported above.
      if (![...copies.keys()].includes(join(dir, rel))) throw new Error(`batch3: handoff ${rel} not imported by its own batch`);
      continue;
    }
    const match = /^([a-z]+)\/(\1)\.(\d{3})\.mp3$/u.exec(rel);
    if (!match) throw new Error(`batch3: unexpected handoff row ${rel}`);
    const pack = match[1];
    if (!indexes.has(pack)) indexes.set(pack, JSON.parse(await readFile(join(dir, pack, 'index.json'), 'utf8')));
    const indexWord = indexes.get(pack)[`${pack}.${match[3]}.mp3`];
    const row = rows.get(rel);
    if (!indexWord || !row) throw new Error(`batch3: ${rel} missing from index.json or MANIFEST`);
    if (cutPhraseFiles.has(rel)) throw new Error(`batch3: ${rel} is CUT but listed in the handoff`);
    if (row[3] !== indexWord) throw new Error(`batch3: ${rel} MANIFEST says ${row[3]}, index.json says ${indexWord}`);
    const fix = PHRASE_WORD_FIXES.get(rel);
    if (fix && fix.from !== indexWord) throw new Error(`batch3: ${rel} fix expects ${fix.from}, index.json says ${indexWord}`);
    const word = fix ? fix.to : indexWord;
    const zhuyin = row[4];
    const initial = zhuyin.replace(/^˙/u, '')[0];
    const key = `w.${pack}.${match[3]}`;
    const file = `teacher/phrases_act1/${rel}`;
    add(key, 'teacher', file, word);
    copies.set(join(dir, rel), file);
    phraseClips.set(key, { initial, word, zhuyin });
  }
  const missing = [...rows.keys()].filter((rel) => !cutPhraseFiles.has(rel) && !handoff.includes(rel));
  if (missing.length) throw new Error(`batch3: MANIFEST rows neither handed off nor CUT: ${missing.join(', ')}`);
}

await rm(OUT_DIR, { recursive: true, force: true });
for (const [from, to] of copies) {
  const target = join(OUT_DIR, to);
  await mkdir(target.replace(/\/[^/]+$/u, ''), { recursive: true });
  await copyFile(from, target);
}

const sorted = [...lines.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const body = sorted
  .map(([key, line]) => `  ${JSON.stringify(key)}: [${line.speaker === 'teacher' ? 'T' : 'N'}, ${JSON.stringify(line.file)}, ${JSON.stringify(line.text)}],`)
  .join('\n');
await writeFile('src/data/voiceLines.ts', `/**
 * Recorded voice lines: line key → [speaker, clip path under src/assets/audio/voice/, display text].
 *
 * GENERATED by scripts/import-voice-clips.mjs from Spire Audio's manifests. Do not edit by hand.
 *
 * PLACEHOLDER audio for the first playtest: ElevenLabs eleven_v4 TTS generated for this
 * project with synthetic Voice Design voices (老師 and 點燈人). See THIRD_PARTY_NOTICES.md.
 * The display text is what the clip says. It is also the Web Speech fallback text.
 * u.notnow is held pending Yao's decision (Q100) and is deliberately absent.
 */

export type VoiceSpeaker = 'teacher' | 'narrator';
const T = 'teacher' as const;
const N = 'narrator' as const;

export const VOICE_LINES: Readonly<Record<string, readonly [VoiceSpeaker, string, string]>> = {
${body}
};
`);

const phraseBody = [...phraseClips.entries()]
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([key, clip]) => `  ${JSON.stringify(key)}: [${JSON.stringify(clip.initial)}, ${JSON.stringify(clip.word)}, ${JSON.stringify(clip.zhuyin)}],`)
  .join('\n');
await writeFile('src/data/phraseClips.ts', `/**
 * 老師 batch 3 phrase clips: voice key → [phrase initial, word, full 注音 of the clip].
 *
 * GENERATED by scripts/import-voice-clips.mjs from batch3_phrases_act1's index.json
 * files and MANIFEST.md. Do not edit by hand. Each key is also in VOICE_LINES
 * (src/data/voiceLines.ts), whose text is the same word.
 *
 * The initial is the PHRASES_BY_INITIAL bucket; the first syllable of the 注音 is
 * that pool entry's spell.
 * PLACEHOLDER audio for the first playtest. See THIRD_PARTY_NOTICES.md.
 */

export const PHRASE_CLIPS: Readonly<Record<string, readonly [string, string, string]>> = {
${phraseBody}
};
`);

const files = new Set(copies.values());
const byDir = {};
for (const file of files) {
  const dir = file.replace(/\/[^/]+$/u, '');
  byDir[dir] = (byDir[dir] ?? 0) + 1;
}
console.log(`${lines.size} voice keys, ${files.size} clip files`, byDir);
console.log(`batch3: ${phraseClips.size} phrase clips, ${cutPhraseFiles.size} CUT clips left out`);
// The source folders must not carry clips the manifests do not list.
const phrasePacks = [...new Set([...phraseClips.keys()].map((key) => key.split('.')[1]))];
for (const [dir, sub] of [['batch2_teacher', ''], ['batch2b_teacher_cards', 'cards_rk'], ['batch2b_teacher_cards', 'cards_ry'], ['batch2b_teacher_cards', 'events'], ['batch1_narrator', ''], ['batch1b_narrator', ''], ...phrasePacks.map((pack) => ['batch3_phrases_act1', pack])]) {
  const names = (await readdir(join(root, dir, sub))).filter((name) => name.endsWith('.mp3') && !name.startsWith('reel_'));
  const unlisted = names.filter((name) => !copies.has(join(root, dir, sub, name)) && !EXCLUDED.has(name.replace(/\.mp3$/u, '')) && !(dir === 'batch3_phrases_act1' && cutPhraseFiles.has(`${sub}/${name}`)));
  if (unlisted.length) throw new Error(`${dir}/${sub}: unlisted clips ${unlisted.join(', ')}`);
}
