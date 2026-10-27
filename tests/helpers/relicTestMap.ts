import { generateRunMap, type RunMap } from '../../src/data/map';

/** Act I of this seed has an elite, several chests, and a boss. */
export const RELIC_TEST_MAP_SEED = 1;

/** Same generator the relic tests and the browser spec share. */
export function relicTestRng(seed = RELIC_TEST_MAP_SEED): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function relicTestMap(seed = RELIC_TEST_MAP_SEED): RunMap {
  return generateRunMap(relicTestRng(seed));
}
