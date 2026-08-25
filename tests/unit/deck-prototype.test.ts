import { beforeEach, describe, expect, it } from 'vitest';
import {
  CARDS,
  LATER_ACT_ELITE_REWARD_POOL_IDS,
  LATER_ACT_REWARD_POOL_IDS,
  REWARD_POOL_IDS,
  STARTER_DECK_IDS,
  getCard,
  resolveCard,
} from '../../src/data/cards';
import { getCharacter } from '../../src/data/characters';
import { getRelic } from '../../src/data/relics';
import {
  beginPlay,
  createCombat,
  drawCards,
  endTurn,
  executeEffects,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatFx,
} from '../../src/game/combat';
import { applyEnemyIntent } from '../../src/game/battle/enemyHandler';
import { makeCard } from '../../src/game/battle/piles';
import {
  canSmith,
  createNewRun,
  pickCharacter,
  startRun,
} from '../../src/game/state';
import { applySnapshot, snapshotRun, type RunSnapshotV1 } from '../../src/game/save';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('共鳴武者 catalog', () => {
  it('publishes the complete 75-card catalog with authored upgrades', () => {
    const character = getCharacter('echoMage');
    expect(Object.keys(CARDS)).toHaveLength(75);
    expect(new Set(Object.values(CARDS).map((card) => card.designId)).size).toBe(75);
    expect(Object.values(CARDS).every((card) => card.type !== 'block')).toBe(true);
    expect(character.status).toBe('playable');
    if (character.status !== 'playable') throw new Error('Expected playable character');
    expect(character.cardPoolIds).toHaveLength(75);
    expect(character.upgradesEnabled).toBe(true);
    expect(Object.values(CARDS).every((card) => !!card.upgrade)).toBe(true);
  });

  it('keeps the simple 5/4/1 starter and nine-card first reward wave', () => {
    expect(STARTER_DECK_IDS).toHaveLength(10);
    expect(STARTER_DECK_IDS.filter((id) => id === 'bo')).toHaveLength(5);
    expect(STARTER_DECK_IDS.filter((id) => id === 'mo')).toHaveLength(4);
    expect(STARTER_DECK_IDS.filter((id) => id === 'po')).toHaveLength(1);
    expect(REWARD_POOL_IDS).toHaveLength(9);
    expect(REWARD_POOL_IDS.some((id) => STARTER_DECK_IDS.includes(id))).toBe(false);
    expect(LATER_ACT_REWARD_POOL_IDS).toHaveLength(75);
    expect(LATER_ACT_ELITE_REWARD_POOL_IDS).toHaveLength(75);
    expect(new Set(LATER_ACT_REWARD_POOL_IDS).size).toBe(75);
    expect(getCard('mo')).toMatchObject({ type: 'skill', designId: 'B002' });
    const liveIds = [...new Set([...STARTER_DECK_IDS, ...REWARD_POOL_IDS])];
    expect(liveIds).toHaveLength(12);
    expect(liveIds.every((id) => getCard(id).cues.length >= 2)).toBe(true);
    expect(
      liveIds.every((id) =>
        !/\b(?:Deal|Gain|Apply|Draw|Spend|Cannot|Costs)\b/.test(getCard(id).description)
      ),
    ).toBe(true);
  });

  it('keeps all 75 player-facing card descriptions localized in Traditional Chinese', () => {
    const catalogIds = Object.keys(CARDS);
    expect(catalogIds).toHaveLength(75);
    expect(catalogIds.every((id) => getCard(id).cues.length >= 1)).toBe(true);
    expect(
      catalogIds.every((id) => {
        const card = getCard(id);
        const english = /\b(?:Deal|Gain|Apply|Draw|Spend|Cannot|Costs|Exhaust)\b/;
        const upgraded = card.upgrade?.description ?? '';
        return (
          /\p{Script=Han}/u.test(card.description) &&
          /\p{Script=Han}/u.test(upgraded) &&
          !/[A-Za-z]{2,}/.test(card.description) &&
          !/[A-Za-z]{2,}/.test(upgraded) &&
          !english.test(card.description) &&
          !english.test(upgraded)
        );
      }),
    ).toBe(true);
    expect(getCard('ne').effects).toEqual([
      { kind: 'block', amount: 3 },
      { kind: 'draw', amount: 1 },
    ]);
    expect(resolveCard('ne', 1).effects).toEqual([
      { kind: 'block', amount: 5 },
      { kind: 'draw', amount: 1 },
    ]);
  });

  it('creates physical starter copies and preserves the compatibility lineage', () => {
    const character = getCharacter('echoMage');
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, character.id);
    expect(character.name).toBe('共鳴武者');
    expect(state.deck.map((card) => card.defId)).toEqual(character.starterDeckIds);
    expect(new Set(state.deck.map((card) => card.uid)).size).toBe(10);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
    expect(getRelic(state.relicId!).firstAttackBonusDamage).toBe(1);
  });

  it('makes Smith available for an unupgraded deck', () => {
    const state = createNewRun();
    startRun(state);
    pickCharacter(state, 'echoMage');
    const rest = state.runMap.acts[0]!.nodes.find((node) => node.kind === 'rest')!;
    state.activeNodeId = rest.id;
    state.screen = 'rest';
    expect(canSmith(state)).toBe(true);
    expect(state.deck.every((card) => card.upgradeLevel === 0)).toBe(true);
  });

  it('loads a checkpoint without replacing its selected relic', () => {
    const source = createNewRun();
    startRun(source);
    pickCharacter(source, 'echoMage');
    source.relicId = 'coinPouch';
    const snapshot = snapshotRun(source)!;
    delete (snapshot as Partial<RunSnapshotV1>).characterId;
    const restored = createNewRun();
    applySnapshot(restored, snapshot);
    expect(restored.characterId).toBe('echoMage');
    expect(restored.relicId).toBe('coinPouch');
  });
});

