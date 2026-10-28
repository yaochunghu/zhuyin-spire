import { beforeEach, describe, expect, it } from 'vitest';
import { isCardId } from '../../src/data/cards';
import { POTION_POOL_IDS } from '../../src/data/potions';
import { RELIC_POOL_IDS } from '../../src/data/relics';
import { EVENTS, effectChips, effectsNeedConfirm, eventsForAct, getEvent, sharedEvents } from '../../src/data/events';
import {
  TREASURE_FLOOR,
  allStartsReachBoss,
  generateRunMap,
  type MapNode,
} from '../../src/data/map';
import { debugSetMetaProgress } from '../../src/debug/debugActions';
import { getActiveProfile, updateActiveProfile } from '../../src/game/profiles';
import { canPlay, createCombat } from '../../src/game/combat';
import {
  choiceChips,
  choiceReason,
  createEventTrack,
  ensureUnknownResolution,
  eventIsEligible,
  openEvent,
  unknownAllows,
  unknownWeights,
} from '../../src/game/eventEngine';
import { applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  answerEventShrine,
  chooseEventChoice,
  confirmEventCard,
  confirmEventChoice,
  createNewRun,
  ensureEventCast,
  pickCharacter,
  startRun,
  toggleEventCard,
  useParentHint,
  type RunState,
} from '../../src/game/state';

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

function prepare(): RunState {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  state.heroHp = state.heroMaxHp - 8;
  state.gold = 80;
  return state;
}

function room(state: RunState): MapNode {
  const node = state.runMap.acts[0]!.nodes.find((candidate) => candidate.row > 0 && candidate.kind !== 'boss');
  if (!node) throw new Error('missing room');
  return node;
}

describe('event tables', () => {
  it('ships the bible set: 7 per act and 9 shared', () => {
    expect(EVENTS).toHaveLength(30);
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(30);
    expect(EVENTS.filter((event) => event.act === 1)).toHaveLength(7);
    expect(EVENTS.filter((event) => event.act === 2)).toHaveLength(7);
    expect(EVENTS.filter((event) => event.act === 3)).toHaveLength(7);
    expect(EVENTS.filter((event) => event.act === 'shared')).toHaveLength(9);
    const titles = EVENTS.map((event) => `${event.icon}${event.title}`);
    expect(new Set(titles).size).toBe(30);
    for (const event of EVENTS) {
      expect(event.choices.filter((choice) => choice.id !== 'leave').length).toBeLessThanOrEqual(3);
      expect(event.choices.some((choice) => choice.id === 'leave')).toBe(true);
      for (const choice of event.choices) {
        if (choice.id === 'leave') {
          expect(choice.a15).toEqual([]);
          continue;
        }
        expect(choice.a15.length).toBeGreaterThan(0);
        expect(choice.confirm).toBe(effectsNeedConfirm(choice.effects));
      }
    }
  });
});

describe('unknown weights', () => {
  it('uses the bible thousandths, including the banned-room split', () => {
    expect(unknownWeights(0, true, true)).toEqual({
      event: 65000, fight: 20000, shop: 10000, treasure: 5000,
    });
    expect(unknownWeights(0, false, true)).toEqual({
      event: 65000, fight: 28000, shop: 0, treasure: 7000,
    });
    expect(unknownWeights(3, true, true)).toEqual({
      event: 95000, fight: 2858, shop: 1428, treasure: 714,
    });
    expect(unknownAllows(12)).toEqual({ shop: true, treasure: true });
    expect(unknownAllows(13)).toEqual({ shop: false, treasure: true });
    expect(unknownAllows(14)).toEqual({ shop: false, treasure: false });
  });
});

