/**
 * Turn a local playtest export into the B1–B24 balance table.
 *
 *   node scripts/balance-report.mjs tests/fixtures/playtest-v3-balance.json
 *
 * No runtime dependencies. v0.4.4 exports (`zhuyin-spire-playtest-v1`) and
 * schema v2 stay readable: a field that export does not have is "n/a".
 * Events with `synthetic: true` (child model, debug, webdriver) are a
 * separate cohort from real play.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const V3_KINDS = new Set([
  'actClear',
  'shopEnter',
  'bossEntry',
  'rest',
  'potionUsed',
  'relicPoolExhaust',
  'sittingStart',
  'sittingEnd',
]);

/** Row order is the END_STATE §15 map documented in docs/BALANCE.md. */
export const BALANCE_ROWS = [
  { id: 'B1', metric: 'Act I clear rate', field: 'actClear / sittingEnd' },
  { id: 'B2', metric: 'Adult can explain damage, block, and intent', field: 'session record' },
  { id: 'B3', metric: 'Child wants to play again', field: 'session record' },
  { id: 'B4', metric: 'Rest choice', field: 'rest.choice' },
  { id: 'B5', metric: 'First-try cast rate', field: 'cast.correct && !cast.retried && hintLevel 0' },
  { id: 'B6', metric: 'Cast success rate', field: 'cast.correct' },
  { id: 'B7', metric: 'Hint rate', field: 'cast.hintLevel' },
  { id: 'B8', metric: 'Slow answer share', field: 'cast.responseBucket >30s' },
  { id: 'B9', metric: 'Turns per non-boss fight', field: 'combatEnd.turns' },
  { id: 'B10', metric: 'Boss turns', field: 'combatEnd.turns boss' },
  { id: 'B11', metric: 'HP lost per normal fight', field: 'combatEnd.hpLost' },
  { id: 'B12', metric: 'HP lost per elite', field: 'combatEnd.hpLost elite' },
  { id: 'B13', metric: 'Gold at shop entry', field: 'shopEnter.gold' },
  { id: 'B14', metric: 'HP at boss entry', field: 'bossEntry.hp' },
  { id: 'B15', metric: 'Deck size at boss entry', field: 'bossEntry.deckSize' },
  { id: 'B16', metric: 'Boss HP lost and gold before the boss', field: 'combatEnd.hpLost boss, bossEntry.gold' },
  { id: 'B17', metric: 'First relic-pool exhaust floor', field: 'relicPoolExhaust.floor' },
  { id: 'B18', metric: 'Potions used', field: 'potionUsed' },
  { id: 'B19', metric: 'Rests taken', field: 'rest' },
  { id: 'B20', metric: 'Elites fought', field: 'combatEnd nodeKind elite' },
  { id: 'B21', metric: 'Boss win rate and HP lost', field: 'combatEnd won+hpLost boss' },
  { id: 'B22', metric: 'Scorch cooled', field: 'scorchCooled' },
  { id: 'B23', metric: 'Mis-taps', field: 'session record' },
  { id: 'B24', metric: 'Speech failures', field: 'session record' },
];

const SESSION_ROWS = new Set(['B2', 'B3', 'B23', 'B24']);

export function parsePlaytestExport(raw) {
  if (Array.isArray(raw)) {
    return { schema: '', events: raw.filter(isEvent) };
  }
  if (raw && typeof raw === 'object' && Array.isArray(raw.events)) {
    return {
      schema: typeof raw.schema === 'string' ? raw.schema : '',
      events: raw.events.filter(isEvent),
    };
  }
  return { schema: '', events: [] };
}

export function formatBalanceReport(raw) {
  const doc = raw && Array.isArray(raw.events) ? raw : parsePlaytestExport(raw);
  const version = schemaVersion(doc.schema, doc.events);
  const lines = ['balance-report', `schema: ${schemaLabel(doc.schema, version)}`];
  if (version < 3) {
    lines.push(version <= 1
      ? 'note: v0.4.4 schema; fields added later are n/a'
      : 'note: schema v2; run fields added in v3 are n/a');
  }
  lines.push('');
  lines.push(...cohortBlock('synthetic (child-model)', doc.events.filter((event) => event.synthetic === true), version));
  lines.push('');
  lines.push(...cohortBlock('real play', doc.events.filter((event) => event.synthetic !== true), version));
  lines.push('');
  return lines.join('\n');
}

