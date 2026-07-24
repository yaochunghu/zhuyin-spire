/**
 * Modular card effects — composed like Lego bricks.
 * Legacy cards without effects[] are derived from type/value.
 */

import { resolveCard, type CardDef, type CardType, type EffectDef, type TargetType } from '../../data/cards';
import type {
  CombatCard,
  CombatFx,
  CombatState,
  EnemyUnit,
  PlayerImpact,
} from './types';

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
  const statusFx: CombatFx[] = [];

  for (const eff of effects) {
    if (eff.kind === 'damage' && targets !== 'self') {
      const hits = eff.hits ?? 1;
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        let dealt = 0;
        for (let i = 0; i < hits; i += 1) {
          if (!enemy.alive) break;
          const echoBonus =
            enemy.echoTurns > 0 && !enemy.echoTriggeredThisTurn ? 2 : 0;
          if (echoBonus > 0) {
            enemy.echoTriggeredThisTurn = true;
            if (state.echoGuardAmount > 0) {
              state.block += state.echoGuardAmount;
              totalBlock += state.echoGuardAmount;
            }
          }
          const relicBonus = state.firstAttackBonusReady
            ? state.firstAttackBonusDamage
            : 0;
          if (state.firstAttackBonusReady) state.firstAttackBonusReady = false;
          const basicBonus = (def.basicAttack || card?.basicOverride) ? state.training : 0;
          const attackBonus = state.nextAttackBonus;
          const rawAmount = eff.amount + basicBonus + attackBonus + echoBonus + relicBonus;
          const hitAmount = Math.floor(rawAmount * (enemy.vulnerableTurns > 0 ? 1.5 : 1));
          const blockBefore = enemy.block;
          const blocked = Math.min(blockBefore, hitAmount);
          enemy.block = Math.max(0, blockBefore - blocked);
          const hpDamage = Math.max(0, hitAmount - blocked);
          if (hpDamage > 0) {
            enemy.hp = Math.max(0, enemy.hp - hpDamage);
            dealt += hpDamage;
          }
          const killed = enemy.hp <= 0;
          if (killed) enemy.alive = false;
          impacts.push({
            enemyId: enemy.id,
            hitIndex: i,
            blockBefore,
            blocked,
            blockAfter: enemy.block,
            hpDamage,
            killed,
            ...(echoBonus > 0 ? { echoBonus } : {}),
            ...(relicBonus > 0 ? { relicBonus } : {}),
          });
        }
        totalDamage += dealt;
      }
    } else if (eff.kind === 'block') {
      state.block += eff.amount;
      totalBlock += eff.amount;
    } else if (eff.kind === 'draw') {
      drawCards(state, eff.amount);
      state.log.push(`${def.zhuyin} 成功！抽 ${eff.amount} 張`);
    } else if (eff.kind === 'energy') {
      state.energy += eff.amount;
      totalEnergy += eff.amount;
    } else if (eff.kind === 'echo' && targets !== 'self') {
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        enemy.echoTurns = Math.max(enemy.echoTurns, eff.amount);
        statusFx.push({
          type: 'enemyStatus',
          enemyId: enemy.id,
          status: 'echo',
          turns: enemy.echoTurns,
        });
      }
    } else if (eff.kind === 'echoGuard') {
      state.echoGuardAmount += eff.amount;
      pushFx({ type: 'playerPower', power: 'echoGuard', amount: eff.amount });
    } else if (eff.kind === 'vulnerable' && targets !== 'self') {
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        enemy.vulnerableTurns = Math.min(9, enemy.vulnerableTurns + eff.amount);
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
      state.jin = Math.max(0, Math.min(9, state.jin + eff.amount));
    }
  }

  if (def.type === 'attack') state.nextAttackBonus = 0;
  if (def.basicAttack || card?.basicOverride) state.basicPlayedThisTurn += 1;
  const blockBeforeSpecial = state.block;
  const energyBeforeSpecial = state.energy;
  applySpecialCardEffect(state, def, targets, drawCards, card, triggeredTempo);
  applyPowerTriggers(
    state,
    def,
    targets,
    effects,
    vulnerableBefore,
    jinBefore,
    drawCards,
    triggeredTempo,
    card,
  );
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
  if (effects.some((effect) => effect.kind === 'echoGuard')) {
    state.log.push(`共鳴護唱：回音時護盾 +${state.echoGuardAmount}`);
  }

  if (livingEnemies(state).length === 0) {
    state.status = 'won';
    state.log.push('敵人全部倒下了！');
  }
}

