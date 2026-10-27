/**
 * Multi-enemy spawn, selection, intents, and enemy turn resolution.
 * Includes extras: block intents, multi-hit sequential damage.
 */

import {
  ENEMIES,
  intentHitCount,
  type EnemyDef,
  type Intent,
  type IntentStep,
} from '../../data/enemies';
import { livingEnemies } from './effects';
import { pushFx } from './fx';
import { gainJin } from './resources';
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
      vulnerableTurns: 0,
      weakTurns: 0,
      strength: 0,
      bankedStrength: 0,
      armedSoothe: 0,
      pendingSoothe: 0,
      phase: 0,
      queuedEnter: false,
      summoned: false,
      justSummoned: false,
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

function strengthCap(unit: EnemyUnit): number {
  return ENEMIES[unit.defId]?.strengthCap ?? 0;
}

function rawStep(unit: EnemyUnit, offset: 0 | 1): IntentStep {
  const def = ENEMIES[unit.defId];
  if (!def || def.pattern.length === 0) return { kind: 'attack', value: 0 };
  const phase = def.phases?.[0];
  const crossed = !!phase && unit.hp > 0 && unit.hp <= phase.belowHp && (unit.phase ?? 0) === 0;
  if (unit.queuedEnter && phase) {
    if (offset === 0) return phase.enter;
    return phase.pattern[0] ?? phase.enter;
  }
  if (!unit.queuedEnter && crossed && offset === 1 && phase) return phase.enter;
  const pattern = (unit.phase ?? 0) > 0 && phase ? phase.pattern : def.pattern;
  const index = ((unit.intentIndex ?? 0) + offset) % pattern.length;
  return pattern[index] ?? { kind: 'attack', value: 0 };
}

function projectedStrength(unit: EnemyUnit, offset: 0 | 1, state?: CombatState): number {
  const cap = strengthCap(unit);
  const current = unit.strength ?? 0;
  if (offset === 0 || cap <= 0) return Math.min(cap, current);
  let extra = unit.bankedStrength ?? 0;
  const actors = state?.enemies ?? [unit];
  for (const actor of actors) {
    if (!actor.alive || actor.hp <= 0 || actor.justSummoned) continue;
    const step = rawStep(actor, 0);
    if (actor.id === unit.id) extra += step.grantSelfStrength ?? 0;
    else extra += step.grantStrength ?? 0;
  }
  return Math.min(cap, current + extra);
}

function sootheAmount(unit: EnemyUnit, offset: 0 | 1): number {
  const pending = unit.pendingSoothe ?? 0;
  const armed = unit.armedSoothe ?? 0;
  if (!ENEMIES[unit.defId]?.listens) return 0;
  if (offset === 0) return armed;
  if (rawStep(unit, 0).kind === 'block') return armed + pending;
  return pending;
}

/** Damage number before Weak. Strength and soothe are already inside it. */
export function intentForOffset(unit: EnemyUnit, offset: 0 | 1, state?: CombatState): Intent {
  const step = rawStep(unit, offset);
  if (step.kind === 'block') return { kind: 'block', value: step.value };
  const value = Math.max(1, step.value + projectedStrength(unit, offset, state) - sootheAmount(unit, offset));
  return { kind: step.kind, value, hits: step.hits };
}

export function currentIntent(state: CombatState): Intent {
  const living = livingEnemies(state);
  const unit =
    (state.selectedEnemyId && living.find((e) => e.id === state.selectedEnemyId)) ||
    living[0];
  if (!unit) return { kind: 'attack', value: 0 };
  return intentForOffset(unit, 0, state);
}

export function intentForUnit(unit: EnemyUnit, state?: CombatState): Intent {
  if (!ENEMIES[unit.defId]) return { kind: 'attack', value: 0 };
  return intentForOffset(unit, 0, state);
}

/** Intent the unit will show after the current one resolves (next turn). */
export function nextIntentForUnit(unit: EnemyUnit, state?: CombatState): Intent {
  if (!ENEMIES[unit.defId]) return { kind: 'attack', value: 0 };
  return intentForOffset(unit, 1, state);
}

/**
 * Read-only view of the pattern step behind the 本回合 (0) or 下回合 (1) pill.
 * The UI uses it for summon, strength, and boss phase-enter cues.
 */
export function intentStepForUnit(
  unit: EnemyUnit,
  offset: 0 | 1,
): { step: IntentStep; phaseEnter: boolean } {
  const step = rawStep(unit, offset);
  const phase = ENEMIES[unit.defId]?.phases?.[0];
  return { step, phaseEnter: !!phase && step === phase.enter };
}

/** A correct cast softens a listening enemy's later attack. Fizzles do not. */
export function noteSuccessfulCast(state: CombatState): void {
  for (const unit of state.enemies) {
    if (!unit.alive || unit.hp <= 0) continue;
    const def = ENEMIES[unit.defId];
    if (!def?.listens) continue;
    unit.pendingSoothe = Math.min(6, (unit.pendingSoothe ?? 0) + 1);
  }
}

/**
 * Weak remaining after this enemy action. The duration ticks once at the
 * player-turn boundary that follows the action (`advanceEnemyStatuses`).
 */
