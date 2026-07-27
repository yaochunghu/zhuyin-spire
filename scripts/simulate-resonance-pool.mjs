import fs from 'node:fs';

const docPath = new URL('../docs/RESONANCE_WARRIOR_DESIGN_PROCESS.md', import.meta.url);
const source = fs.readFileSync(docPath, 'utf8');

const survivorText = source.match(
  /### Survivor IDs after the first cull\s+([\s\S]*?)\s+### Rejected ideas/,
)?.[1] ?? '';
const finalCatalogText = source.match(
  /## Final 75-card pool\s+([\s\S]*?)\s+## Human playtest gates/,
)?.[1] ?? '';

function expandIds(text) {
  const ids = new Set();
  for (const match of text.matchAll(/B(\d{3})(?:[–-]B(\d{3}))?/g)) {
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    for (let value = start; value <= end; value += 1) {
      ids.add(`B${String(value).padStart(3, '0')}`);
    }
  }
  return ids;
}

const finalCatalogIds = new Set(
  [...finalCatalogText.matchAll(/^\| (B\d{3}) \|/gm)].map((match) => match[1]),
);
const survivors = finalCatalogIds.size > 0 ? finalCatalogIds : expandIds(survivorText);
if (survivors.size !== 75) {
  throw new Error(`Expected 75 survivors, found ${survivors.size}`);
}

const cardRows = new Map();
const balanceOverrides = {
  B022: { effect: 'Move all 易傷 from one enemy to another. Gain 5 Block. Draw 1 card.' },
  B030: { cost: 1 },
  B037: {
    effect: 'Return a 基礎攻擊 from your discard pile to your hand. It costs 0 this turn.',
  },
  B045: { cost: 2 },
  B060: {
    effect: 'The first time each turn you perform your second 轉拍, gain 1 Energy and 3 Block.',
  },
  B062: {
    effect: 'The next card this turn triggers 轉拍 even if it matches the previous card type. Draw 1 card. Exhaust.',
  },
  B077: { effect: 'Spend 1 勁. Deal 8 damage. Cannot be played without enough 勁.' },
  B078: { effect: 'Gain 5 Block plus 2 for each 勁 you have, maximum +4.' },
  B080: { effect: 'Deal 4 damage. If you have 勁, spend 1 and apply 1 易傷.' },
  B084: { effect: 'Spend 1 勁. Gain 10 Block.' },
  B122: { effect: 'Draw 2 cards. If they have different types, apply 1 易傷.' },
  B127: {
    effect: 'The first time each turn you play your third 基礎攻擊 in combat, it costs 0, deals twice, and draws 1 card.',
  },
  B128: {
    effect: 'Gain 12 Block. If you take no HP damage next enemy phase, 練功 1. Exhaust.',
  },
  B150: {
    effect: 'Once each turn, after you have applied 易傷, gained 練功, performed 轉拍, and spent 勁 that turn, gain 2 Energy and draw 2 cards.',
  },
};
for (const line of (finalCatalogText || source).split('\n')) {
  const cells = line.split('|').map((cell) => cell.trim());
  if (!/^\| B\d{3} /.test(line) || cells.length < 9) continue;
  const [, id, name, type, costText] = cells;
  const effect = finalCatalogText ? cells[5] : cells[6];
  const rarity = finalCatalogText ? cells[6] : cells[5];
  const mechanics = cells[7];
  const direction = finalCatalogText ? cells[8] : '';
  if (!survivors.has(id) || cardRows.has(id)) continue;
  cardRows.set(id, {
    id,
    name,
    type,
    cost: finalCatalogText
      ? (costText === 'X' ? 2.5 : Number(costText))
      : (balanceOverrides[id]?.cost ?? (costText === 'X' ? 2.5 : Number(costText))),
    rarity,
    effect: finalCatalogText ? effect : (balanceOverrides[id]?.effect ?? effect),
    tags: mechanics.split('/'),
    direction,
  });
}

if (cardRows.size !== 75) {
  throw new Error(`Parsed ${cardRows.size} survivor definitions`);
}

