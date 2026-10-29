/**
 * Modular card effects — composed like Lego bricks.
 * Legacy cards without effects[] are derived from type/value.
 */

import {
  BEAD_ARRAY_BLOCK,
  BEAD_ARRAY_BLOCK_PLUS,
  BEAD_BURST_DAMAGE,
  BEAD_BURST_DAMAGE_PLUS,
  BEAD_FILL_CAP,
  MAKE_TEN_SIZE,
  TENS_CAP,
} from '../../data/balance';
import { resolveCard, type CardDef, type CardType, type EffectDef, type TargetType } from '../../data/cards';
import type {
  CombatCard,
  CombatFx,
  CombatState,
  EnemyUnit,
  PlayerImpact,
} from './types';
import { gainJin, applyImmediateListeningHeart } from './resources';

export type { TargetType, EffectDef };

export function defaultTargetType(type: CardType): TargetType {
  if (type === 'attack') return 'singleEnemy';
  return 'self';
}

export function cardTargetType(def: CardDef): TargetType {
  return def.target ?? defaultTargetType(def.type);
}

/** Build effect list from explicit effects[] or legacy card fields. */
export function effectsForCard(def: CardDef): EffectDef[] {
  if (def.effects && def.effects.length > 0) return def.effects;
  const out: EffectDef[] = [];
  if (def.type === 'attack') {
    out.push({ kind: 'damage', amount: def.value, hits: def.hits ?? 1 });
    if (def.bonusBlock) out.push({ kind: 'block', amount: def.bonusBlock });
  } else if (def.type === 'block') {
    out.push({ kind: 'block', amount: def.value });
  } else if (def.type === 'skill') {
    if (def.draw) out.push({ kind: 'draw', amount: def.draw });
  }
  return out;
}

export function livingEnemies(state: CombatState): EnemyUnit[] {
  return state.enemies.filter((e) => e.alive && e.hp > 0);
}

/** Hand-choice targets. B041 may select any Attack, including one that is already basic. */
export function isEligibleHandChoice(def: CardDef, candidate: CombatCard): boolean {
  if (!def.handChoice) return false;
  const resolved = resolveCard(candidate.defId, candidate.upgradeLevel);
  return resolved.type === def.handChoice;
}

function countBasicAttacks(state: CombatState): number {
  return [...state.drawPile, ...state.hand, ...state.discardPile].filter((candidate) => {
    const resolved = resolveCard(candidate.defId, candidate.upgradeLevel);
    return resolved.basicAttack || candidate.basicOverride;
  }).length;
}

function gainVulnerable(enemy: EnemyUnit, amount: number): void {
  enemy.vulnerableTurns = Math.min(9, enemy.vulnerableTurns + amount);
}

function nextHitIndex(impacts: PlayerImpact[], enemyId: string): number {
  let index = 0;
  for (const impact of impacts) if (impact.enemyId === enemyId) index += 1;
  return index;
}

/** One Attack hit: 練功 and other printed bonuses are already in rawAmount. 易傷 and Block apply here. */
function dealAttackHit(
  state: CombatState,
  enemy: EnemyUnit,
  rawAmount: number,
  impacts: PlayerImpact[],
  hitIndex: number,
  basic = false,
): number {
  if (!enemy.alive) return 0;
  const relicBonus = state.firstAttackBonusReady ? state.firstAttackBonusDamage : 0;
  if (state.firstAttackBonusReady) state.firstAttackBonusReady = false;
  const basicRelicBonus = basic && state.basicHitBonusReady ? state.basicHitBonus : 0;
  if (basicRelicBonus > 0) state.basicHitBonusReady = false;
  const vulnerableRelicBonus = enemy.vulnerableTurns > 0 && state.vulnerableHitBonusReady
    ? state.vulnerableHitBonus
    : 0;
  if (vulnerableRelicBonus > 0) state.vulnerableHitBonusReady = false;
  const hitAmount = Math.floor(
    Math.max(0, rawAmount + relicBonus + basicRelicBonus + vulnerableRelicBonus) *
      (enemy.vulnerableTurns > 0 ? 1.5 : 1),
  );
  const blockBefore = enemy.block;
  const blocked = Math.min(blockBefore, hitAmount);
  enemy.block = Math.max(0, blockBefore - blocked);
  const hpDamage = Math.max(0, hitAmount - blocked);
  if (hpDamage > 0) enemy.hp = Math.max(0, enemy.hp - hpDamage);
  const killed = enemy.hp <= 0;
  if (killed) enemy.alive = false;
  impacts.push({
    enemyId: enemy.id,
    hitIndex,
    blockBefore,
    blocked,
    blockAfter: enemy.block,
    hpDamage,
    killed,
    ...(relicBonus > 0 ? { relicBonus } : {}),
    ...(basicRelicBonus > 0 ? { basicRelicBonus } : {}),
    ...(vulnerableRelicBonus > 0 ? { vulnerableRelicBonus } : {}),
  });
  return hpDamage;
}

