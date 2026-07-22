import { describe, expect, it } from 'vitest';
import { getCard } from '../../src/data/cards';
import {
  createCombat,
  executeEffects,
  type CombatFx,
} from '../../src/game/combat';

function attackBlock(block: number) {
  const combat = createCombat(['bo'], 'rock', 20, 20);
  const enemy = combat.enemies[0]!;
  enemy.block = block;
  const events: CombatFx[] = [];
  executeEffects(combat, getCard('bo'), [enemy.id], (fx) => events.push(fx), () => []);
  const strike = events.find(
    (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
  )!;
  return { enemy, impact: strike.impacts[0]! };
}

describe('ordered player impacts', () => {
  it('reports a fully blocked hit without fake HP damage', () => {
    const { enemy, impact } = attackBlock(4);
    expect(impact).toMatchObject({
      hitIndex: 0,
      blockBefore: 4,
      blocked: 3,
      blockAfter: 1,
      hpDamage: 0,
      killed: false,
    });
    expect(enemy.hp).toBe(enemy.maxHp);
  });

  it('reports shield break and only overflow as HP damage', () => {
    const { enemy, impact } = attackBlock(2);
    expect(impact).toMatchObject({
      blockBefore: 2,
      blocked: 2,
      blockAfter: 0,
      hpDamage: 1,
    });
    expect(enemy.hp).toBe(enemy.maxHp - 1);
  });
});