const roleRows = new Map();
const roleSection = source.match(/## Step 5 — Role assignment([\s\S]*)/)?.[1] ?? '';
for (const line of roleSection.split('\n')) {
  const cells = line.split('|').map((cell) => cell.trim());
  if (!/^\| B\d{3} /.test(line) || cells.length < 5) continue;
  roleRows.set(cells[1], cells[2]);
}
roleRows.set('B065', 'Front-load damage');
roleRows.set('B019', 'Glue');
roleRows.set('B038', 'Glue');
roleRows.set('B064', 'Engine piece');
roleRows.set('B097', 'Scaling piece');
roleRows.set('B100', 'Scaling piece');
roleRows.set('B144', 'Situational tech');

function firstNumber(pattern, text) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function countHits(effect) {
  if (/\bfour times\b/.test(effect)) return 4;
  if (/\bthree times\b/.test(effect)) return 3;
  if (/\btwice\b/.test(effect)) return 2;
  return 1;
}

function features(card) {
  const effect = card.effect;
  const hits = countHits(effect);
  let damage = firstNumber(/Deal (\d+) damage/i, effect) * hits;
  if (/to all enemies/i.test(effect)) damage *= 1.55;
  if (/deal \d+ more/i.test(effect)) {
    damage += firstNumber(/deal (\d+) more/i, effect) * 0.55;
  }
  if (/deal \d+ damage again/i.test(effect)) {
    damage *= 1.55;
  }
  if (/per 勁 spent|for each 轉拍|per duration removed|for each 基礎攻擊/i.test(effect)) {
    damage += 5;
  }

  let block = firstNumber(/Gain (\d+) Block/i, effect);
  if (/gain \d+ more/i.test(effect)) {
    block += firstNumber(/gain (\d+) more/i, effect) * 0.5;
  }
  if (/per 勁|for each 勁/i.test(effect) && /Block/i.test(effect)) block += 4;

  const draw = firstNumber(/Draw (\d+)/i, effect) || (/draw 1/i.test(effect) ? 1 : 0);
  const energy = firstNumber(/gain (\d+) Energy/i, effect);
  const vulnerable = firstNumber(/apply (\d+) 易傷/i, effect);
  const training = firstNumber(/練功 (\d+)/i, effect);
  const gainJin = firstNumber(/gain (\d+) 勁/i, effect);
  const spendJin = /spend/i.test(effect) && /勁/i.test(effect) ? 1 : 0;
  const requiresJin = /Cannot be played without enough 勁/i.test(effect) ? 1 : 0;
  const zhuanpai = /轉拍/.test(effect) ? 1 : 0;
  const basic = /基礎攻擊/.test(effect) || card.tags.includes('B') ? 1 : 0;
  const power = card.type === 'Power' ? 1 : 0;
  const exhaust = /Exhaust/.test(effect) ? 1 : 0;
  const conditional = /\bIf\b|轉拍：|whenever|Whenever|The first|After you|next enemy phase/i.test(effect)
    ? 1
    : 0;

  return {
    damage,
    block,
    draw,
    energy,
    vulnerable,
    training,
    gainJin,
    spendJin,
    requiresJin,
    zhuanpai,
    basic,
    power,
    exhaust,
    conditional,
  };
}

function upgradeEffect(card) {
  let text = card.effect;
  if (card.id === 'B010') return 'Gain 1 Energy. Draw 1 card. Exhaust.';
  const damage = text.match(/Deal (\d+) damage/);
  if (damage) {
    const amount = Number(damage[1]) + (/twice|three times|four times/.test(text) ? 1 : 2);
    return text.replace(damage[0], `Deal ${amount} damage`);
  }
  const block = text.match(/Gain (\d+) Block/);
  if (block) return text.replace(block[0], `Gain ${Number(block[1]) + 2} Block`);
  const draw = text.match(/Draw (\d+) cards?/i);
  if (draw) return text.replace(draw[0], `Draw ${Number(draw[1]) + 1} cards`);
  const vulnerable = text.match(/(\d+) 易傷/);
  if (vulnerable) return text.replace(vulnerable[0], `${Number(vulnerable[1]) + 1} 易傷`);
  const training = text.match(/練功 (\d+)/);
  if (training) return text.replace(training[0], `練功 ${Number(training[1]) + 1}`);
  if (card.cost > 0) return `Costs ${card.cost - 1}. ${text}`;
  return `${text} Draw 1 card.`;
}

const cards = [...cardRows.values()].map((card) => ({
  ...card,
  role: roleRows.get(card.id) ?? 'Unknown',
  f: features(card),
  upgradeEffect: upgradeEffect(card),
  upgradeF: features({ ...card, effect: upgradeEffect(card) }),
}));
const byId = new Map(cards.map((card) => [card.id, card]));

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

const random = mulberry32(0x5eed2026);
const choice = (items) => items[Math.floor(random() * items.length)];

const basics = [
  ...Array(5).fill(byId.get('B001')),
  ...Array(4).fill(byId.get('B002')),
  byId.get('B003'),
];
const rewards = cards.filter((card) => card.rarity !== 'Basic');
const rarityPools = {
  Common: rewards.filter((card) => card.rarity === 'Common'),
  Uncommon: rewards.filter((card) => card.rarity === 'Uncommon'),
  Rare: rewards.filter((card) => card.rarity === 'Rare'),
};

function sampleRarity(draftIndex) {
  if (draftIndex === 11 || draftIndex === 14) return 'Rare';
  const roll = random();
  if (roll < 0.08) return 'Rare';
  if (roll < 0.43) return 'Uncommon';
  return 'Common';
}

function tagCount(deck, tag) {
  return deck.reduce((sum, card) => sum + (card.tags.includes(tag) ? 1 : 0), 0);
}

function pickValue(card, deck, focusTags = []) {
  const f = card.f;
  const energyDenominator = Math.max(0.7, card.cost);
  let value = (f.damage * 0.72 + f.block * 0.68) / energyDenominator;
  value += f.draw * 2.1 + f.energy * 2.8 + f.vulnerable * 1.4;
  value += f.training * (1.2 + tagCount(deck, 'B') * 0.22);
  value += f.zhuanpai * (0.7 + tagCount(deck, 'T') * 0.12);
  value += f.spendJin * (0.4 + tagCount(deck, 'J') * 0.18);
  value += f.gainJin * 1.4;
  value += f.power * 1.4;
  if (/from your draw pile into your hand/i.test(card.effect)) value += 2.2;
  if (/from your discard pile to your hand/i.test(card.effect)) value += 2.4;
  if (/costs? 0 this turn/i.test(card.effect)) value += 1.7;
  if (/becomes a 基礎攻擊/i.test(card.effect)) value += 1.2 + tagCount(deck, 'B') * 0.08;
  if (/next 2 基礎攻擊s.*cost 0/i.test(card.effect)) value += 3.2;
  if (f.requiresJin) value -= Math.max(0.7, 2.2 - tagCount(deck, 'J') * 0.09);
  if (card.role === 'Engine piece') value += 1.7;
  if (card.role === 'Glue') value += 0.7;
  if (card.role === 'Scaling piece') value += 0.9;
  value -= f.conditional * 0.6;
  value -= f.exhaust * 0.25;
  value -= Math.max(0, deck.length - 18) * 0.08;
  for (const tag of card.tags) value += tagCount(deck, tag) * 0.11;
  value += card.tags.filter((tag) => focusTags.includes(tag)).length * 0.85;
  if (card.role === 'Build-around' && deck.length < 14) value -= 0.8;
  return value + (random() - 0.5) * 3.2;
}

function offerCards(draftIndex) {
  const offer = [];
  const seen = new Set();
  while (offer.length < 3) {
    const rarity = sampleRarity(draftIndex);
    const pool = rarityPools[rarity].length ? rarityPools[rarity] : rewards;
    const card = choice(pool);
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    offer.push(card);
  }
  return offer;
}

function evaluateDeck(deck, encounter) {
  const total = (field) => deck.reduce((sum, card) => sum + card.f[field], 0);
  const attacks = deck.filter((card) => card.type === 'Attack').length;
  const skills = deck.filter((card) => card.type === 'Skill').length;
  const powers = deck.filter((card) => card.type === 'Power').length;
  const v = tagCount(deck, 'V');
  const b = tagCount(deck, 'B');
  const t = tagCount(deck, 'T');
  const j = tagCount(deck, 'J');
  const alternating = Math.min(attacks, skills);

  let offense = total('damage') * 0.28;
  offense += total('vulnerable') * Math.max(1, attacks * 0.19);
  offense += total('training') * Math.max(1, b * 0.48);
  offense += total('spendJin') * Math.max(0, j - 2) * 0.42;
  offense += Math.min(v, t) * 0.55 + Math.min(b, t) * 0.52;
  offense += total('draw') * 0.8 + total('energy') * 1.15;
  offense += powers * 0.9;

  let defense = total('block') * 0.23;
  defense += j * 0.35 + Math.min(j, t) * 0.28;
  defense += total('draw') * 0.35;
  defense += alternating * 0.08;

  if (encounter === 'swarm') {
    offense += deck.filter((card) => /all enemies/i.test(card.effect)).length * 2.8;
  } else if (encounter === 'boss') {
    offense += total('training') * 1.6 + powers * 1.2;
  }

  offense *= 0.91 + random() * 0.18;
  defense *= 0.9 + random() * 0.2;
  const thresholds = {
    normal: { offense: 62, threat: 32 },
    swarm: { offense: 74, threat: 39 },
    boss: { offense: 96, threat: 52 },
  }[encounter];
  const damageTaken = Math.max(0, thresholds.threat - defense + (random() - 0.5) * 5);
  const margin = (offense - thresholds.offense) / 11 + (34 - damageTaken) / 9;
  const winChance = 1 / (1 + Math.exp(-margin));
  const win = random() < winChance;
  return { win, damageTaken };
}

const stats = new Map(cards.map((card) => [card.id, {
  id: card.id,
  name: card.name,
  offered: 0,
  picked: 0,
  contained: 0,
  wins: 0,
  damage: 0,
  smithed: 0,
}]));
const cohortStats = new Map(
  ['聽隙爆發', '百鍊連環', '聽勁反擊', 'hybrid']
    .map((name) => [name, { name, runs: 0, wins: 0, damage: 0 }]),
);
const focusProfiles = [
  { name: '聽隙爆發', tags: ['V', 'T'] },
  { name: '百鍊連環', tags: ['B', 'T'] },
  { name: '聽勁反擊', tags: ['J', 'V'] },
  { name: 'hybrid', tags: [] },
];

const runs = Number(process.argv[2] ?? 60000);
for (let run = 0; run < runs; run += 1) {
  const deck = basics.map((card) => ({ ...card, f: { ...card.f }, upgraded: false }));
  const focus = focusProfiles[run % focusProfiles.length];
  for (let draftIndex = 0; draftIndex < 15; draftIndex += 1) {
    const offer = offerCards(draftIndex);
    for (const card of offer) stats.get(card.id).offered += 1;
    const ranked = offer
      .map((card) => ({ card, value: pickValue(card, deck, focus.tags) }))
      .sort((left, right) => right.value - left.value);
    if (ranked[0].value >= 2.7) {
      deck.push({ ...ranked[0].card, f: { ...ranked[0].card.f }, upgraded: false });
      stats.get(ranked[0].card.id).picked += 1;
    }
    if ([4, 9, 14].includes(draftIndex)) {
      const candidate = deck
        .filter((card) => !card.upgraded)
        .map((card) => {
          const base = pickValue(card, deck, focus.tags);
          const plus = pickValue(
            { ...card, effect: card.upgradeEffect, f: card.upgradeF },
            deck,
            focus.tags,
          );
          return { card, gain: plus - base };
        })
        .sort((left, right) => right.gain - left.gain)[0];
      if (candidate) {
        candidate.card.upgraded = true;
        candidate.card.effect = candidate.card.upgradeEffect;
        candidate.card.f = { ...candidate.card.upgradeF };
        stats.get(candidate.card.id).smithed += 1;
      }
    }
  }

  const encounter = choice(['normal', 'normal', 'swarm', 'boss']);
  const result = evaluateDeck(deck, encounter);
  const cohort = cohortStats.get(focus.name);
  cohort.runs += 1;
  cohort.wins += Number(result.win);
  cohort.damage += result.damageTaken;
  for (const id of new Set(deck.map((card) => card.id))) {
    const stat = stats.get(id);
    stat.contained += 1;
    stat.wins += Number(result.win);
    stat.damage += result.damageTaken;
  }
}

const rows = [...stats.values()]
  .filter((stat) => byId.get(stat.id).rarity !== 'Basic')
  .map((stat) => ({
    ...stat,
    pickRate: stat.offered ? stat.picked / stat.offered : 0,
    winRate: stat.contained ? stat.wins / stat.contained : 0,
    avgDamage: stat.contained ? stat.damage / stat.contained : 0,
  }))
  .sort((left, right) => left.pickRate - right.pickRate);

console.log(`seed=0x5eed2026 runs=${runs} cards=${cards.length}`);
console.log('LOW PICK RATE');
for (const row of rows.slice(0, 12)) {
  console.log(
    `${row.id}\t${row.name}\tpick=${(row.pickRate * 100).toFixed(1)}%`
    + `\twin=${(row.winRate * 100).toFixed(1)}%\tdmg=${row.avgDamage.toFixed(2)}`,
  );
}
console.log('HIGH PICK RATE');
for (const row of rows.slice(-12).reverse()) {
  console.log(
    `${row.id}\t${row.name}\tpick=${(row.pickRate * 100).toFixed(1)}%`
    + `\twin=${(row.winRate * 100).toFixed(1)}%\tdmg=${row.avgDamage.toFixed(2)}`,
  );
}
console.log('SMITH PRIORITY');
for (const row of [...rows].sort((a, b) => b.smithed - a.smithed).slice(0, 12)) {
  console.log(`${row.id}\t${row.name}\tsmith=${row.smithed}`);
}

const all = rows.reduce((acc, row) => {
  acc.pick += row.pickRate;
  acc.win += row.winRate;
  acc.damage += row.avgDamage;
  return acc;
}, { pick: 0, win: 0, damage: 0 });
console.log(
  `POOL AVG\tpick=${(all.pick / rows.length * 100).toFixed(1)}%`
  + `\twin=${(all.win / rows.length * 100).toFixed(1)}%`
  + `\tdmg=${(all.damage / rows.length).toFixed(2)}`,
);
console.log('DECK COHORTS');
for (const cohort of cohortStats.values()) {
  console.log(
    `${cohort.name}\truns=${cohort.runs}`
    + `\twin=${(cohort.wins / Math.max(1, cohort.runs) * 100).toFixed(1)}%`
    + `\tdmg=${(cohort.damage / Math.max(1, cohort.runs)).toFixed(2)}`,
  );
}

const rarityCounts = Object.groupBy(cards, (card) => card.rarity);
const typeCounts = Object.groupBy(cards, (card) => card.type);
const duplicateEffects = Object.entries(Object.groupBy(cards, (card) => card.effect))
  .filter(([, group]) => group.length > 1)
  .map(([effect, group]) => ({ effect, ids: group.map((card) => card.id) }));
console.log(
  'STATIC AUDIT',
  JSON.stringify({
    rarity: Object.fromEntries(
      Object.entries(rarityCounts).map(([key, group]) => [key, group.length]),
    ),
    type: Object.fromEntries(
      Object.entries(typeCounts).map(([key, group]) => [key, group.length]),
    ),
    duplicateEffects,
  }),
);
