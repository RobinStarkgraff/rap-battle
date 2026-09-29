/** Signing and releasing units (§4 The market, §5.1 Salary). */

import { applySignAbilities, type CrewOutcome } from '../abilities';
import { salaryFor } from '../market';
import {
  findUnit,
  type Crew,
  type CrewId,
  type Unit,
  type UnitId,
  type UnitRecord,
} from '../model';
import { fail, ok, type Result } from '../result';
import type { Rng } from '../rng';
import { freePlaceFor, putUnit, takeUnit } from './lineup';

export type SignError = 'noPlace' | 'notEnoughGold';

/**
 * Signs a unit for `price`: it goes into the first free place for its role (D-059), its
 * salary is set from its value, the crew joins its career record, and its `sign` abilities
 * resolve.
 */
export function signUnit(
  crew: Crew,
  unit: Unit,
  price: number,
  rng: Rng,
): Result<CrewOutcome, SignError> {
  const place = freePlaceFor(crew, unit.role);
  if (place === null) return fail('noPlace');
  if (crew.wallet < price) return fail('notEnoughGold');
  const signed: Unit = {
    ...unit,
    salary: salaryFor(unit),
    record: joinCrew(unit.record, crew.id),
  };
  const joined = putUnit({ ...crew, wallet: crew.wallet - price }, signed, place);
  return ok(applySignAbilities(joined, unit.id, rng));
}

/** Adds a stint for the crew to a career record, unless the unit played for it before. */
function joinCrew(record: UnitRecord, crewId: CrewId): UnitRecord {
  if (record.crews.some((stint) => stint.crewId === crewId)) return record;
  return { ...record, crews: [...record.crews, { crewId, battles: 0, seasons: 0 }] };
}

export interface Released {
  readonly crew: Crew;
  /** The released unit, as it goes back to the public list. */
  readonly unit: Unit;
}

/** Releases a unit for free, with no refund (§4 Release). The caller lists it as a free agent. */
export function releaseUnit(crew: Crew, unitId: UnitId): Result<Released, 'unknownUnit'> {
  if (findUnit(crew, unitId) === undefined) return fail('unknownUnit');
  return ok(takeUnit(crew, unitId));
}
