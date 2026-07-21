/**
 * Shared battle data types.
 * Handlers, effects, and UI import from here (not from combat facade).
 */

export interface CombatCard {
  uid: string;
  defId: string;
}

export interface EnemyUnit {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;
  alive: boolean;
}

/** Visual / motion events for UI */
export type CombatFx =
  | { type: 'draw'; cards: CombatCard[] }
  | { type: 'discard'; cards: CombatCard[]; reason: 'play' | 'fizzle' | 'endTurn' }
  | { type: 'shuffle'; count: number }
  | {
      type: 'playerStrike';
      damage: number;
      hits: number;
      killed: boolean;
      targetIds?: string[];
    }
  | { type: 'playerBlock'; amount: number }
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