function cohortBlock(label, events, version) {
  const lines = [`cohort: ${label}`];
  for (const row of BALANCE_ROWS) {
    const value = SESSION_ROWS.has(row.id)
      ? 'session record'
      : rowValue(row.id, events, version);
    lines.push(`${row.id} ${row.metric}: ${value} [${row.field}]`);
  }
  return lines;
}

function rowValue(id, events, version) {
  const runFields = version >= 3;
  const casts = version >= 2;
  switch (id) {
    case 'B1':
      return runFields ? actClearRate(events) : 'n/a';
    case 'B4':
      return runFields ? restChoice(events) : 'n/a';
    case 'B5':
      return casts ? firstTryRate(events) : 'n/a';
    case 'B6':
      return casts ? successRate(events) : 'n/a';
    case 'B7':
      return casts ? hintRate(events) : 'n/a';
    case 'B8':
      return casts ? slowRate(events) : 'n/a';
    case 'B9':
      return runFields ? medianLine(fightNumbers(events, nonBossFight, 'turns')) : 'n/a';
    case 'B10':
      return runFields ? medianLine(fightNumbers(events, (event) => event.nodeKind === 'boss', 'turns')) : 'n/a';
    case 'B11':
      return runFields ? medianLine(fightNumbers(events, normalFight, 'hpLost')) : 'n/a';
    case 'B12':
      return runFields ? medianLine(fightNumbers(events, (event) => event.nodeKind === 'elite', 'hpLost')) : 'n/a';
    case 'B13':
      return runFields ? medianLine(numbersOf(events, 'shopEnter', 'gold')) : 'n/a';
    case 'B14':
      return runFields ? medianLine(numbersOf(events, 'bossEntry', 'hp')) : 'n/a';
    case 'B15':
      return runFields ? medianLine(numbersOf(events, 'bossEntry', 'deckSize')) : 'n/a';
    case 'B16':
      return runFields ? bossFightLine(events) : 'n/a';
    case 'B17':
      return runFields ? exhaustFloor(events) : 'n/a';
    case 'B18':
      return runFields ? countLine(events.filter((event) => event.kind === 'potionUsed').length) : 'n/a';
    case 'B19':
      return runFields ? countLine(events.filter((event) => event.kind === 'rest').length) : 'n/a';
    case 'B20':
      return runFields ? countLine(events.filter((event) => event.kind === 'combatEnd' && event.nodeKind === 'elite').length) : 'n/a';
    case 'B21':
      return runFields ? bossResult(events) : 'n/a';
    case 'B22':
      return scorchCooled(events);
    default:
      return 'n/a';
  }
}

function actClearRate(events) {
  const clears = events.filter((event) => event.kind === 'actClear' && event.act === 1).length;
  const defeats = events.filter((event) => event.kind === 'sittingEnd' && event.reason === 'defeat').length;
  const n = clears + defeats;
  if (n === 0) return 'n/a';
  return `${percent(clears, n)} (n=${n})`;
}

function restChoice(events) {
  const rests = events.filter((event) => event.kind === 'rest');
  const tally = { rest: 0, smith: 0, remove: 0 };
  for (const event of rests) {
    if (event.choice === 'rest' || event.choice === 'smith' || event.choice === 'remove') {
      tally[event.choice] += 1;
    }
  }
  return `rest ${tally.rest}, smith ${tally.smith}, remove ${tally.remove} (n=${rests.length})`;
}

function firstTryRate(events) {
  const casts = events.filter((event) => event.kind === 'cast');
  if (casts.length === 0) return 'n/a';
  const hits = casts.filter((event) => event.correct === true && event.retried !== true && !(event.hintLevel > 0)).length;
  return `${percent(hits, casts.length)} (n=${casts.length})`;
}

function successRate(events) {
  const casts = events.filter((event) => event.kind === 'cast');
  if (casts.length === 0) return 'n/a';
  const hits = casts.filter((event) => event.correct === true).length;
  return `${percent(hits, casts.length)} (n=${casts.length})`;
}

function hintRate(events) {
  const casts = events.filter((event) => event.kind === 'cast');
  if (casts.length === 0) return 'n/a';
  const hints = casts.filter((event) => typeof event.hintLevel === 'number' && event.hintLevel > 0).length;
  return `${percent(hints, casts.length)} (n=${casts.length})`;
}

