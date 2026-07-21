/**
 * Modular card effects — composed like Lego bricks.
 * Legacy cards without effects[] are derived from type/value.
 */

import type { CardDef, CardType, EffectDef, TargetType } from '../../data/cards';
import type { CombatCard, CombatFx, CombatState, EnemyUnit } from './types';

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
  let totalHits = 0;
  let totalBlock = 0;
  const hitTargetIds: string[] = [];

  for (const eff of effects) {
    if (eff.kind === 'damage' && targets !== 'self') {
      const hits = eff.hits ?? 1;
      for (const enemy of targets) {
        if (!enemy.alive) continue;
        let dealt = 0;
        for (let i = 0; i < hits; i += 1) {
          // Block absorbs full hit amount if any block remains
          if (enemy.block > 0) {
            const absorb = Math.min(enemy.block, eff.amount);
            enemy.block -= absorb;
            const rest = eff.amount - absorb;
            if (rest > 0) {
              enemy.hp = Math.max(0, enemy.hp - rest);
              dealt += rest;
            }
          } else {
            enemy.hp = Math.max(0, enemy.hp - eff.amount);
            dealt += eff.amount;
          }
        }
        totalDamage += dealt;
        totalHits += hits;
        if (!hitTargetIds.includes(enemy.id)) hitTargetIds.push(enemy.id);
        if (enemy.hp <= 0) enemy.alive = false;
      }
    } else if (eff.kind === 'block') {
      state.block += eff.amount;
      totalBlock += eff.amount;
    } else if (eff.kind === 'draw') {
      drawCards(state, eff.amount);
      state.log.push(`${def.zhuyin} 成功！抽 ${eff.amount} 張`);
    }
  }

  if (totalDamage > 0 || hitTargetIds.some((id) => {
    const e = state.enemies.find((x) => x.id === id);
    return e && !e.alive;
  })) {
    pushFx({
      type: 'playerStrike',
      damage: Math.max(totalDamage, totalHits > 0 ? 1 : 0),
      hits: Math.max(totalHits, 1),
      killed: livingEnemies(state).length === 0,
      targetIds: hitTargetIds,
    });
  }
  if (totalBlock > 0) {
    pushFx({ type: 'playerBlock', amount: totalBlock });
  }

  if (totalDamage > 0) {
    state.log.push(`${def.zhuyin} 成功！造成 ${totalDamage} 傷害`);
  }
  if (totalBlock > 0) {
    state.log.push(`${def.zhuyin} 成功！獲得 ${totalBlock} 護盾`);
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
