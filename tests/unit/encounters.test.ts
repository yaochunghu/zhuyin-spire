import { describe, expect, it } from 'vitest';
import { resolveCard, STARTER_DECK_IDS } from '../../src/data/cards';
import {
  ACT_EASY_SOLOS,
  ACT_ELITE_POOL,
  ACT_HARD_SOLOS,
  BOSS_ID,
  ENEMIES,
  coachBodyForEnemies,
  type IntentStep,
} from '../../src/data/enemies';
import {
  ACT_EASY_MULTIS,
  ACT_HARD_MULTIS,
  EASY_NORMAL_QUOTA,
  ENCOUNTERS,
  isEasyFightKey,
} from '../../src/data/encounters';
import { generateRunMap, type ActMap, type MapNode } from '../../src/data/map';
import {
  beginPlay,
  canPlay,
  createCombat,
  endTurn,
  intentForUnit,
  nextIntentForUnit,
  resolveCastFizzle,
  resolveCastSuccess,
  type CombatState,
  type EnemyUnit,
} from '../../src/game/combat';
import { noteSuccessfulCast } from '../../src/game/battle/enemyHandler';

const MID_DECK = [
  'ge', 'ge', 'ge', 'ge',
  'po', 'po',
  'bo', 'bo',
  'ri', 'ri',
  'ke', 'ke',
  'mo', 'mo',
];

const PEAK: Record<string, number> = {
  '1:normal': 7,
  '1:elite': 10,
  '1:boss': 10,
  '2:normal': 9,
  '2:elite': 12,
  '2:boss': 13,
  '3:normal': 12,
  '3:elite': 12,
  '3:boss': 14,
};

function seededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

function withRng<T>(seed: number, run: () => T): T {
  const prev = Math.random;
  Math.random = seededRng(seed);
  try {
    return run();
  } finally {
    Math.random = prev;
  }
}

function intentTotal(step: IntentStep, strength: number): number {
  if (step.kind === 'block') return 0;
  const hits = step.kind === 'multi' ? (step.hits ?? 1) : 1;
  return (step.value + strength) * hits;
}

function living(state: CombatState): EnemyUnit[] {
  return state.enemies.filter((enemy) => enemy.alive && enemy.hp > 0);
}

function incoming(state: CombatState): number {
  let total = 0;
  for (const enemy of living(state)) {
    const intent = intentForUnit(enemy, state);
    if (intent.kind === 'block') continue;
    const hits = intent.kind === 'multi' ? (intent.hits ?? 1) : 1;
    const perHit = Math.floor(intent.value * (enemy.weakTurns > 0 ? 0.75 : 1));
    total += perHit * hits;
  }
  return total;
}

function cardSpec(defId: string): { damage: number; hits: number; block: number; aoe: boolean } {
  const def = resolveCard(defId, 0);
  let damage = 0;
  let hits = 1;
  let block = 0;
  for (const effect of def.effects) {
    if (effect.kind === 'damage') {
      damage = effect.amount;
      hits = effect.hits ?? 1;
    } else if (effect.kind === 'block') {
      block += effect.amount;
    }
  }
  return { damage, hits, block, aoe: def.target === 'allEnemies' };
}

function strike(enemy: EnemyUnit, amount: number, hits: number): { hp: number; blocked: number; kill: number } {
  let block = enemy.block;
  let hp = 0;
  const hit = Math.floor(Math.max(0, amount) * (enemy.vulnerableTurns > 0 ? 1.5 : 1));
  for (let index = 0; index < hits; index += 1) {
    const blocked = Math.min(block, hit);
    block -= blocked;
    hp += hit - blocked;
  }
  return {
    hp,
    blocked: enemy.block - block,
    kill: hp >= enemy.hp && enemy.hp > 0 ? 1 : 0,
  };
}

function attackScore(state: CombatState, defId: string, target: EnemyUnit): number {
  const spec = cardSpec(defId);
  const targets = spec.aoe ? living(state) : [target];
  return targets.reduce((sum, enemy) => {
    const hit = strike(enemy, spec.damage, spec.hits);
    return sum + hit.hp * 10 + hit.kill * 40 + hit.blocked;
  }, 0);
}

function play(state: CombatState, uid: string, targetId?: string): void {
  const def = beginPlay(state, uid, targetId ? [targetId] : []);
  resolveCastSuccess(state, def);
}

