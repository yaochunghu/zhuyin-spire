import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import {
  effectChips,
  getEvent,
  missingHeartChip,
  STURDIER_MONSTERS_LINE,
} from '../../src/data/events';
import { ACT_PLACE_NAMES, TOWER_SUMMIT_NAME, actTitle, generateRunMap } from '../../src/data/map';
import { getPotion } from '../../src/data/potions';
import { coachForScreen } from '../../src/game/coach';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: '死', pattern: /死/ },
  { name: '殺', pattern: /殺/ },
  { name: '倒下', pattern: /倒下/ },
  { name: '失敗', pattern: /失敗/ },
  { name: '生命歸零', pattern: /生命歸零/ },
  { name: '遊戲結束', pattern: /遊戲結束/ },
  { name: 'Run over', pattern: /Run over/ },
  { name: '秒', pattern: /秒/ },
  { name: '一年級', pattern: /一年級/ },
  { name: '二年級', pattern: /二年級/ },
  { name: '歲', pattern: /歲/ },
  { name: '%', pattern: /%/ },
];

function listTypeScript(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTypeScript(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function isParentOnly(file: string): boolean {
  const rel = file.split(path.sep).join('/');
  return rel.endsWith('/src/ui/options.ts') || rel.endsWith('/src/game/coach.ts');
}

/** 死, 秒, and 歲 are lesson headwords in the phrase bank, not interface sentences. */
function isLessonHeadword(file: string, text: string): boolean {
  const rel = file.split(path.sep).join('/');
  return rel.endsWith('/src/data/phrases.ts') && (text === '死' || text === '秒' || text === '歲');
}

interface Snippet {
  line: number;
  text: string;
}

function extractStrings(source: string): Snippet[] {
  const found: Snippet[] = [];
  let index = 0;
  let line = 1;
  const bump = (char: string) => {
    if (char === '\n') line += 1;
  };
  const sourceLine = (at: number) => source.split('\n')[at - 1] ?? '';

  while (index < source.length) {
    const char = source[index]!;
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        bump(source[index]!);
        index += 1;
      }
      index += 2;
      continue;
    }
    if (char !== "'" && char !== '"' && char !== '`') {
      bump(char);
      index += 1;
      continue;
    }
    const quote = char;
    const startLine = line;
    index += 1;
    let text = '';
    let depth = 0;
    while (index < source.length) {
      const current = source[index]!;
      if (current === '\\') {
        text += source[index + 1] ?? '';
        bump(current);
        if (source[index + 1]) bump(source[index + 1]!);
        index += 2;
        continue;
      }
      if (quote === '`' && current === '$' && source[index + 1] === '{' && depth === 0) {
        depth = 1;
        index += 2;
        continue;
      }
      if (quote === '`' && depth > 0) {
        if (current === '{') depth += 1;
        else if (current === '}') depth -= 1;
        bump(current);
        index += 1;
        continue;
      }
      if (current === quote) {
        index += 1;
        break;
      }
      text += current;
      bump(current);
      index += 1;
    }
    if (!sourceLine(startLine).includes('teachingNote:')) found.push({ line: startLine, text });
  }
  return found;
}

describe('kid-safe child-facing copy', () => {
  it('rejects death words, timers, grade labels, and percents in child-facing strings', () => {
    const hits: string[] = [];
    for (const file of listTypeScript(SRC)) {
      if (isParentOnly(file)) continue;
      const relative = path.relative(path.resolve(SRC, '..'), file);
      for (const snippet of extractStrings(readFileSync(file, 'utf8'))) {
        if (isLessonHeadword(file, snippet.text)) continue;
        if (snippet.text.includes('注音終焉王')) {
          hits.push(`${relative}:${snippet.line} [注音終焉王] ${snippet.text.replace(/\s+/g, ' ').slice(0, 80)}`);
        }
        for (const rule of RULES) {
          if (rule.name === '%' && !/[\u4e00-\u9fff]/.test(snippet.text)) continue;
          if (!rule.pattern.test(snippet.text)) continue;
          const sample = snippet.text.replace(/\s+/g, ' ').slice(0, 80);
          hits.push(`${relative}:${snippet.line} [${rule.name}] ${sample}`);
        }
      }
    }
    const rawHits = listTypeScript(SRC)
      .filter((file) => readFileSync(file, 'utf8').includes('注音終焉王'))
      .map((file) => path.relative(path.resolve(SRC, '..'), file));
    expect(rawHits).toEqual([]);
    expect(hits).toEqual([]);
  });

  it('locks the softened defeat, rest, potion, and event lines', () => {
    expect(coachForScreen('defeat')).toEqual({
      title: '休息一下',
      body: '小武者暈倒了，鼓勵孩子再試一次。三幕比較長，記得在營火休息。',
    });
    expect(getPotion('chorusBurst').blurb).toBe('每隻還在場上的怪物受到 4 點傷害');
    expect(missingHeartChip(49)).toBe('補一點心');
    expect(missingHeartChip(50)).toBe('補很多心');
    expect(missingHeartChip(75)).toBe('補很多心');
    expect(missingHeartChip(100)).toBe('心補滿');
    const rehearsal = getEvent('event_a3_last_rehearsal').choices.find((choice) => choice.id === 'sleep');
    expect(effectChips(rehearsal!.a15)).toContain('補很多心');
    expect(effectChips(rehearsal!.a15).join(' ')).not.toContain('%');
    expect(rehearsal!.a15).toContainEqual({ op: 'healMissingPercent', percent: 75 });
    const gong = getEvent('event_shared_moon_gong').choices.find((choice) => choice.id === 'ring');
    expect(effectChips(gong!.effects)).toContain(STURDIER_MONSTERS_LINE);
    expect(effectChips(gong!.a15)).toContain(STURDIER_MONSTERS_LINE);
    expect(gong!.effects).toContainEqual({ op: 'futureNormalHp', percent: 20, fights: 2 });
    expect(gong!.a15).toContainEqual({ op: 'futureNormalHp', percent: 30, fights: 2 });
    expect(getEvent('event_shared_phonetic_shrine').rationale).toContain('錯到沒有心，這趟就先休息');
  });

  it('uses one set of act names and shows the last boss as 終焉王', () => {
    expect([...ACT_PLACE_NAMES]).toEqual(['魔法花園', '燈籠書庫', '星空觀星台']);
    expect(TOWER_SUMMIT_NAME).toBe('塔頂之心');
    expect([actTitle(1), actTitle(2), actTitle(3)]).toEqual([
      '第一幕 · 魔法花園',
      '第二幕 · 燈籠書庫',
      '第三幕 · 星空觀星台',
    ]);
    expect(generateRunMap(() => 0.4).acts.map((act) => act.title)).toEqual([
      actTitle(1),
      actTitle(2),
      actTitle(3),
    ]);
    expect(ENEMIES.boss3.id).toBe('boss3');
    expect(ENEMIES.boss3.name).toBe('終焉王');
    expect(ENEMIES.boss3.coachTip.startsWith('終焉王')).toBe(true);
    const source = listTypeScript(SRC).map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(source).not.toContain('入門塔');
    expect(source).not.toContain('庭園');
    expect(source).not.toContain('觀測台');
    expect(source).not.toContain('注音終焉王');
  });
});
