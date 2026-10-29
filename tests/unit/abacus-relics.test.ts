import { beforeEach, describe, expect, it } from 'vitest';
import { ABACUS_CARD_IDS, ABACUS_STARTER_DECK_IDS } from '../../src/data/abacusCards';
import { GOLD_ELITE_BASE, GOLD_JITTER, RELIC_POOL_EXHAUST_GOLD } from '../../src/data/balance';
import { getPlayableCharacter } from '../../src/data/characters';
import { POTION_POOL_IDS } from '../../src/data/potions';
import {
  ABACUS_RELIC_POOL_IDS,
  EVENT_RELIC_IDS,
  RELICS,
  RELIC_POOL_IDS,
  getRelic,
  relicPlayerCopy,
  relicPoolIdsFor,
  rollRelicDrop,
} from '../../src/data/relics';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  createNewRun,
  debugFinishFight,
  debugOpenActTreasure,
  getCurrentActNodes,
  isTutorialEligible,
  pickCharacter,
  selectMapNode,
  startRun,
  type RunState,
} from '../../src/game/state';
import { relicTestMap } from '../helpers/relicTestMap';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

function approach(state: RunState, kind: 'treasure' | 'elite' | 'boss' | 'fight') {
  const nodes = getCurrentActNodes(state);
  const node = nodes.find(
    (candidate) =>
      candidate.kind === kind &&
      nodes.some((parent) => parent.nextIds.includes(candidate.id)),
  );
  if (!node) throw new Error(`Missing ${kind}`);
  const parent = nodes.find((candidate) => candidate.nextIds.includes(node.id));
  if (!parent) throw new Error(`Missing parent for ${kind}`);
  state.currentNodeId = parent.id;
  state.visitedIds = [parent.id];
  state.pathIds = [parent.id];
  return node;
}

function abacusRun(): RunState {
  const state = createNewRun();
  startRun(state);
  state.runMap = relicTestMap();
  pickCharacter(state, 'abacusFist');
  state.tutorialEligibleRun = false;
  return state;
}

