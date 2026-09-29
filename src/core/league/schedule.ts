/** Season pairings (§7 Seasons): a double round robin by the circle method. */

import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import type { Pairing } from './types';

/**
 * The rounds of a season for a division of `size` slots (even, at least 2): every pair meets
 * twice, the second half repeating the first with the sides swapped. The slots are shuffled
 * with `rng` first, so the pairings change each season. If that is fewer than
 * `MIN_SEASON_ROUNDS` rounds, the rounds repeat until there are that many.
 */
export function doubleRoundRobin(size: number, rng: Rng): Pairing[][] {
  if (!Number.isInteger(size) || size < 2 || size % 2 !== 0) {
    throw new RangeError(`doubleRoundRobin: size must be even and at least 2, got ${String(size)}`);
  }
  const slots = rng.shuffle(Array.from({ length: size }, (_, slot) => slot));
  const firstHalf = circleRounds(slots);
  const secondHalf = firstHalf.map((round) => round.map(({ a, b }) => ({ a: b, b: a })));
  const rounds = [...firstHalf, ...secondHalf];
  for (let index = 0; rounds.length < TUNABLES.MIN_SEASON_ROUNDS; index++) {
    rounds.push(rounds[index] ?? []);
  }
  return rounds;
}

/**
 * The circle method: the first slot stays put and the others rotate one place each round,
 * so after `size − 1` rounds every pair has met once. Sides alternate for the fixed slot.
 */
function circleRounds(slots: readonly number[]): Pairing[][] {
  const [fixed, ...ring] = slots;
  if (fixed === undefined) return [];
  const rounds: Pairing[][] = [];
  for (let round = 0; round < ring.length; round++) {
    const rotated = [...ring.slice(round), ...ring.slice(0, round)];
    const circle = [fixed, ...rotated];
    const pairings: Pairing[] = [];
    for (let i = 0; i < circle.length / 2; i++) {
      const first = circle[i] ?? 0;
      const second = circle[circle.length - 1 - i] ?? 0;
      const swap = i === 0 && round % 2 === 1;
      pairings.push(swap ? { a: second, b: first } : { a: first, b: second });
    }
    rounds.push(pairings);
  }
  return rounds;
}
