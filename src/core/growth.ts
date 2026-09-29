/** Growth by playing (§4 Growth, D-041): xp, growth steps and the second ability. */

import { ARCHETYPES } from './data';
import type { AbilityId, LearnedAbility, McUnit, Power, SupportUnit, Unit, UnitId } from './model';
import type { Rng } from './rng';
import { TUNABLES } from './tunables';

export type GrowthEvent =
  | { readonly kind: 'statUp'; readonly unitId: UnitId; readonly stat: 'flow' | 'confidence' }
  | {
      readonly kind: 'powerUp';
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly power: Power;
    }
  | { readonly kind: 'learn'; readonly unitId: UnitId; readonly abilityId: AbilityId };

export interface Grown<T extends Unit> {
  readonly unit: T;
  readonly events: readonly GrowthEvent[];
}

/**
 * Adds `amount` xp to a unit and applies every growth step and the second ability it
 * reaches, in order. At `SECOND_ABILITY_XP` the growth step comes first. Seeded picks come
 * from `rng`.
 */
export function gainXp<T extends Unit>(unit: T, amount: number, rng: Rng): Grown<T> {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`gainXp: amount must be a whole number >= 0, got ${String(amount)}`);
  }
  let current: Unit = unit;
  const events: GrowthEvent[] = [];
  for (let xp = unit.xp + 1; xp <= unit.xp + amount; xp++) {
    current = { ...current, xp };
    if (xp % TUNABLES.GROWTH_XP === 0) {
      current = growthStep(current, rng, events);
    }
    if (xp === TUNABLES.SECOND_ABILITY_XP) {
      current = learnSecondAbility(current, rng, events);
    }
  }
  // Each step keeps the unit's role, so `current` still has the caller's type.
  return { unit: current as T, events };
}

function growthStep(unit: Unit, rng: Rng, events: GrowthEvent[]): Unit {
  return unit.role === 'mc'
    ? mcGrowthStep(unit, rng, events)
    : supportGrowthStep(unit, rng, events);
}

/** +1 flow or +1 confidence, seeded. */
function mcGrowthStep(unit: McUnit, rng: Rng, events: GrowthEvent[]): McUnit {
  const stat = rng.pick(['flow', 'confidence'] as const);
  events.push({ kind: 'statUp', unitId: unit.id, stat });
  return { ...unit, [stat]: unit[stat] + 1 };
}

/** +1 power on a seeded pick of its abilities below `MAX_POWER`; nothing if all are maxed. */
function supportGrowthStep(unit: SupportUnit, rng: Rng, events: GrowthEvent[]): SupportUnit {
  const growable = unit.abilities.filter((ability) => ability.power < TUNABLES.MAX_POWER);
  if (growable.length === 0) {
    return unit;
  }
  const chosen = rng.pick(growable);
  const power = raisePower(chosen.power);
  events.push({ kind: 'powerUp', unitId: unit.id, abilityId: chosen.id, power });
  const [first, second] = unit.abilities;
  const raise = (ability: LearnedAbility): LearnedAbility =>
    ability === chosen ? { id: ability.id, power } : ability;
  return {
    ...unit,
    abilities: second === undefined ? [raise(first)] : [raise(first), raise(second)],
  };
}

function raisePower(power: Power): Power {
  return power === 1 ? 2 : 3;
}

/** A random ability from the archetype's pool other than its first, at power 1. */
function learnSecondAbility(unit: Unit, rng: Rng, events: GrowthEvent[]): Unit {
  const [first, second] = unit.abilities;
  if (second !== undefined) {
    return unit;
  }
  const options = ARCHETYPES[unit.archetype].abilityPool.filter((id) => id !== first.id);
  if (options.length === 0) {
    return unit;
  }
  const abilityId = rng.pick(options);
  events.push({ kind: 'learn', unitId: unit.id, abilityId });
  return { ...unit, abilities: [first, { id: abilityId, power: 1 }] };
}