function applySpecialCardEffect(
  state: CombatState,
  def: CardDef,
  targets: EnemyUnit[] | 'self',
  drawCards: (state: CombatState, n: number) => CombatCard[],
  card?: CombatCard | null,
  tempo = false,
): void {
  const enemy = targets === 'self' ? null : targets[0] ?? null;
  const upgraded = 'upgraded' in def && def.upgraded === true;
  const spendJin = (amount: number) => {
    const spent = Math.min(state.jin, amount);
    state.jin -= spent;
    return spent;
  };
  switch (def.designId) {
    case 'B013':
      if (enemy && enemy.vulnerableTurns > 0) drawCards(state, 1);
      break;
    case 'B014':
      if (enemy && enemy.vulnerableTurns === 0) enemy.vulnerableTurns += 1;
      break;
    case 'B016':
      if (enemy && enemy.vulnerableTurns > 0) dealDirect(enemy, upgraded ? 5 : 3);
      break;
    case 'B017':
      if (targets !== 'self') {
        for (const target of targets) {
          if (target.vulnerableTurns === 0) target.vulnerableTurns = 1;
        }
      }
      break;
    case 'B020':
      if (enemy && enemy.vulnerableTurns > 0) dealDirect(enemy, upgraded ? 9 : 7);
      break;
    case 'B021':
      if (enemy) {
        const duration = enemy.vulnerableTurns;
        enemy.vulnerableTurns = 0;
        dealDirect(enemy, duration * (upgraded ? 3 : 2));
      }
      break;
    case 'B028':
      state.block += livingEnemies(state).filter((target) => target.vulnerableTurns > 0).length *
        (upgraded ? 3 : 2);
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
      if (state.basicPlayedThisTurn > 0) state.block += upgraded ? 3 : 2;
      break;
    case 'B041': {
      const attack = state.hand.find((candidate) => getResolved(candidate).type === 'attack');
      if (attack) attack.basicOverride = true;
      break;
    }
    case 'B042': {
      if (!enemy) break;
      const basicCount = [...state.drawPile, ...state.hand, ...state.discardPile]
        .filter((candidate) => {
          const candidateDef = getResolved(candidate);
          return candidateDef.basicAttack || candidate.basicOverride;
        }).length;
      const extraHits = Math.max(0, Math.min(6, basicCount) - 1);
      dealDirect(enemy, extraHits * (upgraded ? 4 : 2));
      break;
    }
    case 'B051':
      if (tempo) state.block += upgraded ? 5 : 3;
      break;
    case 'B052':
      if (tempo && enemy) dealDirect(enemy, upgraded ? 5 : 3);
      break;
    case 'B053':
      if (tempo) state.energy += 1;
      break;
    case 'B055':
      if (tempo && enemy) enemy.vulnerableTurns += upgraded ? 2 : 1;
      break;
    case 'B061':
      if (enemy && state.tempoCount > 0) {
        dealDirect(enemy, state.tempoCount * 3);
      }
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
    case 'B071':
      if (enemy) {
        const repeats = Math.min(2, Math.max(0, state.tempoCount - (tempo ? 1 : 0)));
        dealDirect(enemy, repeats * (upgraded ? 10 : 8));
      }
      break;
    case 'B076':
      state.drawIfJinPending = true;
      break;
    case 'B077':
      spendJin(1);
      break;
    case 'B078':
      if (state.jin > 0) {
        spendJin(1);
        state.block += upgraded ? 6 : 4;
      }
      break;
    case 'B080':
      if (state.jin > 0 && enemy) {
        spendJin(1);
        enemy.vulnerableTurns += upgraded ? 2 : 1;
      }
      break;
    case 'B082': {
      const spent = spendJin(3);
      if (spent > 0 && enemy) dealDirect(enemy, spent * (upgraded ? 4 : 3));
      break;
    }
    case 'B084':
      spendJin(1);
      break;
    case 'B085':
      if (enemy && state.gainedJinLastEnemyPhase) dealDirect(enemy, upgraded ? 7 : 5);
      break;
    case 'B087':
      spendJin(1);
      state.nextAttackBonus += 8;
      break;
    case 'B089':
      if (state.jin > 0 && targets !== 'self') {
        spendJin(1);
        for (const target of targets) dealDirect(target, upgraded ? 5 : 3);
      }
      break;
    case 'B097':
      state.bonusJinNextEnemyPhase = Math.max(state.bonusJinNextEnemyPhase, 1);
      break;
    case 'B102':
      if (enemy && enemy.vulnerableTurns > 0) dealDirect(enemy, upgraded ? 3 : 2);
      break;
    case 'B107':
      if (enemy) enemy.vulnerableTurns += upgraded ? 2 : 1;
      {
        const next = state.hand.find((candidate) => {
          const nextDef = getResolved(candidate);
          return nextDef.basicAttack || candidate.basicOverride;
        });
        if (next) next.temporaryCostReduction = 99;
      }
      break;
    case 'B049':
      state.freeBasicsRemaining = Math.max(state.freeBasicsRemaining, upgraded ? 3 : 2);
      break;
    case 'B108':
      if (tempo) drawCards(state, upgraded ? 2 : 1);
      break;
    case 'B113':
      if (tempo) state.training += upgraded ? 2 : 1;
      break;
    case 'B115':
      if (tempo && (def.basicAttack || card?.basicOverride)) {
        const index = lastIndexWhere(
          state.discardPile,
          (candidate) => getResolved(candidate).type === 'skill',
        );
        if (index >= 0) {
          const [skill] = state.discardPile.splice(index, 1);
          state.drawPile.push(skill!);
        }
      }
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
        enemy.vulnerableTurns += upgraded ? 3 : 2;
      }
      break;
    case 'B122':
      if (enemy) {
        const attacks = state.hand.slice(-2)
          .filter((candidate) => getResolved(candidate).type === 'attack').length;
        if (attacks === 1) enemy.vulnerableTurns += upgraded ? 2 : 1;
      }
      break;
    case 'B123':
      if (tempo && enemy) dealDirect(enemy, state.training * 2);
      break;
    case 'B124':
      if (enemy) {
        const removed = Math.min(enemy.vulnerableTurns, upgraded ? 3 : 2);
        enemy.vulnerableTurns -= removed;
        state.jin = Math.min(9, state.jin + removed);
      }
      break;
    case 'B128':
      state.flawlessTrainingPending = true;
      break;
    case 'B144':
      if (enemy && enemy.vulnerableTurns > 0) state.block += upgraded ? 7 : 5;
      break;
    case 'B149':
      if (enemy && state.gainedJinLastEnemyPhase) dealDirect(enemy, upgraded ? 10 : 8);
      break;
    default:
      break;
  }
}