export function resolveTargets(
  state: CombatState,
  def: CardDef,
  preferredIds: string[],
): EnemyUnit[] | 'self' {
  const t = cardTargetType(def);
  if (t === 'self') return 'self';
  const living = livingEnemies(state);
  if (t === 'allEnemies') return living;
  const pref = preferredIds
    .map((id) => living.find((e) => e.id === id))
    .filter((e): e is EnemyUnit => !!e);
  if (pref.length) return [pref[0]!];
  if (state.selectedEnemyId) {
    const sel = living.find((e) => e.id === state.selectedEnemyId);
    if (sel) return [sel];
  }
  return living[0] ? [living[0]] : [];
}

export function executeEffects(
  state: CombatState,
  def: CardDef,
  targetIds: string[],
  pushFx: (fx: CombatFx) => void,
  drawCards: (state: CombatState, n: number) => CombatCard[],
  card?: CombatCard | null,
  triggeredTempo = false,
): void {
  const effects = effectsForCard(def);
  const targets = resolveTargets(state, def, targetIds);
  const vulnerableBefore = targets === 'self'
    ? new Map<string, number>()
    : new Map(targets.map((enemy) => [enemy.id, enemy.vulnerableTurns]));
  const jinBefore = state.jin;
  const trainingBefore = state.training;
  let totalDamage = 0;
  let totalBlock = 0;
  let totalEnergy = 0;
  const impacts: PlayerImpact[] = [];
  const drawnCards: CombatCard[] = [];
  const statusFx: CombatFx[] = [];
  let deferredDraw = 0;
  let spentJinBonus = 0;
  state.beadsMadeLastAdd = 0;
  let sameHitBonus = 0;
  if (def.designId === 'M021') {
    const spent = Math.min(2, state.tens);
    state.tens -= spent;
    sameHitBonus += spent * 5;
  }
  if (def.designId === 'M022') {
    sameHitBonus += Math.min(10, 2 * Math.max(0, state.castsThisTurn - 1));
  }
  if (def.designId === 'M015' && state.compareExtraDamage > 0) {
    sameHitBonus += state.compareExtraDamage;
    state.compareExtraDamage = 0;
  }
  if (def.designId === 'B082' && targets !== 'self' && targets.some((enemy) => enemy.alive)) {
    const spent = Math.min(state.jin, 3);
    state.jin -= spent;
    spentJinBonus = spent * 3;
  }

  for (const eff of effects) {
    if (eff.kind === 'makeBasic') {
      const chosen = state.hand.find((entry) => entry.uid === card?.chosenHandUid);
      if (chosen && isEligibleHandChoice(def, chosen)) chosen.basicOverride = true;
    } else if (eff.kind === 'damage' && targets !== 'self') {
      const priorTempo = Math.max(0, state.tempoCount - (triggeredTempo ? 1 : 0));
      const repeatHits = def.designId === 'B071' ? Math.min(2, priorTempo) : 0;
      const hits = def.designId === 'B042'
        ? Math.min(6, countBasicAttacks(state))
        : def.designId === 'M025'
          ? Math.max(1, Math.min(5, state.tens))
          : (eff.hits ?? 1) + repeatHits;
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        let dealt = 0;
        for (let i = 0; i < hits; i += 1) {
          if (!enemy.alive) break;
          const isBasicHit = !!(def.basicAttack || card?.basicOverride);
          const basicBonus = isBasicHit ? state.training : 0;
          const attackBonus = state.nextAttackBonus;
          const tempoBonus = def.designId === 'B061' ? state.tempoCount : 0;
          const trainingEcho = def.designId === 'B123' && triggeredTempo ? state.training : 0;
          const jinBonus = def.designId === 'B082' ? spentJinBonus : 0;
          const fright = !state.stageFrightUsed
            && state.hand.some((held) => held.defId === 'cu_stage_fright')
            ? 2
            : 0;
          if (fright > 0) state.stageFrightUsed = true;
          const rawAmount = Math.max(
            0,
            eff.amount + basicBonus + attackBonus + tempoBonus + trainingEcho + jinBonus
              + (i === 0 ? sameHitBonus : 0) - fright,
          );
          dealt += dealAttackHit(state, enemy, rawAmount, impacts, i, isBasicHit);
        }
        totalDamage += dealt;
      }
    } else if (eff.kind === 'block') {
      state.block += eff.amount;
      totalBlock += eff.amount;
    } else if (eff.kind === 'draw') {
      // B032+ tutors a basic Attack before its extra draw, so a full hand keeps the tutor.
      if (def.designId === 'B032') deferredDraw += eff.amount;
      else {
        drawnCards.push(...drawCards(state, eff.amount));
        state.log.push(`${def.zhuyin} 成功！抽 ${eff.amount} 張`);
      }
    } else if (eff.kind === 'energy') {
      state.energy += eff.amount;
      totalEnergy += eff.amount;
    } else if (eff.kind === 'vulnerable' && targets !== 'self') {
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        gainVulnerable(enemy, eff.amount);
        statusFx.push({
          type: 'enemyStatus',
          enemyId: enemy.id,
          status: 'vulnerable',
          turns: enemy.vulnerableTurns,
        });
      }
    } else if (eff.kind === 'weak' && targets !== 'self') {
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        enemy.weakTurns = Math.min(9, enemy.weakTurns + eff.amount);
        statusFx.push({
          type: 'enemyStatus',
          enemyId: enemy.id,
          status: 'weak',
          turns: enemy.weakTurns,
        });
      }
    } else if (eff.kind === 'training') {
      state.training += eff.amount;
    } else if (eff.kind === 'jin') {
      gainJin(state, eff.amount);
    } else if (eff.kind === 'beads') {
      const preferred = targets !== 'self' && cardTargetType(def) !== 'allEnemies'
        ? targets[0]?.id
        : undefined;
      addBeads(state, eff.amount, preferred);
    } else if (eff.kind === 'tens') {
      state.tens = Math.min(TENS_CAP, state.tens + eff.amount);
    }
  }

  if (def.type === 'attack') state.nextAttackBonus = 0;
  if (def.basicAttack || card?.basicOverride) state.basicPlayedThisTurn += 1;
  const blockBeforeSpecial = state.block;
  const energyBeforeSpecial = state.energy;
  totalDamage += applySpecialCardEffect(
    state,
    def,
    targets,
    drawCards,
    drawnCards,
    impacts,
    triggeredTempo,
  );
  if (deferredDraw > 0) {
    const drawn = drawCards(state, deferredDraw);
    drawnCards.push(...drawn);
    if (drawn.length > 0) state.log.push(`${def.zhuyin} 成功！抽 ${drawn.length} 張`);
  }
  applyPowerTriggers(
    state,
    def,
    targets,
    vulnerableBefore,
    jinBefore,
    drawCards,
    impacts,
    triggeredTempo,
    card,
  );
  applyImmediateListeningHeart(state);
  totalBlock += Math.max(0, state.block - blockBeforeSpecial);
  totalEnergy += Math.max(0, state.energy - energyBeforeSpecial);

  if (impacts.length > 0) pushFx({ type: 'playerStrike', impacts });
  for (const fx of statusFx) pushFx(fx);
  if (state.training > trainingBefore) {
    pushFx({
      type: 'playerPower',
      power: 'training',
      amount: state.training - trainingBefore,
    });
  }
  if (state.jin !== jinBefore) {
    pushFx({
      type: 'playerResource',
      resource: 'jin',
      delta: state.jin - jinBefore,
      value: state.jin,
    });
  }
  if (totalBlock > 0) {
    pushFx({ type: 'playerBlock', amount: totalBlock });
  }
  if (totalEnergy > 0) pushFx({ type: 'playerEnergy', amount: totalEnergy });

  if (totalDamage > 0) {
    state.log.push(`${def.zhuyin} 成功！造成 ${totalDamage} 傷害`);
  }
  if (totalBlock > 0) {
    state.log.push(`${def.zhuyin} 成功！獲得 ${totalBlock} 護盾`);
  }
  if (totalEnergy > 0) {
    state.log.push(`${def.zhuyin} 成功！能量 +${totalEnergy}`);
  }
  if (state.training > trainingBefore) {
    state.log.push(`練功 +${state.training - trainingBefore}（共 ${state.training}）`);
  }
  if (state.jin < jinBefore) {
    state.log.push(`消耗 ${jinBefore - state.jin} 勁（剩 ${state.jin}）`);
  }

  if (livingEnemies(state).length === 0) {
    state.status = 'won';
    state.log.push('怪物都變成音符了！');
  }
}

