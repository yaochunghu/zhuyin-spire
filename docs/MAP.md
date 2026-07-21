# Map

## Design

- **3 acts**, each with its own branching climb map
- **15 floors × 7 lanes** per act (row 0 bottom … row 14 boss)
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
- Pre-boss rest / shop opportunities so campfires matter before the boss

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

## UI layout (1080p)

Goals:

- Fit a **1080p-ish** window **without scrolling** the whole map stage
- **Dense, organic** web — not artificial full-bleed 7-lane stretch
- Side margins; graph **max-width ~1180px** (`mapView.ts` constants)

CSS/stage: scale-to-fit combat/map stages in `styles/main.css`. If the map looks too cramped or too sparse, adjust pitch constants in `mapView.ts` before rewriting generation.

---

## Economy interaction

Map structure assumes:

- **More rooms** than a short demo climb → lower gold per fight than early prototypes
- **Rest = 40% max HP** (campfires are the recovery beat)
- **No free heal after every fight** (`HEAL_AFTER_COMBAT = 0`)
- Act clear heal after bosses before next act (`ACT_CLEAR_HEAL`)

See [BALANCE.md](./BALANCE.md).
