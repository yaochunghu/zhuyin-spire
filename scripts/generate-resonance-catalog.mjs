import fs from 'node:fs';

const memo = fs.readFileSync('docs/RESONANCE_WARRIOR_DESIGN_PROCESS.md', 'utf8');
const section = memo
  .split('## Final 75-card pool')[1]
  .split('## Human playtest gates')[0];
const rows = section
  .split('\n')
  .filter((line) => /^\| B\d{3} \|/.test(line))
  .map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    return {
      designId: cells[0],
      name: cells[1],
      type: cells[2].toLowerCase(),
      cost: Number(cells[3]),
      text: cells[4],
      rarity: cells[5].toLowerCase(),
      mechanics: cells[6],
      direction: cells[7],
    };
  });

if (rows.length !== 75) throw new Error(`Expected 75 final cards, found ${rows.length}`);

const families = [
  ['bo', 'ㄅ', '爸爸', '👨', 'ㄅㄚˋ'], ['po', 'ㄆ', '跑步', '🏃', 'ㄆㄠˇ'],
  ['mo', 'ㄇ', '貓咪', '🐱', 'ㄇㄠ'], ['fo', 'ㄈ', '飛機', '✈️', 'ㄈㄟ'],
  ['de', 'ㄉ', '大象', '🐘', 'ㄉㄚˋ'], ['te', 'ㄊ', '兔子', '🐰', 'ㄊㄨˋ'],
  ['ne', 'ㄋ', '牛奶', '🥛', 'ㄋㄧㄡˊ'], ['le', 'ㄌ', '老虎', '🐯', 'ㄌㄠˇ'],
  ['ge', 'ㄍ', '狗', '🐶', 'ㄍㄡˇ'], ['ke', 'ㄎ', '褲子', '👖', 'ㄎㄨˋ'],
  ['he', 'ㄏ', '猴子', '🐵', 'ㄏㄡˊ'], ['ji', 'ㄐ', '雞', '🐔', 'ㄐㄧ'],
  ['qi', 'ㄑ', '氣球', '🎈', 'ㄑㄧˋ'], ['xi', 'ㄒ', '西瓜', '🍉', 'ㄒㄧ'],
  ['zhi', 'ㄓ', '豬', '🐷', 'ㄓㄨ'], ['chi', 'ㄔ', '車', '🚗', 'ㄔㄜ'],
  ['shi', 'ㄕ', '獅子', '🦁', 'ㄕ'], ['ri', 'ㄖ', '日', '🌞', 'ㄖˋ'],
  ['zi', 'ㄗ', '走路', '🚶', 'ㄗㄡˇ'], ['ci', 'ㄘ', '草', '🌿', 'ㄘㄠˇ'],
  ['si', 'ㄙ', '松鼠', '🐿️', 'ㄙㄨㄥ'], ['yi', 'ㄧ', '衣服', '👕', 'ㄧ'],
  ['wu', 'ㄨ', '烏雲', '☁️', 'ㄨ'], ['yu', 'ㄩ', '魚', '🐟', 'ㄩˊ'],
  ['a', 'ㄚ', '阿姨', '👩', 'ㄚ'], ['o', 'ㄛ', '喔', '😲', 'ㄛ'],
  ['e', 'ㄜ', '鵝', '🦢', 'ㄜˊ'],
];

const locked = new Map(Object.entries({
  B001: 'bo', B002: 'mo', B003: 'po', B004: 'he', B005: 'ge', B006: 'ri',
  B007: 'ke', B008: 'te', B009: 'le', B012: 'shi', B051: 'yi', B077: 'fo',
}));
const used = new Set(locked.values());
const spareLegacy = families.map(([id]) => id).filter((id) => !used.has(id));
for (const row of rows) {
  if (!locked.has(row.designId) && spareLegacy.length) locked.set(row.designId, spareLegacy.shift());
}

