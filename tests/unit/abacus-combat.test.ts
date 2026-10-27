import { beforeEach, describe, expect, it } from 'vitest';
import { ABACUS_STARTER_DECK_IDS } from '../../src/data/abacusCards';
import { HERO_MAX_HP } from '../../src/data/balance';
import { getRelic, type RelicDef } from '../../src/data/relics';
import {
  addBeads,
  beginPlay,
  canPlay,
  combatRulesForGate,
  createCombat,
  endTurn,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatState,
} from '../../src/game/combat';
import { answerCast, createNewRun, debugStartEncounter, pickCharacter, startRun, useParentHint } from '../../src/game/state';
import type { CastingPrompt } from '../../src/game/casting/types';

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

const MATH = combatRulesForGate('math');

function fight(
  cardId: string,
  relics: RelicDef | readonly RelicDef[] | null = null,
  enemy: string | string[] = 'rock',
): CombatState {
  const combat = createCombat(Array.from({ length: 8 }, () => cardId), enemy, 80, 80, relics, undefined, MATH);
  combat.energy = 9;
  for (const unit of combat.enemies) {
    unit.hp = 80;
    unit.maxHp = 80;
  }
  return combat;
}

function play(combat: CombatState, success = true): void {
  const card = combat.hand.find((entry) => canPlay(combat, entry.uid));
  if (!card) throw new Error('no playable card');
  const def = beginPlay(combat, card.uid);
  if (success) resolveCastSuccess(combat, def);
  else resolveCastFizzle(combat, def);
}

function mathPrompt(answer = '4'): CastingPrompt {
  return {
    id: 'math-test',
    contentId: 'math:add10@1:2 + 2:4',
    gateId: 'math',
    lessonFamilyId: 'add10@1',
    adaptiveFamily: 'add10',
    focusGlyph: '+',
    inputMode: 'singleChoice',
    mode: 'recognize',
    cue: { text: '2 + 2 = ？', emoji: '🧮', speechText: '2 + 2', word: '2 + 2', spell: answer },
    answerTokens: [answer],
    choiceTokens: ['3', '4', '5'],
    correctSpell: answer,
    correctParts: [answer],
    symbolBank: ['3', '4', '5'],
    correctionText: `答案是 ${answer}`,
    ambientMana: { id: 'clear', icon: '✨', label: '魔力清澈' },
    speechFallback: false,
    createdAt: 1,
    tier: 1,
  };
}

