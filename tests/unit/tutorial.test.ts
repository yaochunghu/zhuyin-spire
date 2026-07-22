import { beforeEach, describe, expect, it } from 'vitest';
import {
  answerCast,
  canTutorialEndTurn,
  canTutorialPlayCard,
  createNewRun,
  debugFinishFight,
  getAvailableMapNodes,
  isTutorialEligible,
  pickCharacter,
  playerEndTurn,
  selectMapNode,
  startRun,
  tryPlayCard,
  type RunState,
} from '../../src/game/state';
import {
  isTutorialComplete,
  resetTutorialCompletion,
  updateGameSettings,
} from '../../src/game/settings';
import { getCard } from '../../src/data/cards';

class MemoryStorage {
  private values = new Map<string, string>();
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function beginTutorial(): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  const node = getAvailableMapNodes(state)[0]!;
  expect(isTutorialEligible(state, node)).toBe(true);
  selectMapNode(state, node.id);
  expect(state.tutorial?.step).toBe('shield');
  expect(state.combat?.enemies).toHaveLength(1);
  expect(state.combat?.enemies[0]?.maxHp).toBe(6);
  return state;
}

function playAndAnswer(state: RunState, uid: string, correct: boolean): void {
  const energy = state.combat!.energy;
  const card = state.combat!.hand.find((item) => item.uid === uid)!;
  const cost = getCard(card.defId).cost;
  tryPlayCard(state, uid);
  expect(state.combat!.energy).toBe(energy - cost);
  const parts = correct ? [...state.cast!.prompt.correctParts] : [];
  answerCast(state, parts);
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
  resetTutorialCompletion();
  updateGameSettings({ tutorialEnabled: true, animationSpeed: 1 });
});

describe('first battle tutorial', () => {
  it('is disabled after completion, when turned off, and for pre-feature saves', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'echoMage');
    const node = getAvailableMapNodes(state)[0]!;
    updateGameSettings({ tutorialEnabled: false });
    expect(isTutorialEligible(state, node)).toBe(false);
    updateGameSettings({ tutorialEnabled: true });
    state.tutorialEligibleRun = false;
    expect(isTutorialEligible(state, node)).toBe(false);
  });

  it('charges the normal card and energy cost for a wrong answer', () => {
    const state = beginTutorial();
    const shield = state.combat!.hand.find((card) => card.defId === 'mo')!;
    const handBefore = state.combat!.hand.length;
    playAndAnswer(state, shield.uid, false);
    expect(state.combat!.hand).toHaveLength(handBefore - 1);
    expect(state.combat!.discardPile.some((card) => card.uid === shield.uid)).toBe(true);
    expect(state.tutorial).toMatchObject({ step: 'shield', wrongAttempts: 1 });
  });

  it('allows End Turn and redraws a required card after wrong-answer depletion', () => {
    const state = beginTutorial();
    while (true) {
      const shield = state.combat!.hand.find(
        (card) => getCard(card.defId).type === 'block',
      );
      if (!shield) break;
      playAndAnswer(state, shield.uid, false);
    }
    expect(canTutorialEndTurn(state)).toBe(true);
    playerEndTurn(state);
    expect(state.tutorial?.step).toBe('shield');
    expect(state.combat!.hand.some((card) => card.defId === 'mo')).toBe(true);
  });

  it('guides shield, End Turn, attack, then removes action gating', () => {
    const state = beginTutorial();
    playAndAnswer(state, state.combat!.hand.find((c) => c.defId === 'mo')!.uid, true);
    expect(state.tutorial?.step).toBe('endTurn');
    expect(state.combat!.energy).toBe(2);
    const affordableAttack = state.combat!.hand.find((c) => c.defId === 'bo')!;
    expect(canTutorialPlayCard(state, affordableAttack.uid)).toBe(true);
    playerEndTurn(state);
    expect(state.tutorial?.step).toBe('attack');
    playAndAnswer(state, state.combat!.hand.find((c) => c.defId === 'bo')!.uid, true);
    expect(state.tutorial?.step).toBe('free');
  });

  it('marks completion only on victory and replay clears it', () => {
    const state = beginTutorial();
    expect(isTutorialComplete()).toBe(false);
    debugFinishFight(state);
    expect(isTutorialComplete()).toBe(true);
    resetTutorialCompletion();
    expect(isTutorialComplete()).toBe(false);
  });

  it('does not complete on defeat and restores normal randomized fights afterward', () => {
    const defeated = beginTutorial();
    defeated.tutorial!.step = 'free';
    defeated.combat!.heroHp = 3;
    defeated.heroHp = 3;
    playerEndTurn(defeated);
    expect(defeated.screen).toBe('defeat');
    expect(isTutorialComplete()).toBe(false);

    const completed = beginTutorial();
    debugFinishFight(completed);
    const nextRun = createNewRun();
    startRun(nextRun);
    pickCharacter(nextRun, 'echoMage');
    const node = getAvailableMapNodes(nextRun)[0]!;
    selectMapNode(nextRun, node.id);
    expect(nextRun.tutorial).toBeNull();
    expect(nextRun.combat!.enemies.every((enemy) => enemy.defId !== 'tutorialSlime')).toBe(
      true,
    );
  });
});
