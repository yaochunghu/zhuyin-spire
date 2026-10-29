/**
 * Run-scoped prompt draws. `castCounter` is the number of values already taken
 * from `castSeed`, so a checkpoint can continue the same stream.
 */

export interface CastStream {
  castSeed: number;
  castCounter: number;
}

const UINT32 = 0x1_0000_0000;

export function createCastSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 0;
}

/** Raw mixer output. `castUnit` is this value divided by 2^32. */
export function castUint32(seed: number, index: number): number {
  let a = (seed + Math.imul(index | 0, 0x6d2b79f5)) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/** Uniform value in [0, 1) for the draw at `index`. */
export function castUnit(seed: number, index: number): number {
  return castUint32(seed, index) / UINT32;
}

export function takeCastRandom(stream: CastStream): number {
  const value = castUnit(stream.castSeed, stream.castCounter);
  stream.castCounter += 1;
  return value;
}

export function castStreamRng(stream: CastStream): () => number {
  return () => takeCastRandom(stream);
}
