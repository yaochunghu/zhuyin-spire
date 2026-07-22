/**
 * Debug mutations on RunState — no DOM.
 */

import { ENCOUNTERS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { drawCards, livingEnemies } from '../game/combat';
import {
  createNewRun,
  debugFinishFight,
  debugStartEncounter,
  enterPractice,
  getAvailableMapNodes,
  playerEndTurn,
  pickCharacter,
  selectMapNode,
  startRun,
  type RunState,
} from '../game/state';
import { resetTutorialCompletion, updateGameSettings } from '../game/settings';
import type { CastMode } from '../game/casting/types';
import {
  getActiveProfile,
  getCastingPreferences,
  saveCastingPreferences,
  updateActiveProfile,
} from '../game/profiles';
import { getDebugSkipCast } from './debugFlags';

export function debugInspect(state: RunState): string {
  const profile = getActiveProfile();
  const lines: string[] = [
    `profile: ${profile.avatar} ${profile.name}`,
    `cast lessons: ${Object.keys(profile.castingHistory.lessons).length}`,
    `screen: ${state.screen}`,
    `act: ${state.actIndex + 1}`,
    `hp: ${state.heroHp}/${state.heroMaxHp}`,
    `gold: ${state.gold}`,
    `node: ${state.currentNodeId ?? '—'}`,
    `active: ${state.activeNodeId ?? '—'}`,
  ];
  if (state.combat) {
    const c = state.combat;
    lines.push(
      `energy: ${c.energy}/${c.maxEnergy}`,
      `hand: ${c.hand.length}`,
      `block: ${c.block}`,
      `phase: ${c.phase} · ${c.status}`,
    );
    for (const e of c.enemies) {
      const name = ENEMIES[e.defId]?.name ?? e.defId;
      lines.push(`  ${name} ${e.hp}/${e.maxHp}${e.alive ? '' : ' 💀'}`);
    }
  }
  if (getDebugSkipCast()) lines.push('skipCast: ON');
  return lines.join('\n');
}

export function debugGoMap(state: RunState): void {
  state.combat = null;
  state.cast = null;
  state.screen = 'map';
}

export function debugGoTitle(state: RunState): void {
  Object.assign(state, createNewRun());
  state.screen = 'title';
}

export function debugNewRun(state: RunState): void {
  startRun(state);
}

export function debugSetHp(state: RunState, hp: number): void {
  state.heroHp = Math.max(0, Math.min(state.heroMaxHp, Math.floor(hp)));
  if (state.combat) state.combat.heroHp = state.heroHp;
}

export function debugAddGold(state: RunState, n: number): void {
  state.gold = Math.max(0, state.gold + n);
}

export function debugFullEnergy(state: RunState): void {
  if (!state.combat) return;
  state.combat.energy = state.combat.maxEnergy;
}

export function debugAddEnergy(state: RunState, n = 1): void {
  if (!state.combat) return;
  state.combat.energy = Math.min(
    state.combat.maxEnergy + 5,
    state.combat.energy + n,
  );
}

export function debugDraw(state: RunState, n = 5): void {
  if (!state.combat || state.combat.status !== 'playing') return;
  drawCards(state.combat, n);
}

export function debugWinCombat(state: RunState): void {
  debugFinishFight(state);
}

export function debugLoseCombat(state: RunState): void {
  if (state.combat) {
    state.combat.heroHp = 0;
    state.combat.status = 'lost';
  }
  state.heroHp = 0;
  state.screen = 'defeat';
}

export function debugEndTurn(state: RunState): void {
  playerEndTurn(state);
}

export function debugStartFight(
  state: RunState,
  opts: { enemyId?: string; encounterId?: string },
): void {
  debugStartEncounter(state, opts.enemyId ?? 'slime', opts.encounterId);
}

export function debugSetAct(state: RunState, actIndex: number): void {
  state.actIndex = Math.max(0, Math.min(2, actIndex));
  state.currentNodeId = null;
  state.activeNodeId = null;
  state.visitedIds = [];
  state.pathIds = [];
  state.combat = null;
  state.cast = null;
  state.screen = 'map';
}

export function debugEnterAvailable(
  state: RunState,
  kind?: 'rest' | 'shop' | 'treasure' | 'fight' | 'elite',
): void {
  state.combat = null;
  state.cast = null;
  state.screen = 'map';
  const avail = getAvailableMapNodes(state);
  const node = kind ? avail.find((n) => n.kind === kind) ?? avail[0] : avail[0];
  if (node) selectMapNode(state, node.id);
}

export function debugPractice(state: RunState): void {
  enterPractice(state);
}

export function debugResetTutorial(): void {
  resetTutorialCompletion();
  updateGameSettings({ tutorialEnabled: true });
}

export function debugStartTutorial(state: RunState): void {
  debugResetTutorial();
  startRun(state);
  pickCharacter(state, 'echoMage');
  const first = getAvailableMapNodes(state).find(
    (node) => node.act === 1 && node.row === 0,
  );
  if (first) selectMapNode(state, first.id);
}

export function debugSetAnimationSpeed(speed: 1 | 2): void {
  updateGameSettings({ animationSpeed: speed });
}

export function debugSetCastingMode(mode: CastMode): void {
  const current = getCastingPreferences();
  saveCastingPreferences({
    ...current,
    modeWeights: {
      recognize: mode === 'recognize' ? 100 : 0,
      listen: mode === 'listen' ? 100 : 0,
      listenHard: mode === 'listenHard' ? 100 : 0,
    },
  });
}

/** Refill all shuffle bags without deleting accuracy or response-time history. */
export function debugResetCastingBags(): void {
  updateActiveProfile((profile) => ({
    ...profile,
    castingHistory: {
      lessons: Object.fromEntries(
        Object.entries(profile.castingHistory.lessons).map(([key, progress]) => [
          key,
          {
            ...progress,
            remainingAnswerKeys: [],
            remainingPromptIdsByAnswer: {},
            lastAnswerKey: null,
            lastPromptId: null,
          },
        ]),
      ),
    },
  }));
}

export function listEnemyOptions(): { id: string; label: string }[] {
  return Object.values(ENEMIES).map((e) => ({
    id: e.id,
    label: `${e.emoji} ${e.name}`,
  }));
}

export function listEncounterOptions(): { id: string; label: string }[] {
  return Object.values(ENCOUNTERS).map((e) => ({
    id: e.id,
    label: e.label ?? e.id,
  }));
}

export function livingSummary(state: RunState): string {
  if (!state.combat) return '—';
  return livingEnemies(state.combat)
    .map((e) => `${ENEMIES[e.defId]?.emoji ?? '?'}${e.hp}`)
    .join(' ');
}
