/**
 * Modular card effects — composed like Lego bricks.
 * Every live card supplies an ordered effects[] list.
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

/** Ordered card effects are authored once and shared by rules and previews. */
export function effectsForCard(def: CardDef): EffectDef[] {
  return def.effects;
}

export interface DamagePreview {
  base: number;
  basicAttackBonus: number;
  relicBonus: number;
  beforeVulnerable: number;
  effective: number;
  /** Subsequent hits/targets after a once-per-turn relic has been consumed. */
  laterEffective: number;
  vulnerable: boolean;
  hits: number;
}

/** Preview one Attack hit using the same modifier ordering as resolution. */
export function previewCardDamage(
  state: CombatState,
  def: CardDef,
  enemy?: EnemyUnit | null,
): DamagePreview | null {
  const effect = def.effects.find((candidate) => candidate.kind === 'damage');
  if (!effect || effect.kind !== 'damage') return null;
  const isAttackHit = def.type === 'attack' && effect.damageType !== 'direct';
  const basicAttackBonus = isAttackHit && def.tags.includes('basicAttack')
    ? state.basicAttackBonusDamage
    : 0;
  const relicBonus = isAttackHit && state.firstAttackBonusReady
    ? state.firstAttackBonusDamage
    : 0;
  const beforeVulnerable = effect.amount + basicAttackBonus + relicBonus;
  const laterBeforeVulnerable = effect.amount + basicAttackBonus;
  const vulnerable = isAttackHit && (enemy?.vulnerableTurns ?? 0) > 0;
  return {
    base: effect.amount,
    basicAttackBonus,
    relicBonus,
    beforeVulnerable,
    effective: vulnerable ? Math.floor(beforeVulnerable * 1.5) : beforeVulnerable,
    laterEffective: vulnerable
      ? Math.floor(laterBeforeVulnerable * 1.5)
      : laterBeforeVulnerable,
    vulnerable,
    hits: effect.hits ?? 1,
  };
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
          const isAttackHit = def.type === 'attack' && eff.damageType !== 'direct';
          const basicAttackBonus = isAttackHit && def.tags.includes('basicAttack')
            ? state.basicAttackBonusDamage
            : 0;
          const relicBonus = isAttackHit && state.firstAttackBonusReady
            ? state.firstAttackBonusDamage
            : 0;
          if (isAttackHit && state.firstAttackBonusReady) {
            state.firstAttackBonusReady = false;
          }
          const beforeVulnerable = eff.amount + basicAttackBonus + relicBonus;
          const vulnerableApplied = isAttackHit && enemy.vulnerableTurns > 0;
          const hitAmount = vulnerableApplied
            ? Math.floor(beforeVulnerable * 1.5)
            : beforeVulnerable;
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
            baseDamage: eff.amount,
            ...(basicAttackBonus > 0 ? { basicAttackBonus } : {}),
            ...(relicBonus > 0 ? { relicBonus } : {}),
            ...(vulnerableApplied ? { vulnerableApplied: true } : {}),
            finalDamage: hitAmount,
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
    } else if (eff.kind === 'applyVulnerable' && targets !== 'self') {
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
    } else if (eff.kind === 'addBasicAttackDamage') {
      state.basicAttackBonusDamage += eff.amount;
      pushFx({ type: 'playerPower', power: 'basicAttackDamage', amount: eff.amount });
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
  if (effects.some((effect) => effect.kind === 'addBasicAttackDamage')) {
    state.log.push(`聲波架式：基礎攻擊 +${state.basicAttackBonusDamage}`);
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
