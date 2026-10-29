/**
 * Battle lifecycle: create combat, end turn, phase transitions, win/loss.
 */

import { DRAW_PER_TURN, MAX_HAND_SIZE, TURN_START_BEADS } from '../../data/balance';
import { resolveEnemyDefIds } from '../../data/encounters';
import { ENEMIES } from '../../data/enemies';
import { resolveCard } from '../../data/cards';
import { combatModsFor, listRelics, type RelicDef } from '../../data/relics';
import type { DeckCard } from '../cardInstances';
import {
  advanceEnemyStatuses,
  intentForUnit,
  runEnemyTurn,
  spawnEnemies,
  syncPrimaryEnemy,
} from './enemyHandler';
import { addBeads, livingEnemies } from './effects';
import { discardHandEndTurn } from './playerHandler';
import { drawCards, makeCard, shuffle } from './piles';
import { applyPendingListeningHeart } from './resources';
import { pushFx } from './fx';
import { ECHO_COMBAT_RULES, type CombatRules, type CombatState } from './types';

export function createCombat(
  deckDefIds: Array<string | DeckCard>,
  enemyIdOrIds: string | string[],
  heroHp: number,
  heroMaxHp: number,
  relics?: RelicDef | readonly RelicDef[] | null,
  encounterId?: string,
  rules: CombatRules = ECHO_COMBAT_RULES,
): CombatState {
  const defIds = Array.isArray(enemyIdOrIds)
    ? enemyIdOrIds
    : resolveEnemyDefIds(enemyIdOrIds, encounterId);

  const mods = combatModsFor(listRelics(relics));
  const maxEnergy = mods.maxEnergy;
  const startBlock = mods.startBlock;
  const turn1Energy = mods.firstTurnEnergy;

  const enemies = spawnEnemies(defIds);
  const names = enemies.map((e) => ENEMIES[e.defId]?.name ?? e.defId).join('、');

  const drawPile = shuffle(deckDefIds.map(makeCard));
  const state: CombatState = {
    heroHp,
    heroMaxHp,
    block: startBlock,
    energy: turn1Energy,
    maxEnergy,
    firstAttackBonusDamage: mods.firstAttackBonusDamage,
    firstAttackBonusReady: mods.firstAttackBonusDamage > 0,
    basicHitBonus: mods.firstBasicHitBonus,
    basicHitBonusReady: mods.firstBasicHitBonus > 0,
    vulnerableHitBonus: mods.firstVulnerableHitBonus,
    vulnerableHitBonusReady: mods.firstVulnerableHitBonus > 0,
    tempoRelicBlock: mods.firstTempoBlock,
    tempoRelicReady: mods.firstTempoBlock > 0,
    jinGuardBlock: mods.firstJinBlock,
    jinGuardReady: mods.firstJinBlock > 0,
    jinGuardBlockPending: 0,
    jinGuardBlockImmediate: 0,
    training: 0,
    firstTurnTraining: 0,
    jin: 0,
    gainedJinLastEnemyPhase: false,
    gainedJinThisEnemyPhase: false,
    lastPlayedType: null,
    tempoCount: 0,
    basicPlayedThisTurn: 0,
    basicTrainingCounter: 0,
    nextAttackBonus: 0,
    freeBasicsRemaining: 0,
    bonusDrawNextTurn: 0,
    drawIfJinPending: 0,
    bonusJinNextEnemyPhase: 0,
    flawlessTrainingPending: 0,
    activePowerIds: [],
    activePowerLevels: {},
    powerTriggersThisTurn: {},
    exhaustPile: [],
    drawPile,
    hand: [],
    discardPile: [],
    enemies,
    selectedEnemyId: enemies[0]?.id ?? null,
    pendingTargetIds: [],
    phase: 'playerAction',
    turn: 1,
    parentHintUsed: false,
    rules,
    beads: 0,
    tens: 0,
    castsThisTurn: 0,
    makeTenThisTurn: 0,
    makeTenCount: 0,
    mathRetryUsed: false,
    mathMissStreak: 0,
    beadsMadeLastAdd: 0,
    makeTenDirectDamage: mods.makeTenDirectDamage,
    tenBellEnergy: mods.firstMakeTenEnergy,
    tenBellReady: mods.firstMakeTenEnergy > 0,
    rulerCharmBlock: mods.rulerCharmBlock,
    rulerCharmCast: mods.rulerCharmCast > 0 ? mods.rulerCharmCast : 3,
    rulerCharmUsedThisTurn: false,
    fizzleBeads: mods.fizzleBeads,
    eraserReady: mods.fizzleBeads > 0,
    compareExtraDamage: 0,
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

  if (mods.firstTurnTraining > 0) {
    state.training += mods.firstTurnTraining;
    state.firstTurnTraining = mods.firstTurnTraining;
    state.log.push(`練功起勢：第 1 回合練功 +${mods.firstTurnTraining}`);
  }
  if (startBlock > 0) state.log.push(`遺物護盾 +${startBlock}`);
  if (turn1Energy > maxEnergy) {
    state.log.push(`晨光：第 1 回合 ⚡${turn1Energy}`);
  }
  if (mods.firstAttackBonusDamage > 0) {
    state.log.push(`初心音叉：首次攻擊 +${mods.firstAttackBonusDamage}`);
  }
  if (mods.firstVulnerableHitBonus > 0) {
    state.log.push(`尋隙指套：易傷目標的第一下 +${mods.firstVulnerableHitBonus}`);
  }
  if (mods.firstBasicHitBonus > 0) {
    state.log.push(`練功護腕：基礎攻擊第一下 +${mods.firstBasicHitBonus}`);
  }
  if (mods.firstTempoBlock > 0) {
    state.log.push(`換拍木魚：第一次換拍護盾 +${mods.firstTempoBlock}`);
  }
  if (mods.firstJinBlock > 0) {
    state.log.push(`聽勁護心：第一次得勁護盾 +${mods.firstJinBlock}`);
  }
  if (rules.beadsEnabled && mods.startBeads > 0) {
    addBeads(state, mods.startBeads);
    state.log.push(`算珠袋：撥 ${mods.startBeads} 珠`);
  }
  drawCards(state, DRAW_PER_TURN);
  if (mods.startDraw > 0) {
    drawCards(state, mods.startDraw);
    state.log.push(`多抽 ${mods.startDraw} 張`);
  }
  return state;
}

export function endTurn(state: CombatState): CombatState['status'] {
  if (state.status !== 'playing') return state.status;
  state.phase = 'playerEnd';

  discardHandEndTurn(state);

  state.phase = 'enemyTurn';
  const vulnerableAtPhaseStart = new Map(
    state.enemies.map((enemy) => [enemy.id, enemy.vulnerableTurns]),
  );
  if ((state.relicRainBlock ?? 0) > 0 && state.block === 0) {
    state.block += state.relicRainBlock ?? 0;
    state.log.push(`雨聲筒 +${state.relicRainBlock} 護盾`);
  }
  runEnemyTurn(state);

  if (state.heroHp <= 0) {
    state.status = 'lost';
    state.phase = 'resolve';
    state.log.push('你暈倒了，休息一下…');
    return state.status;
  }

  // Player turn start: leftover block expires (STS-style).
  // 易傷 applied during the enemy phase (B100) is not part of this tick.
  // 聽勁護心's shield was withheld until after every enemy acted.
  state.block = 0;
  applyPendingListeningHeart(state);
  advanceEnemyStatuses(state, vulnerableAtPhaseStart);
  state.turn += 1;
  if (state.firstTurnTraining > 0) {
    const removed = Math.min(state.training, state.firstTurnTraining);
    state.training -= removed;
    state.firstTurnTraining = 0;
    if (removed > 0) state.log.push('練功起勢結束');
  }
  state.energy = state.maxEnergy;
  state.firstAttackBonusReady = state.firstAttackBonusDamage > 0;
  state.basicHitBonusReady = state.basicHitBonus > 0;
  state.vulnerableHitBonusReady = state.vulnerableHitBonus > 0;
  state.tempoRelicReady = state.tempoRelicBlock > 0;
  state.gainedJinLastEnemyPhase = state.gainedJinThisEnemyPhase;
  state.gainedJinThisEnemyPhase = false;
  state.lastPlayedType = null;
  state.tempoCount = 0;
  state.basicPlayedThisTurn = 0;
  state.castsThisTurn = 0;
  state.makeTenThisTurn = 0;
  state.rulerCharmUsedThisTurn = false;
  state.powerTriggersThisTurn = {};
  state.nextAttackBonus = 0;
  state.freeBasicsRemaining = 0;
  state.phase = 'playerStart';
  state.metronomePlayed = 0;
  state.metronomeUsed = false;
  state.stageFrightUsed = false;
  if (state.rules?.beadsEnabled && state.activePowerIds.includes('M019')) {
    addBeads(state, TURN_START_BEADS);
    state.log.push(`撥算如飛：撥 ${TURN_START_BEADS} 珠`);
    if (livingEnemies(state).length === 0) {
      state.status = 'won';
      state.log.push('怪物都變成音符了！');
      return state.status;
    }
  }
  const drawPenalty = state.drawPenaltyNextTurn ?? 0;
  state.drawPenaltyNextTurn = 0;
  drawCards(state, Math.max(0, DRAW_PER_TURN - drawPenalty));
  if (state.activePowerIds.includes('B129') && state.hand.length < MAX_HAND_SIZE) {
    const wantsSkill = state.enemies
      .filter((enemy) => enemy.alive)
      .some((enemy) => intentForUnit(enemy).kind === 'attack');
    const wantedType = wantsSkill ? 'skill' : 'attack';
    drawCardOfType(state, wantedType);
  }
  if (state.bonusDrawNextTurn > 0) {
    drawCards(state, state.bonusDrawNextTurn);
    state.bonusDrawNextTurn = 0;
  }
  state.phase = 'playerAction';
  state.log.push(`—— 第 ${state.turn} 回合 ——`);
  syncPrimaryEnemy(state);
  return state.status;
}

function drawCardOfType(state: CombatState, wantedType: 'attack' | 'skill'): void {
  const matches = (card: CombatState['drawPile'][number]) =>
    resolveCard(card.defId, card.upgradeLevel).type === wantedType;
  let index = lastIndexWhere(state.drawPile, matches);
  if (index < 0 && state.discardPile.some(matches)) {
    const count = state.discardPile.length;
    // Keep cards already in the draw pile. Shuffled discards go underneath
    // (draw order pops from the end).
    state.drawPile = [...shuffle(state.discardPile), ...state.drawPile];
    state.discardPile = [];
    state.log.push('洗牌！');
    pushFx(state, { type: 'shuffle', count });
    index = lastIndexWhere(state.drawPile, matches);
  }
  if (index < 0) return;
  const [card] = state.drawPile.splice(index, 1);
  state.hand.push(card!);
  pushFx(state, { type: 'draw', cards: [card!] });
}

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index]!)) return index;
  }
  return -1;
}
