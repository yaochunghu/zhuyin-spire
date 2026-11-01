import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../../src/data/events';
import {
  CLIMB_ROWS,
  UPPER_FIRST_ROW,
  type MapNode,
  type NodeKind,
  type RunMap,
} from '../../src/data/map';
import type { ActiveEvent, UnknownResolution } from '../../src/game/eventEngine';
import type { Screen } from '../../src/game/state';
import {
  ART_ASSETS,
  EVENT_SCENE_BY_ID,
  REQUIRED_ART_ASSET_KEYS,
  sceneImageCss,
  sceneKeysFor,
  type ArtAssetKey,
  type SceneState,
} from '../../src/ui/assets';

const SCREENS: Screen[] = [
  'title', 'relicPick', 'map', 'rest', 'smith', 'removeCard', 'shop', 'shopRemove',
  'combat', 'castCheck', 'practice', 'reward', 'actClear', 'event', 'eventCast',
  'defeat', 'victory',
];
const KINDS: NodeKind[] = ['fight', 'elite', 'rest', 'shop', 'treasure', 'unknown', 'boss'];
const ROWS = Array.from({ length: CLIMB_ROWS + 1 }, (_, row) => row);
const HEART_KEYS: ArtAssetKey[] = ['sceneHeartBoss', 'sceneHeartBossOpen'];
const ALL: (key: ArtAssetKey) => boolean = () => true;

const ACT = [
  { lower: 'sceneGarden', upper: 'sceneGardenUpper', boss: 'sceneGardenBoss', camp: 'sceneGardenCamp', shop: 'sceneGardenShop' },
  { lower: 'sceneLibrary', upper: 'sceneLibraryUpper', boss: 'sceneLibraryBoss', camp: 'sceneLibraryCamp', shop: 'sceneLibraryShop' },
  { lower: 'sceneObservatory', upper: 'sceneObservatoryUpper', boss: 'sceneObservatoryBoss', camp: 'sceneObservatoryCamp', shop: 'sceneObservatoryShop' },
] as const;

/** One node of every kind on every row, in every act (1–4). */
function syntheticMap(): RunMap {
  const acts = [1, 2, 3, 4].map((act) => ({
    act,
    nodes: KINDS.flatMap((kind) =>
      ROWS.map((row) => ({
        id: `a${act}-${kind}-${row}`,
        act,
        row,
        col: 0,
        kind,
        nextIds: [],
      })),
    ),
  }));
  return { acts } as unknown as RunMap;
}

const RUN_MAP = syntheticMap();
const id = (actIndex: number, kind: NodeKind, row: number) => `a${actIndex + 1}-${kind}-${row}`;

function stateAt(
  actIndex: number,
  nodeId: string | null,
  extra: {
    currentNodeId?: string | null;
    resolution?: UnknownResolution;
    active?: Partial<ActiveEvent> | null;
    runMap?: RunMap;
  } = {},
): SceneState {
  return {
    actIndex,
    activeNodeId: nodeId,
    currentNodeId: extra.currentNodeId ?? null,
    runMap: extra.runMap ?? RUN_MAP,
    eventTrack: {
      resolutions: nodeId && extra.resolution ? { [nodeId]: extra.resolution } : {},
      active: (extra.active ?? null) as ActiveEvent | null,
    },
  };
}

const floor = (actIndex: number, row: number): ArtAssetKey[] =>
  row >= UPPER_FIRST_ROW
    ? [ACT[actIndex]!.upper, ACT[actIndex]!.lower]
    : [ACT[actIndex]!.lower];

describe('backdrop registry', () => {
  it('registers every delivered backdrop and token-heart on disk', () => {
    const backdrops = REQUIRED_ART_ASSET_KEYS.filter((key) =>
      ART_ASSETS[key].src.includes('/backdrops/'),
    );
    expect(backdrops).toHaveLength(48);
    for (const key of [...backdrops, 'tokenHeart' as const]) {
      const file = ART_ASSETS[key].src.split('/assets/art/')[1]!;
      const url = new URL(`../../src/assets/art/${file}`, import.meta.url);
      expect(existsSync(fileURLToPath(url)), file).toBe(true);
    }
    expect(REQUIRED_ART_ASSET_KEYS).not.toContain('sceneEventAbacusShrine');
  });

  it('maps every event id to a registered room', () => {
    expect(Object.keys(EVENT_SCENE_BY_ID).sort()).toEqual(EVENTS.map((event) => event.id).sort());
    for (const key of Object.values(EVENT_SCENE_BY_ID)) expect(ART_ASSETS[key]).toBeDefined();
    expect(EVENT_SCENE_BY_ID.event_a2_glass_fork).toBe('sceneEventMoonMusicBox');
    expect(EVENT_SCENE_BY_ID.event_a3_static_crown).toBe('sceneEventRainTube');
    expect(EVENT_SCENE_BY_ID.event_a3_roof_wind).toBe('sceneEventWindHall');
    expect(EVENT_SCENE_BY_ID.event_shared_traveling_luthier).toBe('sceneEventLuthier');
  });
});

