# Balance

**Source of truth:** `src/data/balance.ts`  
If this doc and the file disagree, **trust the file** and update the doc.

The table below is the live economy. Card text lives in `data/cards.ts`.
Shipped relic and potion effects live in `data/relics.ts` and `data/potions.ts`
and are summarized in [NEXT_PHASE.md](./NEXT_PHASE.md). Live fight patterns
live in `data/enemies.ts` and `data/encounters.ts` and are listed in
[ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md). Difficulty scaling, keys, and
Act IV in [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md) are still
proposals. Structural StS benchmarks and the reasons for adapting them to
this shorter, cast-gated game are in
[STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md).

---

## Design intent (15 climb floors + boss)

- Longer climb than early prototypes → slightly higher **max HP**, lower **gold per fight**
- **Campfires matter:** rest heals a fraction of max HP; fights do **not** free-heal
- Cast accuracy is the real skill check (energy lost on fizzle)
- Shop should be reachable after a few fights + optional treasure, not trivial every room

---

## Live constants

| Constant | Value | Notes |
|----------|-------|-------|
| `HERO_MAX_HP` | **40** | Life pool |
| `DRAW_PER_TURN` | **5** | StS-like |
| `MAX_HAND_SIZE` | **10** | Cap further draws |
| `REST_HEAL_FRACTION` | **0.4** | Campfire = 40% max HP (floor, min 1) → e.g. +16 at 40 max |
| `HEAL_AFTER_COMBAT` | **0** | No post-fight heal |
| Boss clear heal | **Full HP** | Every boss restores the hero to maximum HP when cleared |
| `GOLD_FIGHT_BASE` | **16** | + `0..GOLD_JITTER-1` |
| `GOLD_ELITE_BASE` | **28** | Elite/boss fight gold base |
| `GOLD_JITTER` | **5** | |
| `GOLD_ELITE_FLAT_BONUS` | **4** | |
| `GOLD_DANGER_BONUS` | **8** | Hard path bonus |
| `GOLD_TREASURE_BASE` | **32** | + treasure jitter |
| `GOLD_TREASURE_JITTER` | **8** | |
| `RELIC_POOL_EXHAUST_GOLD` | **20** | Chest, elite, or boss drop when that character's pool is already owned |
| `SHOP_CARD_PRICES` | **22, 34, 46** | Three shop slots |
| `SHOP_REMOVE_PRICE` | **38** | Once per shop visit |
| `POTION_BELT_SLOTS` | **3** | Fixed belt. Not expandable |
| `SHOP_POTION_COUNT` | **2** | Different bottles on one shelf |
| `SHOP_POTION_PRICE` | **18** | Flat price, about one normal fight, under the cheapest card |
| `POTION_DROP_START` | **40** | Percent. Resets when the next act starts |
| `POTION_DROP_STEP` | **10** | Down after a drop, up after a miss |
| `POTION_DROP_MIN` / `MAX` | **10 / 80** | Clamp |
| `BEAD_CAP` / `TENS_CAP` / `MAKE_TEN_SIZE` | **9 / 9 / 10** | 算珠 wraps every 10. 十串 stops at 9 and the 湊十 still fires |
| `BEAD_FILL_CAP` | **5** | 湊十訣 adds at most this many, and never past the next ten |
| `WOOD_BEADS_DIRECT_DAMAGE` | **2** | 木珠串 direct damage per 湊十 |
| `BEAD_POUCH_START` | **4** | 算珠袋 beads at combat start |
| `RULER_CHARM_CAST` / `BLOCK` | **3 / 3** | 小尺子: Block when this many casts have succeeded this turn |
| `TEN_BELL_ENERGY` | **1** | 十響鈴 energy on the first 湊十 |
| `ERASER_BEADS` | **2** | 橡皮擦 beads on the first final fizzle |
| `BEAD_ARRAY_BLOCK` / `_PLUS` | **4 / 6** | 珠串陣 |
| `BEAD_BURST_DAMAGE` / `_PLUS` | **2 / 3** | 珠落玉盤 direct damage |
| `TURN_START_BEADS` | **2** | 撥算如飛 |
| `MATH_CHOICE_COUNT` | **3** | Answers on every live math prompt |
| `MATH_TIER_FLOOR_DEFAULT` / `CEILING` | **1 / 4** | Parent band. Tier 5 is the grade-2 opt-in |
| `MATH_ADAPTIVE_DROP_CAP` | **4** | Adaptivity only lowers |
| `MATH_MISS_WINDOW` / `TRIGGER` | **5 / 2** | Newest miss plus this many misses drops one step |
| `MATH_RECOVER_WINDOW` / `HITS` | **8 / 6** | Newest hit plus this many hits restores one step |
| `MATH_WARMUP_STREAK` | **3** | Misses in a row this combat force the next prompt to tier 1 |

Helper: `restHealAmount(heroMaxHp)`.

