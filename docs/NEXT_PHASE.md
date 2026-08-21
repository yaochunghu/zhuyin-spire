# Next phase — v0.4 plan

This is the working plan after reading the live tree on `main` (2026-08-21).
It is not a calendar. It names what is actually running, what docs still
describe as gated, and the next implementation slice.

## Current version

| Source | Says |
|--------|------|
| `package.json` | **0.3.1** |
| `CHANGELOG.md` latest section | **0.3.1** (2026-07-23): card instances, 共鳴武者, pause menu |
| Git tags / GitHub Releases | Latest published tag **v0.2.2** (2026-07-24) |
| `README.md` | Still **0.2.1** |
| `docs/INDEX.md` snapshot | Still **v0.2.0** |

Treat the running product as **0.3.1 plus unreleased `main` work**. That extra
work is not a new changelog version yet. It includes:

- Phone portrait/landscape combat, map, and pause-menu layouts
- Resonance 75-card generated catalog, score unlocks, Smith, later-act pools
- Magical toy-board / tabletop art (act scenes, enemy miniatures, transitions)
- Visual review package under `design/reviews/next-stage/`

**Version hygiene (do this in the same release train as the next feature, or
immediately before it):** bump README/INDEX to 0.3.1 (or 0.3.2 if the toy-board
pass is named), write the missing changelog section, and only then cut a GitHub
release. Do not treat `v0.2.2` as the live codebase.

## What is actually live

Confirmed in runtime, not only in design memos:

| Area | Live behavior |
|------|----------------|
| Stack | Vite + TypeScript SPA, localStorage, no backend |
| Climb | 3 acts × 15 climb floors × 7 lanes + boss; rest / shop / treasure / elite |
| Character | One playable: 🧒🥋 共鳴武者 (`echoMage` save id) |
| Act I rewards | 9 reviewed designs + 10-card starter (12 unique designs) |
| Later acts | Full `RESONANCE_CARD_IDS` (75), filtered by learner **character score** |
| Score unlocks | 12 cards at 0; **33 at 300**; more at 1000 and 2000 |
| Upgrades | `upgradesEnabled: true`; campfire **Rest / Smith / Remove**; later-act offers can roll `+` |
| Relics | One starting relic per run (`tuningFork` for this character). Treasure is **gold + 3 cards**, not a relic. Extra relic defs exist but are not a run pool |
| Potions | None |
| Events | None. Map `NodeKind` has no event room |
| Casting | Full first-syllable 注音; skip only in debug builds |
| Profiles | Up to 4 learners; shuffle bags and score are per profile |
| UI | Tablet + phone layouts; pause menu; toy-board art with emoji fallback |
| Tests | Vitest + Playwright smoke (tablet + phone) + CI on `main` |

Wave-one cards have Chinese descriptions and combat icons via
`RESONANCE_WAVE_ONE_PRESENTATION`. Generated later-wave cards still show
**English effect text** (`Deal 3 damage…`) and single-cue families.

## What is drafted but not a ship claim

| Artifact | Role |
|----------|------|
| `src/data/resonanceCards.ts` | Implementation draft of the 75-card catalog |
| `docs/RESONANCE_WARRIOR_DESIGN_PROCESS.md` | Cull ledger, directions, human playtest matrix |
| `docs/RELIC_POTION_BIBLE.md` | Historical Echo-coupled 40 relics / 20 potions — needs 共鳴 rewrite |
| `docs/EVENT_ENCOUNTER_BIBLE.md` | 30 events, fuller encounters, keys, Act IV |
| `docs/CARD_BIBLE.md` | Frozen Echo Mage roster (comparison only) |
| `design/reviews/next-stage/` | Viewport art approval; physical-device QA still pending |

Simulation sweeps (40k runs) are **evidence levels 2–3**. They do not replace
cast-on / debug-skip human drafts.

## Doc vs code mismatches (fix while working)

These will mislead the next implementer if left as-is:

- `docs/UPGRADE_BIBLE.md` still says Smith is gated and offers are always level 0.
  Runtime: Smith is on; Act II/III offers can be upgraded.
- `docs/ARCHITECTURE.md` still says rest is Rest-or-Remove and Smith is dormant.
- `docs/CONTENT.md` still says later-act pools exclude the generated catalog.
  Runtime: later acts use the full character pool + score filter.
- `src/data/cards.ts` comment still says only wave-one ids are obtainable.
- `docs/ROADMAP.md` “Shipped (v0.2.0)” understates 0.3.x.

## Product constraint for the next slice

The playbook release gates remain:

1. Starter + nine Act I rewards — **done**
2. Low-rarity direction access and missing encounter answers
3. Uncommon glue / engines
4. Rare build-arounds
5. Broader relics, potions, events — after inventory and save contracts

Score 300 already injects **21 extra generated cards** into Acts II–III for
migrated or scoring learners. That is larger than a reviewed wave. The next
*feature* must make that obtainability honest: either review and present those
cards as preschool content, or keep them out of live pools until that review
exists.

Do not start Act IV, keys, a 20-level ascent, a second character, or English/math
providers in this phase.

## Recommended next feature: Resonance Wave 2 (obtainability + presentation)

**Player-facing purpose:** after a learner has shown they can finish Act I
content, later acts offer a small, icon-first set of extra Commons that teach
the three 共鳴 directions without dumping the English 75-card draft.