function applySpecialCardEffect(
  state: CombatState,
  def: CardDef,
  targets: EnemyUnit[] | 'self',
  drawCards: (state: CombatState, n: number) => CombatCard[],
  drawnCards: CombatCard[],
  impacts: PlayerImpact[],
  tempo = false,
): number {
  const enemy = targets === 'self' ? null : targets[0] ?? null;
  const upgraded = 'upgraded' in def && def.upgraded === true;
  const spendJin = (amount: number) => {
    const spent = Math.min(state.jin, amount);
    state.jin -= spent;
    return spent;
  };
  const rider = (target: EnemyUnit, amount: number): number =>
    dealAttackHit(
      state,
      target,
      amount,
      impacts,
      nextHitIndex(impacts, target.id),
      def.basicAttack,
    );
  let riderHp = 0;
  switch (def.designId) {
    case 'B013':
      if (enemy && enemy.vulnerableTurns > 0) drawCards(state, 1);
      break;
    case 'B014':
      if (enemy && enemy.vulnerableTurns === 0) gainVulnerable(enemy, 1);
      break;
    case 'B016':
      if (enemy && enemy.vulnerableTurns > 0) riderHp += rider(enemy, 3);
      break;
    case 'B017':
      if (targets !== 'self') {
        for (const target of targets) {
          if (target.vulnerableTurns === 0) target.vulnerableTurns = 1;
        }
      }
      break;
    case 'B020':
      if (enemy && enemy.vulnerableTurns > 0) riderHp += rider(enemy, 7);
      break;
    case 'B021':
      if (enemy) {
        const duration = enemy.vulnerableTurns;
        enemy.vulnerableTurns = 0;
        dealDirect(enemy, duration * 2);
      }
      break;
    case 'B028':
      state.block += livingEnemies(state).filter((target) => target.vulnerableTurns > 0).length *
        2;
      break;
    case 'B031':
      state.training += upgraded ? 2 : 1;
      break;
    case 'B032': {
      const index = state.drawPile.findIndex((candidate) => {
        const candidateDef = getResolved(candidate);
        return candidateDef.basicAttack || candidate.basicOverride;
      });
      if (index >= 0 && state.hand.length < 10) {
        const [found] = state.drawPile.splice(index, 1);
        state.hand.push(found!);
      }
      break;
    }
    case 'B037': {
      const index = lastIndexWhere(state.discardPile, (candidate) => {
        const candidateDef = getResolved(candidate);
        return candidateDef.basicAttack || candidate.basicOverride;
      });
      if (index >= 0 && state.hand.length < 10) {
        const [found] = state.discardPile.splice(index, 1);
        found!.temporaryCostReduction = 99;
        state.hand.push(found!);
      }
      break;
    }
    case 'B038':
      if (state.basicPlayedThisTurn > 0) state.block += 2;
      break;
    case 'B051':
      if (tempo) state.block += 3;
      break;
    case 'B052':
      if (tempo && enemy) dealDirect(enemy, 3);
      break;
    case 'B053':
      if (tempo) state.energy += 1;
      break;
    case 'B055':
      if (tempo && enemy) gainVulnerable(enemy, 1);
      break;
    case 'B064':
      if (tempo) {
        const next = state.hand.find((candidate) => getResolved(candidate).type === 'attack');
        if (next) next.temporaryCostReduction += 1;
      }
      break;
    case 'B063':
      if (!tempo && state.hand.length > 0) {
        const discarded = state.hand.pop();
        if (discarded) state.discardPile.push(discarded);
      }
      break;
    case 'B076':
      state.drawIfJinPending += 1;
      break;
    case 'B077':
      spendJin(1);
      break;
    case 'B078':
      if (state.jin > 0) {
        spendJin(1);
        state.block += 4;
      }
      break;
    case 'B080':
      if (state.jin > 0 && enemy) {
        spendJin(1);
        gainVulnerable(enemy, 1);
      }
      break;
    case 'B084':
      spendJin(1);
      break;
    case 'B085':
      if (enemy && state.gainedJinLastEnemyPhase) riderHp += rider(enemy, 5);
      break;
    case 'B087':
      spendJin(1);
      state.nextAttackBonus += 8;
      break;
    case 'B089':
      if (state.jin > 0 && targets !== 'self') {
        spendJin(1);
        for (const target of targets) riderHp += rider(target, 3);
      }
      break;
    case 'B097':
      state.bonusJinNextEnemyPhase += 1;
      break;
    case 'B102':
      if (enemy && enemy.vulnerableTurns > 0) riderHp += rider(enemy, 2);
      break;
    case 'B107':
      state.freeBasicsRemaining += 1;
      break;
    case 'B049':
      state.freeBasicsRemaining += 2;
      break;
    case 'B108':
      if (tempo) drawCards(state, 1);
      break;
    case 'B113':
      if (tempo) state.training += 1;
      break;
    case 'B119': {
      if (!state.gainedJinLastEnemyPhase) break;
      const index = lastIndexWhere(state.discardPile, (candidate) => {
        const candidateDef = getResolved(candidate);
        return candidateDef.basicAttack || candidate.basicOverride;
      });
      if (index >= 0 && state.hand.length < 10) {
        const [found] = state.discardPile.splice(index, 1);
        found!.temporaryCostReduction = 99;
        state.hand.push(found!);
      }
      break;
    }
    case 'B120':
      if (state.jin > 0 && enemy) {
        spendJin(1);
        gainVulnerable(enemy, 2);
      }
      break;
    case 'B122':
      if (enemy) {
        const attacks = drawnCards
          .filter((candidate) => getResolved(candidate).type === 'attack').length;
        if (attacks === 1) gainVulnerable(enemy, 1);
      }
      break;
    case 'B124':
      if (enemy) {
        const removed = Math.min(enemy.vulnerableTurns, upgraded ? 3 : 2);
        enemy.vulnerableTurns -= removed;
        gainJin(state, removed);
      }
      break;
    case 'B128':
      state.flawlessTrainingPending += 1;
      break;
    case 'B144':
      if (enemy && enemy.vulnerableTurns > 0) state.block += 5;
      break;
    case 'B149':
      if (enemy && state.gainedJinLastEnemyPhase) riderHp += rider(enemy, 8);
      break;
    case 'M003':
      if (state.tens > 0 && enemy) {
        state.tens -= 1;
        riderHp += rider(enemy, 5);
      }
      break;
    case 'M004': {
      const room = Math.max(0, MAKE_TEN_SIZE - state.beads);
      const gain = Math.min(def.value > 0 ? def.value : BEAD_FILL_CAP, room);
      if (gain > 0) addBeads(state, gain);
      break;
    }
    case 'M010':
      if (state.castsThisTurn >= 3 && enemy) riderHp += rider(enemy, 4);
      break;
    case 'M013':
      if (state.beadsMadeLastAdd > 0 && enemy) riderHp += rider(enemy, 4);
      break;
    case 'M014':
      if (state.tens > 0) {
        state.tens -= 1;
        state.block += 6;
      }
      break;
    case 'M016':
      drawCards(state, state.castsThisTurn === 1 ? 2 : 1);
      break;
    case 'M020':
      if (state.tens >= 1) addBeads(state, 2);
      break;
    case 'M024': {
      const spent = Math.min(2, state.tens);
      state.tens -= spent;
      state.energy += spent;
      break;
    }
    case 'M026':
      if (state.tens > 0) {
        state.tens -= 1;
        state.block += 6;
      }
      break;
    case 'M027':
      if (state.castsThisTurn >= 2) state.block += 3;
      break;
    default:
      break;
  }
  return riderHp;
}

