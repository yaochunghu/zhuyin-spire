# Docs index — 注音之塔

Start here when you return after a break.

## Returning after a break (≈10 min)

1. **Run the game:** from repo root, `npm install && npm start` → `http://localhost:5173`.
2. **Skim** [AGENTS.md](../AGENTS.md) — non-negotiables and “where to change X”.
3. **Architecture** — [ARCHITECTURE.md](./ARCHITECTURE.md) for screens, state, and render flow.
4. **Playtest tools** — [DEBUG.md](./DEBUG.md) (`?debug=1`, skip cast for combat balance).
5. **What’s next** — [NEXT_PHASE.md](./NEXT_PHASE.md), then [ROADMAP.md](./ROADMAP.md).

Product pitch and parent/child how-to-play: [README.md](../README.md).

---

## Table of contents

| Doc | Purpose |
|-----|---------|
| [STABILIZATION.md](./STABILIZATION.md) | Integration boundary and preserved 75-card progression |
| [BROWSER_SUPPORT.md](./BROWSER_SUPPORT.md) | Browser verification and physical-device release gates |
| [PLAYTEST_GATE.md](./PLAYTEST_GATE.md) | Automated gate plus the two human release gates |
| [playtest/DEVICE_CHECKLIST.md](./playtest/DEVICE_CHECKLIST.md) | Parent checklist for iPhone, iPad, and Android |
| [playtest/FAMILY_SESSION.md](./playtest/FAMILY_SESSION.md) | Act I family script, observations, and read-aloud |
| [playtest/sessions/TEMPLATE.md](./playtest/sessions/TEMPLATE.md) | Blank session record; do not commit filled copies |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Screens, `RunState`, layers, save, render loop |
| [COMBAT.md](./COMBAT.md) | Battle modules, cast gate, drag play, FX pitfalls |
| [MAP.md](./MAP.md) | Spire map gen (15×7), layout constraints |
| [CONTENT.md](./CONTENT.md) | How to add cards, enemies, encounters, phrases |
| [CASTING_GATES.md](./CASTING_GATES.md) | Reusable education gate, phrase bags, learner profiles, future subjects |
| [TELEMETRY.md](./TELEMETRY.md) | Local playtest export: schema v3 run fields, `cast`, and the balance report |
| [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md) | Governing design funnel, evidence ladder, complexity budget, and release gates |
| [DECK_DESIGN.md](./DECK_DESIGN.md) | Live 共鳴武者 foundation, directions, starter, and upgrades |
| [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md) | Locked 共鳴武者 75-card roster, score progression, simulation, and review checks |
| [STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md) | StS combat, cards, runs, economy, progression, UX, and lessons to adapt |
| [ENCOUNTER_RELIC_DESIGN_RESEARCH.md](./ENCOUNTER_RELIC_DESIGN_RESEARCH.md) | Review memo on StS/StS2 encounters, bosses, relic co-design, and a full-run design method |
| [UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md) | Live physical-copy foundation and all 75 score-gated upgrades |
| [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md) | 30 live Act I–III events; difficulty variants, keys, and Act IV still proposed |
| [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md) | Live normal, elite, and boss roster, and Yao's decisions on the #52 questions |
| [BALANCE.md](./BALANCE.md) | Live economy and the B1–B24 measurement map |
| [DEBUG.md](./DEBUG.md) | Debug panel, flags, skip-cast testing |
| [sim/CHILD_MODEL.md](./sim/CHILD_MODEL.md) | Debug-only child-error model and the Act I headless sim |
| [ROADMAP.md](./ROADMAP.md) | Shipped systems, next work, known pitfalls |
| [NEXT_PHASE.md](./NEXT_PHASE.md) | v0.4.9 current release, and what comes next |

Root companions:

| File | Purpose |
|------|---------|
| [../README.md](../README.md) | Play, quick start, version control |
| [../AGENTS.md](../AGENTS.md) | AI/human resume guide |
| [../CHANGELOG.md](../CHANGELOG.md) | Human-readable version history |
| [../RELEASE_NOTES_v0.4.9.md](../RELEASE_NOTES_v0.4.9.md) | Player-facing notes for the current v0.4.9 release |
| [../RELEASE_NOTES_v0.4.8.md](../RELEASE_NOTES_v0.4.8.md) | Player-facing notes for the v0.4.8 release |
| [../RELEASE_NOTES_v0.4.7.md](../RELEASE_NOTES_v0.4.7.md) | Player-facing notes for the v0.4.7 release |
| [../RELEASE_NOTES_v0.4.6.md](../RELEASE_NOTES_v0.4.6.md) | Player-facing notes for the v0.4.6 release |
| [../RELEASE_NOTES_v0.4.5.md](../RELEASE_NOTES_v0.4.5.md) | Player-facing notes for the v0.4.5 release |
| [../RELEASE_NOTES_v0.4.4.md](../RELEASE_NOTES_v0.4.4.md) | Player-facing notes for the v0.4.4 release |
| [../RELEASE_NOTES_v0.4.3.md](../RELEASE_NOTES_v0.4.3.md) | Player-facing notes for the v0.4.3 release |
| [../RELEASE_NOTES_v0.4.2.md](../RELEASE_NOTES_v0.4.2.md) | Player-facing notes for the v0.4.2 release |