describe('unknown resolution', () => {
  it('keeps act events in their act, excludes Act I events from row 0, and never repeats', () => {
    const state = prepare();
    debugSetMetaProgress(2000);
    state.eventTrack = createEventTrack(7);
    const seen = new Set<string>();
    for (const act of state.runMap.acts) {
      for (const node of act.nodes.filter((candidate) => candidate.kind !== 'boss')) {
        const resolution = ensureUnknownResolution(state, node);
        if (!resolution.eventId) {
          expect(state.eventTrack.nonEventUnknownStreak).toBeGreaterThan(0);
          continue;
        }
        expect(state.eventTrack.nonEventUnknownStreak).toBe(0);
        const event = getEvent(resolution.eventId);
        expect(event.act === 'shared' || event.act === act.act).toBe(true);
        if (node.row === 0) expect(event.act).not.toBe(1);
        expect(seen.has(event.id)).toBe(false);
        seen.add(event.id);
      }
    }
  });

  it('falls back to one recorded fight when every event is already seen', () => {
    const state = prepare();
    state.eventTrack = createEventTrack(3);
    const node = room(state);
    state.eventTrack.seenEventIds = eventsForAct(1).map((event) => event.id);
    const first = ensureUnknownResolution(state, node);
    expect(first.outcome).toBe('fight');
    expect(first.fallbackFight).toBe(true);
    expect(ensureUnknownResolution(state, node)).toBe(first);
  });

  it('reproduces the same roll from the same seed and refuses shops near the boss', () => {
    const left = prepare();
    const right = prepare();
    left.eventTrack = createEventTrack(99);
    right.eventTrack = createEventTrack(99);
    const source = { ...room(left), row: 4 };
    const mirror = { ...room(right), row: 4 };
    expect(ensureUnknownResolution(left, source)).toEqual(ensureUnknownResolution(right, mirror));

    for (let seed = 1; seed <= 12; seed += 1) {
      const state = prepare();
      state.eventTrack = createEventTrack(seed);
      const base = room(state);
      const late = { ...base, row: 13 };
      expect(ensureUnknownResolution(state, late).outcome).not.toBe('shop');
      const preBoss = { ...base, id: `${base.id}-late`, row: 14 };
      expect(ensureUnknownResolution(state, preBoss).outcome).not.toBe('treasure');
    }
  });
});

