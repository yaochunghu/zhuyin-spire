/**
 * Debug mutations on RunState — no DOM.
 */

import { ENCOUNTERS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { drawCards, livingEnemies } from '../game/combat';
import { createCombat } from '../game/battle/battleManager';
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
  type Screen,
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

export interface VisualReviewOptions {
  actIndex?: number;
  enemyCount?: number;
  enemyDefIds?: string[];
  handCount?: number;
}

/**
 * Deterministic, development-only state seeding for screenshot review.
 * It intentionally bypasses room eligibility, but uses the real renderers and
 * combat model so no visual-review route or production state is introduced.
 */
export function debugPrepareVisualReview(
  state: RunState,
  screen: Screen,
  options: VisualReviewOptions = {},
): void {
  Object.assign(state, createNewRun());

  if (screen === 'title') {
    state.screen = 'title';
    return;
  }

  startRun(state);
  if (screen === 'relicPick') return;

  pickCharacter(state, 'echoMage');
  state.actIndex = Math.max(0, Math.min(2, options.actIndex ?? 0));
  state.gold = 240;
  state.heroHp = Math.max(1, state.heroMaxHp - 7);

  const reviewOffers = state.deck.slice(0, 3).map((card, index) => ({
    ...card,
    uid: `visual-offer-${index}`,
  }));
  const enemyIdsByAct = [
    ['rock', 'bat', 'ember', 'fang', 'eliteArmor'],
    ['armor', 'spike', 'fangHard', 'toad', 'eliteStorm'],
    ['wraith', 'owl', 'crystal', 'eliteShadow', 'boss3'],
  ] as const;

  switch (screen) {
    case 'map':
      state.screen = 'map';
      return;
    case 'rest':
    case 'smith':
    case 'removeCard':
      state.screen = screen;
      return;
    case 'shop':
    case 'shopRemove':
      state.shopOffers = reviewOffers.map((offer, index) => ({
        ...offer,
        price: 35 + index * 10,
        sold: false,
      }));
      state.screen = screen;
      return;
    case 'combat': {
      const enemyCount = Math.max(1, Math.min(5, options.enemyCount ?? 3));
      const requestedIds = options.enemyDefIds?.filter((id) => ENEMIES[id]);
      const enemyIds =
        requestedIds && requestedIds.length > 0
          ? requestedIds.slice(0, 5)
          : enemyIdsByAct[state.actIndex]!.slice(0, enemyCount);
      state.combat = createCombat(
        state.deck,
        [...enemyIds],
        state.heroHp,
        state.heroMaxHp,
      );
      for (
        let index = state.combat.enemies.length;
        index < enemyIds.length;
        index += 1
      ) {
        const defId = enemyIds[index]!;
        const def = ENEMIES[defId]!;
        state.combat.enemies.push({
          id: `visual-enemy-${index}`,
          defId,
          hp: def.maxHp,
          maxHp: def.maxHp,
          block: 0,
          intentIndex: 0,
          alive: true,
          echoTurns: 0,
          vulnerableTurns: 0,
          weakTurns: 0,
          echoTriggeredThisTurn: false,
        });
      }
      const handCount = Math.max(5, Math.min(10, options.handCount ?? 5));
      drawCards(state.combat, handCount - state.combat.hand.length);
      state.screen = 'combat';
      return;
    }
    case 'castCheck': {
      enterPractice(state);
      const reviewCast = state.cast;
      state.combat = createCombat(
        state.deck,
        ['rock', 'bat'],
        state.heroHp,
        state.heroMaxHp,
      );
      state.cast = reviewCast;
      state.screen = 'castCheck';
      return;
    }
    case 'practice':
      enterPractice(state);
      return;
    case 'reward':
      state.rewardOptions = reviewOffers;
      state.rewardTier = 'normal';
      state.rewardSource = 'fight';
      state.pendingGold = 18;
      state.gold += state.pendingGold;
      state.screen = 'reward';
      return;
    case 'actClear':
      state.lastClearedAct = state.actIndex === 0 ? 1 : 2;
      state.actIndex = state.lastClearedAct;
      state.screen = 'actClear';
      return;
    case 'defeat':
      state.heroHp = 0;
      state.screen = 'defeat';
      return;
    case 'victory':
      state.actIndex = 2;
      state.screen = 'victory';
      return;
    default:
      state.screen = screen;
  }
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
