# Docs index — 注音之塔

Start here when you return after a break.

## Returning after a break (≈10 min)

1. **Run the game:** from repo root, `npm install && npm run dev` → open the local URL (usually `http://localhost:5173`).
2. **Skim** [AGENTS.md](../AGENTS.md) — non-negotiables and “where to change X”.
3. **Architecture** — [ARCHITECTURE.md](./ARCHITECTURE.md) for screens, state, and render flow.
4. **Playtest tools** — [DEBUG.md](./DEBUG.md) (`?debug=1`, skip cast for combat balance).
5. **What’s next** — [ROADMAP.md](./ROADMAP.md).

Product pitch and parent/child how-to-play: [README.md](../README.md).

---

## Table of contents

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Screens, `RunState`, layers, save, render loop |
| [COMBAT.md](./COMBAT.md) | Battle modules, cast gate, drag play, FX pitfalls |
| [MAP.md](./MAP.md) | Spire map gen (15×7), layout constraints |
| [CONTENT.md](./CONTENT.md) | How to add cards, enemies, encounters, phrases |
| [CASTING_GATES.md](./CASTING_GATES.md) | Reusable education gate, phrase bags, learner profiles, future subjects |
| [DECK_DESIGN.md](./DECK_DESIGN.md) | Live 共鳴武者 deck, 易傷/basic attacks, expansion boundary |
| [STS_DESIGN_REFERENCE.md](./STS_DESIGN_REFERENCE.md) | StS combat, cards, runs, economy, progression, UX, and lessons to adapt |
| [CARD_BIBLE.md](./CARD_BIBLE.md) | Frozen 75-card Echo reference awaiting a Resonance rewrite |
| [UPGRADE_BIBLE.md](./UPGRADE_BIBLE.md) | Proposed per-copy upgrade, Smith, reward, migration, and preview contract |
| [RELIC_POTION_BIBLE.md](./RELIC_POTION_BIBLE.md) | Proposed 40 relics, 20 potions, timing rules, and optional-ending keys |
| [EVENT_ENCOUNTER_BIBLE.md](./EVENT_ENCOUNTER_BIBLE.md) | Proposed 30 events, per-act encounters, difficulty variants, and Act IV |
| [BALANCE.md](./BALANCE.md) | Live economy / HP / hand numbers + design intent |
| [DEBUG.md](./DEBUG.md) | Debug panel, flags, skip-cast testing |
| [ROADMAP.md](./ROADMAP.md) | Shipped systems, next work, known pitfalls |

Root companions:

| File | Purpose |
|------|---------|
| [../README.md](../README.md) | Play, quick start, version control |
| [../AGENTS.md](../AGENTS.md) | AI/human resume guide |
| [../CHANGELOG.md](../CHANGELOG.md) | Human-readable version history |

---

## Snapshot (Unreleased after v0.3.0)

- **Stack:** Vite + TypeScript SPA, no backend; localStorage save
- **Acts:** 3 × (15 floors × 7 lanes), STS-style path generation
- **Combat:** modular `src/game/battle/*`, multi-enemy intents, drag-and-drop cards
- **Cards:** V2 physical copies, typed effects, true Powers, exact-copy/designer viewer
- **Character:** 🧒🥋 共鳴武者 with 易傷, basic-Attack scaling, universal relic
- **Teaching:** full first-syllable 注音 cast, per-learner persistent shuffle bags,
  detailed curriculum controls, and a provider boundary for future subjects
- **Debug:** body-mounted panel for testing (not for kids in normal play)

The four `*_BIBLE.md` files are design-review artifacts. Echo-specific card,
relic, and potion rows are frozen historical reference after the character
direction changed; they are not runtime content or an approved translation list.
