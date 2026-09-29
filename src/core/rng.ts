/**
 * Seeded pseudo-random numbers. This is the only source of randomness in `core/`:
 * every random choice comes from an `Rng` that is passed in (CLAUDE.md, D-005), so the
 * same seed always gives the same results on every peer.
 *
 * The generator is mulberry32: a 32-bit state, fast, and good enough for game rolls.
 */

/** A seeded random stream. Each call advances the stream. */
export interface Rng {
  /** The seed this stream was created from. */
  readonly seed: number;
  /** A uniform unsigned 32-bit integer. */
  nextUint32(): number;
  /** A uniform float in `[0, 1)`. */
  next(): number;
  /** A uniform integer in `[min, max]`, both inclusive. */
  int(min: number, max: number): number;
  /** `true` with probability `p` (0 to 1). */
  chance(p: number): boolean;
  /** A uniform pick from a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** An index drawn with the given non-negative weights, which must not all be 0. */
  weightedIndex(weights: readonly number[]): number;
  /** A shuffled copy of `items`. */
  shuffle<T>(items: readonly T[]): T[];
  /**
   * An independent stream named by `label`. It depends only on this stream's seed and
   * the label, not on how far this stream has advanced, so forks are stable.
   */
  fork(label: string | number): Rng;
}

const UINT32 = 0x1_0000_0000;

/** Creates a random stream from a seed. Any number works; it is reduced to 32 bits. */
export function createRng(seed: number): Rng {
  const origin = toUint32(seed);
  let state = origin;

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function next(): number {
    return nextUint32() / UINT32;
  }

  function int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`rng.int: invalid range [${String(min)}, ${String(max)}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) {
      throw new RangeError('rng.pick: the list is empty');
    }
    return item;
  }

  function weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (weights.some((weight) => weight < 0) || !(total > 0)) {
      throw new RangeError('rng.weightedIndex: weights must be non-negative with a positive sum');
    }
    let roll = next() * total;
    for (const [index, weight] of weights.entries()) {
      roll -= weight;
      if (roll < 0) {
        return index;
      }
    }
    // Only reachable through float rounding: fall back to the last positive weight.
    let last = weights.length - 1;
    while ((weights[last] ?? 0) === 0) {
      last--;
    }
    return last;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    // Draws without replacement; the lists in the game are short.
    const rest = [...items];
    const result: T[] = [];
    while (rest.length > 0) {
      result.push(...rest.splice(int(0, rest.length - 1), 1));
    }
    return result;
  }

  return {
    seed: origin,
    nextUint32,
    next,
    int,
    chance: (p) => next() < p,
    pick,
    weightedIndex,
    shuffle,
    fork: (label) => createRng(deriveSeed(origin, label)),
  };
}

/**
 * Derives a new 32-bit seed from a seed and a list of labels, for example the market seed
 * of a round from the league seed: `deriveSeed(leagueSeed, 'market', round)`.
 * Different labels give unrelated seeds, and the same inputs always give the same seed.
 */
export function deriveSeed(seed: number, ...labels: readonly (string | number)[]): number {
  let hash = toUint32(seed);
  for (const label of labels) {
    hash = mix32(hash ^ hashLabel(label));
  }
  return mix32(hash);
}

/** FNV-1a over the label's text, with a type tag so `1` and `'1'` differ. */
function hashLabel(label: string | number): number {
  const text = typeof label === 'number' ? `n:${String(label)}` : `s:${label}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

/** The murmur3 finaliser: spreads every input bit over the whole 32-bit result. */
function mix32(value: number): number {
  let h = value >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function toUint32(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`rng: the seed must be a finite number, got ${String(seed)}`);
  }
  return Math.trunc(seed) >>> 0;
}
