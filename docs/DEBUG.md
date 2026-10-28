# Debug layer

Playtest tools for adults/devs. **Not for normal child play.**

Files:

- `src/debug/debugFlags.ts` — enablement + skip-cast flag  
- `src/debug/debugActions.ts` — pure state mutations  
- `src/debug/debugPanel.ts` — DOM panel (mounts on `document.body`)  
- `src/debug/childModel.ts` — child-error rates, shared with the headless sim  
- `src/debug/childModelBridge.ts` — `?childModel` page hook  

Mounted from `main.ts` after UI bind.

---

## When is debug available?

Debug code is included only in local development or a deliberately opted-in QA
build. Ordinary production builds do not contain or mount the debug panel.

In a debug-capable build, `isDebugEnabled()` is true if **any** of:

1. Vite **`import.meta.env.DEV`** (local `npm run dev`)  
2. URL query **`?debug`**, **`?debug=1`**, or **`?debug=true`**  
3. `localStorage.setItem('zhuyin-debug', '1')`  

`?debug=0` and `?debug=false` stay off. `?debug=1` and the local-storage flag cannot enable debug in the normal public production build. For a private QA artifact only, build with
`VITE_ENABLE_DEBUG_TOOLS=true`; never deploy that artifact to GitHub Pages.

---

## Open / close UI

| Action | How |
|--------|-----|
| Toggle panel | **`` ` ``** (backtick) or **Ctrl+Shift+D** |
| Floating button | 🐛 when layer is mounted |
| Phone | ☰ → Debug (development / QA builds only) |
| Close | × on panel |

Label in UI: **DEBUG · 測試用**.

---

## Child-error model

`?childModel=firstGrader` (also `struggling` or `strong`) answers one open cast
the way the headless Act I sim does. It loads only in a debug-capable build,
and only when the query also has `debug`. A saved `zhuyin-debug` flag is not
enough. Optional `seed` and `zhuyinP` (`0.7`, `0.8`, `0.9`) match the sim.

The page does not play itself. After the title screen is up,
`window.__zsDebug.answerCast()` answers the current cast, or returns `idle`.
The run is marked `synthetic: true`. Rates live in
[sim/CHILD_MODEL.md](./sim/CHILD_MODEL.md). Normal play never imports them.

## Skip cast (most useful)

Toggle **Skip cast** in the panel → `setDebugSkipCast(true)`.

When on, `tryPlayCard` in `state.ts` spends energy and **resolves card success without** the 注音 screen. Use for:

- Combat balance  
- Map/economy pacing  
- Drag/FX testing  

Turn **off** when testing teaching / cast UX.

---

## Actions overview

| Area | Examples |
|------|----------|
| Run nav | Map, title, new run, practice |
| Resources | Full / low HP, ±HP, +gold, full energy, draw |
| Meta progression | Set the run's character to score 0 / 300 / 1,000 / 2,000 (12 / 33 / 54 / 75 cards). Before a character is chosen, the buttons write 共鳴武者 |
| Combat | Kill all (win), lose fight, end turn, start encounter from dropdown |
| Casting | Skip gate, force See/Hear/Hard for the next prompts, refill persistent bags without deleting accuracy |
| Tutorial / motion | Reset completion, start the scripted fight immediately, set 1×/2× |
| Map | Jump act 1/2/3, enter available room kinds when present |
| Event | Open any bible event on a ? room without marking it seen. Sets score 2000, gold, and a little missing HP. Shared events stay on the current act. |
| Inspect | Readonly summary: learner, learned families, screen, act, HP, gold, hand, enemies |

Exact buttons live in `debugPanel.ts`; helpers in `debugActions.ts`.
The Meta buttons persist to the active learner profile and affect newly
generated later-act fight, shop, and treasure offers immediately. They never
delete cards already present in a run. Tutorial start and the scene jump pick
`debugCharacterId`: the run's character, or 共鳴武者 when the run has not chosen
one.

---

## Safety

- Panel is separate from `#app` so full re-renders don’t wipe it.  
- Do not ship “always on” cheats for preschool builds.  
- Skip cast must remain **debug-gated** (product non-negotiable: real cast for real play).

Responsive QA covers 1280×720, 1024×768, and 768×1024 tablet layouts plus phone
portrait/landscape in Chromium and WebKit: `npm run test:e2e`. Phone tests include
rotation without a combat remount, card gesture arbitration, menu/timer pausing,
keyboard-safe Options, deck access, map panning, and three-enemy targeting. Unit
coverage is `npm test`.
