# Content authoring

How to add playable content without reverse-engineering the whole repo.

---

## Cards — `src/data/cards.ts`

共鳴武者 begins with 12 unique designs: three starter designs plus nine Act I
teaching rewards. Cumulative character score expands the Acts II–III fight,
shop, and treasure pool to 33 cards at 300, 54 at 1,000, and all 75 at 2,000.
Act I keeps its small teaching pool at every score. Review
[DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md) and
[RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md)
before changing tier assignments.

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
| `unlockScore` | Obtainability / 🃏 progress threshold (300 / 1000 / 2000; unset means score 0) |
| `designId` / `mechanics` / `direction` | Design-audit metadata |

Also maintain **pools**: `STARTER_DECK_IDS`, `REWARD_POOL_IDS` (Act I, exactly
9), and `character.cardPoolIds` (all 75). Later-act fights, shops, and treasure
filter the full character pool by score. Do not grow the Act I reward table
until playtesting asks for it.

### Teaching rules for cues / phrases

1. Word **starts with** that card’s 注音  
2. Emoji depicts **that word**  
3. `spell` is the **full first syllable** including 聲調 when not first tone  
4. Glyph and reading follow 《重編國語辭典修訂本》 headwords. Neutral tone keeps a trailing ˙ so the cast parser can see it.
5. A 破音字 uses the headword reading whose definition matches the picture. If that word and picture are already in the bank, do not keep a second row.

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

Pictured rows below are locked to the revised-dictionary headword for that
picture. `tests/unit/casting-gate.test.ts` fails if they drift.

| Word | Emoji | Spell | Dictionary sense used |
|------|-------|-------|------------------------|
| 幹 | 🪵 | ㄍㄢˋ | 樹幹. 干 ㄍㄢ is a shield, bank, or dried food. |
| 更 | 📈 | ㄍㄥˋ | 更加. ㄍㄥ is change or a night watch. |
| 還 | ↩️ | ㄏㄨㄢˊ | 歸還. The ㄏㄞˊ row used the same picture and was removed. |
| 卷 | 📜 | ㄐㄩㄢˋ | 書卷、考卷. ㄐㄩㄢˇ is roll up, or a food roll. |
| 期 | 📅 | ㄑㄧˊ | 日期、學期. ㄑㄧ is only 「(一)之又音」. |
| 傳 | 📣 | ㄔㄨㄢˊ | 傳播. The ㄓㄨㄢˋ row used the same picture and was removed. |
| 甚 | ❓ | ㄕㄣˊ | 甚麼. ㄕㄣˋ is 非常. |
| 鑽 | 💎 | ㄗㄨㄢˋ | 鑽石. ㄗㄨㄢ is the verb drill. |
| 撒 | 🌱 | ㄙㄚˇ | 撒種. ㄙㄚ is 撒手 or 撒嬌. |
| 微 | 🔬 | ㄨㄟˊ | 細小, as in 顯微鏡. ㄨㄟ is only 「(一)之又音」. |

余 ➕ stays 余 ㄩˊ. The same dictionary defines 剩下、多餘 on 余, so it is not
rewritten as 餘. One 桌 🍽️ ㄓㄨㄛ row remains beside 桌子. The later 桌 rows
repeated that word and spelling, and `dedupe()` already dropped them at runtime.

The fourteen rows that were left open use the same dictionary. Where several
readings each have their own definitions, the row uses the reading of the
pictured phrase. A cross-reference marked 「(一)之又音」, 「(一)之語音」, or
「(一)之讀音」 is not the headword.

| Word | Emoji | Spell | Dictionary sense used |
|------|-------|-------|------------------------|
| 背 | 🎒 | ㄅㄟ | 背包. ㄅㄟˋ is the body back. |
| 表 | ⌚ | ㄅㄧㄠˇ | 手表 is defined on 表, which says 也作「錶」. |
| 鋪 | 🛏️ | ㄆㄨˋ | 床鋪. 鋪床 is ㄆㄨ. |
| 量 | ⚖️ | ㄌㄧㄤˋ | 重量. 量體重 is ㄌㄧㄤˊ. |
| 困 | 😴 | ㄎㄨㄣˋ | 困倦. 睏 is the same tone. |
| 將 | ♟️ | ㄐㄧㄤ | 將軍, the chess attack. 將帥 is ㄐㄧㄤˋ. |
| 閑 | 😌 | ㄒㄧㄢˊ | 空暇無事. 閒 is the same tone. |
| 興 | 🎉 | ㄒㄧㄥˋ | 高興. ㄒㄧㄥ is 興起. |
| 血 | 🩸 | ㄒㄧㄝˇ | Blood is defined here. ㄒㄩㄝˋ is 「(一)之讀音」. |
| 熟 | 🔥 | ㄕㄨˊ | 煮熟. ㄕㄡˊ is 「(一)之語音」. |
| 掃 | 🧹 | ㄙㄠˋ | 掃帚 / 掃把. 掃地 is ㄙㄠˇ. |
| 艘 | ⛵ | ㄙㄠ | 一艘船. ㄙㄡ is 「(一)之又音」. |
| 應 | ✅ | ㄧㄥˋ | 答應. 應該 is ㄧㄥ. |
| 于 | 📍 | ㄩˊ | The preposition 在. 於 is the same tone. |

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

Character cards may declare a cumulative `unlockScore`, but progress counts
derive only from the character's published `cardPoolIds`. Score is the sole
offer gate; upgrades never increase the count. Practice remains unfiltered
because progression must not hide phonetic material. Never remove an existing
card from a saved deck or offer.

The live 共鳴武者 catalog has 75 designs: 12 at score 0, then three 21-card
waves at scores 300, 1000, and 2000. Profiles saved before character
progression migrate to score 300 and therefore begin with 33 cards unlocked.

The live first-character specification and future upgrade constraints are in
[DECK_DESIGN.md](./DECK_DESIGN.md). The live relic pool is the five 共鳴 drops
in [NEXT_PHASE.md](./NEXT_PHASE.md) plus the starter 初心音叉. The live potion
belt is the six bottles in that same page. Do not restore the archived
Echo-coupled 40-relic or 20-potion proposal.

---

## Balance constants

Do not hardcode economy in UI. Edit `src/data/balance.ts` and document intent in [BALANCE.md](./BALANCE.md).
