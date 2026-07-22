/**
 * Modular card effects — composed like Lego bricks.
 * Legacy cards without effects[] are derived from type/value.
 */

import type { CardDef, CardType, EffectDef, TargetType } from '../../data/cards';
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
): void {
  const effects = effectsForCard(def);
  const targets = resolveTargets(state, def, targetIds);
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
          const hitAmount = eff.amount + echoBonus + relicBonus;
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
    }
  }

  if (impacts.length > 0) pushFx({ type: 'playerStrike', impacts });
  for (const fx of statusFx) pushFx(fx);
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
  if (effects.some((effect) => effect.kind === 'echoGuard')) {
    state.log.push(`共鳴護唱：回音時護盾 +${state.echoGuardAmount}`);
  }

  if (livingEnemies(state).length === 0) {
    state.status = 'won';
    state.log.push('敵人全部倒下了！');
  }
}

export function cardNeedsEnemyTarget(def: CardDef): boolean {
  const t = cardTargetType(def);
  return t === 'singleEnemy' || t === 'allEnemies';
}