function getResolved(card: CombatCard): CardDef {
  return resolveCard(card.defId, card.upgradeLevel);
}

/**
 * Damage that is not an Attack and not 直傷.
 * Block absorbs it. 易傷, 練功, and attack relics do not.
 */
export function dealBlockedDamage(
  enemy: EnemyUnit,
  amount: number,
  impacts: PlayerImpact[],
  hitIndex: number,
): number {
  if (!enemy.alive || enemy.hp <= 0) return 0;
  const hitAmount = Math.max(0, amount);
  const blockBefore = enemy.block;
  const blocked = Math.min(blockBefore, hitAmount);
  enemy.block = Math.max(0, blockBefore - blocked);
  const hpDamage = Math.max(0, hitAmount - blocked);
  if (hpDamage > 0) enemy.hp = Math.max(0, enemy.hp - hpDamage);
  const killed = enemy.hp <= 0;
  if (killed) enemy.alive = false;
  impacts.push({
    enemyId: enemy.id,
    hitIndex,
    blockBefore,
    blocked,
    blockAfter: enemy.block,
    hpDamage,
    killed,
  });
  return hpDamage;
}

/** 直傷: HP only. Enemy Block stays. Use this only when the text says 直傷. */
export function dealTrueDamage(enemy: EnemyUnit, amount: number): number {
  if (!enemy.alive || enemy.hp <= 0) return 0;
  const hpDamage = Math.min(enemy.hp, Math.max(0, amount));
  enemy.hp -= hpDamage;
  if (enemy.hp === 0) enemy.alive = false;
  return hpDamage;
}