const familyById = new Map(families.map((family) => [family[0], family]));
const escape = (value) => value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
const mechanics = (raw) => {
  const out = [];
  if (raw.includes('V')) out.push('vulnerable');
  if (raw.includes('B')) out.push('basic');
  if (raw.includes('T')) out.push('tempo');
  if (raw.includes('J')) out.push('jin');
  return out;
};
const direction = (raw) => {
  if (raw.includes('三向') || raw.includes('hybrid') || raw.includes('×')) return 'hybrid';
  if (raw.includes('百鍊')) return 'bailian';
  if (raw.includes('聽勁')) return 'tingjin';
  if (raw.includes('聽隙')) return 'tingxi';
  return 'general';
};
const job = (row) => {
  if (row.text.includes('Draw')) return 'draw';
  if (row.text.includes('Energy') || row.text.includes('cost')) return 'energy';
  if (row.type === 'power' || row.text.includes('練功')) return 'scaling';
  if (row.text.includes('all enemies')) return 'area';
  if (row.text.includes('Block')) return 'defense';
  return 'frontload';
};
const effects = (row, text = row.text) => {
  if (row.type === 'power') {
    const training = text.match(/^練功 (\d+)/);
    return training ? [{ kind: 'training', amount: Number(training[1]) }] : [];
  }
  const out = [];
  const damage = text.match(/Deal (\d+) damage/);
  if (damage) {
    const hits = /four times/.test(text) ? 4 : /three times/.test(text) ? 3 : /twice/.test(text) ? 2 : 1;
    out.push({ kind: 'damage', amount: Number(damage[1]), ...(hits > 1 ? { hits } : {}) });
  }
  const block = text.match(/Gain (\d+) Block/);
  if (block) out.push({ kind: 'block', amount: Number(block[1]) });
  const draw = text.match(/^Draw (\d+) cards?/);
  if (draw) out.push({ kind: 'draw', amount: Number(draw[1]) });
  const energy = text.match(/^Gain (\d+) Energy/);
  if (energy) out.push({ kind: 'energy', amount: Number(energy[1]) });
  const vulnerable = text.match(/^Apply (\d+) 易傷|\. Apply (\d+) 易傷/);
  if (vulnerable) out.push({ kind: 'vulnerable', amount: Number(vulnerable[1] ?? vulnerable[2]) });
  const weak = text.match(/^Apply (\d+) Weak/);
  if (weak) out.push({ kind: 'weak', amount: Number(weak[1]) });
  return out;
};
const upgradeText = (row) => {
  let text = row.text;
  if (row.designId === 'B010') return 'Gain 1 Energy. Draw 1 card. Exhaust.';
  const hit = text.match(/Deal (\d+) damage/);
  if (hit) {
    const amount = Number(hit[1]) + (/twice|three times|four times/.test(text) ? 1 : 2);
    return text.replace(hit[0], `Deal ${amount} damage`);
  }
  const block = text.match(/Gain (\d+) Block/);
  if (block) return text.replace(block[0], `Gain ${Number(block[1]) + 2} Block`);
  const draw = text.match(/Draw (\d+) cards?/i);
  if (draw) return text.replace(draw[0], `Draw ${Number(draw[1]) + 1} cards`);
  const vulnerable = text.match(/(\d+) 易傷/);
  if (vulnerable) return text.replace(vulnerable[0], `${Number(vulnerable[1]) + 1} 易傷`);
  const training = text.match(/練功 (\d+)/);
  if (training) return text.replace(training[0], `練功 ${Number(training[1]) + 1}`);
  if (row.cost > 0) return `Costs ${row.cost - 1}. ${text}`;
  return `${text} Draw 1 card.`;
};

const serializedEffect = (effect) =>
  `{ kind: '${effect.kind}', amount: ${effect.amount}${effect.hits ? `, hits: ${effect.hits}` : ''} }`;