function playTurn(state: CombatState): void {
  for (let step = 0; step < 6 && state.status === 'playing'; step += 1) {
    const ready = state.hand.filter((card) => {
      const spec = cardSpec(card.defId);
      return (spec.damage > 0 || spec.block > 0) && canPlay(state, card.uid);
    });
    if (ready.length === 0 || living(state).length === 0) break;
    const threat = Math.max(0, incoming(state) - state.block);
    if (threat > 0) {
      const blocks = ready.filter((card) => cardSpec(card.defId).block > 0 && cardSpec(card.defId).damage === 0);
      if (blocks.length > 0) {
        const covering = blocks.filter((card) => cardSpec(card.defId).block >= threat);
        const chosen = (covering.length > 0 ? covering : blocks)
          .sort((a, b) => {
            const delta = cardSpec(a.defId).block - cardSpec(b.defId).block;
            return covering.length > 0 ? delta : -delta;
          })[0]!;
        play(state, chosen.uid);
        continue;
      }
    }
    const target = living(state).sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
    if (!target) break;
    const attacks = ready.filter((card) => cardSpec(card.defId).damage > 0);
    if (attacks.length === 0) break;
    const chosen = attacks
      .sort((a, b) => attackScore(state, b.defId, target) - attackScore(state, a.defId, target))[0]!;
    play(state, chosen.uid, target.id);
  }
  if (state.status === 'playing') endTurn(state);
}

function runFight(
  seed: number,
  deck: string[],
  enemyId: string,
  encounterId?: string,
): CombatState {
  return withRng(seed, () => {
    const state = createCombat(deck, enemyId, 40, 40, null, encounterId);
    for (let turn = 0; turn < 48 && state.status === 'playing'; turn += 1) playTurn(state);
    return state;
  });
}

function shield(state: CombatState): void {
  state.block = 99;
}

const NEW_FIGHTS: Array<{ label: string; enemyId: string; encounterId?: string; deck: string[] }> = [
  { label: '跟讀蟲', enemyId: 'echoBug', deck: STARTER_DECK_IDS },
  { label: '鼓手與石怪', enemyId: 'slime', encounterId: 'drumSquad', deck: STARTER_DECK_IDS },
  { label: '跟讀與史萊姆', enemyId: 'slime', encounterId: 'echoPair', deck: STARTER_DECK_IDS },
  { label: '鐘粉蛾', enemyId: 'bellMoth', deck: MID_DECK },
  { label: '塵鼓', enemyId: 'dustDrum', deck: MID_DECK },
  { label: '小指揮', enemyId: 'littleConductor', deck: MID_DECK },
  { label: '鏡音', enemyId: 'mirrorNote', deck: MID_DECK },
  { label: '冠鐘', enemyId: 'crownBell', deck: MID_DECK },
  { label: '和聲蛹', enemyId: 'eliteChorus', deck: MID_DECK },
  { label: '樂團指揮', enemyId: 'eliteConductor', deck: MID_DECK },
  { label: '慢拍鼓', enemyId: 'eliteMuteDrum', deck: MID_DECK },
  { label: '七音晶', enemyId: 'elitePrism', deck: MID_DECK },
  { label: '喚星使', enemyId: 'eliteStarCaller', deck: MID_DECK },
  { label: '盔甲與鐘蛾', enemyId: 'slime', encounterId: 'a2_armor_moth', deck: MID_DECK },
  { label: '塵鼓與毒蛙', enemyId: 'slime', encounterId: 'a2_drum_toad', deck: MID_DECK },
  { label: '冠鐘與鏡音', enemyId: 'slime', encounterId: 'a3_crown_mirror', deck: MID_DECK },
  { label: '晶盾與鏡音', enemyId: 'slime', encounterId: 'a3_crystal_mirror', deck: MID_DECK },
  { label: '塔守護獸', enemyId: 'boss1', deck: MID_DECK },
  { label: '雙翼監守', enemyId: 'boss2', deck: MID_DECK },
  { label: '注音終焉王', enemyId: 'boss3', deck: MID_DECK },
];

