# AGENTS.md — resume guide for 注音之塔

Read this first in a **new human or AI session**. Deep detail lives under `docs/`.

## Product non-negotiables

1. **Full 注音 cast gate** for real play — skip only via **debug** (`getDebugSkipCast`)
2. **Adult co-play** — coach strip / 家長提示
3. **Touch-first** UI (phone- and tablet-friendly targets)
4. **High-stakes death** — HP → 0 ends the run
5. **Vite + TypeScript** SPA only (no backend required)

## Quick commands

```bash
cd zhuyin-spire   # must be this project root
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc && vite build
```

## Where to change X

| Want to… | Look here |
|----------|-----------|
| HP / gold / rest / hand size | `src/data/balance.ts` → [docs/BALANCE.md](docs/BALANCE.md) |
| Cards / starter / rewards | `src/data/cards.ts` → [docs/CONTENT.md](docs/CONTENT.md); target roster in [docs/CARD_BIBLE.md](docs/CARD_BIBLE.md) |
| Card instances / upgrades / Smith | [docs/UPGRADE_BIBLE.md](docs/UPGRADE_BIBLE.md) before changing the save shape |
| Relics / potions / keys | `src/data/relics.ts` → [docs/RELIC_POTION_BIBLE.md](docs/RELIC_POTION_BIBLE.md) |
| Monsters / intents / roles | `src/data/enemies.ts` → [docs/EVENT_ENCOUNTER_BIBLE.md](docs/EVENT_ENCOUNTER_BIBLE.md) |
| Multi-enemy packs | `src/data/encounters.ts` |
| Map topology / room kinds | `src/data/map.ts` → [docs/MAP.md](docs/MAP.md) |
| Phrases / packs / profiles | `src/data/phrases.ts`, `src/game/profiles.ts` → [docs/CASTING_GATES.md](docs/CASTING_GATES.md) |
| Combat rules | `src/game/battle/*` via `src/game/combat.ts` → [docs/COMBAT.md](docs/COMBAT.md) |
| Cast providers / spell check | `src/game/casting/*`, `src/game/castCheck.ts`, `src/ui/castView.ts` |
| Run flow / screens | `src/game/state.ts`, `src/main.ts` |
| Save / continue | `src/game/save.ts` |
| Map / combat / shop UI | `src/ui/mapView.ts`, `combatView.ts`, `screens.ts` |
| Drag / card fly FX | `src/ui/dragPlay.ts`, `cardFx.ts` |
| Debug cheats | `src/debug/*` → [docs/DEBUG.md](docs/DEBUG.md) |
| Responsive phone/tablet stages | `src/styles/main.css`, `src/ui/responsive.ts` |

## Architecture in one breath

Single mutable `RunState` in `main.ts`. `render()` rebuilds `#app` from `state.screen`. Views use `ui/runtime` (`run()`, `render()`, session flags). Combat implementation is modular under `game/battle/`; facade at `game/combat.ts`. Casting subjects register behind `game/casting/`. Debug panel mounts on **`document.body`** (survives `#app` wipe).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Coding footguns (already paid for)

- **Never full-remount combat mid-FX** — breaks drag listeners and fly-card anchors (`clearFloatSoon` / `combatFxPlaying`).
- **Cast skip** must stay behind debug flags.
- Never reset casting history at new-run start; shuffle bags and learning belong
  to the active learner profile.
- A parent curriculum edit must leave every obtainable card with a valid prompt.
- Prefer balance constants from `data/balance.ts`; don’t hardcode economy in UI.
- Keep preschool UX: big hit targets, icons first, adult text secondary.
- On phones, preserve horizontal hand scrolling: a touch drag becomes card play
  only after a clear upward gesture. Do not capture every pointer on press.

## Git rules (this project only)

- Repository root is **`zhuyin-spire/`** (has its own `.git`).
- **Do not** commit this game via a parent directory repo (e.g. home folder remotes).
- Commit messages: complete sentences, focus on why.
- Do not force-push or rewrite published history unless the user asks.
- Prefer landing **docs with features** so the tree stays resume-friendly.
- Before push: confirm remote is a **dedicated** zhuyin-spire repo, not an unrelated project.

## Docs map

[docs/INDEX.md](docs/INDEX.md) · Architecture · Combat · Map · Content · Design bibles · Balance · Debug · [Roadmap](docs/ROADMAP.md)

## Suggested first tasks when resuming

1. Act I playtest (debug skip cast on, then off)  
2. Balance tweaks in `balance.ts` / enemy HP  
3. Content (cards/enemies/phrases)  
4. Cast/map polish per roadmap  

Do not re-litigate non-negotiables unless the product owner changes them.