describe('sceneKeysFor: Acts I–III', () => {
  it('splits every act at UPPER_FIRST_ROW and keeps the boss chamber for row 15', () => {
    expect(UPPER_FIRST_ROW).toBe(8);
    for (const actIndex of [0, 1, 2]) {
      const rooms = ACT[actIndex]!;
      for (const row of [0, 7, 8, 13, 14, 15]) {
        for (const kind of ['fight', 'elite'] as const) {
          for (const screen of ['combat', 'castCheck', 'reward', 'defeat'] as const) {
            expect(sceneKeysFor(stateAt(actIndex, id(actIndex, kind, row)), screen)).toEqual(floor(actIndex, row));
          }
        }
        for (const screen of ['combat', 'castCheck', 'reward', 'defeat'] as const) {
          expect(sceneKeysFor(stateAt(actIndex, id(actIndex, 'boss', row)), screen)).toEqual([rooms.boss, rooms.lower]);
        }
        // Q85 B: one camp room for every camp, row 14 included.
        for (const screen of ['rest', 'smith', 'removeCard'] as const) {
          expect(sceneKeysFor(stateAt(actIndex, id(actIndex, 'rest', row)), screen)).toEqual([rooms.camp, ...floor(actIndex, row)]);
        }
        for (const screen of ['shop', 'shopRemove'] as const) {
          expect(sceneKeysFor(stateAt(actIndex, id(actIndex, 'shop', row)), screen)).toEqual([rooms.shop, ...floor(actIndex, row)]);
          const unknownShop = stateAt(actIndex, id(actIndex, 'unknown', row), { resolution: { outcome: 'shop' } });
          expect(sceneKeysFor(unknownShop, screen)).toEqual([rooms.shop, ...floor(actIndex, row)]);
        }
        // Treasure (fixed row 8, map chest, or ❓ chest) uses its floor.
        expect(sceneKeysFor(stateAt(actIndex, id(actIndex, 'treasure', row)), 'reward')).toEqual(floor(actIndex, row));
        const unknownChest = stateAt(actIndex, id(actIndex, 'unknown', row), { resolution: { outcome: 'treasure' } });
        expect(sceneKeysFor(unknownChest, 'reward')).toEqual(floor(actIndex, row));
        const unknownFight = stateAt(actIndex, id(actIndex, 'unknown', row), { resolution: { outcome: 'fight', enemyId: 'slime' } });
        expect(sceneKeysFor(unknownFight, 'combat')).toEqual(floor(actIndex, row));

        for (const eventId of ['event_a1_bell_rope', 'event_shared_moon_gong']) {
          const nodeId = id(actIndex, 'unknown', row);
          const atEvent = stateAt(actIndex, nodeId, {
            resolution: { outcome: 'event', eventId },
            active: { eventId, nodeId, phase: 'choose' },
          });
          const room = [EVENT_SCENE_BY_ID[eventId]!, ...floor(actIndex, row)];
          expect(sceneKeysFor(atEvent, 'event')).toEqual(room);
          expect(sceneKeysFor(atEvent, 'eventCast')).toEqual(room);
          // The event fight stays in the event room (EVENT_FIGHT_SCENE).
          expect(sceneKeysFor(atEvent, 'combat')).toEqual(room);
        }
      }
    }
  });

  it('shows the next floor on the map, capped at upper, and the next act after a clear', () => {
    for (const actIndex of [0, 1, 2]) {
      expect(sceneKeysFor(stateAt(actIndex, null), 'map')).toEqual(floor(actIndex, 0));
      for (const row of [0, 6, 7, 8, 13, 14, 15]) {
        const next = Math.min(row + 1, CLIMB_ROWS - 1);
        const state = stateAt(actIndex, null, { currentNodeId: id(actIndex, 'fight', row) });
        expect(sceneKeysFor(state, 'map')).toEqual(floor(actIndex, next));
      }
      // actIndex has already advanced on actClear.
      expect(sceneKeysFor(stateAt(actIndex, null), 'actClear')).toEqual([ACT[actIndex]!.lower]);
    }
  });

  it('keeps camp and shop screens in their rooms even with no room on record', () => {
    expect(sceneKeysFor(stateAt(1, null), 'shop')).toEqual(['sceneLibraryShop', 'sceneLibrary']);
    expect(sceneKeysFor(stateAt(2, null), 'rest')).toEqual(['sceneObservatoryCamp', 'sceneObservatory']);
  });

  it('ignores a stale node id from another act', () => {
    const state = stateAt(1, id(0, 'boss', 15));
    expect(sceneKeysFor(state, 'combat')).toEqual(['sceneLibrary']);
  });
});

