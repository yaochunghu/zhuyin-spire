/**
 * Multi-enemy spawn, selection, intents, and enemy turn resolution.
 * Includes extras: block intents, multi-hit sequential damage.
 */

import {
  ENEMIES,
  intentAt,
  intentHitCount,
  type EnemyDef,
  type Intent,
} from '../../data/enemies';
import { livingEnemies } from './effects';
import { pushFx } from './fx';
import type { CombatState, EnemyUnit } from './types';

let enemyUid = 0;

export function spawnEnemies(defIds: string[]): EnemyUnit[] {
  return defIds.slice(0, 3).map((defId) => {
    const def = ENEMIES[defId];
    if (!def) throw new Error(`Unknown enemy ${defId}`);
    enemyUid += 1;
    return {
      id: `e${enemyUid}`,
      defId,
      hp: def.maxHp,
      maxHp: def.maxHp,
      block: 0,
      intentIndex: 0,
      alive: true,
      echoTurns: 0,
      vulnerableTurns: 0,
      weakTurns: 0,
      echoTriggeredThisTurn: false,
    };
  });
}

/**
 * Pick next living enemy after a dead selection (left→right, wrap).
 * Keeps multi-target flow snappy when a unit dies mid-fight.
 */
function nextLivingAfter(state: CombatState, fromId: string | null): string | null {
  const living = livingEnemies(state);
  if (living.length === 0) return null;
  if (!fromId) return living[0]!.id;
  const all = state.enemies;
  const start = all.findIndex((e) => e.id === fromId);
  if (start < 0) return living[0]!.id;
  for (let step = 1; step <= all.length; step += 1) {
    const u = all[(start + step) % all.length]!;
    if (u.alive && u.hp > 0) return u.id;
  }
  return living[0]!.id;
}

/** Sync legacy single-enemy fields + auto-select next living on death */
export function syncPrimaryEnemy(state: CombatState): void {
  const living = livingEnemies(state);
  if (living.length === 0) {
    state.selectedEnemyId = null;
    state.enemyId = 'slime';
    state.enemyHp = 0;
    state.enemyMaxHp = 1;
    state.enemyTurnIndex = 0;
    return;
  }

  // Selected dead / missing → advance to next living (not always slot 0)
  if (
    !state.selectedEnemyId ||
    !living.some((e) => e.id === state.selectedEnemyId)
  ) {
    state.selectedEnemyId = nextLivingAfter(state, state.selectedEnemyId);
  }

  const primary =
    living.find((e) => e.id === state.selectedEnemyId) || living[0]!;
  state.selectedEnemyId = primary.id;
  state.enemyId = primary.defId;
  state.enemyHp = primary.hp;
  state.enemyMaxHp = primary.maxHp;
  state.enemyTurnIndex = primary.intentIndex;
}

export function getEnemy(state: CombatState): EnemyDef {
  syncPrimaryEnemy(state);
  return ENEMIES[state.enemyId] ?? ENEMIES.slime!;
}

export function getEnemyUnit(state: CombatState, id: string): EnemyUnit | null {
  return state.enemies.find((e) => e.id === id) ?? null;
}

export function currentIntent(state: CombatState): Intent {
  const living = livingEnemies(state);
  const unit =
    (state.selectedEnemyId && living.find((e) => e.id === state.selectedEnemyId)) ||
    living[0];
  if (!unit) return { kind: 'attack', value: 0 };
  const def = ENEMIES[unit.defId];
  if (!def) return { kind: 'attack', value: 0 };
  return intentAt(def, unit.intentIndex);
}

export function intentForUnit(unit: EnemyUnit): Intent {
  const def = ENEMIES[unit.defId];
  if (!def) return { kind: 'attack', value: 0 };
  return intentAt(def, unit.intentIndex);
}

/** Intent the unit will show after the current one resolves (next turn). */
export function nextIntentForUnit(unit: EnemyUnit): Intent {
  const def = ENEMIES[unit.defId];
  if (!def) return { kind: 'attack', value: 0 };
  return intentAt(def, unit.intentIndex + 1);
}

export function selectEnemy(state: CombatState, enemyInstanceId: string): void {
  const u = state.enemies.find((e) => e.id === enemyInstanceId && e.alive);
  if (u) {
    state.selectedEnemyId = u.id;
    syncPrimaryEnemy(state);
  }
}

/**
 * Resolve one enemy intent: block self, or attack hero (multi hits sequential vs shield).
 */
