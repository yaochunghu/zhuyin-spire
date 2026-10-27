import { beforeEach, describe, expect, it } from 'vitest';
import { PHRASES_BY_INITIAL } from '../../src/data/phrases';
import { intentTotalDamage, intentTotalLabel } from '../../src/data/enemies';
import { getCard, resolveCard } from '../../src/data/cards';
import {
  beginPlay,
  canPlay,
  createCombat,
  effectiveCost,
  endTurn,
  executeEffects,
  intentForUnit,
  makeCard,
  nextIntentForUnit,
  resolveCastSuccess,
  weakTurnsAfterEnemyAction,
  type CombatState,
} from '../../src/game/combat';
import { coachForScreen } from '../../src/game/coach';
import { activeRunSaveKey, applySnapshot, parseSnapshot, snapshotRun } from '../../src/game/save';
import {
  beginRestRemove,
  createNewRun,
  pickCharacter,
  skipRemoveCard,
  startRun,
} from '../../src/game/state';
import { LEARNING_REVEAL_CONTINUE_MS, LEARNING_REVEAL_TOTAL_MS } from '../../src/game/settings';
import { endTurnShouldPlayOutro } from '../../src/ui/combatView';
import { practiceRevealKind } from '../../src/ui/castView';

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

const noDraw = () => [];

function pileUids(combat: CombatState): string[] {
  return [...combat.hand, ...combat.drawPile, ...combat.discardPile, ...combat.exhaustPile]
    .map((card) => card.uid)
    .sort();
}

function restState() {
  const state = createNewRun();
  startRun(state);
  pickCharacter(state, 'echoMage');
  const rest = state.runMap.acts[0]!.nodes.find((node) => node.kind === 'rest')!;
  state.activeNodeId = rest.id;
  state.screen = 'rest';
  return state;
}

