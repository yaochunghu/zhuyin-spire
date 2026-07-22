# Changelog

All notable changes to **注音之塔 / Zhuyin Spire** are documented here.

Format: human-readable summary per version. For code archaeology use `git log` and tags.

---

## [Unreleased]

### Casting variety and learner profiles

- Replaced run-local recent-word avoidance with per-learner, persistent
  distinct-spelling shuffle bags and variant bags
- Added a reusable casting-provider contract and character gate id; Zhuyin is
  live now, while English and math remain reserved future providers
- Added vowel-family teaching for ㄚ／ㄛ／ㄜ, preschool core/broad vocabulary
  tiers, authored coverage floors, and promoted familiar starter-family words
  into the default core
- Expanded Options with up to four learner profiles plus topics, tones, answer
  length, distractors, prompt-mode weights, gentle adaptation, and word lists
- Added ambient mana-state cues without introducing another combat resource;
  combat currency remains 能量 and wrong casts keep the normal card/Energy cost
- Migrated existing runs, tutorial state, badges, practice totals, and phrase
  settings into the first learner while keeping audio and animation device-global
- Added unit/browser coverage for migration, profile isolation, persistent bags,
  vowel families, content floors, unsafe filters, and tablet profile controls

### Preschool onboarding and tablet polish

- Added a persistent global Options dialog: volume, 1×/2× gameplay motion,
  tutorial controls/replay, and phrase packs
- Added a first-run, single-enemy scripted lesson with deterministic cards,
  wrong-answer recovery, automatic targeting, and completion-on-victory
- Expanded successful spelling to a two-second animated teaching reveal; wrong
  casts now show the correct spelling
- Replaced aggregate player hit FX with ordered shield/HP impacts and distinct
  monster shield clang/crack/break feedback
- Parallelized end-turn card movement and centralized 1×/2× gameplay timing
- Rebuilt map/combat stages for landscape and portrait tablets, normalized map
  positions, scrollable 15-floor maps, larger touch targets, and higher route contrast
- Added reduced-motion handling, tutorial/speed debug controls, Vitest unit coverage,
  and Playwright smoke tests for three viewport sizes

### First character deck prototype

- Added 🧙‍♂️ 回音法師 with a character-bound starter deck and 🎵 初心音叉 relic
- Replaced the broad placeholder Act I pool with 3 starter designs and exactly 9
  reward designs organized by combat job
- Added the two-turn 🔔 Echo monster status, once-per-turn bonus damage,
  battle-long Echo defense scaling, status badges, and explanatory hit FX
- Added stable card icons and job labels so card identity is separate from the
  changing spelling-prompt emoji
- Preserved v1 run saves and documented a deliberate, instance-based upgrade path
- Kept remaining cards playable after the tutorial's first shield cast; End Turn
  is now a recommendation instead of an energy-breaking action lock

### Design research

- Added a source-backed StS1 systems reference covering combat, cards, character
  structure, enemies, maps, economy, relics, potions, progression, inspection,
  accessibility, balance metrics, and explicit copy/adapt/defer guidance
- Added review-ready design bibles for 75 base Echo Mage cards and their
  upgrades, 12 Colorless cards, five Statuses, eight Curses, 40 relics, 20
  potions, 30 events, complete encounter rosters, three optional-ending keys,
  and Act IV; these are documented targets and are not activated runtime content

---

## [0.1.0] — 2026-07-21

Baseline snapshot of the preschool Spire + 注音 game, documented for long-term resume.

### Gameplay & systems

- 3-act climb; **15×7** maps with STS-style path generation (silverua-inspired pipeline)
- Modular combat (`src/game/battle/*`): multi-enemy, intents (attack/heavy/multi/block), roles
- Drag-and-drop card play; shield drop zone; draw/discard card FX
- Full first-syllable 注音 cast gate + listen mode; large phrase bank; practice room
- Hand rules: draw 5 / max hand 10
- Rest heals **40% max HP**; **no** post-combat heal; gold/shop retuned for longer acts
- Starter relics; shop buy/remove; treasure rooms; elite/boss content
- localStorage run save on stable screens
- Adult coach strip; procedural SFX + Web Speech

### Tooling & docs

- Debug overlay (skip cast, resource cheats, jump screens/encounters)
- Project documentation under `docs/` + `AGENTS.md` + this changelog
- Standalone git repository for the game folder (tag `v0.1.0`)

[Unreleased]: #unreleased
[0.1.0]: #010--2026-07-21
