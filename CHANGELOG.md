# Changelog

All notable changes to **注音之塔 / Zhuyin Spire** are documented here.

Format: human-readable summary per version. For code archaeology use `git log` and tags.

---

## [Unreleased]

- (nothing yet)

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
