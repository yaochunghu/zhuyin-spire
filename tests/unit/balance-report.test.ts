import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatBalanceReport, parsePlaytestExport } from '../../scripts/balance-report.mjs';

const V3_FIXTURE = JSON.parse(readFileSync(
  new URL('../fixtures/playtest-v3-balance.json', import.meta.url),
  'utf8',
)) as unknown;

const V1_FIXTURE = JSON.parse(readFileSync(
  new URL('../fixtures/playtest-v1-events.json', import.meta.url),
  'utf8',
)) as unknown[];

function cohortValues(report: string, label: string): Record<string, string> {
  const start = report.indexOf(`cohort: ${label}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = report.slice(start);
  const end = rest.indexOf('\n\n');
  const block = end === -1 ? rest : rest.slice(0, end);
  const values: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const match = /^(B\d+) .+: (.*) \[[^\]]+\]$/.exec(line);
    if (match) values[match[1]!] = match[2]!;
  }
  return values;
}

describe('balance-report extractor', () => {
  it('prints B4 and B9–B17 and keeps synthetic runs apart from real play', () => {
    const report = formatBalanceReport(parsePlaytestExport(V3_FIXTURE));
    expect(report.startsWith('balance-report\nschema: zhuyin-spire-playtest-v3\n')).toBe(true);
    expect(report).not.toContain('note:');
    expect(report).toContain('cohort: synthetic (child-model)');
    expect(report).toContain('cohort: real play');

    const synthetic = cohortValues(report, 'synthetic (child-model)');
    expect(synthetic).toMatchObject({
      B1: '100% (n=1)',
      B2: 'session record',
      B3: 'session record',
      B4: 'rest 1, smith 1, remove 0 (n=2)',
      B5: '50% (n=2)',
      B6: '50% (n=2)',
      B7: '0% (n=2)',
      B8: '50% (n=2)',
      B9: 'median 4 (n=2)',
      B10: 'median 7 (n=1)',
      B11: 'median 6 (n=2)',
      B12: 'median 12 (n=1)',
      B13: 'median 40 (n=2)',
      B14: 'median 28 (n=1)',
      B15: 'median 12 (n=1)',
      B16: 'hpLost median 9 (n=1); gold before median 44 (n=1)',
      B17: 'median 16 (n=1)',
      B18: '1 (n=1)',
      B19: '2 (n=2)',
      B20: '1 (n=1)',
      B21: 'win 100% (n=1); hpLost median 9 (n=1)',
      B22: 'n/a',
      B23: 'session record',
      B24: 'session record',
    });

    const real = cohortValues(report, 'real play');
    expect(real).toMatchObject({
      B1: '0% (n=1)',
      B4: 'rest 0, smith 0, remove 1 (n=1)',
      B5: 'n/a',
      B6: 'n/a',
      B7: 'n/a',
      B8: 'n/a',
      B9: 'median 4 (n=1)',
      B10: 'median 5 (n=1)',
      B11: 'median 2 (n=1)',
      B12: 'n/a',
      B13: 'median 10 (n=1)',
      B14: 'median 20 (n=1)',
      B15: 'median 11 (n=1)',
      B16: 'hpLost median 11 (n=1); gold before median 15 (n=1)',
      B17: 'none',
      B18: '0 (n=0)',
      B19: '1 (n=1)',
      B20: '0 (n=0)',
      B21: 'win 0% (n=1); hpLost median 11 (n=1)',
      B22: 'n/a',
      B2: 'session record',
      B24: 'session record',
    });
  });

  it('reads a v0.4.4 export and prints n/a for fields that schema does not have', () => {
    const wrapped = formatBalanceReport(parsePlaytestExport({
      schema: 'zhuyin-spire-playtest-v1',
      events: V1_FIXTURE,
    }));
    expect(wrapped).toContain('schema: zhuyin-spire-playtest-v1');
    expect(wrapped).toContain('note: v0.4.4 schema; fields added later are n/a');
    const real = cohortValues(wrapped, 'real play');
    const synthetic = cohortValues(wrapped, 'synthetic (child-model)');
    for (const id of ['B1', 'B4', 'B5', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17']) {
      expect(real[id]).toBe('n/a');
      expect(synthetic[id]).toBe('n/a');
    }
    expect(real.B2).toBe('session record');
    expect(real.B23).toBe('session record');

    const raw = formatBalanceReport(parsePlaytestExport(V1_FIXTURE));
    expect(raw).toContain('schema: zhuyin-spire-playtest-v1');
    expect(cohortValues(raw, 'real play').B9).toBe('n/a');
    expect(cohortValues(raw, 'real play').B16).toBe('n/a');
  });

  it('reads schema v2 and leaves the v3 run fields as n/a', () => {
    const report = formatBalanceReport(parsePlaytestExport({
      schema: 'zhuyin-spire-playtest-v2',
      events: [
        {
          kind: 'cast',
          at: 1,
          correct: true,
          retried: false,
          hintLevel: 0,
          responseBucket: '<5s',
        },
        {
          kind: 'combatEnd',
          at: 2,
          won: true,
          hpLost: 3,
          characterId: 'echoMage',
        },
      ],
    }));
    expect(report).toContain('note: schema v2; run fields added in v3 are n/a');
    const real = cohortValues(report, 'real play');
    expect(real.B5).toBe('100% (n=1)');
    expect(real.B6).toBe('100% (n=1)');
    expect(real.B4).toBe('n/a');
    expect(real.B9).toBe('n/a');
    expect(real.B16).toBe('n/a');
    expect(real.B17).toBe('n/a');
  });
});