describe('per-character relic pools', () => {
  it('keeps the five 共鳴 drops and the four 珠算 drops on their own characters', () => {
    expect(relicPoolIdsFor('echoMage')).toEqual([...RELIC_POOL_IDS]);
    expect(relicPoolIdsFor(null)).toEqual([...RELIC_POOL_IDS]);
    expect(relicPoolIdsFor('abacusFist')).toEqual([...ABACUS_RELIC_POOL_IDS]);
    expect(ABACUS_RELIC_POOL_IDS).toHaveLength(4);
    for (const id of RELIC_POOL_IDS) {
      expect(RELICS[id].characters).toEqual(['echoMage']);
      expect(rollRelicDrop([], () => RELIC_POOL_IDS.indexOf(id), 'abacusFist')).not.toBe(id);
    }
    for (const id of ABACUS_RELIC_POOL_IDS) {
      expect(RELICS[id].characters).toEqual(['abacusFist']);
      expect(RELICS[id].source).toBe('pool');
      expect(rollRelicDrop([], () => ABACUS_RELIC_POOL_IDS.indexOf(id), 'abacusFist')).toBe(id);
      expect(rollRelicDrop([], () => 0, 'echoMage')).not.toBe(id);
    }
    expect(rollRelicDrop([...ABACUS_RELIC_POOL_IDS], () => 0, 'abacusFist')).toBeNull();
    expect(rollRelicDrop([...RELIC_POOL_IDS], () => 0, 'echoMage')).toBeNull();
    expect(rollRelicDrop([...ABACUS_RELIC_POOL_IDS], () => 0)).toBe(RELIC_POOL_IDS[0]);
    expect(RELICS.woodBeads.source).toBe('starter');
    expect(RELICS.woodBeads.characters).toEqual(['abacusFist']);
    expect(ABACUS_RELIC_POOL_IDS).not.toContain('woodBeads');
    for (const id of EVENT_RELIC_IDS) {
      expect(RELICS[id].characters).toEqual(['echoMage', 'abacusFist']);
      expect(relicPoolIdsFor('abacusFist')).not.toContain(id);
      expect(relicPoolIdsFor('echoMage')).not.toContain(id);
    }
    for (const id of ['shieldCharm', 'coinPouch', 'morningSpark', 'luckyDraw'] as const) {
      expect(RELICS[id].source).toBe('legacy');
      expect(RELICS[id].characters).toEqual(['echoMage', 'abacusFist']);
    }
    expect([...POTION_POOL_IDS]).toEqual([
      'guardBubble',
      'soundPebble',
      'warmHoney',
      'sparkSoda',
      'pageJuice',
      'chorusBurst',
    ]);
  });

  it('pays exhaust gold from the character pool that is already owned', () => {
    const state = abacusRun();
    state.relicIds = ['woodBeads', ...ABACUS_RELIC_POOL_IDS];
    const before = state.gold;
    const boss = approach(state, 'boss');
    selectMapNode(state, boss.id);
    debugFinishFight(state);
    expect(state.pendingRelicId).toBeNull();
    expect(state.relicIds).toEqual(['woodBeads', ...ABACUS_RELIC_POOL_IDS]);
    const gain = state.gold - before;
    expect(gain).toBeGreaterThanOrEqual(GOLD_ELITE_BASE + RELIC_POOL_EXHAUST_GOLD);
    expect(gain).toBeLessThan(GOLD_ELITE_BASE + GOLD_JITTER + RELIC_POOL_EXHAUST_GOLD);

    const chest = abacusRun();
    chest.relicIds = ['woodBeads', 'beadPouch', 'rulerCharm', 'tenBell'];
    expect(debugOpenActTreasure(chest)).toBe(true);
    expect(chest.pendingRelicId).toBe('eraser');
    expect(chest.relicIds).toContain('eraser');
    expect(RELIC_POOL_IDS).not.toContain(chest.pendingRelicId);
  });

  it('round-trips a 珠算 save at version 4, including a legacy relic', () => {
    const state = abacusRun();
    state.relicIds = ['woodBeads', 'shieldCharm'];
    const snapshot = snapshotRun(state);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.v).toBe(4);
    expect(snapshot!.characterId).toBe('abacusFist');
    expect(snapshot!.relicIds).toEqual(['woodBeads', 'shieldCharm']);
    expect(snapshot!.deck.map((card) => card.defId)).toEqual([...ABACUS_STARTER_DECK_IDS]);
    expect(snapshot).not.toHaveProperty('combat');
    expect(parseSnapshot(JSON.parse(JSON.stringify(snapshot)))?.characterId).toBe('abacusFist');

    const restored = createNewRun();
    applySnapshot(restored, snapshot!);
    expect(restored.characterId).toBe('abacusFist');
    expect(restored.relicIds).toEqual(['woodBeads', 'shieldCharm']);
    expect(restored.deck.every((card) => (ABACUS_CARD_IDS as string[]).includes(card.defId))).toBe(true);

    const legacy = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
    delete legacy.characterId;
    const missing = parseSnapshot(legacy);
    expect(missing).not.toBeNull();
    const resumed = createNewRun();
    applySnapshot(resumed, missing!);
    expect(resumed.characterId).toBe('echoMage');
    expect(resumed.relicIds).toContain('shieldCharm');

    legacy.characterId = 'not-a-character';
    expect(parseSnapshot(legacy)).toBeNull();
  });

  it('starts 數星人 with 小星盤 and skips the 注音 tutorial', () => {
    const echo = createNewRun();
    startRun(echo);
    echo.runMap = relicTestMap();
    pickCharacter(echo, 'echoMage');
    echo.tutorialEligibleRun = true;
    const node = getCurrentActNodes(echo).find((candidate) => candidate.kind === 'fight' && candidate.row === 0);
    expect(node).toBeTruthy();
    echo.currentNodeId = null;
    echo.visitedIds = [];
    expect(isTutorialEligible(echo, node!)).toBe(true);

    const state = abacusRun();
    state.tutorialEligibleRun = true;
    state.currentNodeId = null;
    state.visitedIds = [];
    expect(isTutorialEligible(state, node!)).toBe(false);
    expect(state.relicIds).toEqual(['woodBeads']);
    expect(getPlayableCharacter('abacusFist').name).toBe('數星人');
    expect(getPlayableCharacter('abacusFist').title).toBe('數清來招，湊十出拳');
    expect(getRelic('woodBeads').id).toBe('woodBeads');
    expect(getRelic('woodBeads').emoji).toBe('🌟');
    expect(getRelic('woodBeads').name).toBe('小星盤');
    expect(getRelic('beadPouch').id).toBe('beadPouch');
    expect(getRelic('beadPouch').emoji).toBe('✨');
    expect(getRelic('beadPouch').name).toBe('星星袋');
    expect(getRelic('beadPouch').blurb).toBe('每場戰鬥開始數 4 顆星');
    expect(getRelic('beadPouch').adultNote).toBe(
      '這 4 顆星自己算一次，不會和湊十訣併成同一次。不能跳過答題。',
    );
    expect(getRelic('eraser').blurb).toBe('每場戰鬥第一次法術飄走時，數 2 顆星');
    expect(getRelic('eraser').adultNote).toBe(
      '再算一次的第一次答錯不算。法術消散才數星，而且一場只有一次。故意答錯仍然少一張牌和能量。',
    );
    expect(getPlayableCharacter('abacusFist').cardPoolIds).toHaveLength(27);
    expect(getPlayableCharacter('abacusFist').starterDeckIds).toEqual([...ABACUS_STARTER_DECK_IDS]);
  });

  it('keeps 念錯 and 拼對 for 共鳴武者 and says 算錯 and 算對 for 數星人', () => {
    const metronome = getRelic('pocketMetronome');
    const box = getRelic('moonMusicBox');
    expect(relicPlayerCopy(metronome, 'zhuyin').adultNote).toContain('念錯');
    expect(relicPlayerCopy(metronome, 'math').adultNote).toContain('算錯');
    expect(relicPlayerCopy(metronome, 'math').adultNote).not.toContain('念錯');
    expect(relicPlayerCopy(box, 'zhuyin').blurb).toContain('拼對');
    expect(relicPlayerCopy(box, 'math').blurb).toContain('算對');
    expect(relicPlayerCopy(box, 'math').blurb).not.toContain('拼對');
    expect(relicPlayerCopy(box, 'math').adultNote).toContain('算對');
    expect(getRelic('rulerCharm').adultNote).toContain('算錯');
    expect(getRelic('rulerCharm').adultNote).not.toContain('念錯');
    expect(getRelic('tuningFork').adultNote).toContain('念錯');
  });
});