export function weakTurnsAfterEnemyAction(weakTurns: number): number {
  return weakTurns > 0 ? weakTurns - 1 : 0;
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
function bankGrants(state: CombatState, actor: EnemyUnit, step: IntentStep): void {
  if (step.grantSelfStrength) {
    actor.bankedStrength = (actor.bankedStrength ?? 0) + step.grantSelfStrength;
  }
  const allyBonus = step.grantStrength ?? 0;
  if (allyBonus <= 0) return;
  for (const other of state.enemies) {
    if (other.id === actor.id || !other.alive || other.hp <= 0) continue;
    other.bankedStrength = (other.bankedStrength ?? 0) + allyBonus;
  }
}

function trySummon(state: CombatState, unit: EnemyUnit, defId: string | undefined): void {
  if (!defId || unit.summoned) return;
  unit.summoned = true;
  const def = ENEMIES[defId];
  const actor = ENEMIES[unit.defId];
  if (!def || state.enemies.length >= 3) return;
  enemyUid += 1;
  state.enemies.push({
    id: `e${enemyUid}`,
    defId,
    hp: def.maxHp,
    maxHp: def.maxHp,
    block: 0,
    intentIndex: 0,
    alive: true,
    vulnerableTurns: 0,
    weakTurns: 0,
    strength: 0,
    bankedStrength: 0,
    armedSoothe: 0,
    pendingSoothe: 0,
    phase: 0,
    queuedEnter: false,
    summoned: false,
    justSummoned: true,
  });
  state.log.push(`${actor?.name ?? unit.defId} 叫來了 ${def.name}`);
}

function consumeSoothe(unit: EnemyUnit, step: IntentStep): void {
  if (!ENEMIES[unit.defId]?.listens) return;
  if (step.kind === 'block') {
    unit.armedSoothe = (unit.armedSoothe ?? 0) + (unit.pendingSoothe ?? 0);
  } else {
    unit.armedSoothe = unit.pendingSoothe ?? 0;
  }
  unit.pendingSoothe = 0;
}

function advancePattern(unit: EnemyUnit): void {
  const def = ENEMIES[unit.defId];
  const phase = def?.phases?.[0];
  const crossed = !!phase && unit.hp > 0 && unit.hp <= phase.belowHp && (unit.phase ?? 0) === 0;
  if (unit.queuedEnter && phase) {
    unit.queuedEnter = false;
    unit.phase = 1;
    unit.intentIndex = 0;
    return;
  }
  unit.intentIndex += 1;
  if (crossed && phase) unit.queuedEnter = true;
}

function commitStrength(state: CombatState): void {
  for (const unit of state.enemies) {
    const cap = strengthCap(unit);
    unit.strength = Math.min(cap, (unit.strength ?? 0) + (unit.bankedStrength ?? 0));
    unit.bankedStrength = 0;
    unit.justSummoned = false;
  }
}

export function applyEnemyIntent(state: CombatState, unit: EnemyUnit): void {
  const def = ENEMIES[unit.defId];
  if (!def) return;
  // Enemy Block lasts until this enemy's next action, then a guard can grant a fresh shield.
  unit.block = 0;
  const step = rawStep(unit, 0);
  const intent = intentForOffset(unit, 0, state);

  // —— Defend ——
  if (intent.kind === 'block') {
    unit.block += intent.value;
    state.log.push(`${def.name} 獲得 🛡️${intent.value}`);
    pushFx(state, {
      type: 'enemyBlock',
      amount: intent.value,
      enemyId: unit.id,
    });
    trySummon(state, unit, step.summon);
    bankGrants(state, unit, step);
    consumeSoothe(unit, step);
    advancePattern(unit);
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
      gainJin(state, 1, 'afterEnemies');
      state.gainedJinThisEnemyPhase = true;
      state.log.push(`完整化解攻擊：勁 +1（${state.jin}/9）`);
      if (state.drawIfJinPending > 0) {
        state.bonusDrawNextTurn += state.drawIfJinPending;
        state.drawIfJinPending = 0;
      }
      if (state.bonusJinNextEnemyPhase > 0) {
        gainJin(state, state.bonusJinNextEnemyPhase, 'afterEnemies');
        state.bonusJinNextEnemyPhase = 0;
      }
      if (
        state.activePowerIds.includes('B100') &&
        (state.powerTriggersThisTurn.B100 ?? 0) === 0
      ) {
        const vulnerable = state.activePowerLevels.B100 === 1 ? 2 : 1;
        unit.vulnerableTurns = Math.min(9, unit.vulnerableTurns + vulnerable);
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
  trySummon(state, unit, step.summon);
  bankGrants(state, unit, step);
  consumeSoothe(unit, step);
  advancePattern(unit);
}

/** Run sequential intents for all living enemies. */
export function runEnemyTurn(state: CombatState): void {
  const hpBefore = state.heroHp;
  for (const unit of state.enemies) {
    if (!unit.alive || unit.hp <= 0) continue;
    if (unit.justSummoned) continue;
    applyEnemyIntent(state, unit);
    if (state.heroHp <= 0) break;
  }
  commitStrength(state);
  if (state.flawlessTrainingPending > 0) {
    if (state.heroHp === hpBefore) state.training += state.flawlessTrainingPending;
    state.flawlessTrainingPending = 0;
  }
  // "Next enemy phase" riders expire even when the full-block condition never happens.
  state.drawIfJinPending = 0;
  state.bonusJinNextEnemyPhase = 0;
}

/**
 * Advance monster statuses exactly once when a new player turn begins.
 * Duration that already existed before the enemy phase ticks down.
 * 易傷 applied during that phase (化勁留隙) stays up for the player turn that follows.
 */
export function advanceEnemyStatuses(
  state: CombatState,
  vulnerableAtPhaseStart?: ReadonlyMap<string, number>,
): void {
  for (const unit of state.enemies) {
    if (!unit.alive) continue;
    const before = vulnerableAtPhaseStart?.get(unit.id);
    if (before === undefined) {
      if (unit.vulnerableTurns > 0) unit.vulnerableTurns -= 1;
    } else if (before > 0) {
      const gained = Math.max(0, unit.vulnerableTurns - before);
      unit.vulnerableTurns = Math.min(9, Math.max(0, before - 1) + gained);
    }
    unit.weakTurns = weakTurnsAfterEnemyAction(unit.weakTurns);
  }
}
