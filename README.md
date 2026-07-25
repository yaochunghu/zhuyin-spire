# 注音之塔 · Zhuyin Spire

A **preschool** browser deckbuilder inspired by *Slay the Spire*: climb a colorful tower with **注音符號** spell cards.  
Recognize or **listen** for the correct 注音 to cast. **Wrong answer = fizzle** (energy spent). **HP → 0 ends the run.**

**Version:** 0.3.0 · **Stack:** Vite + TypeScript (no backend)

**Play online:** [https://yaochunghu.github.io/zhuyin-spire/](https://yaochunghu.github.io/zhuyin-spire/)

---

## Quick start

```bash
cd zhuyin-spire
npm install
npm run dev
```

Open the local URL (usually `http://localhost:5173`). Phone, tablet, and desktop
layouts are supported in both portrait and landscape.
The development server listens only on your own computer. To test from another
device on your trusted LAN, opt in explicitly with `npm run dev -- --host 0.0.0.0`.

```bash
npm run build    # typecheck + production bundle
npm test         # Vitest unit suite
npx playwright install chromium webkit # once per machine
npm run test:e2e # Playwright phone + tablet smoke suite
npm run preview  # serve dist/
```

The published GitHub Pages build uses `/zhuyin-spire/` as Vite's production
asset base; local development remains at `/`.

## Privacy and security

The game has no account system, backend, ads, analytics, tracking cookies, or
microphone access. Runs, learner nicknames, and learning progress stay in this
browser's local storage. Use a short nickname only—never enter a child's real
name. GitHub Pages may process standard connection logs such as IP addresses as
part of hosting the site.

Read the full [Privacy Notice](PRIVACY.md), [Security Policy](SECURITY.md), and
[Third-Party Notices](THIRD_PARTY_NOTICES.md). Security problems should be
reported privately through GitHub Security Advisories, never through a public
Issue.

## Copyright and project status

Copyright © 2026 `yaochunghu`. All rights reserved. The source is public for
inspection and learning, but **no open-source license is granted**. Copying,
redistributing, publishing modified versions, or using project assets requires
prior permission. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the
separately licensed map-generation reference.

This is an independent educational fan project inspired by *Slay the Spire*.
It is not affiliated with, endorsed by, or sponsored by Mega Crit.

---

## Who plays what

| Role | What they do |
|------|----------------|
| **Child** | Tap big **注音**, icons, pick answers. Almost no reading required. |
| **Adult** | Read the **家長提示** strip; say cue words; encourage. |

The test for the child is recognizing / listening for 注音 — not reading Chinese UI.

---

## How to play (short)

1. Adult opens the game; child taps **▶️** to climb, or **📚** for **practice** (no HP).
2. Pick a character, which sets the starting deck, deck theme, and starting relic. **🧒🥋 共鳴武者** is the first playable character.
3. **Map climbs upward** (StS-style web): lit rooms are branches. **3 acts**, each with boss. **🃏** shows the deck.
4. In combat, play a card (tap or **drag** onto enemy / shield). Cast check — spell the **full first syllable**:
   - 聲母 + 韻母 + **聲調**（ˊˇˋ˙；一聲 usually unmarked）
   - Example: 爸爸 → `ㄅㄚˋ` (not just ㄅ)
5. **🔊 再聽** for listen modes. ✋ ends the turn. Rest at campfires (**40% max HP**). **No free heal after every fight.**
6. Rewards / shop / treasure use big icons; adult text stays secondary.

The first character starts with exactly 10 cards: 5 one-energy attacks, 4
one-energy shields, and 1 two-energy attack that applies 🎯 易傷 for two turns.
Act I adds a focused nine-card reward pool. See
[docs/DECK_DESIGN.md](docs/DECK_DESIGN.md) for the card jobs and upgrade plan.
The older **75-card Echo Mage proposal is now frozen reference material** while
the Resonance Warrior prototype is playtested. Upgraded faces remain states of
the same physical card, not extra card designs. Review the historical proposal in
[docs/CARD_BIBLE.md](docs/CARD_BIBLE.md) and
[docs/UPGRADE_BIBLE.md](docs/UPGRADE_BIBLE.md). It is not live content yet.

On a fresh installation, the first Act I battle is a one-monster guided lesson:
shield → End Turn → attack → finish normally. Every screen size uses one large ☰
pause button for resume, sound, Options, the exact-copy deck/designer viewer, and
development-only debug tools. Options include 1×/2× gameplay animation,
tutorial replay, and detailed curriculum controls. Up to four children can keep separate runs, tutorials,
badges, practice results, and casting history; switch learners from the title.

Autosave on stable screens (map, rest, shop, reward, …). Title: continue or new game.

---

## Project layout

```
src/
  main.ts           App shell + screen switch + debug mount
  data/             cards, enemies, encounters, map, balance, phrases, relics
  game/             run state, settings, cast, save, coach, combat facade
  game/casting/     reusable gate contract + Zhuyin provider and shuffle bags
  game/battle/      combat implementation (modular)
  ui/               map, combat, cast, drag, card FX, screens
  debug/            playtest panel (development/debug builds only)
  styles/main.css   kid UI + stages
docs/               architecture, combat, map, content, balance, debug, roadmap
AGENTS.md           resume guide for humans + AI
CHANGELOG.md        version history
```

---

## Documentation

| Doc | When to open |
|-----|----------------|
| [docs/INDEX.md](docs/INDEX.md) | **Start here** after a break |
| [AGENTS.md](AGENTS.md) | Non-negotiables, where to change X |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Screens, state, render loop |
| [docs/COMBAT.md](docs/COMBAT.md) | Battle modules, cast gate, FX pitfalls |
| [docs/MAP.md](docs/MAP.md) | 15×7 STS map generation |
| [docs/CONTENT.md](docs/CONTENT.md) | Add cards / enemies / phrases |
| [docs/CASTING_GATES.md](docs/CASTING_GATES.md) | Casting metaphor, anti-repeat pools, profiles, future subjects |
| [docs/DECK_DESIGN.md](docs/DECK_DESIGN.md) | Live 共鳴武者, 易傷/basic attacks, expansion boundary |
| [docs/STS_DESIGN_REFERENCE.md](docs/STS_DESIGN_REFERENCE.md) | StS systems reference and what to copy, adapt, or defer |
| [docs/CARD_BIBLE.md](docs/CARD_BIBLE.md) | Frozen Echo roster reference awaiting Resonance rewrite |
| [docs/UPGRADE_BIBLE.md](docs/UPGRADE_BIBLE.md) | Proposed per-copy upgrades, Smithing, migration, and previews |
| [docs/RELIC_POTION_BIBLE.md](docs/RELIC_POTION_BIBLE.md) | Proposed 40 relics, 20 potions, and timing rules |
| [docs/EVENT_ENCOUNTER_BIBLE.md](docs/EVENT_ENCOUNTER_BIBLE.md) | Proposed events, encounters, difficulty variants, keys, and Act IV |
| [docs/BALANCE.md](docs/BALANCE.md) | HP, gold, rest, hand rules |
| [docs/DEBUG.md](docs/DEBUG.md) | Skip cast, jump fights, cheats for testing |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What’s done / next |

---

## Debug (testing)

On `npm run dev`:

- Toggle panel: **`` ` ``** or **Ctrl+Shift+D**, or 🐛
- **Skip cast** — balance combat without 注音
- Force win/lose, HP/gold, start encounters, reset/start tutorial, force cast modes,
  refill phrase bags, set 1×/2×, jump map/acts

Details: [docs/DEBUG.md](docs/DEBUG.md).

---

## Version control

This folder is its **own git repository** (`zhuyin-spire/.git`).

- Do **not** commit the game through a parent home-directory repo (e.g. unrelated remotes).
- From this directory: `git status`, `git add`, `git commit` as usual.
- Current source version: `0.3.0`; baseline tag: `v0.1.0` (see
  [CHANGELOG.md](CHANGELOG.md)).
- Dedicated remote: `https://github.com/yaochunghu/zhuyin-spire.git`.

```bash
cd /path/to/zhuyin-spire
git log --oneline -5
```

---

## Teaching content rule

Each card maps to one stable **lesson family**. Cast checks draw from a shared,
profile-persistent shuffle bag so every distinct spelling appears before that
family refills. ㄚ／ㄛ／ㄜ teach their vowel families through familiar compound
syllables instead of relying on a tiny standalone pool.

Every phrase must:

1. Start with that 注音  
2. Use an emoji that depicts **that word**  
3. Spell the full first syllable including 聲調 when needed  

Parent settings (global ⚙️) include topics, core/broad vocabulary, tones, answer
length, distractors, prompt-mode weights, gentle adaptation, and word lists.
See [docs/CASTING_GATES.md](docs/CASTING_GATES.md).

---

## Non-negotiables

1. Full 注音 cast in real play (skip **only** via debug)  
2. Adult co-play / coach strip  
3. Touch-first  
4. High-stakes death  
5. Vite + TypeScript browser SPA  
