# 注音之塔 · Zhuyin Spire

A **preschool** browser deckbuilder inspired by *Slay the Spire*: climb a colorful tower with **注音符號** spell cards.  
Recognize or **listen** for the correct 注音 to cast. **Wrong answer = fizzle** (energy spent). **HP → 0 ends the run.**

**Version:** 0.1.0 · **Stack:** Vite + TypeScript (no backend)

---

## Quick start

```bash
cd zhuyin-spire
npm install
npm run dev
```

Open the local URL (usually `http://localhost:5173`). Best on a tablet or large window.

```bash
npm run build    # typecheck + production bundle
npm run preview  # serve dist/
```

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
2. **Map climbs upward** (StS-style web): lit rooms are branches. **3 acts**, each with boss. **🃏** shows the deck.
3. In combat, play a card (tap or **drag** onto enemy / shield). Cast check — spell the **full first syllable**:
   - 聲母 + 韻母 + **聲調**（ˊˇˋ˙；一聲 usually unmarked）
   - Example: 爸爸 → `ㄅㄚˋ` (not just ㄅ)
4. **🔊 再聽** for listen modes. ✋ ends the turn. Rest at campfires (**40% max HP**). **No free heal after every fight.**
5. Rewards / shop / treasure use big icons; adult text stays secondary.

Autosave on stable screens (map, rest, shop, reward, …). Title: continue or new game.

---

## Project layout

```
src/
  main.ts           App shell + screen switch + debug mount
  data/             cards, enemies, encounters, map, balance, phrases, relics
  game/             run state, cast, save, coach, combat facade
  game/battle/      combat implementation (modular)
  ui/               map, combat, cast, drag, card FX, screens
  debug/            playtest panel (DEV / ?debug=1)
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
| [docs/BALANCE.md](docs/BALANCE.md) | HP, gold, rest, hand rules |
| [docs/DEBUG.md](docs/DEBUG.md) | Skip cast, jump fights, cheats for testing |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What’s done / next |

---

## Debug (testing)

On `npm run dev` (or `?debug=1`):

- Toggle panel: **`` ` ``** or **Ctrl+Shift+D**, or 🐛
- **Skip cast** — balance combat without 注音
- Force win/lose, HP/gold, start encounters, jump map/acts

Details: [docs/DEBUG.md](docs/DEBUG.md).

---

## Version control

This folder is its **own git repository** (`zhuyin-spire/.git`).

- Do **not** commit the game through a parent home-directory repo (e.g. unrelated remotes).
- From this directory: `git status`, `git add`, `git commit` as usual.
- Tag baseline: `v0.1.0` (see [CHANGELOG.md](CHANGELOG.md)).
- Optional: add a **dedicated** GitHub remote named for this game — never push into unrelated projects.

```bash
cd /path/to/zhuyin-spire
git log --oneline -5
```

---

## Teaching content rule

Each card has one **注音**. Cast checks draw from a **shared phrase bank** keyed by that 注音 so the same card practices many words over a run.

Every phrase must:

1. Start with that 注音  
2. Use an emoji that depicts **that word**  
3. Spell the full first syllable including 聲調 when needed  

Parent settings (title): theme packs. Advanced filters: `localStorage` key `zhuyin-spire-phrase-settings-v1`.

---

## Non-negotiables

1. Full 注音 cast in real play (skip **only** via debug)  
2. Adult co-play / coach strip  
3. Touch-first  
4. High-stakes death  
5. Vite + TypeScript browser SPA  