describe('encounter budgets', () => {
  it('keeps every attack, including one point of capped strength, inside the live peak', () => {
    for (const def of Object.values(ENEMIES)) {
      const ceiling = PEAK[`${def.act}:${def.tier}`]!;
      const cap = def.strengthCap ?? 0;
      const steps = [
        ...def.pattern,
        ...(def.phases?.flatMap((phase) => [phase.enter, ...phase.pattern]) ?? []),
      ];
      for (const step of steps) {
        expect(intentTotal(step, cap), `${def.id} ${step.kind} ${step.value}`).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it('opens new packs at or under the old pack peaks', () => {
    const opening = (id: string) => ENCOUNTERS[id]!.enemyDefIds.reduce((sum, defId) => {
      return sum + intentTotal(ENEMIES[defId]!.pattern[0]!, 0);
    }, 0);
    expect(opening('drumSquad')).toBeLessThanOrEqual(7);
    expect(opening('echoPair')).toBeLessThanOrEqual(7);
    expect(opening('a2_armor_moth')).toBeLessThanOrEqual(6);
    expect(opening('a2_drum_toad')).toBeLessThanOrEqual(6);
    expect(opening('a3_crown_mirror')).toBeLessThanOrEqual(13);
    expect(opening('a3_crystal_mirror')).toBeLessThanOrEqual(13);
  });

  it('leaves the shared Act I patterns alone', () => {
    expect(ENEMIES.slimeWeak!.pattern.map((step) => step.value)).toEqual([3, 3, 2]);
    expect(ENEMIES.rock!.pattern.map((step) => [step.kind, step.value])).toEqual([
      ['block', 7],
      ['attack', 4],
      ['block', 6],
      ['attack', 5],
    ]);
  });
});

describe('listener, buffer, summon, and boss phase', () => {
  it('softens a later 跟讀蟲 attack and leaves the current pill alone', () => {
    const state = createCombat(['bo', 'bo', 'bo', 'bo', 'bo'], 'echoBug', 40, 40);
    const bug = state.enemies[0]!;
    expect(intentForUnit(bug, state).value).toBe(4);
    expect(nextIntentForUnit(bug, state).value).toBe(5);

    const fizzled = state.hand[0]!;
    resolveCastFizzle(state, beginPlay(state, fizzled.uid));
    expect(bug.pendingSoothe).toBe(0);
    expect(nextIntentForUnit(bug, state).value).toBe(5);

    resolveCastSuccess(state, beginPlay(state, state.hand[0]!.uid));
    expect(bug.pendingSoothe).toBe(1);
    expect(intentForUnit(bug, state).value).toBe(4);
    expect(nextIntentForUnit(bug, state).value).toBe(4);

    for (let extra = 0; extra < 8; extra += 1) noteSuccessfulCast(state);
    expect(bug.pendingSoothe).toBe(6);
    expect(nextIntentForUnit(bug, state).value).toBe(1);
    expect(intentForUnit(bug, state).value).toBe(4);
  });

  it('carries soothe across a block and applies Weak only when the hit resolves', () => {
    const carried = createCombat(['mo'], 'echoBug', 40, 40);
    const bug = carried.enemies[0]!;
    bug.intentIndex = 1;
    noteSuccessfulCast(carried);
    expect(intentForUnit(bug, carried).value).toBe(5);
    shield(carried);
    endTurn(carried);
    expect(intentForUnit(bug, carried).kind).toBe('block');
    expect(nextIntentForUnit(bug, carried).value).toBe(3);

    const weakened = createCombat(['mo'], 'echoBug', 40, 40);
    const soft = weakened.enemies[0]!;
    soft.weakTurns = 1;
    expect(intentForUnit(soft, weakened).value).toBe(4);
    endTurn(weakened);
    expect(weakened.heroHp).toBe(37);
  });

  it('lets 小鼓手 raise 小石怪 after the drum, once', () => {
    const state = createCombat(['mo'], 'slime', 40, 40, null, 'drumSquad');
    const drum = state.enemies[0]!;
    const rock = state.enemies[1]!;
    expect(drum.defId).toBe('drumlet');
    expect(intentForUnit(rock, state).kind).toBe('block');
    shield(state);
    endTurn(state);
    expect(intentForUnit(rock, state)).toMatchObject({ kind: 'attack', value: 4 });
    expect(rock.strength).toBe(0);
    shield(state);
    endTurn(state);
    expect(rock.strength).toBe(1);
    expect(nextIntentForUnit(rock, state).value).toBe(6);

    rock.bankedStrength = 5;
    shield(state);
    endTurn(state);
    expect(rock.strength).toBe(1);
  });

  it('shows 塵鼓 growing on the next pill and not on the shield', () => {
    const state = createCombat(['mo'], 'dustDrum', 40, 40);
    const drum = state.enemies[0]!;
    expect(intentForUnit(drum, state).kind).toBe('block');
    expect(nextIntentForUnit(drum, state)).toMatchObject({ kind: 'attack', value: 7 });
    shield(state);
    endTurn(state);
    expect(drum.strength).toBe(1);
    expect(intentForUnit(drum, state)).toMatchObject({ kind: 'attack', value: 7 });
    expect(nextIntentForUnit(drum, state)).toMatchObject({ kind: 'multi', value: 3, hits: 3 });
  });

  it('summons one resting friend and refuses a fourth body', () => {
    const state = createCombat(['mo'], 'littleConductor', 40, 40);
    const conductor = state.enemies[0]!;
    expect(nextIntentForUnit(conductor, state).kind).toBe('block');
    shield(state);
    endTurn(state);
    expect(state.enemies).toHaveLength(1);
    shield(state);
    const hp = state.heroHp;
    endTurn(state);
    expect(state.enemies.map((enemy) => enemy.defId)).toEqual(['littleConductor', 'noteWisp']);
    expect(state.enemies[1]!.intentIndex).toBe(0);
    expect(state.heroHp).toBe(hp);
    expect(intentForUnit(state.enemies[1]!, state).kind).toBe('block');

    const crowded = createCombat(['mo'], ['slime', 'slime', 'littleConductor'], 40, 40);
    const caller = crowded.enemies[2]!;
    caller.intentIndex = 1;
    shield(crowded);
    endTurn(crowded);
    expect(crowded.enemies).toHaveLength(3);
    expect(caller.summoned).toBe(true);
  });

  it('buffs 鐘音符 on the following pill, after 樂團指揮 has already hit', () => {
    const state = createCombat(['mo'], 'eliteConductor', 40, 40);
    const conductor = state.enemies[0]!;
    shield(state);
    endTurn(state);
    shield(state);
    endTurn(state);
    shield(state);
    endTurn(state);
    const wisp = state.enemies[1]!;
    expect(wisp.defId).toBe('bellWisp');
    expect(intentForUnit(wisp, state).value).toBe(4);
    expect(nextIntentForUnit(wisp, state).value).toBe(5);
    expect(intentForUnit(conductor, state).value).toBe(6);
    shield(state);
    endTurn(state);
    expect(wisp.strength).toBe(1);
    expect(intentForUnit(wisp, state).value).toBe(5);
  });

  it('clears 七音晶 block on its next action', () => {
    const state = createCombat(['mo'], 'elitePrism', 40, 40);
    expect(intentForUnit(state.enemies[0]!, state).value).toBe(12);
    shield(state);
    endTurn(state);
    expect(state.enemies[0]!.block).toBe(12);
    shield(state);
    endTurn(state);
    expect(state.enemies[0]!.block).toBe(0);
  });

  it('telegraphs 塔守護獸, then the heavy, then a resting slime', () => {
    const state = createCombat(['mo'], 'boss1', 40, 40);
    const boss = state.enemies[0]!;
    expect(intentForUnit(boss, state).value).toBe(6);
    boss.hp = 21;
    expect(intentForUnit(boss, state).value).toBe(6);
    expect(nextIntentForUnit(boss, state)).toMatchObject({ kind: 'block', value: 8 });
    shield(state);
    endTurn(state);
    expect(boss.queuedEnter).toBe(true);
    expect(boss.phase).toBe(0);
    expect(nextIntentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 10 });
    expect(state.enemies).toHaveLength(1);
    shield(state);
    endTurn(state);
    expect(boss.phase).toBe(1);
    expect(intentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 10 });
    expect(state.enemies).toHaveLength(1);
    shield(state);
    endTurn(state);
    shield(state);
    const hp = state.heroHp;
    endTurn(state);
    expect(state.enemies.map((enemy) => enemy.defId)).toEqual(['boss1', 'slimeWeak']);
    expect(state.enemies[1]!.intentIndex).toBe(0);
    expect(state.heroHp).toBe(hp);
    expect(ENEMIES.boss!.phases![0]!.belowHp).toBe(ENEMIES.boss1!.phases![0]!.belowHp);
    expect(ENEMIES.boss!.phases![0]!.pattern.map((step) => step.kind)).toEqual(
      ENEMIES.boss1!.phases![0]!.pattern.map((step) => step.kind),
    );
  });

  it('previews 雙翼監守 heavy at 13 before the note arrives', () => {
    const state = createCombat(['mo'], 'boss2', 40, 40);
    const boss = state.enemies[0]!;
    boss.hp = 29;
    expect(nextIntentForUnit(boss, state).kind).toBe('block');
    shield(state);
    endTurn(state);
    expect(nextIntentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 13 });
    shield(state);
    endTurn(state);
    expect(intentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 13 });
    expect(state.enemies).toHaveLength(1);
  });

  it('previews 注音終焉王 heavy at 14 and summons 星螢 after that hit', () => {
    const state = createCombat(['mo'], 'boss3', 40, 40);
    const boss = state.enemies[0]!;
    expect(intentForUnit(boss, state).value).toBe(9);
    boss.hp = 37;
    expect(nextIntentForUnit(boss, state).kind).not.toBe('block');
    boss.hp = 36;
    expect(intentForUnit(boss, state).value).toBe(9);
    expect(nextIntentForUnit(boss, state)).toMatchObject({ kind: 'block', value: 14 });
    shield(state);
    endTurn(state);
    expect(nextIntentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 14 });
    shield(state);
    endTurn(state);
    expect(boss.strength).toBe(1);
    expect(intentForUnit(boss, state)).toMatchObject({ kind: 'heavy', value: 14 });
    expect(state.enemies).toHaveLength(1);
    shield(state);
    endTurn(state);
    shield(state);
    const hp = state.heroHp;
    endTurn(state);
    expect(state.enemies.map((enemy) => enemy.defId)).toEqual(['boss3', 'starWisp']);
    expect(state.enemies[1]!.intentIndex).toBe(0);
    expect(state.heroHp).toBe(hp);
  });

  it('ranks the boss coach line above a listener', () => {
    const tip = coachBodyForEnemies(['echoBug', 'boss1']);
    expect(tip).toContain('塔守護獸');
    expect(coachBodyForEnemies(['echoBug'])).toContain('ㄍㄣ ㄉㄨˊ');
    expect(coachBodyForEnemies(['drumlet'])).toContain('ㄍㄨˇ ㄕㄡˇ');
    expect(coachBodyForEnemies(['eliteConductor'])).toContain('ㄩㄝˋ ㄉㄨㄟˋ ㄓˇ ㄏㄨㄟ');
  });
});

