/** Lock-in (§3 step 3): the payroll is paid from the wallet, and the lineup is fixed. */

import { benchSalary } from '../market';
import { allUnits, type BattleLineup, type Crew, type Unit } from '../model';
import { fail, ok, type Result } from '../result';
import { payroll, placeOf, takeUnit } from './lineup';

export interface LockedIn {
  /** The crew after paying its payroll. */
  readonly crew: Crew;
  /** The snapshot sent to the opponent (D-004). */
  readonly lineup: BattleLineup;
}

/** Pays the payroll and fixes the lineup. Only possible while `wallet >= payroll`. */
export function lockIn(crew: Crew): Result<LockedIn, 'cannotAffordPayroll'> {
  const due = payroll(crew);
  if (crew.wallet < due) return fail('cannotAffordPayroll');
  const paid = { ...crew, wallet: crew.wallet - due };
  return ok({ crew: paid, lineup: battleLineup(paid) });
}

export function battleLineup(crew: Crew): BattleLineup {
  return { id: crew.id, mcSlots: crew.mcSlots, supportSlots: crew.supportSlots };
}

export interface ForcedLockIn extends LockedIn {
  /** The units released to make the payroll affordable, in release order. */
  readonly released: readonly Unit[];
}

/**
 * Locks in the current lineup when the shop timer runs out or a player drops (§7): if the
 * wallet can't cover the payroll, units are released one at a time until it can, the one
 * that costs least at lock-in first, then bench before active slots, then the highest slot.
 * Units that cost nothing are kept, because releasing them wouldn't help (D-066).
 */
export function forceLockIn(crew: Crew): ForcedLockIn {
  let current = crew;
  const released: Unit[] = [];
  while (current.wallet < payroll(current)) {
    const next = cheapestToRelease(current);
    if (next === undefined) break;
    const taken = takeUnit(current, next.id);
    current = taken.crew;
    released.push(taken.unit);
  }
  const locked = lockIn(current);
  if (!locked.ok) {
    // Unreachable: with every paying unit released the payroll is 0.
    throw new RangeError(`forceLockIn: crew ${crew.id} still can't pay`);
  }
  return { ...locked.value, released };
}

function cheapestToRelease(crew: Crew): Unit | undefined {
  const order = allUnits(crew);
  const candidates = order
    .map((unit) => ({ unit, cost: lockInCost(crew, unit), place: order.indexOf(unit) }))
    .filter((candidate) => candidate.cost > 0);
  candidates.sort(
    (x, y) => x.cost - y.cost || benchFirst(crew, x.unit, y.unit) || y.place - x.place,
  );
  return candidates[0]?.unit;
}

function lockInCost(crew: Crew, unit: Unit): number {
  return placeOf(crew, unit.id)?.area === 'bench' ? benchSalary(unit.salary) : unit.salary;
}

function benchFirst(crew: Crew, x: Unit, y: Unit): number {
  const onBench = (unit: Unit): number => (placeOf(crew, unit.id)?.area === 'bench' ? 0 : 1);
  return onBench(x) - onBench(y);
}