describe('QA bug hunt regressions', () => {
  it('BUG-01 keeps draw-pile cards when B129 reshuffles the discard', () => {
    const combat = createCombat(['bo'], 'rock', 40, 40);
    combat.activePowerIds = ['B129'];
    combat.hand = [];
    const keepers = [makeCard('bo'), makeCard('bo')];
    const drawn = Array.from({ length: 5 }, () => makeCard('ge'));
    const skill = makeCard('mo');
    const other = makeCard('po');
    combat.drawPile = [...keepers, ...drawn];
    combat.discardPile = [other, skill];
    combat.exhaustPile = [];
    combat.block = 99;
    const before = pileUids(combat);

    endTurn(combat);

    expect(pileUids(combat)).toEqual(before);
    expect(combat.hand.some((card) => card.uid === skill.uid)).toBe(true);
    expect(combat.drawPile.map((card) => card.uid)).toEqual(
      expect.arrayContaining(keepers.map((card) => card.uid).concat(other.uid)),
    );
    expect(combat.discardPile).toHaveLength(0);
  });

  it('BUG-01 does not reshuffle when the discard has no matching card', () => {
    const combat = createCombat(['bo'], 'rock', 40, 40);
    combat.activePowerIds = ['B129'];
    combat.hand = [];
    const keepers = [makeCard('bo'), makeCard('bo')];
    const drawn = Array.from({ length: 5 }, () => makeCard('ge'));
    const other = makeCard('po');
    combat.drawPile = [...keepers, ...drawn];
    combat.discardPile = [other];
    combat.block = 99;

    endTurn(combat);

    expect(combat.drawPile.map((card) => card.uid)).toEqual(keepers.map((card) => card.uid));
    expect(combat.discardPile.map((card) => card.uid)).toEqual([other.uid]);
    expect(combat.hand.some((card) => card.defId === 'mo')).toBe(false);
  });

  it('BUG-02 returns to the campfire without deleting a card', () => {
    const state = restState();
    const deck = state.deck.map((card) => card.uid);
    expect(beginRestRemove(state)).toBe(true);
    expect(state.screen).toBe('removeCard');
    skipRemoveCard(state);
    expect(state.screen).toBe('rest');
    expect(state.deck.map((card) => card.uid)).toEqual(deck);
    const saved = parseSnapshot(JSON.parse(localStorage.getItem(activeRunSaveKey()) ?? 'null'));
    expect(saved?.screen).toBe('rest');
    expect(snapshotRun(state)?.screen).toBe('rest');
  });

  it('BUG-03 keeps B100 易傷 through the player turn that follows the enemy phase', () => {
    const combat = createCombat(['mo'], 'slime', 40, 40);
    combat.activePowerIds = ['B100'];
    combat.activePowerLevels = { B100: 0 };
    combat.block = 99;
    endTurn(combat);
    expect(combat.enemies[0]!.vulnerableTurns).toBe(1);

    const upgraded = createCombat(['mo'], 'slime', 40, 40);
    upgraded.activePowerIds = ['B100'];
    upgraded.activePowerLevels = { B100: 1 };
    upgraded.block = 99;
    endTurn(upgraded);
    expect(upgraded.enemies[0]!.vulnerableTurns).toBe(2);

    endTurn(combat);
    expect(combat.enemies[0]!.vulnerableTurns).toBe(0);
  });

  it('BUG-04 clears enemy block at the start of that enemy\'s next action', () => {
    const combat = createCombat(['mo'], 'rock', 40, 40);
    combat.block = 99;
    endTurn(combat);
    expect(combat.enemies[0]!.block).toBe(7);
    endTurn(combat);
    expect(combat.enemies[0]!.block).toBe(0);
  });

  it('BUG-05 expires this-turn discounts and applies them to B132 and B065', () => {
    const combat = createCombat(['bo'], 'rock', 40, 40);
    const retained = makeCard('rw_b149');
    retained.temporaryCostReduction = 99;
    const discarded = makeCard('bo');
    discarded.temporaryCostReduction = 4;
    combat.hand = [retained, discarded];
    combat.block = 99;
    endTurn(combat);
    expect(retained.temporaryCostReduction).toBe(0);
    expect(discarded.temporaryCostReduction).toBe(0);
    expect(combat.hand.some((card) => card.uid === retained.uid)).toBe(true);

    const priced = createCombat(['bo'], 'rock', 40, 40);
    const chain = makeCard('rw_b132');
    chain.temporaryCostReduction = 1;
    priced.tempoCount = 2;
    priced.energy = 0;
    priced.hand = [chain];
    expect(effectiveCost(priced, chain, resolveCard(chain.defId, 0))).toBe(0);
    expect(canPlay(priced, chain.uid)).toBe(true);

    const spin = makeCard('rw_b065');
    spin.temporaryCostReduction = 1;
    priced.lastPlayedType = 'skill';
    priced.hand = [spin];
    expect(effectiveCost(priced, spin, resolveCard(spin.defId, 0))).toBe(0);
  });

  it('BUG-06 stacks next-enemy-phase riders and expires them if they do not trigger', () => {
    const missed = createCombat(['bo'], 'rock', 40, 40);
    executeEffects(missed, getCard('rw_b076'), [], () => {}, noDraw);
    executeEffects(missed, getCard('rw_b076'), [], () => {}, noDraw);
    expect(missed.drawIfJinPending).toBe(2);
    missed.hand = [];
    missed.drawPile = Array.from({ length: 8 }, () => makeCard('bo'));
    missed.block = 0;
    endTurn(missed);
    expect(missed.drawIfJinPending).toBe(0);
    expect(missed.hand).toHaveLength(5);

    const caught = createCombat(['bo'], 'slime', 40, 40);
    executeEffects(caught, getCard('rw_b076'), [], () => {}, noDraw);
    executeEffects(caught, getCard('rw_b076'), [], () => {}, noDraw);
    caught.hand = [];
    caught.drawPile = Array.from({ length: 8 }, () => makeCard('bo'));
    caught.block = 99;
    endTurn(caught);
    expect(caught.hand).toHaveLength(7);
    expect(caught.drawIfJinPending).toBe(0);

    const bonus = createCombat(['bo'], 'slime', 40, 40);
    executeEffects(bonus, getCard('rw_b097'), [], () => {}, noDraw);
    executeEffects(bonus, getCard('rw_b097'), [], () => {}, noDraw);
    expect(bonus.bonusJinNextEnemyPhase).toBe(2);
    bonus.block = 99;
    endTurn(bonus);
    expect(bonus.jin).toBe(3);
    expect(bonus.bonusJinNextEnemyPhase).toBe(0);

    const quiet = createCombat(['bo'], 'slime', 40, 40);
    executeEffects(quiet, getCard('rw_b097'), [], () => {}, noDraw);
    quiet.block = 0;
    endTurn(quiet);
    expect(quiet.jin).toBe(0);
    expect(quiet.bonusJinNextEnemyPhase).toBe(0);

    const safe = createCombat(['bo'], 'slime', 40, 40);
    executeEffects(safe, getCard('rw_b128'), [], () => {}, noDraw);
    executeEffects(safe, getCard('rw_b128'), [], () => {}, noDraw);
    safe.block = 99;
    endTurn(safe);
    expect(safe.training).toBe(2);
    expect(safe.flawlessTrainingPending).toBe(0);

    const hit = createCombat(['bo'], 'slime', 40, 40);
    executeEffects(hit, getCard('rw_b128'), [], () => {}, noDraw);
    hit.block = 0;
    endTurn(hit);
    expect(hit.training).toBe(0);
    expect(hit.flawlessTrainingPending).toBe(0);
  });

  it('BUG-07 deals B042 hits only for basic attacks and through block, 易傷, and 練功', () => {
    const empty = createCombat(['mo'], 'rock', 40, 40);
    const emptyEnemy = empty.enemies[0]!;
    empty.hand = [makeCard('mo')];
    empty.drawPile = [makeCard('mo')];
    empty.discardPile = [makeCard('mo')];
    const emptyHp = emptyEnemy.hp;
    executeEffects(empty, getCard('rw_b042'), [emptyEnemy.id], () => {}, noDraw);
    expect(emptyEnemy.hp).toBe(emptyHp);

    const blocked = createCombat(['bo'], 'rock', 40, 40);
    const enemy = blocked.enemies[0]!;
    enemy.block = 10;
    enemy.vulnerableTurns = 2;
    blocked.hand = [];
    blocked.drawPile = [makeCard('bo'), makeCard('bo')];
    blocked.discardPile = [makeCard('bo')];
    const hp = enemy.hp;
    executeEffects(blocked, getCard('rw_b042'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hp);
    expect(enemy.block).toBe(1);

    const trained = createCombat(['bo'], 'rock', 40, 40);
    const trainedEnemy = trained.enemies[0]!;
    const played = makeCard('rw_b042');
    played.basicOverride = true;
    trained.training = 3;
    trained.hand = [];
    trained.drawPile = [];
    trained.discardPile = [makeCard('bo')];
    trainedEnemy.block = 100;
    executeEffects(trained, getCard('rw_b042'), [trainedEnemy.id], () => {}, noDraw, played);
    expect(trainedEnemy.hp).toBe(trainedEnemy.maxHp);
    expect(trainedEnemy.block).toBe(95);
  });

  it('BUG-08 routes conditional attack damage through block and 易傷', () => {
    const chase = createCombat(['o'], 'rock', 40, 40);
    const chaseEnemy = chase.enemies[0]!;
    chaseEnemy.block = 20;
    chaseEnemy.vulnerableTurns = 2;
    const chaseHp = chaseEnemy.hp;
    executeEffects(chase, getCard('o'), [chaseEnemy.id], () => {}, noDraw);
    expect(chaseEnemy.hp).toBe(chaseHp);
    expect(chaseEnemy.block).toBe(0);

    const borrow = createCombat(['bo'], 'rock', 40, 40);
    const borrowEnemy = borrow.enemies[0]!;
    borrow.jin = 2;
    borrowEnemy.block = 100;
    executeEffects(borrow, getCard('rw_b082'), [borrowEnemy.id], () => {}, noDraw);
    expect(borrow.jin).toBe(0);
    expect(borrowEnemy.hp).toBe(borrowEnemy.maxHp);
    expect(borrowEnemy.block).toBe(89);

    const marked = createCombat(['bo'], 'rock', 40, 40);
    const markedEnemy = marked.enemies[0]!;
    marked.jin = 1;
    markedEnemy.vulnerableTurns = 1;
    const markedHp = markedEnemy.hp;
    executeEffects(marked, getCard('rw_b082'), [markedEnemy.id], () => {}, noDraw);
    expect(markedEnemy.hp).toBe(markedHp - 12);

    const echo = createCombat(['bo'], 'rock', 40, 40);
    const echoEnemy = echo.enemies[0]!;
    echo.activePowerIds = ['B127'];
    echo.basicPlayedThisTurn = 1;
    echoEnemy.vulnerableTurns = 1;
    echoEnemy.block = 100;
    executeEffects(echo, getCard('rw_b102'), [echoEnemy.id], () => {}, noDraw);
    expect(echoEnemy.hp).toBe(echoEnemy.maxHp);
    expect(echoEnemy.block).toBe(86);

    const bridge = createCombat(['bo'], 'rock', 40, 40);
    const bridgeEnemy = bridge.enemies[0]!;
    bridge.training = 3;
    bridgeEnemy.block = 100;
    executeEffects(bridge, getCard('rw_b123'), [bridgeEnemy.id], () => {}, noDraw, null, true);
    expect(bridgeEnemy.block).toBe(90);
    executeEffects(bridge, getCard('rw_b123'), [bridgeEnemy.id], () => {}, noDraw);
    expect(bridgeEnemy.block).toBe(86);
  });

  it('BUG-09 keeps power and card interactions from masking each other', () => {
    const area = createCombat(['wu'], ['slime', 'bat'], 40, 40);
    area.activePowerIds = ['B114'];
    area.enemies[0]!.vulnerableTurns = 2;
    executeEffects(area, getCard('wu'), area.enemies.map((enemy) => enemy.id), () => {}, noDraw);
    expect(area.enemies[0]!.vulnerableTurns).toBe(3);
    expect(area.enemies[1]!.vulnerableTurns).toBe(0);

    const spend = createCombat(['fo'], 'rock', 40, 40);
    spend.activePowerIds = ['B131', 'B093'];
    spend.activePowerLevels = { B131: 0, B093: 0 };
    spend.jin = 1;
    spend.tempoCount = 2;
    let drawn = 0;
    executeEffects(spend, getCard('fo'), [spend.enemies[0]!.id], () => {}, (_state, count) => {
      drawn += count;
      return [];
    }, undefined, true);
    expect(spend.jin).toBe(1);
    expect(spend.block).toBe(2);
    expect(drawn).toBe(1);

    const installed = createCombat(['bo'], 'rock', 40, 40);
    const power = makeCard('rw_b024');
    installed.hand = [power];
    installed.energy = 3;
    installed.activePowerIds = ['B024'];
    installed.activePowerLevels = { B024: 1 };
    resolveCastSuccess(installed, beginPlay(installed, power.uid));
    expect(installed.activePowerLevels.B024).toBe(1);
    expect(installed.activePowerIds.filter((id) => id === 'B024')).toHaveLength(1);

    const tutor = createCombat(['bo'], 'rock', 40, 40);
    tutor.hand = Array.from({ length: 9 }, () => makeCard('mo'));
    const basic = makeCard('bo');
    const filler = makeCard('ge');
    tutor.drawPile = [basic, filler];
    executeEffects(tutor, resolveCard('zi', 1), [], () => {}, noDraw);
    expect(tutor.hand.some((card) => card.uid === basic.uid)).toBe(true);
    expect(tutor.drawPile.map((card) => card.uid)).toEqual([filler.uid]);

    const free = createCombat(['bo'], 'rock', 40, 40);
    executeEffects(free, getCard('rw_b049'), [], () => {}, noDraw);
    executeEffects(free, getCard('rw_b107'), [free.enemies[0]!.id], () => {}, noDraw);
    expect(free.freeBasicsRemaining).toBe(3);

    const capped = createCombat(['bo'], 'rock', 40, 40);
    capped.jin = 1;
    capped.enemies[0]!.vulnerableTurns = 8;
    executeEffects(capped, getCard('rw_b120'), [capped.enemies[0]!.id], () => {}, noDraw);
    expect(capped.enemies[0]!.vulnerableTurns).toBe(9);

  });

  it('BUG-10 removes single-character prompts that still have two readings', () => {
    const rows = Object.values(PHRASES_BY_INITIAL).flat();
    const spells = new Map<string, Set<string>>();
    for (const phrase of rows) {
      if ([...phrase.word].length !== 1) continue;
      const known = spells.get(phrase.word) ?? new Set<string>();
      known.add(phrase.spell);
      spells.set(phrase.word, known);
    }
    for (const [word, known] of spells) expect(known.size, word).toBe(1);
    expect(rows.some((phrase) => phrase.word === '了' || phrase.word === '覺' || phrase.word === '樂')).toBe(false);
    expect(rows.filter((phrase) => phrase.word === '還').map((phrase) => phrase.spell)).toEqual(['ㄏㄨㄢˊ']);
    expect(rows.filter((phrase) => phrase.word === '傳').map((phrase) => phrase.spell)).toEqual(['ㄔㄨㄢˊ']);
  });

  it('BUG-11 keeps the treasure reward source across a checkpoint', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'echoMage');
    state.screen = 'reward';
    state.rewardSource = 'treasure';
    const snap = snapshotRun(state);
    expect(snap?.rewardSource).toBe('treasure');
    const restored = createNewRun();
    restored.rewardSource = 'fight';
    applySnapshot(restored, snap!);
    expect(restored.rewardSource).toBe('treasure');

    const omitted = { ...snap!, rewardSource: undefined };
    delete omitted.rewardSource;
    expect(parseSnapshot(omitted)?.rewardSource).toBeUndefined();
    restored.rewardSource = 'treasure';
    applySnapshot(restored, omitted);
    expect(restored.rewardSource).toBeNull();
  });

  it('BUG-12 previews weakened enemy damage', () => {
    expect(intentTotalDamage({ kind: 'attack', value: 8 }, true)).toBe(6);
    expect(intentTotalDamage({ kind: 'multi', value: 3, hits: 2 }, true)).toBe(4);
    expect(intentTotalDamage({ kind: 'attack', value: 8 })).toBe(8);
  });

  it('previews the next attack without Weak when this action ticks the last turn off', () => {
    const fading = createCombat(['mo'], 'slimeWeak', 40, 40);
    const unit = fading.enemies[0]!;
    unit.weakTurns = 1;
    expect(intentTotalLabel(intentForUnit(unit), unit.weakTurns > 0)).toBe('⚔️ 2');
    expect(
      intentTotalLabel(
        nextIntentForUnit(unit),
        weakTurnsAfterEnemyAction(unit.weakTurns) > 0,
      ),
    ).toBe('⚔️ 3');

    fading.block = 0;
    const hp = fading.heroHp;
    endTurn(fading);
    expect(fading.heroHp).toBe(hp - 2);
    expect(unit.weakTurns).toBe(0);
    expect(intentTotalLabel(intentForUnit(unit), unit.weakTurns > 0)).toBe('⚔️ 3');

    const lasting = createCombat(['mo'], 'slimeWeak', 40, 40);
    const lastingUnit = lasting.enemies[0]!;
    lastingUnit.weakTurns = 2;
    expect(
      intentTotalLabel(
        nextIntentForUnit(lastingUnit),
        weakTurnsAfterEnemyAction(lastingUnit.weakTurns) > 0,
      ),
    ).toBe('⚔️ 2');
    lasting.block = 0;
    const lastingHp = lasting.heroHp;
    endTurn(lasting);
    expect(lasting.heroHp).toBe(lastingHp - 2);
    expect(lastingUnit.weakTurns).toBe(1);
    expect(intentTotalLabel(intentForUnit(lastingUnit), lastingUnit.weakTurns > 0)).toBe(
      '⚔️ 2',
    );

    const multi = createCombat(['mo'], 'slimeWeak', 40, 40);
    const multiUnit = multi.enemies[0]!;
    multiUnit.intentIndex = 1;
    multiUnit.weakTurns = 1;
    expect(
      intentTotalLabel(
        nextIntentForUnit(multiUnit),
        weakTurnsAfterEnemyAction(multiUnit.weakTurns) > 0,
      ),
    ).toBe('⚔️ 4');
    multi.block = 0;
    const multiHp = multi.heroHp;
    endTurn(multi);
    expect(multi.heroHp).toBe(multiHp - 2);
    expect(multiUnit.weakTurns).toBe(weakTurnsAfterEnemyAction(1));
    expect(intentTotalDamage(intentForUnit(multiUnit), multiUnit.weakTurns > 0)).toBe(4);
  });

  it('BUG-13 reveals practice mistakes and plays a fatal end-turn outro', () => {
    expect(practiceRevealKind(false)).toBe('correction');
    expect(practiceRevealKind(true)).toBe('success');
    expect(LEARNING_REVEAL_CONTINUE_MS).toBe(1200);
    expect(LEARNING_REVEAL_TOTAL_MS).toBe(2000);
    expect(endTurnShouldPlayOutro('defeat')).toBe(true);
    expect(endTurnShouldPlayOutro('victory')).toBe(true);
    expect(endTurnShouldPlayOutro('combat')).toBe(false);

    expect(coachForScreen('rest')).toMatchObject({
      title: '營火三選一',
    });
    expect(coachForScreen('rest').body).toContain('升級');
    expect(coachForScreen('actClear').body).toContain('回滿');
    expect(coachForScreen('relicPick').body).toContain('75');
    expect(coachForScreen('defeat').body).not.toContain('遺物');
    expect(coachForScreen('removeCard').body).toContain('回營火');
    expect(coachForScreen('practice').body).toContain('拼錯');
  });
});
