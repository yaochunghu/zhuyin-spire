/**
 * Combat facade — re-exports the battle module public API.
 * Game/UI code may keep importing from `./combat` (stable path).
 * Implementation lives under `src/game/battle/`.
 */

export type {
  BattlePhase,
  CombatCard,
  CombatFx,
  CombatState,
  EnemyUnit,
  PlayerImpact,
} from './battle';

export {
  beginPlay,
  canPlay,
  applyCombatPotion,
  combatPotionBlock,
  healedAmount,
  cardNeedsEnemyTarget,
  cardTargetType,
  dealBlockedDamage,
  dealTrueDamage,
  effectiveCost,
  isEligibleHandChoice,
  createCombat,
  currentIntent,
  drawCards,
  endTurn,
  executeEffects,
  getEnemy,
  getEnemyUnit,
  intentForUnit,
  livingEnemies,
  makeCard,
  nextIntentForUnit,
  weakTurnsAfterEnemyAction,
  pickRewardIds,
  resolveCastFizzle,
  resolveCastSuccess,
  selectEnemy,
  shuffle,
  syncPrimaryEnemy,
  takePendingFx,
} from './battle';
