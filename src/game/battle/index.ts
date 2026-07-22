/**
 * Public battle API — re-exported by src/game/combat.ts facade.
 */

export type {
  BattlePhase,
  CombatCard,
  CombatFx,
  CombatState,
  EnemyUnit,
  PlayerImpact,
} from './types';

export { pushFx, takePendingFx } from './fx';
export { drawCards, makeCard, pickRewardIds, shuffle } from './piles';
export {
  applyEnemyIntent,
  currentIntent,
  getEnemy,
  getEnemyUnit,
  intentForUnit,
  nextIntentForUnit,
  runEnemyTurn,
  selectEnemy,
  spawnEnemies,
  syncPrimaryEnemy,
} from './enemyHandler';
export {
  beginPlay,
  canPlay,
  discardHandEndTurn,
  resolveCastFizzle,
  resolveCastSuccess,
} from './playerHandler';
export { createCombat, endTurn } from './battleManager';
export {
  cardNeedsEnemyTarget,
  cardTargetType,
  executeEffects,
  livingEnemies,
} from './effects';
