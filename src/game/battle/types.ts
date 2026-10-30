/**
 * Shared battle data types.
 * Handlers, effects, and UI import from here (not from combat facade).
 */

import type { CastingGateId } from '../casting/types';

/** Per-character combat switches. Omitted rules keep the 共鳴武者 defaults. */
export interface CombatRules {
  jinOnFullBlock: boolean;
  beadsEnabled: boolean;
}

export const ECHO_COMBAT_RULES: CombatRules = {
  jinOnFullBlock: true,
  beadsEnabled: false,
};

export function combatRulesForGate(gateId: CastingGateId): CombatRules {
  if (gateId === 'math') return { jinOnFullBlock: false, beadsEnabled: true };
  return { jinOnFullBlock: true, beadsEnabled: false };
}

export interface CombatCard {
  uid: string;
  sourceUid: string;
  /** Explicit physical hand target, chosen before the cast and cleared on resolution. */
  chosenHandUid?: string;
  defId: string;
  upgradeLevel: 0 | 1;
  temporaryCostReduction: number;
  basicOverride: boolean;
}

export interface EnemyUnit {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;
  alive: boolean;
  vulnerableTurns: number;
  weakTurns: number;
  /** Damage added to each later attack hit. Already included in the intent number. */
  strength?: number;
  /** Strength gained this enemy phase. It applies only after the phase ends. */
  bankedStrength?: number;
  /** Soothe already aimed at the current attack. */
  armedSoothe?: number;
  /** Soothe from casts this player turn. It aims at a later attack. */
  pendingSoothe?: number;
  /** 0 = opening pattern. 1 = the fight has finished its one phase-enter action. */
  phase?: number;
  /** The next action is the phase-enter step, not the opening pattern. */
  queuedEnter?: boolean;
  /** This unit already used its one summon. */
  summoned?: boolean;
  /** Appeared during the current enemy phase and does not act until the next one. */
  justSummoned?: boolean;
}

/** One ordered hit, including the monster shield state before and after it. */
export interface PlayerImpact {
  enemyId: string;
  hitIndex: number;
  blockBefore: number;
  blocked: number;
  blockAfter: number;
  hpDamage: number;
  killed: boolean;
  /** Optional damage additions, kept separate so feedback can explain them. */
  relicBonus?: number;
  basicRelicBonus?: number;
  vulnerableRelicBonus?: number;
}

/** Visual / motion events for UI */
export type CombatFx =
  | { type: 'draw'; cards: CombatCard[] }
  | { type: 'discard'; cards: CombatCard[]; reason: 'play' | 'fizzle' | 'endTurn' }
  | { type: 'shuffle'; count: number }
  | {
      type: 'playerStrike';
      impacts: PlayerImpact[];
    }
  | { type: 'playerBlock'; amount: number }
  | { type: 'playerEnergy'; amount: number }
  | { type: 'playerPower'; power: 'training'; amount: number }
  | { type: 'playerResource'; resource: 'jin'; delta: number; value: number }
  | { type: 'playerBeads'; amount: number; value: number }
  | { type: 'playerTempo'; count: number }
  | {
      type: 'enemyStatus';
      enemyId: string;
      status: 'vulnerable' | 'weak';
      turns: number;
    }
  | {
      type: 'enemyStrike';
      blockBefore: number;
      blocked: number;
      damage: number;
      /** Which enemy is acting (for UI flair) */
      enemyId?: string;
      /** Multi-hit count for sequential juice */
      hits?: number;
    }
  | {
      type: 'enemyBlock';
      amount: number;
      enemyId?: string;
    };

export type BattlePhase =
  | 'playerStart'
  | 'playerAction'
  | 'playerEnd'
  | 'enemyTurn'
  | 'resolve';

export interface CombatState {
  heroHp: number;
  heroMaxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  /** Character relic: spent by the first Attack hit of each player turn. */
  firstAttackBonusDamage: number;
  firstAttackBonusReady: boolean;
  /** First 基礎攻擊 hit of each player turn. */
  basicHitBonus: number;
  basicHitBonusReady: boolean;
  /** First Attack hit each turn against an enemy that already has 易傷. */
  vulnerableHitBonus: number;
  vulnerableHitBonusReady: boolean;
  /** Block from the first 轉拍 of each player turn. */
  tempoRelicBlock: number;
  tempoRelicReady: boolean;
  /** Block the first time this combat a full block grants 勁. Not reset each turn. */
  jinGuardBlock: number;
  jinGuardReady: boolean;
  /** 聽勁護心 shield earned during the enemy phase, applied after block expires. */
  jinGuardBlockPending: number;
  /** 聽勁護心 shield earned by a card, applied at the end of that card. */
  jinGuardBlockImmediate: number;
  /** Event relics. Absent on combats created before this feature. */
  relicRainBlock?: number;
  relicMetronome?: boolean;
  metronomePlayed?: number;
  metronomeUsed?: boolean;
  musicBoxSourceUid?: string | null;
  musicBoxUsed?: boolean;
  drawPenaltyNextTurn?: number;
  stageFrightUsed?: boolean;
  training: number;
  /** 練功起勢 still to remove when the second player turn begins. */
  firstTurnTraining: number;
  jin: number;
  gainedJinLastEnemyPhase: boolean;
  gainedJinThisEnemyPhase: boolean;
  lastPlayedType: 'attack' | 'skill' | 'power' | null;
  tempoCount: number;
  basicPlayedThisTurn: number;
  basicTrainingCounter: number;
  nextAttackBonus: number;
  freeBasicsRemaining: number;
  bonusDrawNextTurn: number;
  /** Copies of B076 waiting on the next enemy phase. */
  drawIfJinPending: number;
  bonusJinNextEnemyPhase: number;
  /** Copies of B128 waiting on the next enemy phase. */
  flawlessTrainingPending: number;
  activePowerIds: string[];
  activePowerLevels: Record<string, 0 | 1>;
  powerTriggersThisTurn: Record<string, number>;
  exhaustPile: CombatCard[];
  drawPile: CombatCard[];
  hand: CombatCard[];
  discardPile: CombatCard[];
  enemies: EnemyUnit[];
  /** Highlighted single-target enemy */
  selectedEnemyId: string | null;
  /** Targets chosen for pending cast (drag or tap) */
  pendingTargetIds: string[];
  phase: BattlePhase;
  turn: number;
  parentHintUsed: boolean;
  rules: CombatRules;
  beads: number;
  tens: number;
  castsThisTurn: number;
  makeTenThisTurn: number;
  makeTenCount: number;
  mathRetryUsed: boolean;
  mathMissStreak: number;
  /** How many 湊十 the latest addBeads call fired. */
  beadsMadeLastAdd: number;
  makeTenDirectDamage: number;
  tenBellEnergy: number;
  tenBellReady: boolean;
  rulerCharmBlock: number;
  rulerCharmCast: number;
  rulerCharmUsedThisTurn: boolean;
  fizzleBeads: number;
  eraserReady: boolean;
  /** Extra damage for 比大小 when the shown intent does not beat Block. */
  compareExtraDamage: number;
  status: 'playing' | 'won' | 'lost';
  log: string[];
  /**
   * Deck shuffle and reshuffle. A combat built outside a run leaves this
   * empty and keeps using Math.random.
   */
  shuffleRng?: () => number;
  pending: CombatCard | null;
  pendingFx: CombatFx[];
  /**
   * Legacy single-enemy mirrors (kept for gradual UI migration).
   * Always sync from first living enemy / selected.
   */
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyTurnIndex: number;
}
