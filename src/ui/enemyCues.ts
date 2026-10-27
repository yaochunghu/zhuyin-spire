/**
 * Pure helpers for enemy mechanic cues: boss brace, summon, and strength.
 * combatView turns these into pill chips and small portrait badges.
 */

import type { IntentStep } from '../data/enemies';

/** Doubles as a CSS suffix: `intent-cue-${cue}`. */
export type IntentCue = 'brace' | 'summon' | 'buff-allies' | 'buff-self';

export interface IntentCueContext {
  /** The step is the boss phase-enter guard. */
  phaseEnter: boolean;
  /** The unit still has its one summon and the row has room. */
  canSummon: boolean;
  /** Another living enemy can still gain strength. */
  hasBuffableAlly: boolean;
  /** This unit can still gain strength. */
  canGrowSelf: boolean;
}

const CUE_ICON: Record<IntentCue, string> = {
  brace: '✨',
  summon: '📣',
  'buff-allies': '💪',
  'buff-self': '💪',
};

const CUE_TITLE: Record<IntentCue, string> = {
  brace: '下回合會變硬：先打多一點',
  summon: '叫朋友來',
  'buff-allies': '幫朋友加力量',
  'buff-self': '自己加力量',
};

/** Cues for one intent step, most important first. Empty for a plain intent. */
export function intentCues(step: IntentStep, ctx: IntentCueContext): IntentCue[] {
  const cues: IntentCue[] = [];
  if (ctx.phaseEnter) cues.push('brace');
  if (step.summon && ctx.canSummon) cues.push('summon');
  if ((step.grantStrength ?? 0) > 0 && ctx.hasBuffableAlly) cues.push('buff-allies');
  if ((step.grantSelfStrength ?? 0) > 0 && ctx.canGrowSelf) cues.push('buff-self');
  return cues;
}

export function intentCueIcon(cue: IntentCue): string {
  return CUE_ICON[cue];
}

/** Adult tooltip text for a set of cues, e.g. "叫朋友來 · 自己加力量". */
export function intentCueTitle(cues: readonly IntentCue[]): string {
  return cues.map((cue) => CUE_TITLE[cue]).join(' · ');
}

export function strengthBadge(strength: number): { label: string; title: string } | null {
  if (strength <= 0) return null;
  return { label: `💪+${strength}`, title: `力量 +${strength}：每次攻擊多 ${strength}` };
}

/**
 * Remembers which enemies a fight started with, so a friend called in during
 * the enemy phase can be greeted as 新來的 on the player turn that follows.
 */
export interface ArrivalLog {
  seen: Set<string>;
  arrivedTurn: Map<string, number>;
  greeted: Set<string>;
}

/** Record enemy ids for this render. The first call seeds the starting row. */
export function noteArrivals(log: ArrivalLog | undefined, ids: readonly string[], turn: number): ArrivalLog {
  if (!log) {
    return { seen: new Set(ids), arrivedTurn: new Map(), greeted: new Set() };
  }
  for (const id of ids) {
    if (log.seen.has(id)) continue;
    log.seen.add(id);
    log.arrivedTurn.set(id, turn);
  }
  return log;
}

export function isNewArrival(log: ArrivalLog, id: string, turn: number): boolean {
  return log.arrivedTurn.get(id) === turn;
}

/** True only the first time it is asked for a new arrival, so the entrance plays once. */
export function takeEntrance(log: ArrivalLog, id: string, turn: number): boolean {
  if (!isNewArrival(log, id, turn) || log.greeted.has(id)) return false;
  log.greeted.add(id);
  return true;
}
