/**
 * Named run rolls. Each stream has its own seed and counter, so a reward
 * draw does not move the next shuffle, gold roll, or potion roll.
 *
 * Practice, combat casts, and 注音神龕 stay on `castSeed` / `castCounter`.
 * Map topology is stored on the run. Event rolls stay on `eventTrack`.
 */

import { castUint32 } from './castRng';

export const RUN_RNG_STREAMS = [
  'combat',
  'reward',
  'shop',
  'gold',
  'relic',
  'potion',
  'upgrade',
] as const;

export type RunRngStreamName = (typeof RUN_RNG_STREAMS)[number];

export interface RunRngStream {
  seed: number;
  counter: number;
}

export type RunRngState = Record<RunRngStreamName, RunRngStream>;

const UINT32 = 0x1_0000_0000;

/** Fixed positions in the master mixer. They are not cast-stream draws. */
const STREAM_SALT: Record<RunRngStreamName, number> = {
  combat: 1,
  reward: 2,
  shop: 3,
  gold: 4,
  relic: 5,
  potion: 6,
  upgrade: 7,
};

export function createRunRng(masterSeed: number): RunRngState {
  const master = masterSeed >>> 0;
  const rng = {} as RunRngState;
  for (const name of RUN_RNG_STREAMS) {
    rng[name] = { seed: castUint32(master, STREAM_SALT[name]), counter: 0 };
  }
  return rng;
}

export function cloneRunRng(rng: RunRngState): RunRngState {
  const copy = {} as RunRngState;
  for (const name of RUN_RNG_STREAMS) {
    const stream = rng[name];
    copy[name] = { seed: stream.seed, counter: stream.counter };
  }
  return copy;
}

function takeUint32(stream: RunRngStream): number {
  const value = castUint32(stream.seed, stream.counter);
  stream.counter += 1;
  return value;
}

/** Uniform value in [0, 1). One counter step. */
export function takeRunUnit(stream: RunRngStream): number {
  return takeUint32(stream) / UINT32;
}

/** Uniform float in [0, 1), same step as `takeRunUnit`. */
export function runRandomFloat(stream: RunRngStream): number {
  return takeRunUnit(stream);
}

/**
 * Uniform integer in `0 .. maxExclusive-1`.
 * Rejection sampling matches the old crypto helper, so a small range is not
 * biased toward low residues.
 */
export function runRandomInt(stream: RunRngStream, maxExclusive: number): number {
  const max = Math.floor(maxExclusive);
  if (!Number.isFinite(max) || max <= 0) return 0;
  const limit = Math.floor(UINT32 / max) * max;
  let value = takeUint32(stream);
  while (value >= limit) value = takeUint32(stream);
  return value % max;
}