describe('seeded fights', () => {
  it.each(NEW_FIGHTS)('$label starts and a seeded deck can win', ({ enemyId, encounterId, deck, label }) => {
    const started = createCombat(deck, enemyId, 40, 40, null, encounterId);
    expect(started.status).toBe('playing');
    expect(started.heroHp).toBe(40);
    expect(started.enemies.every((enemy) => enemy.alive && enemy.hp > 0)).toBe(true);

    let note = '';
    for (let seed = 1; seed <= 24; seed += 1) {
      const state = runFight(seed, deck, enemyId, encounterId);
      if (state.status === 'won' && state.heroHp > 0) return;
      note = `${label} seed ${seed} status ${state.status} hp ${state.heroHp} turn ${state.turn} ${state.log.slice(-8).join(' | ')}`;
    }
    expect(note).toBe('won');
  });
});

function priorFights(nodes: MapNode[]): Map<string, number> {
  const prior = new Map<string, number>();
  const ordered = [...nodes].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const node of ordered) {
    const parents = nodes.filter((parent) => parent.nextIds.includes(node.id));
    if (parents.length === 0) {
      prior.set(node.id, 0);
      continue;
    }
    let min = Number.POSITIVE_INFINITY;
    for (const parent of parents) {
      const add = parent.kind === 'fight' ? 1 : 0;
      min = Math.min(min, add + (prior.get(parent.id) ?? 0));
    }
    prior.set(node.id, min);
  }
  return prior;
}