describe('sceneKeysFor: Act IV, foyer and victory', () => {
  const heart = (kind: NodeKind, screen: Screen) =>
    sceneKeysFor(stateAt(3, id(3, kind, 0)), screen);

  it('routes the four Act IV rooms with the heart → observatory fallback', () => {
    expect(heart('rest', 'rest')).toEqual(['sceneHeartCamp', 'sceneHeartBoss', 'sceneObservatory']);
    expect(heart('rest', 'smith')[0]).toBe('sceneHeartCamp');
    expect(heart('shop', 'shop')).toEqual(['sceneHeartShop', 'sceneHeartBoss', 'sceneObservatory']);
    expect(heart('shop', 'shopRemove')[0]).toBe('sceneHeartShop');
    for (const screen of ['combat', 'reward', 'defeat'] as const) {
      expect(heart('elite', screen)).toEqual(['sceneHeartRehearsal', 'sceneHeartBoss', 'sceneObservatory']);
    }
    expect(heart('boss', 'combat')).toEqual(['sceneHeartBoss', 'sceneObservatory']);
    expect(heart('boss', 'defeat')).toEqual(['sceneHeartBoss', 'sceneObservatory']);
  });

  it('pictures the next Act IV room on the map, camp before the first', () => {
    const route = {
      acts: [{
        act: 4,
        nodes: [
          { id: 'h0', act: 4, row: 0, kind: 'rest', nextIds: ['h1'] },
          { id: 'h1', act: 4, row: 1, kind: 'shop', nextIds: ['h2'] },
          { id: 'h2', act: 4, row: 2, kind: 'elite', nextIds: ['h3'] },
          { id: 'h3', act: 4, row: 3, kind: 'boss', nextIds: [] },
        ],
      }],
    } as unknown as RunMap;
    const mapAt = (currentNodeId: string | null) =>
      sceneKeysFor(stateAt(3, null, { currentNodeId, runMap: route }), 'map')[0];
    expect(mapAt(null)).toBe('sceneHeartCamp');
    expect(mapAt('h0')).toBe('sceneHeartShop');
    expect(mapAt('h1')).toBe('sceneHeartRehearsal');
    expect(mapAt('h2')).toBe('sceneHeartBoss');
  });

  it('puts title, character select and practice in the foyer', () => {
    for (const screen of ['title', 'relicPick', 'practice'] as const) {
      for (const actIndex of [0, 1, 2, 3]) {
        expect(sceneKeysFor(stateAt(actIndex, null), screen)).toEqual(['sceneFoyer']);
      }
    }
  });

  it('opens the top door on every victory (Q80 A)', () => {
    for (const actIndex of [0, 1, 2, 3]) {
      expect(sceneKeysFor(stateAt(actIndex, null), 'victory')).toEqual([
        'sceneHeartBossOpen',
        'sceneHeartBoss',
        'sceneObservatory',
      ]);
    }
  });
});