### Scope in

1. **Hard obtainability flag** separate from “card exists in the catalog.”
   Score unlocks may remain as the long-term curve, but 1000/2000 (and any
   unreviewed 300-row) must not enter `rewardPoolFor` / shop / treasure until
   the wave is marked reviewed.
2. **Author Wave 2 presentation** for the score-300 Commons that survive a
   human cull: Chinese `description`, stable `icon`, full cue families from
   `LEGACY_CARDS` or new preschool phrases, upgrade text in Chinese.
3. **Keep Act I at the 12-design teaching set** until Wave 2 is proven. Do not
   grow the first-act reward table in this slice.
4. **Static + unit gates:** every newly obtainable card has phrase coverage,
   Skill (not leftover `block` type), failed-cast / multi-enemy / save-load
   tests for any new trigger.
5. **Playtest telemetry already exists** (`src/game/playtestTelemetry.ts`).
   Use it; do not build a new analytics backend.
6. **Doc alignment** for version, Smith, and pool rules listed above.

### Scope out

- Promoting Uncommons/Rares (waves 3–4)
- Potion inventory and 20-potion bible
- Event rooms
- Relic *content* expansion (starter fork stays; a pool is the slice after Wave 2)
- Physical iPad/iPhone/Android certification (art package already flags this)
- Cutting a GitHub release unless the owner asks

### Suggested Wave 2 job mix

Start from the score-300 Commons that fill holes the starter nine do not cover:

| Hole in wave 1 | Candidate job |
|----------------|---------------|
| Energy / Exhaust tempo | 深呼吸 (`de`, B010) |
| Block + draw | 邊擋邊唱 (`ne`, B011) |
| 易傷 payoff Attack | 試探拳 / 趁隙直拳 class (`ji`, `xi`) |
| Extra 基礎攻擊 density | 低樁拳 / 基本防線 class |
| Skill-side 轉拍 | 守攻換拍 (`a`, B052) if the trigger is already implemented |
| 勁 setup that is not only 化勁掌 | one cheap Block that makes full-block readable |

Final list is a **human cull of ~9–12 designs**, not “every `unlockScore: 300`
row.” Prefer cards whose effects already resolve through
`src/game/battle/effects.ts` without new selectors.

### Release checks for this feature

Copy of the playbook wave gate, specialized:

- [ ] Obtainability is data-driven; designer catalog can still show drafts
- [ ] Act I rewards unchanged (9 + starter)
- [ ] Later-act / shop / treasure only see reviewed Wave 1 + Wave 2 ids
- [ ] No English card faces in the live pool
- [ ] Failed cast still spends the card and Energy
- [ ] Smith upgrades the exact UID; V2 saves round-trip
- [ ] Phone hand + tablet cards stay fixed-height and icon-first
- [ ] Debug-skip and one cast-on Act I + Act II smoke both pass
- [ ] Changelog + README version match `package.json`

## Phase map after Wave 2

Ordered by dependency, not dates:

| Phase | Feature | Why it waits |
|-------|---------|----------------|
| **0.4a (this PR’s recommended work)** | Wave 2 obtainability + Chinese presentation | Stops unreviewed English cards leaking into Acts II–III |
| **0.4b** | Human debug-skip / cast-on matrix on Wave 1+2 | Playbook gate; telemetry already wired |
| **0.5** | Relic *pool* (chest + elite) with 3–6 共鳴-safe relics | Treasure currently duplicates card rewards; StS chest identity is missing. Needs a run relic list and inspectable badges first — not the 40-row bible |
| **0.6** | Potion belt (3 slots) + 4–6 potions | Save schema and targeting UI do not exist |
| **0.7** | Act I events only (3–5 rooms, exact costs on buttons) | Map has no event kind; bible is Echo-era |
| **0.8** | Encounter rewrite one act at a time | Current packs are still slime-forward teaching recipes |
| Later | Waves 3–4, keys / Act IV, second character | After the three-act loop has relics + events + reviewed Commons |

## Why not start with relics or events

They are the correct *climb* fantasy, but they sit on missing contracts:

- Relic bible still talks Echo duration and `+2` first-hit; live fork is `+1`
  and 易傷/練功/勁 are the character language.
- Events need eligibility, bounded RNG streams, and a new map node kind.
- Wave 2 is already half-wired (score 300) and is the leak that will hit
  players first if ignored.

## Implementation notes (when coding starts)

- Pools: `src/data/characters.ts` (`actIRewardIds` vs `cardPoolIds`),
  `rewardPoolFor` in `src/game/state.ts`, `filterUnlockedCardsForProfile`.
- Presentation: extend `RESONANCE_WAVE_ONE_PRESENTATION` (or a Wave 2 map)
  rather than editing generated English strings in place if the generator
  will be re-run.
- Phrases: `getCardCastBinding` coverage floors; parent curriculum must still
  leave every obtainable card with a valid prompt.
- Do not remount combat mid-FX. Do not enable cast skip outside debug.

## First coding task when this plan is approved

Add an explicit `reviewedWave: 1 | 2 | …` (or `obtainable: boolean`) on each
card / character pool so `unlockScore` cannot publish Wave 3–4 by accident,
then author Chinese faces for the culled Wave 2 set.
