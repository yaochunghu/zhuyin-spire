# Content authoring

How to add playable content without reverse-engineering the whole repo.

---

## Cards — `src/data/cards.ts`

The live foundation uses authored Attack, Skill, Power, Status, and Curse types.
Collectible character cards use Attack, Skill, or Power. A direct Attack remains
an Attack when it also blocks, draws, or applies a status; Powers leave normal
pile circulation after a successful cast. Failed Powers pay Energy and discard.

The old Echo-focused rows in [CARD_BIBLE.md](./CARD_BIBLE.md) are frozen design
reference. New content must follow the live 共鳴武者 direction in
[DECK_DESIGN.md](./DECK_DESIGN.md), not translate those rows mechanically.

### `CardDef` fields

| Field | Meaning |
|-------|---------|
| `id` | Stable string key |
| `zhuyin` | Teaching initial (e.g. `ㄅ`) — keys phrase bank |
| `name` | Display name |
| `type` | `attack` \| `skill` \| `power` \| `status` \| `curse` |
| `rarity` / `pool` | Reward frame and acquisition pool |
| `cost` | Energy |
| `icon?` | Stable combat art emoji; unlike the changing spelling cue emoji |
| `job?` | Primary deck job: frontload, area, defense, scaling, draw, or energy |
| `effects` | Required ordered discriminated effects; shared by combat and previews |
| `tags` / `keywords` | Mechanical tags such as `basicAttack`; lifecycle keywords |
| `upgrade?` | Authored cost/effect/tag changes; never a second definition id |
| `target?` | `self` \| `singleEnemy` \| `allEnemies` |
| `cues` | Fallback teaching phrases on the card |
| `description` | Kid/adult readable text |
| `balanceNote` / `unlockTier` | Adult designer information |

Run decks contain physical `DeckCardV2` copies with stable `uid`, `defId`, and
`upgradeLevel`. Rewards and shops create a new copy. Removal and future Smithing
operate on the copy, never every card sharing its definition. The in-game card
viewer exposes exact copies plus a searchable designer catalog.

Also maintain `STARTER_DECK_IDS`, reward pools, practice ids, and character
ownership. For the first character, keep three starter designs and exactly nine
Act I rewards until playtesting justifies expansion. Run
`validateCardDefinitions()` and the unit suite after every content edit.

### Teaching rules for cues / phrases

1. Word **starts with** that card’s 注音  
2. Emoji depicts **that word**  
3. `spell` is the **full first syllable** including 聲調 when not first tone  

Example: 爸爸 → `ㄅㄚˋ`.

### Minimal “new attack card” checklist

1. Add a source definition with explicit type, rarity, effects, cues, and balance note
2. Add `id` to appropriate reward / starter pools  
3. Ensure its `getCardCastBinding` lesson family passes the coverage floor (do
   not rely on the emergency fallback as authored content)
4. Play one fight with debug skip-cast off to verify cast UI  

---

## Enemies — `src/data/enemies.ts`

The proposed complete enemy, encounter, event, difficulty, and Act IV contract
lives in [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md).

### Roles (design language)

| Role | Teach |
|------|--------|
| `fodder` | Low HP — clear first in multi |
| `striker` | Attack-heavy — need block |
| `tank` | Often guards — chip 🛡️ |
| `swarm` | Multi small hits |
| `heavy` | Telegraphs 💥 |
| `elite` / `boss` | Longer loops |

### `EnemyDef`

- `pattern: IntentStep[]` cycles each enemy turn  
- Helpers: `atk`, `heavy`, `multi(value, hits)`, `guard`  
- `act`, `tier`, `behaviorNote` for adults  

Register ids in `ACT_NORMAL_POOL` / `ACT_ELITE_POOL` / boss mapping as appropriate.

Damage budget comment in file: preschool peaks roughly Act I ~3–7, II ~6–9, III ~8–11 unblocked (tune carefully).

---

## Encounters — `src/data/encounters.ts`

```ts
{
  id: 'tankFodder',
  enemyDefIds: ['rock', 'slimeWeak'],  // 1–3, left→right
  label: '…',
  recipe: 'tank + fodder',
  act: 1,
}
```

Prefer **tank+fodder** or **striker+fodder** in Act I — avoid dual full strikers early.

Wire into map via `ACT_MULTI_ENCOUNTERS` (see `map.ts` imports).

---

## Phrases — `src/data/phrases.ts`

- Large bank: `PHRASES_BY_INITIAL[zhuyin] → Phrase[]`  
- Packs: 家裡 / 公園 / 食物 / … (`PhrasePack`)  
- Every entry has an intentional `core` or `broad` vocabulary tier; topic and
  vocabulary are separate dimensions
- Parent filters and include/exclude lists live in the active learner profile
- ㄚ／ㄛ／ㄜ cards use vowel families, so consonant-plus-vowel examples count

Cast checks prefer the **shared bank**, not only the card’s few cues, and draw
through persistent distinct-spelling bags. Run `npm test` after phrase edits;
coverage tests require starter families ≥24 prompts/12 answers and all other live
cards ≥16/8. See [CASTING_GATES.md](./CASTING_GATES.md).

---

## Characters and relics — `src/data/characters.ts`, `src/data/relics.ts`

Each `CharacterDef` owns its starter deck ids, starting relic id, casting-gate id,
and one main theme. New runs select a character; they do not separately choose an unrelated
starter relic. Keep every relic character-agnostic, useful, small, and thematic;
it may amplify broad actions but must not require one character's signature
mechanic. Existing V1 saves may retain a legacy relic so an in-progress run is
not destroyed.

The live first-character specification and future upgrade constraints are in
[DECK_DESIGN.md](./DECK_DESIGN.md).
The proposed full 40-relic and 20-potion catalog is in
[RELIC_POTION_BIBLE.md](./RELIC_POTION_BIBLE.md).

---

## Balance constants

Do not hardcode economy in UI. Edit `src/data/balance.ts` and document intent in [BALANCE.md](./BALANCE.md).