describe('Q81 A: Acts I–III never resolve to the open-sky rooms', () => {
  const eventIds = [...EVENTS.map((event) => event.id), 'event_not_real', 'event_a1_abacus_shrine', undefined];
  const resolutions: (UnknownResolution | undefined)[] = [
    undefined,
    { outcome: 'fight', enemyId: 'slime' },
    { outcome: 'fight', fallbackFight: true, enemyId: 'slime' },
    { outcome: 'shop' },
    { outcome: 'treasure' },
  ];
  const inRunScreens = SCREENS.filter((screen) => screen !== 'victory');

  function* contexts(): Generator<{ state: SceneState; screen: Screen }> {
    for (const screen of inRunScreens) {
      for (const actIndex of [0, 1, 2]) {
        for (const kind of KINDS) {
          for (const row of ROWS) {
            const nodeId = id(actIndex, kind, row);
            for (const currentNodeId of [null, nodeId]) {
              for (const activeNodeId of [null, nodeId]) {
                if (kind !== 'unknown') {
                  yield { screen, state: stateAt(actIndex, activeNodeId, { currentNodeId }) };
                  continue;
                }
                for (const eventId of eventIds) {
                  const options = [...resolutions, eventId ? { outcome: 'event' as const, eventId } : undefined];
                  for (const resolution of options) {
                    for (const phase of [null, 'choose', 'fight', 'result'] as const) {
                      const active = phase && eventId ? { eventId, nodeId, phase } : null;
                      yield { screen, state: stateAt(actIndex, activeNodeId, { currentNodeId, resolution, active }) };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  it('holds over every screen × act × kind × row × event × track state, full chain', () => {
    let count = 0;
    for (const { state, screen } of contexts()) {
      const chain = sceneKeysFor(state, screen, ALL);
      count += 1;
      for (const key of HEART_KEYS) {
        if (chain.includes(key)) {
          throw new Error(`${screen} act ${state.actIndex} node ${state.activeNodeId} → ${chain.join(' → ')}`);
        }
      }
    }
    expect(count).toBeGreaterThan(100_000);
  });

  it('holds with each registered scene removed from the registry', () => {
    const sceneKeys = REQUIRED_ART_ASSET_KEYS.filter((key) => key.startsWith('scene'));
    for (const missing of sceneKeys) {
      const has = (key: ArtAssetKey) => key !== missing && key in ART_ASSETS;
      for (const screen of inRunScreens) {
        for (const actIndex of [0, 1, 2]) {
          for (const kind of KINDS) {
            for (const row of ROWS) {
              const nodeId = id(actIndex, kind, row);
              const resolution = kind === 'unknown'
                ? { outcome: 'event' as const, eventId: 'event_shared_moon_gong' }
                : undefined;
              const state = stateAt(actIndex, nodeId, { currentNodeId: nodeId, resolution });
              const chain = sceneKeysFor(state, screen, has);
              expect(chain.some((key) => HEART_KEYS.includes(key))).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe('fallbacks', () => {
  const lowerPlates: ArtAssetKey[] = ['sceneGarden', 'sceneLibrary', 'sceneObservatory', 'sceneFoyer'];

  it('drops a missing key and shows the next scene in the chain', () => {
    const noUpper = (key: ArtAssetKey) => key !== 'sceneLibraryUpper';
    expect(sceneKeysFor(stateAt(1, id(1, 'fight', 9)), 'combat', noUpper)).toEqual(['sceneLibrary']);
    const noShop = (key: ArtAssetKey) => key !== 'sceneGardenShop';
    expect(sceneKeysFor(stateAt(0, id(0, 'shop', 10)), 'shop', noShop)).toEqual(['sceneGardenUpper', 'sceneGarden']);
    const noOpen = (key: ArtAssetKey) => key !== 'sceneHeartBossOpen';
    expect(sceneKeysFor(stateAt(2, null), 'victory', noOpen)).toEqual(['sceneHeartBoss', 'sceneObservatory']);
    const noHeart = (key: ArtAssetKey) => !key.startsWith('sceneHeart');
    expect(sceneKeysFor(stateAt(3, id(3, 'rest', 0)), 'rest', noHeart)).toEqual(['sceneObservatory']);
    expect(sceneKeysFor(stateAt(0, null), 'title', (key) => key !== 'sceneFoyer')).toEqual([]);
    expect(sceneImageCss([])).toBe('none');
  });

  it('stacks the next scene under the primary so a failed load still paints a room', () => {
    const css = sceneImageCss(sceneKeysFor(stateAt(0, id(0, 'rest', 14)), 'rest'));
    expect(css).toBe(
      `url("${ART_ASSETS.sceneGardenCamp.src}"), url("${ART_ASSETS.sceneGardenUpper.src}")`,
    );
  });

  it('never leaves an in-run screen without a scene when any one non-plate key is missing', () => {
    const missingKeys = REQUIRED_ART_ASSET_KEYS.filter(
      (key) => key.startsWith('scene') && !lowerPlates.includes(key),
    );
    const inRunScreens = SCREENS.filter((screen) => !['title', 'relicPick', 'practice'].includes(screen));
    for (const missing of missingKeys) {
      const has = (key: ArtAssetKey) => key !== missing;
      for (const screen of inRunScreens) {
        for (const actIndex of [0, 1, 2, 3]) {
          for (const kind of KINDS) {
            for (const row of [0, 7, 8, 14, 15]) {
              const nodeId = id(actIndex, kind, row);
              const state = stateAt(actIndex, nodeId, {
                resolution: kind === 'unknown' ? { outcome: 'event', eventId: 'event_a2_moth_rehearsal' } : undefined,
              });
              expect(sceneImageCss(sceneKeysFor(state, screen, has))).not.toBe('none');
            }
          }
        }
      }
    }
  });
});