function nearestKeys(node: MapNode, nodes: MapNode[], kind: 'fight' | 'elite', limit: number): string[] {
  const found: string[] = [];
  const seen = new Set<string>([node.id]);
  let frontier = nodes.filter((parent) => parent.nextIds.includes(node.id));
  while (frontier.length > 0 && found.length < limit) {
    const next: MapNode[] = [];
    for (const parent of frontier) {
      if (seen.has(parent.id)) continue;
      seen.add(parent.id);
      if (parent.kind === kind) {
        const key = parent.encounterId ?? parent.enemyId;
        if (key) found.push(key);
      }
      next.push(...nodes.filter((older) => older.nextIds.includes(parent.id)));
    }
    frontier = next;
  }
  return found.slice(0, limit).reverse();
}

function poolAllows(pool: readonly string[], recentOldestFirst: string[], key: string): boolean {
  let blocked = [...recentOldestFirst];
  while (true) {
    const open = pool.filter((id) => !blocked.includes(id));
    if (open.length > 0 || blocked.length === 0) return (open.length > 0 ? open : pool).includes(key);
    blocked = blocked.slice(1);
  }
}

function fightPool(act: 1 | 2 | 3, prior: number, key: string): readonly string[] | null {
  const easy = prior < EASY_NORMAL_QUOTA[act];
  const solos = easy ? ACT_EASY_SOLOS[act] : ACT_HARD_SOLOS[act];
  const multis = easy ? (prior === 0 ? [] : ACT_EASY_MULTIS[act]) : ACT_HARD_MULTIS[act];
  if (solos.includes(key)) return solos;
  if (multis.includes(key)) return multis;
  return null;
}