function dealDirect(enemy: EnemyUnit, amount: number): void {
  dealTrueDamage(enemy, amount);
}

function makeTenEnemy(state: CombatState, preferredId?: string): EnemyUnit | null {
  const living = livingEnemies(state);
  if (preferredId) {
    const preferred = living.find((enemy) => enemy.id === preferredId);
    if (preferred) return preferred;
  }
  if (state.selectedEnemyId) {
    const selected = living.find((enemy) => enemy.id === state.selectedEnemyId);
    if (selected) return selected;
  }
  return living[0] ?? null;
}

function fireMakeTen(state: CombatState, preferredId?: string): void {
  if (state.tens < TENS_CAP) state.tens += 1;
  state.makeTenCount += 1;
  state.makeTenThisTurn += 1;
  const target = makeTenEnemy(state, preferredId);
  if (target && state.makeTenDirectDamage > 0) {
    const dealt = dealTrueDamage(target, state.makeTenDirectDamage);
    if (dealt > 0) state.log.push(`小星盤：直傷 ${dealt}`);
  }
  if (state.tenBellReady && state.tenBellEnergy > 0) {
    state.tenBellReady = false;
    state.energy += state.tenBellEnergy;
    state.log.push(`十響鈴：能量 +${state.tenBellEnergy}`);
  }
  for (const powerId of state.activePowerIds) {
    if (powerId === 'M018') {
      const block = state.activePowerLevels.M018 === 1 ? BEAD_ARRAY_BLOCK_PLUS : BEAD_ARRAY_BLOCK;
      state.block += block;
      state.log.push(`星座陣：護盾 +${block}`);
    } else if (powerId === 'M023') {
      const amount = state.activePowerLevels.M023 === 1 ? BEAD_BURST_DAMAGE_PLUS : BEAD_BURST_DAMAGE;
      for (const enemy of livingEnemies(state)) {
        const dealt = dealTrueDamage(enemy, amount);
        if (dealt > 0) state.log.push(`流星雨：直傷 ${dealt}`);
      }
    }
  }
}