function slowRate(events) {
  const casts = events.filter((event) => event.kind === 'cast');
  if (casts.length === 0) return 'n/a';
  const slow = casts.filter((event) => event.responseBucket === '>30s').length;
  return `${percent(slow, casts.length)} (n=${casts.length})`;
}

function bossFightLine(events) {
  const lost = fightNumbers(events, (event) => event.nodeKind === 'boss', 'hpLost');
  const gold = numbersOf(events, 'bossEntry', 'gold');
  if (lost.length === 0 && gold.length === 0) return 'n/a';
  const parts = [];
  if (lost.length > 0) parts.push(`hpLost ${medianLine(lost)}`);
  if (gold.length > 0) parts.push(`gold before ${medianLine(gold)}`);
  return parts.join('; ');
}

function bossResult(events) {
  const bosses = events.filter((event) => event.kind === 'combatEnd' && event.nodeKind === 'boss' && typeof event.won === 'boolean');
  if (bosses.length === 0) return 'n/a';
  const wins = bosses.filter((event) => event.won === true).length;
  const lost = fightNumbers(events, (event) => event.nodeKind === 'boss', 'hpLost');
  const hp = lost.length > 0 ? `; hpLost ${medianLine(lost)}` : '';
  return `win ${percent(wins, bosses.length)} (n=${bosses.length})${hp}`;
}

function exhaustFloor(events) {
  const floors = [];
  for (const run of splitRuns(events)) {
    const exhausts = run
      .filter((event) => event.kind === 'relicPoolExhaust' && finiteNumber(event.floor) !== null)
      .sort((a, b) => (finiteNumber(a.at) ?? 0) - (finiteNumber(b.at) ?? 0));
    if (exhausts.length > 0) floors.push(exhausts[0].floor);
  }
  if (floors.length === 0) return 'none';
  return medianLine(floors);
}

function scorchCooled(events) {
  const rows = events.filter((event) => event.kind === 'scorchCooled' && typeof event.cooled === 'boolean');
  if (rows.length === 0) return 'n/a';
  const cooled = rows.filter((event) => event.cooled === true).length;
  return `${percent(cooled, rows.length)} (n=${rows.length})`;
}

function fightNumbers(events, kindTest, key) {
  return events
    .filter((event) => event.kind === 'combatEnd' && kindTest(event))
    .map((event) => finiteNumber(event[key]))
    .filter((value) => value !== null);
}

function numbersOf(events, kind, key) {
  return events
    .filter((event) => event.kind === kind)
    .map((event) => finiteNumber(event[key]))
    .filter((value) => value !== null);
}

function nonBossFight(event) {
  return event.nodeKind === 'fight' || event.nodeKind === 'unknown' || event.nodeKind === 'event';
}

function normalFight(event) {
  return event.nodeKind === 'fight' || event.nodeKind === 'unknown';
}

function splitRuns(events) {
  const runs = [];
  let current = [];
  for (const event of events) {
    if (event.kind === 'sittingStart' && current.length > 0) {
      runs.push(current);
      current = [];
    }
    current.push(event);
  }
  if (current.length > 0) runs.push(current);
  return runs.length > 0 ? runs : [[]];
}

function medianLine(values) {
  if (values.length === 0) return 'n/a';
  return `median ${trimNum(median(values))} (n=${values.length})`;
}

function countLine(count) {
  return `${count} (n=${count})`;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function percent(hits, total) {
  return `${trimNum((100 * hits) / total)}%`;
}

function trimNum(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function schemaVersion(schema, events) {
  if (typeof schema === 'string') {
    const match = schema.match(/playtest-v(\d+)\s*$/);
    if (match) return Number(match[1]);
  }
  if (events.some((event) => V3_KINDS.has(event.kind))) return 3;
  if (events.some((event) => event.kind === 'cast')) return 2;
  if (events.some((event) => event.kind === 'combatEnd' && typeof event.characterId === 'string')) return 2;
  return 1;
}

function schemaLabel(schema, version) {
  if (typeof schema === 'string' && schema.length > 0) return schema;
  return `zhuyin-spire-playtest-v${version}`;
}

function isEvent(value) {
  return !!value && typeof value === 'object' && typeof value.kind === 'string';
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('usage: node scripts/balance-report.mjs <telemetry-export.json>\n');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  process.stdout.write(formatBalanceReport(parsePlaytestExport(raw)));
}