const RETIRED = new Set(['eliteDuo', 'fangPair', 'earlyMix', 'midStrike']);
const BANNED_BODIES: Record<1 | 2 | 3, string[]> = {
  1: [],
  2: ['fang', 'eliteBee', 'eliteBoom', 'eliteArmor'],
  3: ['spike', 'fangHard', 'eliteStorm', 'eliteBoom', 'eliteBee', 'eliteArmor'],
};

function assertAct(act: ActMap): void {
  const prior = priorFights(act.nodes);
  for (const node of act.nodes) {
    const bodies = node.encounterId
      ? ENCOUNTERS[node.encounterId]!.enemyDefIds
      : node.enemyId ? [node.enemyId] : [];
    for (const banned of BANNED_BODIES[act.act]) {
      expect(bodies, node.id).not.toContain(banned);
    }
    if (node.encounterId) expect(RETIRED.has(node.encounterId)).toBe(false);

    if (node.kind === 'fight') {
      const key = node.encounterId ?? node.enemyId!;
      const fightsBefore = prior.get(node.id) ?? 0;
      if (fightsBefore < EASY_NORMAL_QUOTA[act.act]) {
        expect(isEasyFightKey(act.act, key), `${node.id} ${key}`).toBe(true);
      }
      if (fightsBefore === 0) expect(node.encounterId).toBeUndefined();
      if (key === 'slimeTriple') {
        expect(act.act).toBe(1);
        expect(node.row).toBeGreaterThanOrEqual(4);
        expect(fightsBefore).toBeGreaterThanOrEqual(EASY_NORMAL_QUOTA[1]);
        expect(nearestKeys(node, act.nodes, 'fight', 2)).not.toContain('slimeTriple');
      } else {
        const pool = fightPool(act.act, fightsBefore, key);
        expect(pool, key).not.toBeNull();
        expect(poolAllows(pool!, nearestKeys(node, act.nodes, 'fight', 2), key), key).toBe(true);
      }
    } else if (node.kind === 'elite') {
      expect(node.encounterId).toBeUndefined();
      expect(ACT_ELITE_POOL[act.act]).toContain(node.enemyId);
      expect(poolAllows(
        ACT_ELITE_POOL[act.act],
        nearestKeys(node, act.nodes, 'elite', 1),
        node.enemyId!,
      )).toBe(true);
    } else if (node.kind === 'boss') {
      expect(node.enemyId).toBe(BOSS_ID[act.act]);
    }
  }
}

describe('generated maps', () => {
  it('keeps the easy quota, drops retired packs, and avoids the nearest repeat', () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const map = generateRunMap(seededRng(seed));
      for (const act of map.acts) assertAct(act);
    }
    expect(ACT_HARD_MULTIS[1]).toContain('drumSquad');
  });
});