describe('event results', () => {
  it('pays the printed gold, heals with max HP, and keeps the physical card', () => {
    const state = prepare();
    const beforeGold = state.gold;
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_whispering_door');
    state.screen = 'event';
    chooseEventChoice(state, 'knock');
    expect(state.gold).toBe(beforeGold + 35);
    expect(state.eventTrack.active?.resultLines).toContain('拿到 35 金幣');

    state.eventTrack.difficulty = 15;
    openEvent(state, state.activeNodeId, 'event_a1_whispering_door');
    chooseEventChoice(state, 'knock');
    expect(state.gold).toBe(beforeGold + 35 + 25);

    const upgrade = prepare();
    upgrade.activeNodeId = room(upgrade).id;
    openEvent(upgrade, upgrade.activeNodeId, 'event_a1_whispering_door');
    upgrade.screen = 'event';
    const card = upgrade.deck[0]!;
    chooseEventChoice(upgrade, 'listen');
    expect(upgrade.eventTrack.active?.phase).toBe('pick');
    toggleEventCard(upgrade, card.uid);
    confirmEventCard(upgrade);
    expect(upgrade.eventTrack.active?.phase).toBe('confirm');
    confirmEventChoice(upgrade);
    expect(upgrade.heroHp).toBe(upgrade.heroMaxHp - 8 - 4);
    expect(upgrade.deck.find((item) => item.uid === card.uid)?.upgradeLevel).toBe(1);

    const choir = prepare();
    const hp = choir.heroHp;
    const max = choir.heroMaxHp;
    choir.activeNodeId = room(choir).id;
    openEvent(choir, choir.activeNodeId, 'event_a1_lantern_choir');
    choir.screen = 'event';
    chooseEventChoice(choir, 'sing');
    expect(choir.heroMaxHp).toBe(max + 2);
    expect(choir.heroHp).toBe(hp + 2);
  });

  it('disables prices the hero cannot pay and names the reason', () => {
    const state = prepare();
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_whispering_door');
    state.heroHp = 4;
    expect(choiceReason(state, getEvent('event_a1_whispering_door').choices[0]!)).toBe('要留至少 1 顆心');
    state.heroHp = 5;
    expect(choiceReason(state, getEvent('event_a1_whispering_door').choices[0]!)).toBeNull();
    state.eventTrack.difficulty = 15;
    state.heroHp = 6;
    expect(choiceReason(state, getEvent('event_a1_whispering_door').choices[0]!)).toBe('要留至少 1 顆心');
    state.heroHp = 7;
    expect(choiceReason(state, getEvent('event_a1_whispering_door').choices[0]!)).toBeNull();

    openEvent(state, state.activeNodeId, 'event_a1_lantern_choir');
    state.eventTrack.difficulty = 0;
    state.gold = 5;
    expect(choiceReason(state, getEvent('event_a1_lantern_choir').choices[0]!)).toBe('還差 15🪙');
    openEvent(state, state.activeNodeId, 'event_a1_tuning_fountain');
    expect(choiceReason(state, getEvent('event_a1_tuning_fountain').choices[1]!)).toBeNull();
    state.potions = ['guardBubble', 'warmHoney', 'sparkSoda'];
    expect(choiceReason(state, getEvent('event_a1_tuning_fountain').choices[1]!)).toBe('藥水格已滿');
  });

  it('puts a pool bottle in an empty belt slot without touching the starter relic', () => {
    const state = prepare();
    const startMax = state.heroMaxHp;
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_tuning_fountain');
    state.screen = 'event';
    chooseEventChoice(state, 'bottle');
    confirmEventChoice(state);
    expect(state.heroMaxHp).toBe(startMax - 2);
    expect(state.potions.filter((id) => id !== null)).toHaveLength(1);
    expect(POTION_POOL_IDS).toContain(state.potions.find((id) => id !== null));
    expect(state.relicIds).toEqual(['tuningFork']);
  });

  it('lowers current HP only when max HP drops below it, and adds an unplayable curse', () => {
    debugSetMetaProgress(2000);
    const lowered = prepare();
    const startMax = lowered.heroMaxHp;
    lowered.heroHp = startMax;
    lowered.activeNodeId = room(lowered).id;
    openEvent(lowered, lowered.activeNodeId, 'event_shared_three_doors');
    lowered.screen = 'event';
    chooseEventChoice(lowered, 'star');
    expect(lowered.eventTrack.active?.phase).toBe('confirm');
    confirmEventChoice(lowered);
    expect(lowered.heroMaxHp).toBe(startMax - 3);
    expect(lowered.heroHp).toBe(startMax - 3);

    const kept = prepare();
    const keptMax = kept.heroMaxHp;
    kept.heroHp = 20;
    kept.activeNodeId = room(kept).id;
    openEvent(kept, kept.activeNodeId, 'event_shared_three_doors');
    kept.screen = 'event';
    chooseEventChoice(kept, 'star');
    confirmEventChoice(kept);
    expect(kept.heroMaxHp).toBe(keptMax - 3);
    expect(kept.heroHp).toBe(20);

    const cursed = prepare();
    cursed.activeNodeId = room(cursed).id;
    openEvent(cursed, cursed.activeNodeId, 'event_a1_sleeping_chime');
    cursed.screen = 'event';
    chooseEventChoice(cursed, 'wake');
    confirmEventChoice(cursed);
    const curse = cursed.deck.find((card) => card.defId === 'cu_silence');
    expect(curse).toBeTruthy();
    expect(cursed.relicIds[0]).toBe('tuningFork');
    expect(RELIC_POOL_IDS).toContain(cursed.relicIds[1]);
    expect(cursed.relicIds).toHaveLength(2);
    const combat = createCombat(cursed.deck, 'slime', cursed.heroHp, cursed.heroMaxHp, null);
    const piles = [combat.hand, combat.drawPile, combat.discardPile];
    let played = combat.hand.find((card) => card.uid === curse!.uid);
    if (!played) {
      for (const pile of piles) {
        const index = pile.findIndex((card) => card.uid === curse!.uid);
        if (index < 0) continue;
        played = pile.splice(index, 1)[0];
        combat.hand.push(played!);
        break;
      }
    }
    expect(canPlay(combat, curse!.uid)).toBe(false);
  });

  it('appends a named event relic and disables a random relic once the pool is owned', () => {
    const state = prepare();
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_lost_metronome');
    state.screen = 'event';
    chooseEventChoice(state, 'keep');
    confirmEventChoice(state);
    expect(state.relicIds).toEqual(['tuningFork', 'pocketMetronome']);

    const full = prepare();
    full.relicIds = ['tuningFork', ...RELIC_POOL_IDS];
    full.activeNodeId = room(full).id;
    openEvent(full, full.activeNodeId, 'event_a2_moth_rehearsal');
    expect(choiceReason(full, getEvent('event_a2_moth_rehearsal').choices[0]!)).toBe('沒有新的遺物');
    expect(full.relicIds[0]).toBe('tuningFork');
  });

  it('removes and transforms the selected physical card', () => {
    const state = prepare();
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_dusty_score');
    state.screen = 'event';
    const removed = state.deck[1]!;
    chooseEventChoice(state, 'clean');
    toggleEventCard(state, removed.uid);
    confirmEventCard(state);
    confirmEventChoice(state);
    expect(state.deck.some((card) => card.uid === removed.uid)).toBe(false);

    const rewritten = prepare();
    rewritten.activeNodeId = room(rewritten).id;
    openEvent(rewritten, rewritten.activeNodeId, 'event_a1_dusty_score');
    rewritten.screen = 'event';
    const before = rewritten.deck.length;
    const target = rewritten.deck[2]!;
    chooseEventChoice(rewritten, 'rewrite');
    toggleEventCard(rewritten, target.uid);
    confirmEventCard(rewritten);
    confirmEventChoice(rewritten);
    expect(rewritten.deck.some((card) => card.uid === target.uid)).toBe(false);
    expect(rewritten.deck).toHaveLength(before);
  });
});

