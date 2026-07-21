# Balance

**Source of truth:** `src/data/balance.ts`  
If this doc and the file disagree, **trust the file** and update the doc.

---

## Design intent (15-floor acts)

- Longer climb than early prototypes → slightly higher **max HP**, lower **gold per fight**
- **Campfires matter:** rest heals a fraction of max HP; fights do **not** free-heal
- Cast accuracy is the real skill check (energy lost on fizzle)
- Shop should be reachable after a few fights + optional treasure, not trivial every room

---

## Live constants (v0.1.0 era)

| Constant | Value | Notes |
|----------|-------|-------|
| `HERO_MAX_HP` | **40** | Life pool |
| `DRAW_PER_TURN` | **5** | StS-like |
| `MAX_HAND_SIZE` | **10** | Cap further draws |
| `REST_HEAL_FRACTION` | **0.4** | Campfire = 40% max HP (floor, min 1) → e.g. +16 at 40 max |
| `HEAL_AFTER_COMBAT` | **0** | No post-fight heal |
| `ACT_CLEAR_HEAL` | **16** | After Act I/II boss before next act |
| `GOLD_FIGHT_BASE` | **16** | + `0..GOLD_JITTER-1` |
| `GOLD_ELITE_BASE` | **28** | Elite/boss fight gold base |
| `GOLD_JITTER` | **5** | |
| `GOLD_ELITE_FLAT_BONUS` | **4** | |
| `GOLD_DANGER_BONUS` | **8** | Hard path bonus |
| `GOLD_TREASURE_BASE` | **32** | + treasure jitter |
| `GOLD_TREASURE_JITTER` | **8** | |
| `SHOP_CARD_PRICES` | **22, 34, 46** | Three shop slots |
| `SHOP_REMOVE_PRICE` | **38** | Once per shop visit |

Helper: `restHealAmount(heroMaxHp)`.

---

## Related content knobs (not in balance.ts)

| Area | File |
|------|------|
| Card costs / damage / block | `data/cards.ts` |
| Enemy HP / intent damage | `data/enemies.ts` |
| Multi-enemy recipes | `data/encounters.ts` |
| Map density / room kinds | `data/map.ts` |
| Relic strength | `data/relics.ts` |

---

## Playtest tips

1. Enable **debug skip cast** to measure pure combat/economy without 注音 load.  
2. Then re-test with cast **on** — fizzle rate changes effective DPS.  
3. Watch campfire spacing: if players never need rest, rest rooms or fight damage may be soft.  
4. Shop prices should feel “save for a good card,” not always-buy-all.

See [DEBUG.md](./DEBUG.md) and [ROADMAP.md](./ROADMAP.md).
