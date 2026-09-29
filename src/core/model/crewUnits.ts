/** Small queries and updates on a crew's units. */

import type { Crew, McSlots, SupportSlots } from './crew';
import type { McUnit, Unit, UnitId } from './unit';

/** Units in active slots, in resolution order: MC slot 1, 2, 3, then support slot 1, 2 (§5). */
export function activeUnits(crew: Pick<Crew, 'mcSlots' | 'supportSlots'>): Unit[] {
  return [...crew.mcSlots, ...crew.supportSlots].filter((unit) => unit !== null);
}

/** Every unit of the crew: active slots in resolution order, then the bench. */
export function allUnits(crew: Crew): Unit[] {
  return [...activeUnits(crew), ...crew.bench];
}

/** Every MC of the crew, on stage or on the bench. */
export function allMcs(crew: Crew): McUnit[] {
  return allUnits(crew).filter((unit) => unit.role === 'mc');
}

export function findUnit(crew: Crew, id: UnitId): Unit | undefined {
  return allUnits(crew).find((unit) => unit.id === id);
}

/**
 * Replaces the unit with the same id, wherever it sits. Throws if the crew doesn't have it
 * or it has a different role there.
 */
export function replaceUnit(crew: Crew, unit: Unit): Crew {
  if (findUnit(crew, unit.id)?.role !== unit.role) {
    throw new RangeError(`replaceUnit: crew ${crew.id} has no ${unit.role} ${unit.id}`);
  }
  const bench = crew.bench.map((benched) => (benched.id === unit.id ? unit : benched));
  if (unit.role === 'mc') {
    const [opener, middle, closer] = crew.mcSlots;
    const mcSlots: McSlots = [swapIn(opener, unit), swapIn(middle, unit), swapIn(closer, unit)];
    return { ...crew, mcSlots, bench };
  }
  const [first, second] = crew.supportSlots;
  const supportSlots: SupportSlots = [swapIn(first, unit), swapIn(second, unit)];
  return { ...crew, supportSlots, bench };
}

function swapIn<T extends Unit>(slot: T | null, unit: T): T | null {
  return slot?.id === unit.id ? unit : slot;
}
