/**
 * Drink a potion inside a fight.
 * Card casts are untouched: no Energy, no 注音, no Attack bonuses.
 */

import { MAX_HAND_SIZE } from '../../data/balance';
import { potionNeedsEnemy, type PotionDef } from '../../data/potions';
import { dealBlockedDamage, dealTrueDamage, livingEnemies } from './effects';
import { pushFx } from './fx';
import { drawCards } from './piles';
import type { CombatState, PlayerImpact } from './types';

export type PotionApplyReason = 'phase' | 'full-hp' | 'no-draw' | 'target';

export interface PotionApplyResult {
  ok: boolean;
  reason?: PotionApplyReason;
  endedFight: boolean;
}

function playerCanAct(combat: CombatState): boolean {
  return combat.status === 'playing' &&
    (combat.phase === 'playerAction' || combat.phase === 'playerStart');
}

export function healedAmount(current: number, max: number, amount: number): number {
  if (amount <= 0 || current >= max) return 0;
  return Math.min(amount, max - current);
}

function canDrawAny(combat: CombatState): boolean {
  return combat.hand.length < MAX_HAND_SIZE &&
    (combat.drawPile.length > 0 || combat.discardPile.length > 0);
}

export function combatPotionBlock(
  combat: CombatState,
  potion: PotionDef,
  targetId?: string | null,
): PotionApplyReason | null {
  if (!playerCanAct(combat)) return 'phase';
  if (potion.heal && healedAmount(combat.heroHp, combat.heroMaxHp, potion.heal) <= 0 &&
      !potion.block && !potion.energy && !potion.draw && !potion.damage && !potion.trueDamage) {
    return 'full-hp';
  }
  if (potion.draw && !canDrawAny(combat)) return 'no-draw';
  if (potion.damage || potion.trueDamage) {
    const living = livingEnemies(combat);
    if (living.length === 0) return 'target';
    if (potionNeedsEnemy(potion)) {
      if (!targetId || !living.some((enemy) => enemy.id === targetId)) return 'target';
    }
  }
  return null;
}

function damageTargets(combat: CombatState, potion: PotionDef, targetId?: string | null) {
  const living = livingEnemies(combat);
  if (potion.damageAll) return living;
  return living.filter((enemy) => enemy.id === targetId);
}

/**
 * Resolves one bottle. Callers remove it from the belt only when `ok`.
 * `trueDamage` is the 直傷 path. The live pool leaves it unset.
 */
export function applyCombatPotion(
  combat: CombatState,
  potion: PotionDef,
  targetId?: string | null,
): PotionApplyResult {
  const reason = combatPotionBlock(combat, potion, targetId);
  if (reason) return { ok: false, reason, endedFight: false };

  const impacts: PlayerImpact[] = [];
  if (potion.trueDamage || potion.damage) {
    const targets = damageTargets(combat, potion, targetId);
    targets.forEach((enemy, index) => {
      if (potion.trueDamage) {
        const blockBefore = enemy.block;
        const hpDamage = dealTrueDamage(enemy, potion.trueDamage);
        impacts.push({
          enemyId: enemy.id,
          hitIndex: index,
          blockBefore,
          blocked: 0,
          blockAfter: enemy.block,
          hpDamage,
          killed: enemy.hp <= 0,
        });
      } else if (potion.damage) {
        dealBlockedDamage(enemy, potion.damage, impacts, index);
      }
    });
    if (impacts.length > 0) pushFx(combat, { type: 'playerStrike', impacts });
    const dealt = impacts.reduce((sum, impact) => sum + impact.hpDamage, 0);
    combat.log.push(`${potion.name}：造成 ${dealt} 傷害`);
  }

  if (livingEnemies(combat).length === 0) {
    combat.status = 'won';
    combat.log.push('敵人全部倒下了！');
    return { ok: true, endedFight: true };
  }

  if (potion.block) {
    combat.block += potion.block;
    pushFx(combat, { type: 'playerBlock', amount: potion.block });
    combat.log.push(`${potion.name}：護盾 +${potion.block}`);
  }
  if (potion.energy) {
    combat.energy += potion.energy;
    pushFx(combat, { type: 'playerEnergy', amount: potion.energy });
    combat.log.push(`${potion.name}：能量 +${potion.energy}`);
  }
  if (potion.draw) {
    const drawn = drawCards(combat, potion.draw);
    combat.log.push(`${potion.name}：抽 ${drawn.length} 張`);
  }
  if (potion.heal) {
    const gained = healedAmount(combat.heroHp, combat.heroMaxHp, potion.heal);
    if (gained > 0) {
      combat.heroHp += gained;
      combat.log.push(`${potion.name}：生命 +${gained}`);
    }
  }
  return { ok: true, endedFight: false };
}
