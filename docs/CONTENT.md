# Content authoring

How to add playable content without reverse-engineering the whole repo.

---

## Cards — `src/data/cards.ts`

The live 共鳴武者 release is the ten-card starter plus nine reward designs
(12 unique designs total). `resonanceCards.ts` also contains a generated
75-card implementation draft for static review, but cards outside the first
wave are not in character, reward, shop, or later-act pools. Review
[DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md) and
[RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md)
before promoting another wave.

The target type system is `Attack | Skill | Power`: any direct Attack card
remains Attack even with secondary effects; one-use defense/draw/Energy/status
actions are Skills; Powers remain active for the rest of combat. The live
prototype's `block` type must migrate to Skill rather than becoming a fourth
type. Status and Curse are separate pollution types.

### `CardDef` fields

| Field | Meaning |
|-------|---------|
| `id` | Stable string key |
| `zhuyin` | Teaching initial (e.g. `ㄅ`) — keys phrase bank |
| `name` | Display name |
| `type` | `attack` \| `skill` \| `power` |
| `cost` | Energy |
| `icon?` | Stable combat art emoji; unlike the changing spelling cue emoji |
| `job?` | Primary deck job: frontload, area, defense, scaling, draw, or energy |
| `value` | Primary damage or block amount |
| `hits?` | Multi-hit attacks |
| `bonusBlock?` / `draw?` | Extra effects |
| `effects?` | Modular damage/block/draw/energy/status/training/勁 definitions |
| `target?` | `self` \| `singleEnemy` \| `allEnemies` |
| `cues` | Fallback teaching phrases on the card |
| `description` | Exact readable effect text |
| `upgrade` | Draft `+` face; the physical-copy schema exists but live upgrades remain gated off |
| `designId` / `mechanics` / `direction` | Design-audit metadata |

Also maintain **pools**: `STARTER_DECK_IDS`, `REWARD_POOL_IDS`, `ELITE_REWARD_POOL_IDS`, practice ids, etc. For the first character, keep the starter at 3 designs and Act I rewards at exactly 9 until playtesting justifies expansion.

### Teaching rules for cues / phrases

1. Word **starts with** that card’s 注音  
2. Emoji depicts **that word**  
3. `spell` is the **full first syllable** including 聲調 when not first tone  

Example: 爸爸 → `ㄅㄚˋ`.

### Minimal “new attack card” checklist

1. Add `CardDef` to `CARDS`  
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

Characters use a discriminated runtime status. A `playable` definition owns its
starter deck ids, starter summary, starting relic, casting-gate id, reward pool,
implemented card catalog, and one main theme. An `inDesign` definition contains
presentation copy only and must never be accepted by run state or save
validation. New runs select a character; they do not separately choose an
unrelated starter relic. Keep starter relics always useful, small, and thematic.
Existing v1 saves may retain a legacy relic so an in-progress run is not
destroyed.

Draft character cards may declare a cumulative `unlockScore`, but progress
counts derive only from the character's published `cardPoolIds`. Promoting a
reviewed wave requires adding those ids to the published pool; upgrades never
increase the count. Practice remains unfiltered because progression must not
hide phonetic material. Never remove an existing card from a saved deck or
offer.

The live 共鳴武者 catalog has 12 designs. Character score is already stored so
future reviewed waves can use it, but no score currently publishes cards from
the generated 75-card draft. Profiles saved before character progression may
migrate to score 300 without changing the current 12/12 live pool.

The live first-character specification and future upgrade constraints are in
[DECK_DESIGN.md](./DECK_DESIGN.md).
The proposed full 40-relic and 20-potion catalog is in
[RELIC_POTION_BIBLE.md](./RELIC_POTION_BIBLE.md).

---

## Balance constants

Do not hardcode economy in UI. Edit `src/data/balance.ts` and document intent in [BALANCE.md](./BALANCE.md).
