import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { createCombat, intentStepForUnit } from '../../src/game/combat';
import {
  intentCues,
  intentCueTitle,
  isNewArrival,
  noteArrivals,
  strengthBadge,
  takeEntrance,
} from '../../src/ui/enemyCues';

const open = { phaseEnter: false, canSummon: true, hasBuffableAlly: true, canGrowSelf: true };

describe('enemy intent cues', () => {
  it('classifies brace, summon, and strength steps', () => {
    expect(intentCues({ kind: 'attack', value: 5 }, open)).toEqual([]);
    expect(intentCues({ kind: 'block', value: 8 }, { ...open, phaseEnter: true })).toEqual(['brace']);
    expect(intentCues({ kind: 'block', value: 5, summon: 'noteWisp' }, open)).toEqual(['summon']);
    expect(intentCues({ kind: 'block', value: 3, grantStrength: 1 }, open)).toEqual(['buff-allies']);
    expect(
      intentCues({ kind: 'block', value: 14, grantSelfStrength: 1 }, { ...open, phaseEnter: true }),
    ).toEqual(['brace', 'buff-self']);
  });

  it('drops cues that would not do anything', () => {
    const quiet = { phaseEnter: false, canSummon: false, hasBuffableAlly: false, canGrowSelf: false };
    expect(
      intentCues({ kind: 'block', value: 5, summon: 'noteWisp', grantStrength: 1, grantSelfStrength: 1 }, quiet),
    ).toEqual([]);
  });

  it('gives kid-facing Chinese titles', () => {
    expect(intentCueTitle(['brace'])).toBe('下回合會變硬：先打多一點');
    expect(intentCueTitle(['summon', 'buff-self'])).toBe('叫朋友來 · 自己加力量');
    expect(intentCueTitle(['buff-allies'])).toBe('幫朋友加力量');
  });

  it('labels strength only when there is some', () => {
    expect(strengthBadge(0)).toBeNull();
    expect(strengthBadge(2)).toEqual({ label: '💪+2', title: '力量 +2：每次攻擊多 2' });
  });
});

describe('new arrival log', () => {
  it('treats the starting row as old and greets a later friend once', () => {
    let log = noteArrivals(undefined, ['e1', 'e2'], 1);
    expect(isNewArrival(log, 'e1', 1)).toBe(false);
    log = noteArrivals(log, ['e1', 'e2', 'e3'], 2);
    expect(isNewArrival(log, 'e3', 2)).toBe(true);
    expect(takeEntrance(log, 'e3', 2)).toBe(true);
    expect(takeEntrance(log, 'e3', 2)).toBe(false);
    log = noteArrivals(log, ['e1', 'e2', 'e3'], 3);
    expect(isNewArrival(log, 'e3', 3)).toBe(false);
  });
});

describe('intentStepForUnit', () => {
  it('flags the boss phase-enter guard as now and as next', () => {
    const phase = ENEMIES.boss1!.phases![0]!;
    const state = createCombat(['mo'], 'boss1', 40, 40);
    const boss = state.enemies[0]!;
    expect(intentStepForUnit(boss, 0).phaseEnter).toBe(false);

    boss.hp = phase.belowHp;
    const next = intentStepForUnit(boss, 1);
    expect(next.phaseEnter).toBe(true);
    expect(next.step).toBe(phase.enter);

    boss.queuedEnter = true;
    expect(intentStepForUnit(boss, 0).phaseEnter).toBe(true);
    expect(intentStepForUnit(boss, 1).phaseEnter).toBe(false);
  });
});
