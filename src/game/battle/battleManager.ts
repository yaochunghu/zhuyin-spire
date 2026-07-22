/**
 * Battle lifecycle: create combat, end turn, phase transitions, win/loss.
 */

import { DRAW_PER_TURN } from '../../data/balance';
import { resolveEnemyDefIds } from '../../data/encounters';
import { ENEMIES } from '../../data/enemies';
import type { RelicDef } from '../../data/relics';
import type { DeckCardV2 } from '../cardInstances';
import {
  advanceEnemyStatuses,
  runEnemyTurn,
  spawnEnemies,
  syncPrimaryEnemy,
} from './enemyHandler';
import { discardHandEndTurn } from './playerHandler';
import { drawCards, makeCard, shuffle } from './piles';
import type { CombatState } from './types';

export function createCombat(
  deckDefIds: Array<string | DeckCardV2>,
  enemyIdOrIds: string | string[],
  heroHp: number,
  heroMaxHp: number,
  relic?: RelicDef | null,
  encounterId?: string,
): CombatState {
  const defIds = Array.isArray(enemyIdOrIds)
    ? enemyIdOrIds
    : resolveEnemyDefIds(enemyIdOrIds, encounterId);

  const maxEnergy = relic?.maxEnergy ?? 3;
  const startBlock = relic?.startBlock ?? 0;
  const turn1Energy = relic?.firstTurnEnergy ?? maxEnergy;

  const enemies = spawnEnemies(defIds);
  const names = enemies.map((e) => ENEMIES[e.defId]?.name ?? e.defId).join('、');

  const drawPile = shuffle(deckDefIds.map(makeCard));
  const state: CombatState = {
    heroHp,
    heroMaxHp,
    block: startBlock,
    energy: turn1Energy,
    maxEnergy,
    firstAttackBonusDamage: relic?.firstAttackBonusDamage ?? 0,
    firstAttackBonusReady: (relic?.firstAttackBonusDamage ?? 0) > 0,
    basicAttackBonusDamage: 0,
    drawPile,
    hand: [],
    discardPile: [],
    powerPile: [],
    enemies,
    selectedEnemyId: enemies[0]?.id ?? null,
    pendingTargetIds: [],
    phase: 'playerAction',
    turn: 1,
    parentHintUsed: false,
    status: 'playing',
    log: [`遇到了 ${names}！`],
    pending: null,
    pendingFx: [],
    enemyId: enemies[0]?.defId ?? 'slime',
    enemyHp: enemies[0]?.hp ?? 0,
    enemyMaxHp: enemies[0]?.maxHp ?? 1,
    enemyTurnIndex: 0,
  };
  syncPrimaryEnemy(state);

  if (startBlock > 0) state.log.push(`遺物護盾 +${startBlock}`);
  if (relic?.firstTurnEnergy && relic.firstTurnEnergy > maxEnergy) {
    state.log.push(`晨光：第 1 回合 ⚡${relic.firstTurnEnergy}`);
  }
  if (relic?.firstAttackBonusDamage) {
    state.log.push(`初心音叉：每回合首擊 +${relic.firstAttackBonusDamage}`);
  }
  drawCards(state, DRAW_PER_TURN);
  if (relic?.startDraw && relic.startDraw > 0) {
    drawCards(state, relic.startDraw);
    state.log.push(`多抽 ${relic.startDraw} 張`);
  }
  return state;
}

export function endTurn(state: CombatState): CombatState['status'] {
  if (state.status !== 'playing') return state.status;
  state.phase = 'playerEnd';

  discardHandEndTurn(state);

  state.phase = 'enemyTurn';
  runEnemyTurn(state);

  if (state.heroHp <= 0) {
    state.status = 'lost';
    state.phase = 'resolve';
    state.log.push('你倒下了…');
    return state.status;
  }

  // Player turn start: leftover block expires (STS-style)
  state.block = 0;
  advanceEnemyStatuses(state);
  state.turn += 1;
  state.energy = state.maxEnergy;
  state.firstAttackBonusReady = state.firstAttackBonusDamage > 0;
  state.phase = 'playerStart';
  drawCards(state, DRAW_PER_TURN);
  state.phase = 'playerAction';
  state.log.push(`—— 第 ${state.turn} 回合 ——`);
  syncPrimaryEnemy(state);
  return state.status;
}