describe('珠算武者 combat', () => {
  it('turns 10 beads into one 十串 and lets 木珠串 ignore Block and 易傷', () => {
    const combat = fight('ab_m001', getRelic('woodBeads'), ['slime', 'bat']);
    const [first, second] = combat.enemies;
    second!.block = 9;
    second!.vulnerableTurns = 4;
    addBeads(combat, 8);
    expect(combat.beads).toBe(8);
    expect(combat.tens).toBe(0);
    const before = second!.hp;
    expect(addBeads(combat, 4, second!.id)).toBe(1);
    expect(combat.beads).toBe(2);
    expect(combat.tens).toBe(1);
    expect(second!.hp).toBe(before - 2);
    expect(second!.block).toBe(9);
    expect(first!.hp).toBe(80);
  });

  it('keeps firing 湊十 at the 十串 cap and skips damage when nobody is alive', () => {
    const combat = fight('ab_m001', getRelic('woodBeads'));
    combat.tens = 9;
    const before = combat.enemies[0]!.hp;
    expect(addBeads(combat, 20)).toBe(2);
    expect(combat.tens).toBe(9);
    expect(combat.beads).toBe(0);
    expect(combat.enemies[0]!.hp).toBe(before - 4);
    combat.enemies[0]!.alive = false;
    combat.enemies[0]!.hp = 0;
    expect(addBeads(combat, 10)).toBe(1);
    expect(combat.tens).toBe(9);
  });

  it('does not grant 勁 for a full block', () => {
    const abacus = fight('ab_m002', null, 'slime');
    abacus.block = 30;
    endTurn(abacus);
    expect(abacus.jin).toBe(0);

    const echo = createCombat(['bo'], 'slime', 40, 40);
    echo.block = 30;
    endTurn(echo);
    expect(echo.jin).toBe(1);
  });

  it('adds the bead pouch on its own, rings the bell once, and blocks on the third cast', () => {
    const pouch = fight('ab_m002', getRelic('beadPouch'));
    expect(pouch.beads).toBe(4);
    expect(pouch.tens).toBe(0);

    const bell = fight('ab_m001', [getRelic('woodBeads'), getRelic('tenBell')]);
    const energy = bell.energy;
    addBeads(bell, 10);
    expect(bell.energy).toBe(energy + 1);
    addBeads(bell, 10);
    expect(bell.energy).toBe(energy + 1);

    const ruler = fight('ab_m002', getRelic('rulerCharm'));
    play(ruler);
    play(ruler);
    expect(ruler.block).toBe(8);
    play(ruler, false);
    expect(ruler.castsThisTurn).toBe(2);
    expect(ruler.block).toBe(8);
    play(ruler);
    expect(ruler.castsThisTurn).toBe(3);
    expect(ruler.block).toBe(15);
    play(ruler);
    expect(ruler.block).toBe(19);
    ruler.block = 30;
    endTurn(ruler);
    expect(ruler.castsThisTurn).toBe(0);
    expect(ruler.rulerCharmUsedThisTurn).toBe(false);
  });

  it('gives eraser beads only when the cast actually fizzles', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'abacusFist');
    state.relicIds = ['woodBeads', 'eraser'];
    debugStartEncounter(state, 'rock');
    const combat = state.combat!;
    const card = combat.hand[0]!;
    const def = beginPlay(combat, card.uid);
    state.cast = { prompt: mathPrompt(), cardDef: def };
    state.screen = 'castCheck';
    expect(answerCast(state, ['9'])).toBe('retry');
    expect(combat.mathRetryUsed).toBe(true);
    expect(combat.mathMissStreak).toBe(0);
    expect(combat.beads).toBe(0);
    expect(combat.castsThisTurn).toBe(0);
    expect(state.cast?.prompt.retry).toBe(true);
    expect(answerCast(state, ['9'])).toBe('fizzle');
    expect(combat.beads).toBe(2);
    expect(combat.castsThisTurn).toBe(0);
    expect(combat.log.some((line) => line.includes('橡皮擦'))).toBe(true);

    const again = combat.hand.find((entry) => canPlay(combat, entry.uid));
    const second = beginPlay(combat, again!.uid);
    state.cast = { prompt: mathPrompt(), cardDef: second };
    state.screen = 'castCheck';
    expect(answerCast(state, ['9'])).toBe('fizzle');
    expect(combat.beads).toBe(2);
  });

  it('keeps 再算一次 for a later card after 💡 was used on an earlier card', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'abacusFist');
    debugStartEncounter(state, 'rock');
    const combat = state.combat!;
    combat.energy = 9;
    const firstDef = beginPlay(combat, combat.hand[0]!.uid);
    state.cast = { prompt: mathPrompt(), cardDef: firstDef };
    state.screen = 'castCheck';
    expect(useParentHint(state)).toContain('4');
    expect(state.cast?.prompt.hintRevealedAnswer).toBe(true);
    expect(answerCast(state, ['9'])).toBe('fizzle');
    expect(combat.parentHintUsed).toBe(true);
    expect(combat.mathRetryUsed).toBe(false);

    const second = combat.hand.find((card) => canPlay(combat, card.uid));
    expect(second).toBeTruthy();
    const secondDef = beginPlay(combat, second!.uid);
    state.cast = { prompt: mathPrompt(), cardDef: secondDef };
    state.screen = 'castCheck';
    expect(state.cast.prompt.hintRevealedAnswer).toBeUndefined();
    expect(answerCast(state, ['9'])).toBe('retry');
    expect(combat.mathRetryUsed).toBe(true);
    expect(state.cast?.prompt.retry).toBe(true);
  });

  it('fizzles immediately when the parent hint was used before the first try', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'abacusFist');
    debugStartEncounter(state, 'rock');
    const combat = state.combat!;
    const def = beginPlay(combat, combat.hand[0]!.uid);
    state.cast = { prompt: mathPrompt(), cardDef: def };
    state.screen = 'castCheck';
    expect(useParentHint(state)).toContain('4');
    expect(answerCast(state, ['9'])).toBe('fizzle');
    expect(combat.mathRetryUsed).toBe(false);
    expect(combat.mathMissStreak).toBe(1);
  });

  it('spends 十串 only when the card says so, and the third cast counts itself', () => {
    const palm = fight('ab_m003');
    palm.tens = 1;
    play(palm);
    expect(palm.tens).toBe(0);
    expect(palm.enemies[0]!.hp).toBe(80 - 10);

    const empty = fight('ab_m003');
    play(empty);
    expect(empty.tens).toBe(0);
    expect(empty.enemies[0]!.hp).toBe(80 - 5);

    const heavy = fight('ab_m021');
    heavy.tens = 2;
    play(heavy);
    expect(heavy.tens).toBe(0);
    expect(heavy.enemies[0]!.hp).toBe(80 - 16);

    const third = fight('ab_m010');
    play(third);
    expect(third.enemies[0]!.hp).toBe(80 - 4);
    play(third);
    play(third);
    expect(third.castsThisTurn).toBe(3);
    expect(third.enemies[0]!.hp).toBe(80 - 4 - 4 - 8);
  });

  it('primes 比大小 from the shown intent and installs 撥算如飛 for the next turn', () => {
    const compare = fight('ab_m015', null, 'slime');
    compare.block = 0;
    play(compare);
    expect(compare.enemies[0]!.vulnerableTurns).toBe(1);
    expect(compare.enemies[0]!.hp).toBe(80 - 7);

    const safe = fight('ab_m015', null, 'slime');
    safe.block = 20;
    play(safe);
    expect(safe.enemies[0]!.vulnerableTurns).toBe(0);
    expect(safe.enemies[0]!.hp).toBe(80 - 8);

    const tempo = fight('ab_m019');
    play(tempo);
    expect(tempo.activePowerIds).toContain('M019');
    tempo.block = 40;
    endTurn(tempo);
    expect(tempo.beads).toBe(2);
    expect(tempo.castsThisTurn).toBe(0);
  });

  it('wins a starter fight against 小史萊姆 without gaining 勁', () => {
    let makeTens = 0;
    for (let fightIndex = 0; fightIndex < 16; fightIndex += 1) {
      const combat = createCombat(
        [...ABACUS_STARTER_DECK_IDS],
        'slime',
        HERO_MAX_HP,
        HERO_MAX_HP,
        getRelic('woodBeads'),
        undefined,
        MATH,
      );
      for (let turn = 0; turn < 30 && combat.status === 'playing'; turn += 1) {
        while (combat.status === 'playing' && combat.hand.some((card) => canPlay(combat, card.uid))) {
          play(combat);
        }
        if (combat.status !== 'playing') break;
        endTurn(combat);
      }
      expect(combat.status).toBe('won');
      expect(combat.jin).toBe(0);
      makeTens += combat.makeTenCount;
    }
    expect(makeTens).toBeGreaterThan(0);
  });
});
