import { describe, expect, it } from 'vitest';
import { resolveCard } from '../../src/data/cards';
import { beginPlay, createCombat, resolveCastSuccess, resolveCastFizzle } from '../../src/game/combat';

function combatWith(cardId: string, upgradeLevel: 0 | 1) {
  const deck = [cardId, 'ge', 'bo', 'mo', 'bo', 'mo', 'ge'].map((defId, index) => ({
    defId, uid: `test-${index}`, upgradeLevel: index === 0 ? upgradeLevel : 0 as const,
  }));
  const combat = createCombat(deck, 'slime', 40, 40);
  const all = [...combat.hand, ...combat.drawPile];
  for (const card of all) card.uid = card.sourceUid;
  combat.hand = deck.slice(0, 3).map((entry) => all.find((card) => card.uid === entry.uid)!);
  combat.drawPile = deck.slice(3).map((entry) => all.find((card) => card.uid === entry.uid)!);
  combat.pendingFx = [];
  return combat;
}

describe('authored card contracts', () => {
  it.each([0, 1] as const)('B144 retains Weak at upgrade level %s', (level) => {
    const combat = combatWith('rw_b144', level);
    const enemy = combat.enemies[0]!;
    enemy.vulnerableTurns = 2;
    const def = beginPlay(combat, 'test-0', [enemy.id]);
    resolveCastSuccess(combat, def);
    expect(enemy.weakTurns).toBe(2);
    expect(combat.block).toBe(5);
  });

  it.each([0, 1] as const)('B041 draws and converts only the chosen physical Attack at level %s', (level) => {
    const combat = combatWith('rw_b041', level);
    // The third card is selected deliberately, not the first Attack in hand.
    const def = beginPlay(combat, 'test-0', [], 'test-2');
    resolveCastSuccess(combat, def);
    expect(combat.hand.find((card) => card.uid === 'test-1')?.basicOverride).toBeFalsy();
    expect(combat.hand.find((card) => card.uid === 'test-2')?.basicOverride).toBe(true);
    expect(combat.hand).toHaveLength(level === 0 ? 3 : 4);
  });

  it('validates selection before spending energy or moving a card', () => {
    const combat = combatWith('rw_b041', 0);
    expect(() => beginPlay(combat, 'test-0', [], 'missing')).toThrow();
    expect(combat.energy).toBe(3);
    expect(combat.hand).toHaveLength(3);
  });

  it('still draws without a choice when no Attack is in hand', () => {
    const combat = combatWith('rw_b041', 0);
    combat.hand = combat.hand.slice(0, 1);
    const def = beginPlay(combat, 'test-0');
    resolveCastSuccess(combat, def);
    expect(combat.hand).toHaveLength(1);
    expect(combat.hand[0]?.basicOverride).toBeFalsy();
  });

  it('rejects an omitted choice when an Attack is available', () => {
    const combat = combatWith('rw_b041', 0);
    expect(() => beginPlay(combat, 'test-0')).toThrow('Choose a valid card');
    expect(combat.energy).toBe(3);
    expect(combat.pending).toBeNull();
  });

  it('a failed B041 cast neither draws nor converts the selected Attack', () => {
    const combat = combatWith('rw_b041', 1);
    const def = beginPlay(combat, 'test-0', [], 'test-2');
    resolveCastFizzle(combat, def);
    expect(combat.hand).toHaveLength(2);
    expect(combat.hand.every((card) => !card.basicOverride)).toBe(true);
    expect(resolveCard('rw_b041', 1).description).toContain('抽 2 張牌');
  });
});

it.each([0, 1] as const)('B051 keeps its promised 3 tempo Block at level %s', (level) => {
  const combat = combatWith('yi', level);
  combat.lastPlayedType = 'skill';
  const def = beginPlay(combat, 'test-0', [combat.enemies[0]!.id]);
  resolveCastSuccess(combat, def);
  expect(combat.block).toBe(3);
});
