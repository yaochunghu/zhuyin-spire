/**
 * Shared battle data types.
 * Handlers, effects, and UI import from here (not from combat facade).
 */

import type { DeckCardV2 } from '../cardInstances';

export type CombatCard = DeckCardV2;

export interface EnemyUnit {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;
  alive: boolean;
  /** Attack damage received is multiplied by 1.5 while active. */
  vulnerableTurns: number;
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
  /** Damage additions are separate so previews and feedback can explain them. */
  baseDamage: number;
  basicAttackBonus?: number;
  relicBonus?: number;
  vulnerableApplied?: boolean;
  finalDamage: number;
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
  | { type: 'playerPower'; power: 'basicAttackDamage'; amount: number }
  | { type: 'enemyStatus'; enemyId: string; status: 'vulnerable'; turns: number }
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
  /** Universal relic: readied again at the start of every player turn. */
  firstAttackBonusDamage: number;
  firstAttackBonusReady: boolean;
  /** Battle-long scaling installed by 聲波架式. */
  basicAttackBonusDamage: number;
  drawPile: CombatCard[];
  hand: CombatCard[];
  discardPile: CombatCard[];
  /** Successfully cast Power cards leave ordinary pile circulation. */
  powerPile: CombatCard[];
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