---

## Snapshot (main, v0.4.9)

`package.json` is **0.4.9**. The current GitHub Release is **v0.4.9**: #83
is `[0.4.9]` in [CHANGELOG.md](../CHANGELOG.md). The previous release is
v0.4.8 at `ea6255a` (#82), 2026-10-29 05:46 UTC. Two characters are playable.

- **Stack:** Vite + TypeScript SPA, no backend; localStorage save. Saves stay
  on version 4. `eventTrack`, `castSeed`, `castCounter`, and `rng` are optional.
- **Acts:** 3 × (15 floors × 7 lanes), STS-style path generation. ? rooms in
  every act resolve once into an event, a fight, a shop, or a treasure.
- **Combat:** modular `src/game/battle/*`, multi-enemy intents, drag-and-drop cards
- **Fights:** act-native listeners, buffers or scalers, and summoners. Bosses
  brace, then one heavier hit. 鐘粉蛾 is the event moth. Yao's decisions on
  that pass are in [ENCOUNTER_AUDIT.md](./ENCOUNTER_AUDIT.md).
- **Teaching:** full first-syllable 注音 cast, per-learner persistent shuffle bags,
  detailed curriculum controls, and a provider boundary. 注音 and 珠算 are
  registered. `english` is reserved. Each run's `castSeed` and `castCounter`
  replay later prompts.
- **Cards:** 共鳴武者 Act I uses the 12-design teaching pool. Later acts expand
  by cumulative character score: 12 → 33 → 54 → all 75. 珠算武者 is the second
  playable character, with 27 cards and the same score gates.
- **Events:** 30 events across Acts I, II, and III. Difficulty variants, keys,
  and Act IV are still proposed.
- **Relics:** each character has its own drop pool. 共鳴武者 keeps 初心音叉 plus
  five drops. 珠算武者 starts with 木珠串 and rolls four math relics. Legacy
  four remain loadable. See [NEXT_PHASE.md](./NEXT_PHASE.md).
- **Potions:** 3 belt slots and 6 bottles. Combat rewards and the shop can
  give one. See [NEXT_PHASE.md](./NEXT_PHASE.md).
- **Shop:** on a phone, each offer keeps its card, price, and the remove-card
  button on screen. The remove button is disabled when gold is short.
- **Layout:** the parent coach no longer covers map dots. Campfire choices
  fit on screen. The math cast and the 注音 cast dock fit at the checked
  phone sizes. A hinted answer keeps 送出 and 家長協助 inside the dock, and
  the tutorial banner stays off the slots (#68). During a tutorial cast the
  banner sits under the combat HUD at 640×360 and 844×390, and the math
  speech note fits at 568×320 (#75). The cast fit matrix walks combat, event
  fights, the shrine, and practice through the default, hinted,
  speech-fallback, retry, and correction-card states at eight viewports (#78).
  The correction card uses the compact layout up to 640px height, so 繼續
  stays on screen at 1024×600. That matrix guards the 640×360 hinted header
  so the answer does not cover 送出.
- **Content:** 輕聲 is written with ˙ first. 仔 is ㄗㄞˇ. Grade 1 does not
  ask 公分. 餘, 於, and 閒 are the Taiwan forms (#70). Shape prompts use
  球 ⚽, 魔術方塊的一面 🟦, and 書本 📘. 三角飯糰 stays 🍙. Make-10 tier 2
  asks 「N 和 M 合起來是幾？」, total 2–10, about one single-zero question
  in ten, never 0 and 0. 問 uses 🙋 (#77). The public page says 一年級,
  ages 5–7 (#79). Campfire and map coach lines say 「休息一下，把心補回來」.
  Act names are 魔法花園, 燈籠書庫, and 星空觀星台; the summit is 塔頂之心;
  the last boss is 終焉王. The Act 3 boss headline is 「🏆 爬到塔頂了！」;
  earlier bosses say 「🏆 過關！」. Math listen speech reads the question as
  words (#83).
- **Telemetry:** local export is schema v3 (#74). `cast` still stores no
  question or answer. Run fields include `bossEntry`, `combatEnd` (`hpLost`
  before the boss heal), `actClear`, `shopEnter`, `rest`, `potionUsed`,
  `relicPoolExhaust`, and `sittingStart` / `sittingEnd`.
  `scripts/balance-report.mjs` prints B1–B24. See [TELEMETRY.md](./TELEMETRY.md)
  and [BALANCE.md](./BALANCE.md).
- **Debug:** body-mounted panel for testing (not for kids in normal play)
- **Save fixtures:** ten version-4 checkpoints and a seeded choice replay under
  `tests/fixtures/`. Regenerate with `npm run generate:save-fixtures`. Saves
  stay version 4

共鳴武者 Smith and all 75 physical-copy upgrades are live through score unlocks.
Rejected and pre-共鳴 design records are quarantined under `docs/archive/`;
they are historical evidence, not implementation backlogs.