describe('event saves', () => {
  it('resumes a half-chosen event without a new card order', () => {
    const state = prepare();
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_a1_whispering_door');
    state.screen = 'event';
    chooseEventChoice(state, 'listen');
    const order = [...state.eventTrack.active!.rolls.cardOrder];
    const snapshot = snapshotRun(state);
    expect(snapshot).not.toBeNull();
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    expect(restored.screen).toBe('event');
    expect(restored.eventTrack.active?.eventId).toBe('event_a1_whispering_door');
    expect(restored.eventTrack.active?.rolls.cardOrder).toEqual(order);
    expect(restored.eventTrack.active?.phase).toBe('pick');
  });

  it('draws 注音神龕 from the run cast stream and continues that stream on reload', () => {
    const clearLessons = () => {
      updateActiveProfile((profile) => ({
        ...profile,
        castingHistory: { lessons: {} },
      }));
    };
    const openShrine = (seed: number) => {
      clearLessons();
      const state = prepare();
      state.eventTrack = createEventTrack(7);
      state.castSeed = seed;
      state.castCounter = 0;
      state.activeNodeId = room(state).id;
      openEvent(state, state.activeNodeId, 'event_shared_phonetic_shrine');
      state.screen = 'event';
      chooseEventChoice(state, 'practice');
      confirmEventChoice(state);
      const prompt = state.cast?.prompt;
      if (!prompt) throw new Error('expected a shrine prompt');
      return {
        state,
        cursor: state.eventTrack.cursor,
        counter: state.castCounter,
        signature: {
          contentId: prompt.contentId,
          mode: prompt.mode,
          answerTokens: [...prompt.answerTokens],
          choiceTokens: [...prompt.choiceTokens],
        },
      };
    };

    const first = openShrine(0x51);
    const again = openShrine(0x51);
    const otherSeed = openShrine(0x52);
    expect(again.signature).toEqual(first.signature);
    expect(again.counter).toBe(first.counter);
    expect(first.counter).toBeGreaterThan(0);
    expect(otherSeed.cursor).toBe(first.cursor);
    expect(first.state.screen).toBe('eventCast');
    expect(first.state.eventTrack.active?.shrineLeft).toBe(3);

    const fresh = openShrine(0x51);
    const history = structuredClone(getActiveProfile().castingHistory);
    const snapshot = snapshotRun(fresh.state);
    expect(snapshot?.castSeed).toBe(0x51);
    expect(snapshot?.castCounter).toBe(fresh.counter);
    expect(snapshot?.eventTrack?.active?.eventId).toBe('event_shared_phonetic_shrine');

    fresh.state.cast = null;
    ensureEventCast(fresh.state);
    const continued = fresh.state.cast?.prompt;
    if (!continued) throw new Error('expected the next shrine prompt');

    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    updateActiveProfile((profile) => ({
      ...profile,
      castingHistory: structuredClone(history),
    }));
    expect(restored.screen).toBe('eventCast');
    expect(restored.cast).toBeNull();
    expect(restored.castSeed).toBe(0x51);
    expect(restored.castCounter).toBe(fresh.counter);
    expect(restored.eventTrack.active?.shrineLeft).toBe(3);
    ensureEventCast(restored);
    expect(restored.cast?.prompt.contentId).toBe(continued.contentId);
    expect(restored.cast?.prompt.mode).toBe(continued.mode);
    expect(restored.cast?.prompt.answerTokens).toEqual(continued.answerTokens);
    expect(restored.castCounter).toBe(fresh.state.castCounter);
  });

  it('spends the shrine parent hint once for the whole event', () => {
    const state = prepare();
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_shared_phonetic_shrine');
    state.screen = 'event';
    chooseEventChoice(state, 'practice');
    confirmEventChoice(state);
    expect(state.screen).toBe('eventCast');
    const spelling = state.cast?.prompt.correctionText ?? '';
    expect(spelling.length).toBeGreaterThan(0);
    expect(snapshotRun(state)?.eventTrack?.active).not.toHaveProperty('parentHintUsed');
    expect(useParentHint(state)).toBe(spelling);
    expect(state.eventTrack.active?.parentHintUsed).toBe(true);
    expect(useParentHint(state)).toBeNull();

    answerEventShrine(state, true);
    expect(state.screen).toBe('eventCast');
    expect(useParentHint(state)).toBeNull();

    const snapshot = snapshotRun(state)!;
    const restored = createNewRun();
    applySnapshot(restored, parseSnapshot(snapshot)!);
    expect(restored.eventTrack.active?.parentHintUsed).toBe(true);

    const legacy = structuredClone(snapshot) as { eventTrack?: { active?: { parentHintUsed?: boolean } } };
    delete legacy.eventTrack?.active?.parentHintUsed;
    expect(parseSnapshot(legacy)).not.toBeNull();

    const storedFalse = structuredClone(snapshot) as { eventTrack?: { active?: { parentHintUsed?: boolean } } };
    if (storedFalse.eventTrack?.active) storedFalse.eventTrack.active.parentHintUsed = false;
    const loadedFalse = createNewRun();
    applySnapshot(loadedFalse, parseSnapshot(storedFalse)!);
    expect(loadedFalse.eventTrack.active).not.toHaveProperty('parentHintUsed');
    expect(snapshotRun(loadedFalse)?.eventTrack?.active).not.toHaveProperty('parentHintUsed');
  });

  it('loads a save from before events existed', () => {
    const state = prepare();
    const snapshot = snapshotRun(state)!;
    const legacy: Record<string, unknown> = { ...snapshot, v: 2, relicId: 'tuningFork' };
    delete legacy.eventTrack;
    delete legacy.relicIds;
    delete legacy.pendingRelicId;
    delete legacy.rewardSource;
    const parsed = parseSnapshot(legacy);
    expect(parsed).not.toBeNull();
    const restored = createNewRun();
    applySnapshot(restored, parsed!);
    expect(restored.eventTrack.seenEventIds).toEqual([]);
    expect(restored.relicIds).toEqual(['tuningFork']);
    expect(Number.isInteger(restored.castSeed)).toBe(true);
    expect(restored.castCounter).toBe(0);
    expect(restored.deck.every((card) => isCardId(card.defId))).toBe(true);
  });

  it('does not offer an Act II event on an Act I row', () => {
    const state = prepare();
    debugSetMetaProgress(2000);
    const node = room(state);
    const actTwo = EVENTS.filter((event) => event.act === 2);
    for (const event of actTwo) {
      expect(eventIsEligible(state, event, node.row, 1)).toBe(false);
    }
  });
});