/** Add beads and fire every 湊十. No-op unless this combat uses the bead rules. */
export function addBeads(state: CombatState, amount: number, preferredEnemyId?: string): number {
  if (state.rules?.beadsEnabled !== true || amount <= 0) {
    state.beadsMadeLastAdd = 0;
    return 0;
  }
  let fired = 0;
  state.beads += amount;
  while (state.beads >= MAKE_TEN_SIZE) {
    state.beads -= MAKE_TEN_SIZE;
    fireMakeTen(state, preferredEnemyId);
    fired += 1;
  }
  state.beadsMadeLastAdd = fired;
  if (fired > 0) state.log.push(`湊十 ×${fired}（星星 ${state.beads}，星座 ${state.tens}）`);
  return fired;
}

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index]!)) return index;
  }
  return -1;
}

function applyPowerTriggers(
  state: CombatState,
  def: CardDef,
  targets: EnemyUnit[] | 'self',
  vulnerableBefore: Map<string, number>,
  jinBefore: number,
  drawCards: (state: CombatState, n: number) => CombatCard[],
  impacts: PlayerImpact[],
  tempo: boolean,
  card?: CombatCard | null,
): void {
  const has = (id: string) => state.activePowerIds.includes(id);
  const upgradedPower = (id: string) => state.activePowerLevels[id] === 1;
  const triggers = (id: string) => state.powerTriggersThisTurn[id] ?? 0;
  const trigger = (id: string) => {
    state.powerTriggersThisTurn[id] = triggers(id) + 1;
  };
  const enemies = targets === 'self' ? [] : targets;
  const appliedVulnerable = enemies.some(
    (enemy) => enemy.vulnerableTurns > (vulnerableBefore.get(enemy.id) ?? 0),
  );
  const attackedVulnerable =
    def.type === 'attack' &&
    enemies.some((enemy) => (vulnerableBefore.get(enemy.id) ?? 0) > 0);
  const basic = !!(def.basicAttack || card?.basicOverride);

  if (appliedVulnerable && has('B024') && triggers('B024') === 0) {
    drawCards(state, upgradedPower('B024') ? 2 : 1);
    trigger('B024');
  }
  if (attackedVulnerable && has('B030') && triggers('B030') === 0) {
    state.energy += 1;
    trigger('B030');
  }
  if (basic && has('B040')) {
    state.basicTrainingCounter += 1;
    if (state.basicTrainingCounter >= 3) {
      state.basicTrainingCounter = 0;
      state.training += upgradedPower('B040') ? 2 : 1;
    }
  }
  if (basic && has('B114')) {
    for (const enemy of enemies) {
      if ((vulnerableBefore.get(enemy.id) ?? 0) <= 0) continue;
      gainVulnerable(enemy, 1);
    }
  }
  if (basic && has('B127') && state.basicPlayedThisTurn === 2) {
    const originalImpacts = [...impacts];
    for (const original of originalImpacts) {
      const enemy = state.enemies.find((candidate) => candidate.id === original.enemyId);
      if (!enemy?.alive) continue;
      const amount = original.blocked + original.hpDamage;
      const blockBefore = enemy.block;
      const blocked = Math.min(blockBefore, amount);
      enemy.block = Math.max(0, blockBefore - blocked);
      const hpDamage = Math.max(0, amount - blocked);
      enemy.hp = Math.max(0, enemy.hp - hpDamage);
      const killed = enemy.hp <= 0;
      if (killed) enemy.alive = false;
      impacts.push({
        enemyId: enemy.id,
        hitIndex: original.hitIndex,
        blockBefore,
        blocked,
        blockAfter: enemy.block,
        hpDamage,
        killed,
      });
    }
    drawCards(state, upgradedPower('B127') ? 2 : 1);
  }
  if (tempo && basic && has('B115') && triggers('B115') === 0) {
    const index = lastIndexWhere(
      state.discardPile,
      (candidate) => getResolved(candidate).type === 'skill',
    );
    if (index >= 0) {
      const [skill] = state.discardPile.splice(index, 1);
      state.drawPile.push(skill!);
    }
    trigger('B115');
  }
  if (tempo && has('B059') && triggers('B059') === 0) {
    drawCards(state, upgradedPower('B059') ? 2 : 1);
    trigger('B059');
  }
  if (tempo && has('B060') && state.tempoCount === 2 && triggers('B060') === 0) {
    state.energy += 1;
    state.block += 3;
    trigger('B060');
  }
  if (tempo && has('B070') && triggers('B070') < 3) {
    for (const enemy of livingEnemies(state)) dealDirect(enemy, 2);
    state.block += 2;
    trigger('B070');
  }
  const cardSpentJin = state.jin < jinBefore;
  if (tempo && has('B131')) {
    if (state.tempoCount === 1) state.training += upgradedPower('B131') ? 2 : 1;
    if (state.tempoCount === 2) gainJin(state, 1);
  }
  if (cardSpentJin && has('B093')) {
    state.block += 2;
    drawCards(state, upgradedPower('B093') ? 2 : 1);
  }
}

export function cardNeedsEnemyTarget(def: CardDef): boolean {
  const t = cardTargetType(def);
  return t === 'singleEnemy' || t === 'allEnemies';
}
