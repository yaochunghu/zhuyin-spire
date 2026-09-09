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
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Screens, `RunState`, layers, save, render loop |
| [COMBAT.md](./COMBAT.md) | Battle modules, cast gate, drag play, FX pitfalls |
| [MAP.md](./MAP.md) | Spire map gen (15×7), layout constraints |
| [CONTENT.md](./CONTENT.md) | How to add cards, enemies, encounters, phrases |
| [CASTING_GATES.md](./CASTING_GATES.md) | Reusable education gate, phrase bags, learner profiles, future subjects |
| [DESIGN_PLAYBOOK.md](./DESIGN_PLAYBOOK.md) | Governing design funnel, evidence ladder, complexity budget, and release gates |
| [DECK_DESIGN.md](./DECK_DESIGN.md) | Live 共鳴武者 foundation, directions, starter, and upgrades |
| [RESONANCE_WARRIOR_DESIGN_PROCESS.md](./RESONANCE_WARRIOR_DESIGN_PROCESS.md) | Locked 共鳴武者 75-card roster, score progression, simulation, and review checks |
| [STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md) | StS combat, cards, runs, economy, progression, UX, and lessons to adapt |
| [ENCOUNTER_RELIC_DESIGN_RESEARCH.md](./ENCOUNTER_RELIC_DESIGN_RESEARCH.md) | Review memo on StS/StS2 encounters, bosses, relic co-design, and a full-run design method |
| [UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md) | Live physical-copy foundation and all 75 score-gated upgrades |
| [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md) | Proposed 30 events, per-act encounters, difficulty variants, and Act IV |
| [BALANCE.md](./BALANCE.md) | Live economy / HP / hand numbers + design intent |
| [DEBUG.md](./DEBUG.md) | Debug panel, flags, skip-cast testing |
| [ROADMAP.md](./ROADMAP.md) | Shipped systems, next work, known pitfalls |
| [NEXT_PHASE.md](./NEXT_PHASE.md) | Current version, complete 75-card progression, next feature slice |

Root companions:

| File | Purpose |
|------|---------|
| [../README.md](../README.md) | Play, quick start, version control |
| [../AGENTS.md](../AGENTS.md) | AI/human resume guide |
| [../CHANGELOG.md](../CHANGELOG.md) | Human-readable version history |

---

## Snapshot (v0.4.0)

- **Stack:** Vite + TypeScript SPA, no backend; localStorage save
- **Acts:** 3 × (15 floors × 7 lanes), STS-style path generation
- **Combat:** modular `src/game/battle/*`, multi-enemy intents, drag-and-drop cards
- **Teaching:** full first-syllable 注音 cast, per-learner persistent shuffle bags,
  detailed curriculum controls, and a provider boundary for future subjects
- **Cards:** Act I uses the 12-design teaching pool. Later acts expand by
  cumulative character score: 12 → 33 → 54 → all 75.
- **Debug:** body-mounted panel for testing (not for kids in normal play)

共鳴武者 Smith and all 75 physical-copy upgrades are live through score unlocks.
Rejected and pre-共鳴 design records are quarantined under `docs/archive/`;
they are historical evidence, not implementation backlogs.
