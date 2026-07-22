# Debug layer

Playtest tools for adults/devs. **Not for normal child play.**

Files:

- `src/debug/debugFlags.ts` — enablement + skip-cast flag  
- `src/debug/debugActions.ts` — pure state mutations  
- `src/debug/debugPanel.ts` — DOM panel (mounts on `document.body`)  

Mounted from `main.ts` after UI bind.

---

## When is debug available?

`isDebugEnabled()` is true if **any** of:

1. Vite **`import.meta.env.DEV`** (local `npm run dev`)  
2. URL query **`?debug=1`** or `?debug=true`  
3. `localStorage.setItem('zhuyin-debug', '1')`  

Production builds stay off unless you force (2) or (3).

---

## Open / close UI

| Action | How |
|--------|-----|
| Toggle panel | **`` ` ``** (backtick) or **Ctrl+Shift+D** |
| Floating button | 🐛 when layer is mounted |
| Close | × on panel |

Label in UI: **DEBUG · 測試用**.

---

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
| Combat | Kill all (win), lose fight, end turn, start encounter from dropdown |
| Casting | Skip gate, force See/Hear/Hard for the next prompts, refill persistent bags without deleting accuracy |
| Tutorial / motion | Reset completion, start the scripted fight immediately, set 1×/2× |
| Map | Jump act 1/2/3, enter available room kinds when present |
| Inspect | Readonly summary: learner, learned families, screen, act, HP, gold, hand, enemies |

Exact buttons live in `debugPanel.ts`; helpers in `debugActions.ts`.

---

## Safety

- Panel is separate from `#app` so full re-renders don’t wipe it.  
- Do not ship “always on” cheats for preschool builds.  
- Skip cast must remain **debug-gated** (product non-negotiable: real cast for real play).

For tablet QA, the Playwright projects cover 1280×720, 1024×768, and 768×1024:
`npm run test:e2e`. Unit coverage is `npm test`.