describe('珠算武者 shared events', () => {
  function abacus(): RunState {
    const state = prepare();
    pickCharacter(state, 'abacusFist');
    state.heroHp = 40;
    state.heroMaxHp = 70;
    state.gold = 80;
    return state;
  }

  it('does not offer 注音神龕, and no other shared event is a quiz', () => {
    const shrine = getEvent('event_shared_phonetic_shrine');
    const echo = prepare();
    const math = abacus();
    expect(eventIsEligible(echo, shrine, 4, 2)).toBe(true);
    expect(eventIsEligible(math, shrine, 4, 2)).toBe(false);
    for (const act of [1, 2, 3] as const) {
      expect(eventIsEligible(math, shrine, 4, act)).toBe(false);
    }

    const quizIds = sharedEvents().filter((event) =>
      event.choices.some((choice) =>
        [...choice.effects, ...choice.a15].some((effect) => effect.op === 'shrine'),
      ),
    ).map((event) => event.id);
    expect(quizIds).toEqual(['event_shared_phonetic_shrine']);

    const well = getEvent('event_shared_humming_well');
    expect(eventIsEligible(math, well, 4, 2)).toBe(true);
  });

  it('says 算 on a math quiz chip and does not charge 珠算武者 HP if the shrine is already open', () => {
    const shrine = getEvent('event_shared_phonetic_shrine');
    const practice = shrine.choices.find((choice) => choice.id === 'practice');
    expect(practice).toBeTruthy();
    expect(effectChips(practice!.effects)).toContain('拼 3 題');
    expect(effectChips(practice!.effects, '算')).toContain('算 3 題');
    expect(effectChips(practice!.effects, '算').join(' ')).not.toContain('拼 ');

    const math = abacus();
    expect(choiceChips(math, practice!).join(' ')).toContain('算 3 題');
    expect(choiceChips(prepare(), practice!).join(' ')).toContain('拼 3 題');

    const state = abacus();
    const before = state.heroHp;
    state.activeNodeId = room(state).id;
    openEvent(state, state.activeNodeId, 'event_shared_phonetic_shrine');
    state.screen = 'event';
    chooseEventChoice(state, 'practice');
    confirmEventChoice(state);
    expect(state.screen).toBe('eventCast');
    expect(state.cast?.prompt.gateId).toBe('math');
    expect(state.cast?.prompt.cue.text).not.toBe('+');
    answerEventShrine(state, false);
    expect(state.heroHp).toBe(before);
    expect(state.flash).not.toContain('❤️');
  });
});

describe('map unknowns', () => {
  it('places a ? in every act without moving the fixed floors', () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      let value = seed;
      const rng = () => {
        value = (value * 1_664_525 + 1_013_904_223) >>> 0;
        return value / 0x1_0000_0000;
      };
      const map = generateRunMap(rng);
      for (const act of map.acts) {
        expect(act.nodes.filter((node) => node.kind === 'unknown').length).toBeGreaterThanOrEqual(2);
        expect(act.nodes.filter((node) => node.row === 0).every((node) => node.kind === 'fight')).toBe(true);
        expect(act.nodes.filter((node) => node.row === 14).every((node) => node.kind === 'rest')).toBe(true);
        expect(act.nodes.filter((node) => node.row === TREASURE_FLOOR).every((node) => node.kind === 'treasure')).toBe(true);
        expect(allStartsReachBoss(act)).toBe(true);
      }
    }
  });
});
