/**
 * Unique names (§8 Stage names, §2 Crew identity): a taken roll is rolled again up to
 * `NAME_REROLLS` times, then the smallest free numeral is added (*Biscuit II*).
 */

import { TUNABLES } from './tunables';

const NUMERALS = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** A name set compared case-insensitively. */
export interface NameSet {
  has(name: string): boolean;
}

/** A `NameSet` over the given names, ignoring case. */
export function nameSet(names: Iterable<string>): NameSet & { add(name: string): void } {
  const keys = new Set<string>();
  for (const name of names) keys.add(name.toLowerCase());
  return {
    has: (name) => keys.has(name.toLowerCase()),
    add: (name) => {
      keys.add(name.toLowerCase());
    },
  };
}

/**
 * Rolls names with `roll` until one is free, up to `NAME_REROLLS` rerolls; after that the
 * last roll gets the smallest free numeral (then a plain number, which is never needed).
 */
export function uniqueName(roll: () => string, taken: NameSet): string {
  let name = roll();
  for (let reroll = 0; reroll < TUNABLES.NAME_REROLLS && taken.has(name); reroll++) {
    name = roll();
  }
  if (!taken.has(name)) {
    return name;
  }
  for (const numeral of NUMERALS) {
    if (!taken.has(`${name} ${numeral}`)) return `${name} ${numeral}`;
  }
  let number = NUMERALS.length + 2;
  while (taken.has(`${name} ${String(number)}`)) number++;
  return `${name} ${String(number)}`;
}
