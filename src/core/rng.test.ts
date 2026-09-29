import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from './rng';

function draws(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.nextUint32());
}

describe('createRng', () => {
  it('gives the same stream for the same seed', () => {
    expect(draws(42, 20)).toEqual(draws(42, 20));
  });

  it('gives different streams for different seeds', () => {
    expect(draws(1, 5)).not.toEqual(draws(2, 5));
  });

  it('matches the reference mulberry32 output', () => {
    // First outputs of the reference implementation for seed 1, so a refactor that
    // changes the stream (and every saved league's rolls) fails here.
    expect(draws(1, 3)).toEqual([2693262067, 11749833, 2265367787]);
  });

  it('reduces the seed to 32 bits', () => {
    expect(createRng(2 ** 32 + 5).seed).toBe(5);
    expect(createRng(-1).seed).toBe(0xffffffff);
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('returns every integer of an inclusive range and nothing outside it', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(rng.int(2, 5));
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
    expect(rng.int(4, 4)).toBe(4);
    expect(() => rng.int(5, 2)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it('draws chance() at about the given rate', () => {
    const rng = createRng(11);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) {
      if (rng.chance(0.3)) hits++;
    }
    expect(hits / 10_000).toBeCloseTo(0.3, 1);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it('picks from a list and rejects an empty one', () => {
    const rng = createRng(5);
    expect(['x', 'y', 'z']).toContain(rng.pick(['x', 'y', 'z']));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('draws weighted indices in proportion and never a zero weight', () => {
    const rng = createRng(9);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) {
      const index = rng.weightedIndex([3, 0, 2]);
      counts[index] = (counts[index] ?? 0) + 1;
    }
    expect(counts[1]).toBe(0);
    expect((counts[0] ?? 0) / 10_000).toBeCloseTo(0.6, 1);
    expect(() => rng.weightedIndex([0, 0])).toThrow(RangeError);
    expect(() => rng.weightedIndex([1, -1])).toThrow(RangeError);
    expect(() => rng.weightedIndex([])).toThrow(RangeError);
  });

  it('shuffles into a permutation without changing the input', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = createRng(13).shuffle(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(createRng(13).shuffle(items)).toEqual(shuffled);
  });
});

describe('fork', () => {
  it('is stable no matter how far the parent has advanced', () => {
    const fresh = createRng(100);
    const advanced = createRng(100);
    advanced.next();
    advanced.next();
    expect(advanced.fork('market').nextUint32()).toBe(fresh.fork('market').nextUint32());
  });

  it('does not advance the parent', () => {
    const forked = createRng(100);
    forked.fork('x');
    expect(forked.nextUint32()).toBe(createRng(100).nextUint32());
  });

  it('gives independent streams per label', () => {
    const rng = createRng(100);
    const a = rng.fork('a');
    const b = rng.fork('b');
    const parent = createRng(100);
    const first = [a.nextUint32(), b.nextUint32(), parent.nextUint32()];
    expect(new Set(first).size).toBe(3);
  });
});

describe('deriveSeed', () => {
  it('is deterministic and depends on every label and its order', () => {
    expect(deriveSeed(1, 'market', 3)).toBe(deriveSeed(1, 'market', 3));
    const seeds = [
      deriveSeed(1, 'market', 3),
      deriveSeed(1, 'market', 4),
      deriveSeed(2, 'market', 3),
      deriveSeed(1, 3, 'market'),
      deriveSeed(1, 'market', '3'),
      deriveSeed(1),
    ];
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('returns unsigned 32-bit integers', () => {
    for (let i = 0; i < 100; i++) {
      const seed = deriveSeed(i, 'x');
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