describe('共鳴 combat rules', () => {
  const noDraw = () => [];
  const collect = (events: CombatFx[]) => (fx: CombatFx) => events.push(fx);

  it('amplifies Attack damage by 易傷', () => {
    const combat = createCombat(['po', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('po'), [enemy.id], () => {}, noDraw);
    expect(enemy.vulnerableTurns).toBe(2);
    const hpBefore = enemy.hp;
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hpBefore - 4);
  });

  it('adds 練功 to every hit of a 基礎攻擊', () => {
    const combat = createCombat(['shi', 'te'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(combat, getCard('shi'), [], () => {}, noDraw);
    expect(combat.training).toBe(2);
    const hpBefore = enemy.hp;
    executeEffects(combat, getCard('te'), [enemy.id], () => {}, noDraw);
    expect(enemy.hp).toBe(hpBefore - 8);
  });

  it('grants one 勁 when an enemy attack action is fully blocked', () => {
    const combat = createCombat(['mo'], 'slime', 30, 30);
    combat.block = 99;
    endTurn(combat);
    expect(combat.jin).toBe(1);
  });

  it('treats a multi-hit intent as one 化勁 action and rejects any HP leak', () => {
    const blocked = createCombat(['mo'], 'bat', 30, 30);
    blocked.block = 4;
    applyEnemyIntent(blocked, blocked.enemies[0]!);
    expect(blocked.heroHp).toBe(30);
    expect(blocked.jin).toBe(1);

    const leaked = createCombat(['mo'], 'bat', 30, 30);
    leaked.block = 3;
    applyEnemyIntent(leaked, leaked.enemies[0]!);
    expect(leaked.heroHp).toBe(29);
    expect(leaked.jin).toBe(0);
  });

  it('triggers 轉拍 only after two successful alternating casts', () => {
    const combat = createCombat(['mo', 'yi', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    const shield = combat.hand.find((card) => card.defId === 'mo')!;
    const tempoAttack = combat.hand.find((card) => card.defId === 'yi')!;

    const shieldDef = beginPlay(combat, shield.uid);
    resolveCastSuccess(combat, shieldDef);
    expect(combat.lastPlayedType).toBe('skill');
    const blockBefore = combat.block;

    const attackDef = beginPlay(combat, tempoAttack.uid, [enemy.id]);
    resolveCastSuccess(combat, attackDef);
    expect(combat.tempoCount).toBe(1);
    expect(combat.block).toBe(blockBefore + 3);
  });

  it('failed casts do not update 轉拍 or spend 勁', () => {
    const combat = createCombat(['mo', 'fo', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    combat.jin = 1;
    const shield = combat.hand.find((card) => card.defId === 'mo')!;
    const shieldDef = beginPlay(combat, shield.uid);
    resolveCastFizzle(combat, shieldDef);
    expect(combat.lastPlayedType).toBeNull();

    const spender = combat.hand.find((card) => card.defId === 'fo')!;
    const spenderDef = beginPlay(combat, spender.uid, [combat.enemies[0]!.id]);
    resolveCastFizzle(combat, spenderDef);
    expect(combat.jin).toBe(1);
  });

  it('spends one 勁 only when 化勁掌 resolves successfully', () => {
    const combat = createCombat(['fo', 'bo', 'bo', 'bo', 'bo'], 'rock', 30, 30);
    combat.jin = 1;
    const enemy = combat.enemies[0]!;
    const hpBefore = enemy.hp;
    const spender = combat.hand.find((card) => card.defId === 'fo')!;
    const def = beginPlay(combat, spender.uid, [enemy.id]);
    expect(combat.jin).toBe(1);
    resolveCastSuccess(combat, def);
    expect(combat.jin).toBe(0);
    expect(enemy.hp).toBe(hpBefore - 8);
  });

  it('draws one card when 邊擋邊唱 resolves', () => {
    const combat = createCombat(['ne', 'bo', 'bo', 'bo', 'bo', 'mo'], 'rock', 30, 30);
    const handBefore = combat.hand.length;
    const blockBefore = combat.block;
    executeEffects(combat, getCard('ne'), [], () => {}, drawCards);
    expect(combat.block).toBe(blockBefore + 3);
    expect(combat.hand.length).toBe(handBefore + 1);
  });

  it('keeps conditional riders unchanged on upgraded Wave 2 cards', () => {
    const vulnerableCombat = createCombat(['xi'], 'rock', 30, 30);
    const vulnerableEnemy = vulnerableCombat.enemies[0]!;
    vulnerableEnemy.vulnerableTurns = 2;
    const hpBefore = vulnerableEnemy.hp;
    executeEffects(
      vulnerableCombat,
      resolveCard('xi', 1),
      [vulnerableEnemy.id],
      () => {},
      noDraw,
    );
    expect(vulnerableEnemy.hp).toBe(hpBefore - 12);

    const tempoCombat = createCombat(['a'], 'rock', 30, 30);
    const tempoEnemy = tempoCombat.enemies[0]!;
    const tempoHpBefore = tempoEnemy.hp;
    executeEffects(
      tempoCombat,
      resolveCard('a', 1),
      [tempoEnemy.id],
      () => {},
      noDraw,
      undefined,
      true,
    );
    expect(tempoCombat.block).toBe(7);
    expect(tempoEnemy.hp).toBe(tempoHpBefore - 3);

    const basicDefense = createCombat(['si'], 'rock', 30, 30);
    basicDefense.basicPlayedThisTurn = 1;
    executeEffects(basicDefense, resolveCard('si', 1), [], () => {}, noDraw);
    expect(basicDefense.block).toBe(9);
  });

  it('applies conditional area 易傷 only to enemies without it', () => {
    const combat = createCombat(['zhi'], ['slime', 'bat'], 30, 30);
    const [marked, open] = combat.enemies;
    marked!.vulnerableTurns = 2;
    executeEffects(
      combat,
      getCard('zhi'),
      combat.enemies.map((enemy) => enemy.id),
      () => {},
      noDraw,
    );
    expect(marked!.vulnerableTurns).toBe(2);
    expect(open!.vulnerableTurns).toBe(1);
  });

  it('resolves upgraded draw riders from their structured effects', () => {
    const combat = createCombat(['de'], 'rock', 30, 30);
    let drawn = 0;
    executeEffects(
      combat,
      resolveCard('de', 1),
      [],
      () => {},
      (_state, count) => {
        drawn += count;
        return [];
      },
    );
    expect(drawn).toBe(1);
  });

  it('uses the installed Power copy upgrade for later triggers', () => {
    const combat = createCombat(['he', 'bo', 'bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    let drawn = 0;
    const countDraw = (_state: typeof combat, count: number) => {
      drawn += count;
      return [];
    };

    combat.activePowerIds = ['B024', 'B040', 'B093', 'B131'];
    combat.activePowerLevels = { B024: 1, B040: 1, B093: 1, B131: 1 };
    executeEffects(combat, getCard('he'), [enemy.id], () => {}, countDraw);
    expect(drawn).toBe(2);

    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, countDraw);
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, countDraw);
    executeEffects(combat, getCard('bo'), [enemy.id], () => {}, countDraw);
    expect(combat.training).toBe(2);

    combat.jin = 1;
    executeEffects(combat, getCard('fo'), [enemy.id], () => {}, countDraw);
    expect(drawn).toBe(4);

    combat.tempoCount = 1;
    executeEffects(combat, getCard('mo'), [], () => {}, countDraw, undefined, true);
    expect(combat.training).toBe(4);
  });

  it('uses the upgraded 化勁留隙 duration during the enemy phase', () => {
    const combat = createCombat(['mo'], 'slime', 30, 30);
    combat.activePowerIds = ['B100'];
    combat.activePowerLevels = { B100: 1 };
    combat.block = 99;
    applyEnemyIntent(combat, combat.enemies[0]!);
    expect(combat.enemies[0]!.vulnerableTurns).toBe(2);
  });

  it('keeps cost-only basic discounts aligned with their locked text', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    executeEffects(combat, resolveCard('rw_b049', 1), [], () => {}, noDraw);
    expect(combat.freeBasicsRemaining).toBe(2);

    combat.freeBasicsRemaining = 0;
    combat.hand = [];
    executeEffects(
      combat,
      getCard('rw_b107'),
      [combat.enemies[0]!.id],
      () => {},
      noDraw,
    );
    expect(combat.freeBasicsRemaining).toBe(1);

    combat.block = 99;
    endTurn(combat);
    expect(combat.freeBasicsRemaining).toBe(0);
  });

  it('checks exactly the cards drawn by 聽拍尋隙, including its upgrade', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    executeEffects(
      combat,
      resolveCard('rw_b122', 1),
      [enemy.id],
      () => {},
      () => [makeCard('bo'), makeCard('mo'), makeCard('mo')],
    );
    expect(enemy.vulnerableTurns).toBe(1);

    enemy.vulnerableTurns = 0;
    executeEffects(
      combat,
      resolveCard('rw_b122', 1),
      [enemy.id],
      () => {},
      () => [makeCard('bo'), makeCard('bo'), makeCard('mo')],
    );
    expect(enemy.vulnerableTurns).toBe(0);
  });

  it('applies 轉拍 hit bonuses through ordinary damage rules', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    combat.tempoCount = 2;
    enemy.block = 10;
    enemy.vulnerableTurns = 1;
    const hpBefore = enemy.hp;
    executeEffects(
      combat,
      getCard('rw_b061'),
      [enemy.id],
      () => {},
      noDraw,
    );
    expect(enemy.block).toBe(0);
    expect(enemy.hp).toBe(hpBefore - 8);
  });

  it('repeats the second basic Attack damage with its resolved bonuses', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    const enemy = combat.enemies[0]!;
    combat.activePowerIds = ['B127'];
    combat.activePowerLevels = { B127: 0 };
    combat.basicPlayedThisTurn = 1;
    combat.training = 2;
    enemy.vulnerableTurns = 1;
    const hpBefore = enemy.hp;
    let drawn = 0;
    executeEffects(
      combat,
      getCard('bo'),
      [enemy.id],
      () => {},
      (_state, count) => {
        drawn += count;
        return [];
      },
    );
    expect(enemy.hp).toBe(hpBefore - 14);
    expect(drawn).toBe(1);
  });

  it('triggers 聲波循環 from its installed Power once per turn', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    combat.activePowerIds = ['B115'];
    combat.activePowerLevels = { B115: 0 };
    combat.discardPile = [makeCard('mo')];
    executeEffects(combat, getCard('bo'), [combat.enemies[0]!.id], () => {}, noDraw, undefined, true);
    expect(combat.drawPile.at(-1)?.defId).toBe('mo');
    expect(combat.powerTriggersThisTurn.B115).toBe(1);

    combat.discardPile = [makeCard('ne')];
    executeEffects(combat, getCard('bo'), [combat.enemies[0]!.id], () => {}, noDraw, undefined, true);
    expect(combat.discardPile).toHaveLength(1);
  });

  it('lets 聞聲即動 find the needed type after a discard reshuffle', () => {
    const combat = createCombat(['bo'], 'rock', 30, 30);
    combat.activePowerIds = ['B129'];
    combat.activePowerLevels = { B129: 0 };
    combat.hand = [];
    combat.drawPile = Array.from({ length: 5 }, () => makeCard('bo'));
    combat.discardPile = [makeCard('mo')];
    combat.block = 99;
    endTurn(combat);
    expect(combat.hand).toHaveLength(6);
    expect(combat.hand.some((card) => card.defId === 'mo')).toBe(true);
  });

  it('uses 初心音叉 once each player turn', () => {
    const combat = createCombat(['bo', 'bo'], 'rock', 99, 99, getRelic('tuningFork'));
    const enemy = combat.enemies[0]!;
    const first: CombatFx[] = [];
    executeEffects(combat, getCard('bo'), [enemy.id], collect(first), noDraw);
    const firstStrike = first.find(
      (fx): fx is Extract<CombatFx, { type: 'playerStrike' }> => fx.type === 'playerStrike',
    );
    expect(firstStrike?.impacts[0]?.relicBonus).toBe(1);
    expect(combat.firstAttackBonusReady).toBe(false);
    combat.block = 99;
    endTurn(combat);
    expect(combat.firstAttackBonusReady).toBe(true);
  });
});
