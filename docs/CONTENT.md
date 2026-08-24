# Content authoring

How to add playable content without reverse-engineering the whole repo.

---

## Cards — `src/data/cards.ts`

The live 共鳴武者 release is the ten-card starter plus nine Act I reward designs
(12 unique designs). After character score 300, later-act fights, shops, and
treasure may also offer the 13 reviewed Wave 2 Commons. `resonanceCards.ts`
still contains the generated 75-card catalog for the designer and score UI;
cards without `reviewedWave <= LIVE_REVIEWED_WAVE` are not obtainable. Review
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
| `upgrade` | Live `+` face applied to one physical card copy |
| `unlockScore` | Catalog / 🃏 progress threshold (300 / 1000 / 2000) |
| `reviewedWave` | Human-reviewed obtainability wave; live offers use `LIVE_REVIEWED_WAVE` |
| `designId` / `mechanics` / `direction` | Design-audit metadata |

Also maintain **pools**: `STARTER_DECK_IDS`, `REWARD_POOL_IDS` (Act I, exactly 9),
`RESONANCE_WAVE_TWO_IDS`, and `LIVE_REVIEWED_WAVE`. Later-act / shop / treasure
offers come from `character.cardPoolIds` filtered by score **and** reviewed wave.
Do not grow the Act I reward table until playtesting asks for it.

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

The live 共鳴武者 catalog has 75 designs: 12 at score 0, then three 21-card
waves at scores 300, 1000, and 2000. Profiles saved before character
progression migrate to score 300 and therefore begin with 33 cards unlocked.

The live first-character specification and future upgrade constraints are in
[DECK_DESIGN.md](./DECK_DESIGN.md). Relic and potion work is deliberately
gated by [NEXT_PHASE.md](./NEXT_PHASE.md); do not restore the archived
Echo-coupled proposal.

---

## Balance constants

Do not hardcode economy in UI. Edit `src/data/balance.ts` and document intent in [BALANCE.md](./BALANCE.md).