function getResolved(card: CombatCard): CardDef {
  return resolveCard(card.defId, card.upgradeLevel);
}

function dealDirect(enemy: EnemyUnit, amount: number): void {
  enemy.hp = Math.max(0, enemy.hp - Math.max(0, amount));
  if (enemy.hp === 0) enemy.alive = false;
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
  effects: EffectDef[],
  vulnerableBefore: Map<string, number>,
  jinBefore: number,
  drawCards: (state: CombatState, n: number) => CombatCard[],
  tempo: boolean,
  card?: CombatCard | null,
): void {
  const has = (id: string) => state.activePowerIds.includes(id);
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
    drawCards(state, 1);
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
      state.training += 1;
    }
  }
  if (basic && attackedVulnerable && has('B114')) {
    for (const enemy of enemies) enemy.vulnerableTurns = Math.min(9, enemy.vulnerableTurns + 1);
  }
  if (basic && has('B127') && state.basicPlayedThisTurn === 2) {
    const damage = effects.find((effect) => effect.kind === 'damage');
    if (damage) {
      for (const enemy of enemies) dealDirect(enemy, damage.amount * (damage.hits ?? 1));
      drawCards(state, 1);
    }
  }
  if (tempo && has('B059') && triggers('B059') === 0) {
    drawCards(state, 1);
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
  if (tempo && has('B131')) {
    if (state.tempoCount === 1) state.training += 1;
    if (state.tempoCount === 2) state.jin = Math.min(9, state.jin + 1);
  }
  if (state.jin < jinBefore && has('B093')) {
    state.block += 2;
    drawCards(state, 1);
  }
}

export function cardNeedsEnemyTarget(def: CardDef): boolean {
  const t = cardTargetType(def);
  return t === 'singleEnemy' || t === 'allEnemies';
}
