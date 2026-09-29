/**
 * Where a crew's units sit (§2 Crew): the MC slots, the support slots and the bench. Units
 * are placed, taken out and moved here; the payroll follows from where they sit (§5.1).
 */

import { benchSalary } from '../market';
import {
  activeUnits,
  findUnit,
  type Crew,
  type McSlots,
  type McUnit,
  type Role,
  type SupportSlots,
  type SupportUnit,
  type Unit,
  type UnitId,
} from '../model';
import { fail, ok, type Result } from '../result';
import { TUNABLES } from '../tunables';

/** A place in the crew. Bench indexes count from 0; the bench has no gaps. */
export type Place =
  | { readonly area: 'mc'; readonly index: 0 | 1 | 2 }
  | { readonly area: 'support'; readonly index: 0 | 1 }
  | { readonly area: 'bench'; readonly index: number };

const MC_INDEXES = [0, 1, 2] as const;
const SUPPORT_INDEXES = [0, 1] as const;

export type MoveError = 'unknownUnit' | 'wrongRole' | 'benchFull' | 'noSuchPlace';

/** What the crew pays at lock-in: active salaries in full, bench salaries halved (§5.1). */
export function payroll(crew: Crew): number {
  const active = activeUnits(crew).reduce((sum, unit) => sum + unit.salary, 0);
  const bench = crew.bench.reduce((sum, unit) => sum + benchSalary(unit.salary), 0);
  return active + bench;
}

/** Where a unit sits, or `undefined` if the crew doesn't have it. */
export function placeOf(crew: Crew, unitId: UnitId): Place | undefined {
  for (const index of MC_INDEXES) {
    if (crew.mcSlots[index]?.id === unitId) return { area: 'mc', index };
  }
  for (const index of SUPPORT_INDEXES) {
    if (crew.supportSlots[index]?.id === unitId) return { area: 'support', index };
  }
  const benchIndex = crew.bench.findIndex((unit) => unit.id === unitId);
  return benchIndex < 0 ? undefined : { area: 'bench', index: benchIndex };
}

/**
 * Where a newly signed unit goes: the first free active slot of its role (lowest slot
 * number), or else the first free bench place, or `null` if the crew is full (D-059).
 */
export function freePlaceFor(crew: Crew, role: Role): Place | null {
  if (role === 'mc') {
    const index = MC_INDEXES.find((i) => crew.mcSlots[i] === null);
    if (index !== undefined) return { area: 'mc', index };
  } else {
    const index = SUPPORT_INDEXES.find((i) => crew.supportSlots[i] === null);
    if (index !== undefined) return { area: 'support', index };
  }
  return crew.bench.length < TUNABLES.BENCH_SIZE
    ? { area: 'bench', index: crew.bench.length }
    : null;
}

/** Puts a unit into a free place. Throws if the place is taken or doesn't fit its role. */
export function putUnit(crew: Crew, unit: Unit, place: Place): Crew {
  switch (place.area) {
    case 'mc': {
      if (unit.role !== 'mc' || crew.mcSlots[place.index] !== null) {
        throw new RangeError(`putUnit: MC slot ${String(place.index)} can't take ${unit.id}`);
      }
      return { ...crew, mcSlots: withMc(crew.mcSlots, place.index, unit) };
    }
    case 'support': {
      if (unit.role !== 'support' || crew.supportSlots[place.index] !== null) {
        throw new RangeError(`putUnit: support slot ${String(place.index)} can't take ${unit.id}`);
      }
      return { ...crew, supportSlots: withSupport(crew.supportSlots, place.index, unit) };
    }
    case 'bench': {
      if (crew.bench.length >= TUNABLES.BENCH_SIZE) {
        throw new RangeError(`putUnit: the bench of ${crew.id} is full`);
      }
      const bench = [...crew.bench];
      bench.splice(Math.min(place.index, bench.length), 0, unit);
      return { ...crew, bench };
    }
  }
}

/** Takes a unit out of the crew. Throws if the crew doesn't have it. */
export function takeUnit(crew: Crew, unitId: UnitId): { crew: Crew; unit: Unit } {
  const unit = findUnit(crew, unitId);
  const place = placeOf(crew, unitId);
  if (unit === undefined || place === undefined) {
    throw new RangeError(`takeUnit: crew ${crew.id} has no unit ${unitId}`);
  }
  return { crew: clearPlace(crew, place), unit };
}

/**
 * Moves a unit to another place (§4 Arrange). A unit already there swaps into the moving
 * unit's old place, if its role fits there. Moving onto the bench past its end appends.
 */
export function moveUnit(crew: Crew, unitId: UnitId, to: Place): Result<Crew, MoveError> {
  const from = placeOf(crew, unitId);
  if (from === undefined) return fail('unknownUnit');
  if (to.area === 'bench' && (to.index < 0 || !Number.isInteger(to.index))) {
    return fail('noSuchPlace');
  }
  const { crew: without, unit } = takeUnit(crew, unitId);
  if (from.area === 'bench' && to.area === 'bench') {
    return ok(putUnit(without, unit, to));
  }
  const occupant = unitAt(crew, to);
  if (!fits(unit.role, to)) return fail('wrongRole');
  if (occupant === null || occupant.id === unitId) {
    if (to.area === 'bench' && crew.bench.length >= TUNABLES.BENCH_SIZE) {
      return fail('benchFull');
    }
    return ok(putUnit(without, unit, to));
  }
  if (!fits(occupant.role, from)) return fail('wrongRole');
  const swapped = putUnit(clearPlace(without, to), unit, to);
  return ok(putUnit(swapped, occupant, from));
}

function fits(role: Role, place: Place): boolean {
  return place.area === 'bench' || place.area === role;
}

function unitAt(crew: Crew, place: Place): Unit | null {
  switch (place.area) {
    case 'mc':
      return crew.mcSlots[place.index];
    case 'support':
      return crew.supportSlots[place.index];
    case 'bench':
      return crew.bench[place.index] ?? null;
  }
}

function clearPlace(crew: Crew, place: Place): Crew {
  switch (place.area) {
    case 'mc':
      return { ...crew, mcSlots: withMc(crew.mcSlots, place.index, null) };
    case 'support':
      return { ...crew, supportSlots: withSupport(crew.supportSlots, place.index, null) };
    case 'bench':
      return { ...crew, bench: crew.bench.filter((_, index) => index !== place.index) };
  }
}

function withMc(slots: McSlots, index: 0 | 1 | 2, unit: McUnit | null): McSlots {
  const [a, b, c] = slots;
  return [index === 0 ? unit : a, index === 1 ? unit : b, index === 2 ? unit : c];
}

function withSupport(slots: SupportSlots, index: 0 | 1, unit: SupportUnit | null): SupportSlots {
  const [a, b] = slots;
  return [index === 0 ? unit : a, index === 1 ? unit : b];
}
