/**
 * Random but valid lineups for property tests: any archetype, stats in its range, one or
 * two abilities from its pool at any power (support) and empty slots now and then. Only test
 * files import this module; the real unit generation is the market's (T-016).
 */

import { MC_ARCHETYPES, SUPPORT_ARCHETYPES } from '../data';
import type {
  BattleLineup,
  LearnedAbility,
  McUnit,
  Power,
  SupportUnit,
  UnitAbilities,
} from '../model';
import type { Rng } from '../rng';
import { mc, support } from './fixtures';

const POWERS: readonly Power[] = [1, 2, 3];

function randomAbilities(
  pool: readonly LearnedAbility['id'][],
  rng: Rng,
  withPower: boolean,
): UnitAbilities {
  const [first, second] = rng.shuffle(pool);
  const power = (): Power => (withPower ? rng.pick(POWERS) : 1);
  if (first === undefined) throw new RangeError('empty ability pool');
  const learnedFirst: LearnedAbility = { id: first, power: power() };
  return second !== undefined && rng.chance(0.3)
    ? [learnedFirst, { id: second, power: power() }]
    : [learnedFirst];
}

function randomMc(id: string, rng: Rng, confidenceBonus: number): McUnit {
  const archetype = rng.pick(Object.values(MC_ARCHETYPES));
  const base = mc({ id, archetype: archetype.id });
  return {
    ...base,
    flow: rng.int(archetype.flow.min, archetype.flow.max) + rng.int(0, 2),
    confidence:
      rng.int(archetype.confidence.min, archetype.confidence.max) + rng.int(0, 2) + confidenceBonus,
    abilities: randomAbilities(archetype.abilityPool, rng, false),
  };
}

function randomSupport(id: string, rng: Rng): SupportUnit {
  const archetype = rng.pick(Object.values(SUPPORT_ARCHETYPES));
  return {
    ...support({ id, archetype: archetype.id, abilities: ['shout-out'] }),
    abilities: randomAbilities(archetype.abilityPool, rng, true),
  };
}

export interface RandomLineupOptions {
  /** The chance for each slot to be empty. */
  readonly emptyChance?: number;
  /** Extra confidence for every MC, to make battles run long. */
  readonly confidenceBonus?: number;
}

/** A lineup whose unit ids start with `prefix`. */
export function randomLineup(
  prefix: string,
  rng: Rng,
  options: RandomLineupOptions = {},
): BattleLineup {
  const { emptyChance = 0.15, confidenceBonus = 0 } = options;
  const slot = <T>(make: () => T): T | null => (rng.chance(emptyChance) ? null : make());
  return {
    id: prefix,
    mcSlots: [
      slot(() => randomMc(`${prefix}m1`, rng, confidenceBonus)),
      slot(() => randomMc(`${prefix}m2`, rng, confidenceBonus)),
      slot(() => randomMc(`${prefix}m3`, rng, confidenceBonus)),
    ],
    supportSlots: [
      slot(() => randomSupport(`${prefix}s1`, rng)),
      slot(() => randomSupport(`${prefix}s2`, rng)),
    ],
  };
}