const initial = ['bo', 'mo', 'po', 'he', 'ge', 'ri', 'ke', 'te', 'le', 'shi', 'yi', 'fo'];
const initialSet = new Set(initial);
let lockedIndex = 0;
const definitions = rows.map((row, index) => {
  const runtimeId = locked.get(row.designId) ?? `rw_${row.designId.toLowerCase()}`;
  const family = familyById.get(runtimeId) ?? families[index % families.length];
  const [, zhuyin, word, emoji, spell] = family;
  const upText = upgradeText(row);
  const upgradedCost = upText.match(/^Costs (\d+)\./)?.[1];
  const baseEffects = effects(row);
  const upEffects = effects(row, upText);
  const value = baseEffects.find((effect) => effect.kind === 'damage' || effect.kind === 'block')?.amount ?? 0;
  const unlockScore = initialSet.has(runtimeId)
    ? undefined
    : lockedIndex++ < 21
      ? 300
      : lockedIndex <= 42
        ? 1000
        : 2000;
  return `  '${runtimeId}': {
    id: '${runtimeId}',
    designId: '${row.designId}',
    zhuyin: '${zhuyin}',
    name: '${escape(row.name)}',
    type: '${row.type}',
    cost: ${row.cost},
    icon: '${emoji}',
    job: '${job(row)}',
    value: ${value},
    rarity: '${row.rarity}',
    mechanics: [${mechanics(row.mechanics).map((item) => `'${item}'`).join(', ')}],
    direction: '${direction(row.direction)}',
    basicAttack: ${/This is a 基礎攻擊/.test(row.text)},
    exhaust: ${/Exhaust/.test(row.text)},
    retain: ${/Retain/.test(row.text)},
    target: '${/all enemies/.test(row.text) ? 'allEnemies' : row.type === 'attack' || /selected enemy|one enemy|target|易傷|Weak/.test(row.text) ? 'singleEnemy' : 'self'}',
    cues: [{ word: '${word}', emoji: '${emoji}', spell: '${spell}' }],
    effects: [${baseEffects.map(serializedEffect).join(', ')}],
    description: '${escape(row.text)}',
    ${unlockScore ? `unlockScore: ${unlockScore},` : ''}
    upgrade: {
      ${upgradedCost !== undefined ? `cost: ${upgradedCost},` : ''}
      effects: [${upEffects.map(serializedEffect).join(', ')}],
      description: '${escape(upText)}',
    },
  }`;
}).join(',\n');

const ids = rows.map((row) => `'${locked.get(row.designId) ?? `rw_${row.designId.toLowerCase()}`}'`);

if (process.argv.includes('--markdown')) {
  const table = rows.map((row) => {
    const runtimeId = locked.get(row.designId) ?? `rw_${row.designId.toLowerCase()}`;
    return `| \`${runtimeId}\` | ${row.designId} ${row.name} | ${row.text} | ${upgradeText(row)} |`;
  }).join('\n');
  process.stdout.write(`# Upgrade Bible: 共鳴武者

> **Status:** physical-copy foundation implemented; card upgrades not released.
> The V1→V2 save model and dormant Smith/offer plumbing use this contract.
> Generated \`+\` faces are an engineering draft and must not be treated as
> authored or balanced content.

## Locked rules

- A future collectible card upgrade will be permanent and non-repeatable.
- Status and Curse cards cannot be upgraded.
- Upgrades preserve the card's 注音 family, role, direction, and physical-copy UID.
- The live campfire remains Rest or Remove; Smith is gated off.
- Live reward and shop offers always use upgrade level 0.
- Proposed later-act upgrade rates require a separate approval and playtest.
- Temporary, relic-driven, and event-driven upgrade sources are deferred.

## Runtime contract

\`\`\`ts
interface DeckCard {
  uid: string;
  defId: string;
  upgradeLevel: 0 | 1;
}
\`\`\`

Deck order and duplicate copies survive V1→V2 migration. Reward and shop
instances serialize an upgrade level for forward compatibility, but the current
character only creates level-zero offers.

## Generated draft catalog (not live)

| Runtime ID | Card | Base | Upgraded |
|---|---|---|---|
${table}

## Validation gates

The build may assert that generated draft faces are structurally resolvable and
that no upgrade level exceeds 1. It must also assert that 共鳴武者 keeps Smith
disabled and live offers at level zero. No draft \`+\` face becomes canonical
until its wording, number, casting cost, touch presentation, and human evidence
pass [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md).
`);
  process.exit(0);
}

process.stdout.write(`/* Generated implementation draft from the post-cull design table. Only wave-one IDs are live. */
import type { CardDef } from './cards';

export const RESONANCE_CARDS: Record<string, CardDef> = {
${definitions}
};

export const RESONANCE_CARD_IDS = [${ids.join(', ')}] as const;
export const RESONANCE_INITIAL_REWARD_IDS = ${JSON.stringify(initial.slice(3))} as const;
`);
