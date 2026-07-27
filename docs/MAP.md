# Map

## Design

- **3 acts**, each with its own branching climb map
- **15 climb floors × 7 lanes**, then a boss floor per act
  (rows 0–14 climb, row 15 boss; 16 floors total)
- Path topology ported from (MIT):  
  [silverua/slay-the-spire-map-in-unity](https://github.com/silverua/slay-the-spire-map-in-unity) — `MapGenerator.cs`-style pipeline
- Typical node count after prune: **~40–55** per act (not a full honeycomb of 100+)

Primary file: `src/data/map.ts`  
Render: `src/ui/mapView.ts`

---

## Generation pipeline

1. Full grid of candidate nodes  
2. **Paths** from starts → pre-boss band → boss  
3. **Connections** along paths  
4. **Remove crossing** edges  
5. **Prune** isolates  
6. Assign **room kinds** + encounters  

Kinds: `fight` | `elite` | `rest` | `shop` | `treasure` | `boss`

Content hooks:

- Normal / elite pools: `data/enemies.ts` (`ACT_NORMAL_POOL`, `ACT_ELITE_POOL`, `BOSS_ID`)
- Multi-enemy recipes: `data/encounters.ts` (`ACT_MULTI_ENCOUNTERS`)
- Cast difficulty stage per node: `early` | `mid` | `elite` | `boss`

Layout notes baked into generation:

- Treasure often mid-act (around floor 8 band)
- Floor 15 is always Rest on every route; the boss is alone on floor 16

---

## Run navigation

`RunState` holds:

- `runMap.acts[0..2]`
- `actIndex`
- `currentNodeId` — last completed (null = pick start)
- `activeNodeId` — room currently playing
- `visitedIds` / `pathIds`

`getAvailableMapNodes` / `selectMapNode` in `state.ts` gate which rooms light up.

---

## Responsive UI layout

`mapView.ts` converts row/column plus organic jitter into normalized percentages.
Edges resize with the panel while node hit targets remain fixed at 56px (boss 64px).
The stage renders at the actual viewport size—there is no 1920×1080 uniform scale.

The web has a minimum usable height and its panel scrolls when sixteen floors do not
fit. Rendering centers the next available room and shows `目前第 N/16 層`. Locked
nodes and unused edges keep visible contrast but remain below available/visited paths.

On phones, act/floor progress stays in the compact header while the route plane pans
inside its own viewport. The plane may be wider than the screen so 48px node targets
and edge endpoints remain usable instead of shrinking; the page itself must not gain
horizontal overflow. Available rooms are automatically centered after render.

---

## Economy interaction

Map structure assumes:

- **More rooms** than a short demo climb → lower gold per fight than early prototypes
- **Rest = 40% max HP** (campfires are the recovery beat)
- **No free heal after every fight** (`HEAL_AFTER_COMBAT = 0`)
- Every cleared boss restores HP to full before its reward/act transition

See [BALANCE.md](./BALANCE.md).
