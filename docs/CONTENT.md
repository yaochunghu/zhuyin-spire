# Content authoring

How to add playable content without reverse-engineering the whole repo.

---

## Cards — `src/data/cards.ts`

### `CardDef` fields

| Field | Meaning |
|-------|---------|
| `id` | Stable string key |
| `zhuyin` | Teaching initial (e.g. `ㄅ`) — keys phrase bank |
| `name` | Display name |
| `type` | `attack` \| `block` \| `skill` |
| `cost` | Energy |
| `value` | Primary damage or block amount |
| `hits?` | Multi-hit attacks |
| `bonusBlock?` / `draw?` | Extra effects |
| `effects?` | Modular `{ kind, amount, hits? }[]` |
| `target?` | `self` \| `singleEnemy` \| `allEnemies` |
| `cues` | Fallback teaching phrases on the card |
| `description` | Kid/adult readable text |

Also maintain **pools**: `STARTER_DECK_IDS`, `REWARD_POOL_IDS`, `ELITE_REWARD_POOL_IDS`, practice ids, etc.

### Teaching rules for cues / phrases

1. Word **starts with** that card’s 注音  
2. Emoji depicts **that word**  
3. `spell` is the **full first syllable** including 聲調 when not first tone  

Example: 爸爸 → `ㄅㄚˋ`.

### Minimal “new attack card” checklist

1. Add `CardDef` to `CARDS`  
2. Add `id` to appropriate reward / starter pools  
3. Ensure `PHRASES_BY_INITIAL` has plenty of words for that 注音 (or rely on card cues + bank merge)  
4. Play one fight with debug skip-cast off to verify cast UI  

---

## Enemies — `src/data/enemies.ts`

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
- Parent filters: `game/phraseSettings.ts` + title UI  
- Advanced localStorage: include/exclude word lists under `zhuyin-spire-phrase-settings-v1`

Cast checks prefer the **shared bank**, not only the card’s few cues, so one card practices many words over a run.

---

## Relics — `src/data/relics.ts`

Weak starter relics (+block, +gold, turn-1 energy, …). Pick screen at run start. Keep effects small — preschool co-op, not full StS relic soup.

---

## Balance constants

Do not hardcode economy in UI. Edit `src/data/balance.ts` and document intent in [BALANCE.md](./BALANCE.md).