export function applyEnemyIntent(state: CombatState, unit: EnemyUnit): void {
  const def = ENEMIES[unit.defId];
  if (!def) return;
  const intent = intentAt(def, unit.intentIndex);

  // —— Defend ——
  if (intent.kind === 'block') {
    unit.block += intent.value;
    state.log.push(`${def.name} 獲得 🛡️${intent.value}`);
    pushFx(state, {
      type: 'enemyBlock',
      amount: intent.value,
      enemyId: unit.id,
    });
    unit.intentIndex += 1;
    return;
  }

  // —— Attack (single / heavy / multi) ——
  const hits = Math.max(1, intentHitCount(intent));
  const perHit = Math.max(0, Math.floor(intent.value * (unit.weakTurns > 0 ? 0.75 : 1)));
  const jinBeforeAction = state.jin;
  if (
    state.activePowerIds.includes('B090') &&
    (state.powerTriggersThisTurn.B090 ?? 0) === 0 &&
    state.jin > 0 &&
    perHit * hits > state.block
  ) {
    state.jin -= 1;
    state.block += 5;
    state.powerTriggersThisTurn.B090 = 1;
    state.log.push('不動如山：消耗 1 勁，護盾 +5');
  }
  const blockBefore = state.block;
  let totalBlocked = 0;
  let totalDamage = 0;

  for (let i = 0; i < hits; i += 1) {
    if (state.block > 0) {
      const absorb = Math.min(state.block, perHit);
      state.block -= absorb;
      totalBlocked += absorb;
      const rest = perHit - absorb;
      if (rest > 0) {
        state.heroHp = Math.max(0, state.heroHp - rest);
        totalDamage += rest;
      }
    } else {
      state.heroHp = Math.max(0, state.heroHp - perHit);
      totalDamage += perHit;
    }
    if (state.heroHp <= 0) break;
  }

  if (totalBlocked > 0) {
    state.log.push(`護盾擋住 ${totalBlocked} 點（${def.name}）`);
  }
  if (totalDamage > 0) {
    state.log.push(
      hits > 1
        ? `${def.name} 連擊 ${hits} 下，造成 ${totalDamage} 傷害！`
        : `${def.name} 造成 ${totalDamage} 傷害！`,
    );
  } else if (totalBlocked > 0 && totalDamage === 0) {
    state.log.push(`${def.name} 的攻擊全被擋住了！`);
    if (state.jin < 9) {
      state.jin += 1;
      state.gainedJinThisEnemyPhase = true;
      state.log.push(`完整化解攻擊：勁 +1（${state.jin}/9）`);
      if (state.drawIfJinPending) {
        state.bonusDrawNextTurn += 1;
        state.drawIfJinPending = false;
      }
      if (state.bonusJinNextEnemyPhase > 0) {
        state.jin = Math.min(9, state.jin + state.bonusJinNextEnemyPhase);
        state.bonusJinNextEnemyPhase = 0;
      }
      if (
        state.activePowerIds.includes('B100') &&
        (state.powerTriggersThisTurn.B100 ?? 0) === 0
      ) {
        unit.vulnerableTurns = Math.min(9, unit.vulnerableTurns + 1);
        pushFx(state, {
          type: 'enemyStatus',
          enemyId: unit.id,
          status: 'vulnerable',
          turns: unit.vulnerableTurns,
        });
        state.powerTriggersThisTurn.B100 = 1;
      }
    }
  }

  pushFx(state, {
    type: 'enemyStrike',
    blockBefore,
    blocked: totalBlocked,
    damage: totalDamage,
    enemyId: unit.id,
    hits,
  });
  if (state.jin !== jinBeforeAction) {
    pushFx(state, {
      type: 'playerResource',
      resource: 'jin',
      delta: state.jin - jinBeforeAction,
      value: state.jin,
    });
  }
  unit.intentIndex += 1;
}

/** Run sequential intents for all living enemies. */
export function runEnemyTurn(state: CombatState): void {
  const hpBefore = state.heroHp;
  for (const unit of state.enemies) {
    if (!unit.alive || unit.hp <= 0) continue;
    applyEnemyIntent(state, unit);
    if (state.heroHp <= 0) break;
  }
  if (state.flawlessTrainingPending) {
    if (state.heroHp === hpBefore) state.training += 1;
    state.flawlessTrainingPending = false;
  }
}

/** Advance monster statuses exactly once when a new player turn begins. */
export function advanceEnemyStatuses(state: CombatState): void {
  for (const unit of state.enemies) {
    if (!unit.alive) continue;
    if (unit.echoTurns > 0) unit.echoTurns -= 1;
    if (unit.vulnerableTurns > 0) unit.vulnerableTurns -= 1;
    if (unit.weakTurns > 0) unit.weakTurns -= 1;
    unit.echoTriggeredThisTurn = false;
  }
}