Fight gold, treasure gold, relic drops, potion drops, reward cards, shop cards, upgrade offers, and deck shuffles each read a named stream saved on the run (`rng` in the version-4 checkpoint). The ranges in this table are unchanged. A reward card is a uniform draw from that character's current pool, so its rarity mix is the pool's mix. A potion drop uses `POTION_DROP_START` / `POTION_DROP_STEP` and then a uniform bottle. A relic drop is uniform among that character's unowned pool relics.

---

## Related content knobs (not in balance.ts)

| Area | File |
|------|------|
| Card costs / damage / block | `data/cards.ts` |
| Enemy HP / intent damage | `data/enemies.ts` |
| Multi-enemy recipes | `data/encounters.ts` |
| Map density / room kinds | `data/map.ts` |
| Relic strength | `data/relics.ts` — per-character pools. 共鳴武者: starter plus five drops. 珠算武者: 木珠串 plus four drops. Four legacy relics and four named event relics stay shared |
| Potion effects | `data/potions.ts` — six bottles. Block-absorbing hits are not 直傷 |
| Events | `data/events.ts` — 30 events for Acts I, II, and III |
| Fight roster | `data/enemies.ts`, `data/encounters.ts` — live patterns in [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md) |

---

## Playtest tips

1. Enable **debug skip cast** to measure pure combat/economy without 注音 load.  
2. Then re-test with cast **on** — fizzle rate changes effective DPS.  
3. Watch campfire spacing: if players never need rest, rest rooms or fight damage may be soft.  
4. Shop prices should feel “save for a good card,” not always-buy-all.

See [DEBUG.md](./DEBUG.md) and [ROADMAP.md](./ROADMAP.md).

---

## Balance measurement (B1–B24)

The v1 roadmap points at END_STATE.md §15 for rows B1–B26. That document is
not in this repo. This table is the measurement contract for
`scripts/balance-report.mjs`. A row the family sheet still writes by hand is
`session record` ([playtest/FAMILY_SESSION.md](./playtest/FAMILY_SESSION.md)).
B25 and B26 are later grades and acts. This extractor stops at B24.

`node scripts/balance-report.mjs <telemetry-export.json>` prints every row.
Events with `synthetic: true` (child model, debug, or webdriver) are
`cohort: synthetic (child-model)`. Other events are `cohort: real play`.
A v0.4.4 export and a schema v2 export stay readable. A field that export
does not have is `n/a`. See [TELEMETRY.md](./TELEMETRY.md).

Bands the roadmap states, and this table does not invent the rest:

- B1: flag an Act I clear rate above 80% (P46-11).
- B10: boss turns 5–8; flag a median under 5.
- B13: if shop gold misses the band, tune `GOLD_FIGHT_BASE` from 16 toward 13. Shop prices stay.
- B17: the median first exhaust floor should not fall before the Act III elites. That content is later.
- B21: later second bosses, about ±10 percentage points of wins and ±20% HP lost.
- B22: `scorchCooled` at or above 80% for the steady persona, once that event exists. Until then the cell is `n/a`.

| Row | What it measures | Where it comes from |
|-----|------------------|---------------------|
| B1 | Act I clear rate | `actClear` with `act` 1, over those clears plus `sittingEnd` `reason` `defeat` |
| B2 | Adult can explain damage, block, and intent | session record (三件說明) |
| B3 | Child wants to play again | session record |
| B4 | Campfire choice | `rest.choice` (`rest`, `smith`, `remove`) |
| B5 | First-try cast rate | `cast` that is correct, not retried, and `hintLevel` 0 |
| B6 | Cast success rate | `cast.correct` |
| B7 | Hint rate | `cast.hintLevel` above 0 |
| B8 | Slow answer share | `cast.responseBucket` `>30s` |
| B9 | Turns per non-boss fight | `combatEnd.turns` where `nodeKind` is `fight`, `unknown`, or `event` |
| B10 | Boss turns | `combatEnd.turns` where `nodeKind` is `boss` |
| B11 | HP lost per normal fight | `combatEnd.hpLost` where `nodeKind` is `fight` or `unknown` |
| B12 | HP lost per elite | `combatEnd.hpLost` where `nodeKind` is `elite` |
| B13 | Gold at shop entry | `shopEnter.gold` |
| B14 | HP at boss entry | `bossEntry.hp` |
| B15 | Deck size at boss entry | `bossEntry.deckSize` |
| B16 | Boss HP lost, and gold before the boss | `combatEnd.hpLost` for a boss, and `bossEntry.gold`. Both are stored before the post-boss full heal |
| B17 | First floor where the relic pool runs out | earliest `relicPoolExhaust.floor` in each sitting. `none` when schema v3 recorded no exhaust |
| B18 | Potions used | `potionUsed` |
| B19 | Campfire choices taken | `rest` |
| B20 | Elites fought | `combatEnd` with `nodeKind` `elite` |
| B21 | Boss win rate and HP lost | `combatEnd.won` and `combatEnd.hpLost` where `nodeKind` is `boss` |
| B22 | Scorch cooled | `scorchCooled` when that event exists |
| B23 | Mis-taps | session record (誤觸) |
| B24 | Speech failures | session record (語音失敗) |

Numbers are medians with a sample size, except the rates and the plain counts.
Rest count and prompt difficulty are not tuning levers.
