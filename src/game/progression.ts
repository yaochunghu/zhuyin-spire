export const SCORE_PER_ROOM = 5;
export const SCORE_NORMAL_WIN = 10;
export const SCORE_ELITE_WIN = 30;
export const SCORE_BOSS_WIN = 75;
export const SCORE_FLAWLESS_ELITE = 15;
export const SCORE_FLAWLESS_BOSS = 30;
export const SCORE_VICTORY = 100;

export interface RunScoreStats {
  roomsCompleted: number;
  normalWins: number;
  eliteWins: number;
  bossWins: number;
  flawlessElites: number;
  flawlessBosses: number;
  currentCombatHpLost: number;
}

export interface ScoreBreakdownItem {
  key: keyof Omit<RunScoreStats, 'currentCombatHpLost'> | 'victory';
  label: string;
  count: number;
  points: number;
}

export interface RunScoreResult {
  breakdown: ScoreBreakdownItem[];
  gained: number;
  cumulativeScore: number;
  newlyUnlockedCardIds: string[];
}

export function createRunScoreStats(): RunScoreStats {
  return {
    roomsCompleted: 0,
    normalWins: 0,
    eliteWins: 0,
    bossWins: 0,
    flawlessElites: 0,
    flawlessBosses: 0,
    currentCombatHpLost: 0,
  };
}

export function calculateRunScore(
  stats: RunScoreStats,
  victory: boolean,
): { breakdown: ScoreBreakdownItem[]; total: number } {
  const candidates: ScoreBreakdownItem[] = [
    {
      key: 'roomsCompleted',
      label: '完成房間',
      count: stats.roomsCompleted,
      points: stats.roomsCompleted * SCORE_PER_ROOM,
    },
    {
      key: 'normalWins',
      label: '一般戰鬥',
      count: stats.normalWins,
      points: stats.normalWins * SCORE_NORMAL_WIN,
    },
    {
      key: 'eliteWins',
      label: '菁英戰鬥',
      count: stats.eliteWins,
      points: stats.eliteWins * SCORE_ELITE_WIN,
    },
    {
      key: 'bossWins',
      label: '首領戰鬥',
      count: stats.bossWins,
      points: stats.bossWins * SCORE_BOSS_WIN,
    },
    {
      key: 'flawlessElites',
      label: '無傷菁英',
      count: stats.flawlessElites,
      points: stats.flawlessElites * SCORE_FLAWLESS_ELITE,
    },
    {
      key: 'flawlessBosses',
      label: '無傷首領',
      count: stats.flawlessBosses,
      points: stats.flawlessBosses * SCORE_FLAWLESS_BOSS,
    },
    {
      key: 'victory',
      label: '三幕登頂',
      count: victory ? 1 : 0,
      points: victory ? SCORE_VICTORY : 0,
    },
  ];
  const breakdown = candidates.filter((item) => item.count > 0);
  return {
    breakdown,
    total: breakdown.reduce((sum, item) => sum + item.points, 0),
  };
}
