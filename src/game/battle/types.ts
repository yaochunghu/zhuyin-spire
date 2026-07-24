/**
 * Shared battle data types.
 * Handlers, effects, and UI import from here (not from combat facade).
 */

export interface CombatCard {
  uid: string;
  sourceUid: string;
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
  /** Echo: first incoming attack each player turn gains +2 damage. */
  echoTurns: number;
  vulnerableTurns: number;
  weakTurns: number;
  echoTriggeredThisTurn: boolean;
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
  echoBonus?: number;
  relicBonus?: number;
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
  | { type: 'playerPower'; power: 'echoGuard' | 'training'; amount: number }
  | { type: 'playerResource'; resource: 'jin'; delta: number; value: number }
  | { type: 'playerTempo'; count: number }
  | {
      type: 'enemyStatus';
      enemyId: string;
      status: 'echo' | 'vulnerable' | 'weak';
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
  /** Character relic: spent by the first damaging hit of this combat. */
  firstAttackBonusDamage: number;
  firstAttackBonusReady: boolean;
  /** Battle-long scaling from 共鳴護唱. */
  echoGuardAmount: number;
  training: number;
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
  drawIfJinPending: boolean;
  bonusJinNextEnemyPhase: number;
  flawlessTrainingPending: boolean;
  activePowerIds: string[];
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
  status: 'playing' | 'won' | 'lost';
  log: string[];
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
