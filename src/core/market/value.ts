/**
 * A unit's value (§4 The market, §5.1 Salary, §6): its rating sets both its ask and its
 * salary, and its age sets how many seasons it has left.
 */

import type { Role, Unit } from '../model';
import { TUNABLES } from '../tunables';

/** The known retirement age of a role (§6). */
export function retireAge(role: Role): number {
  return role === 'mc' ? TUNABLES.MC_RETIRE_AGE : TUNABLES.SUPPORT_RETIRE_AGE;
}

/** Seasons left before retirement, counting the current one: 1 on the farewell tour. */
export function seasonsLeft(unit: Pick<Unit, 'role' | 'age'>): number {
  return retireAge(unit.role) - unit.age;
}

/** Whether this is the unit's last season: it retires at the season end (§6 Farewell tour). */
export function onFarewellTour(unit: Pick<Unit, 'role' | 'age'>): boolean {
  return seasonsLeft(unit) <= 1;
}

/** `⌊seasons left / YOUTH_SEASONS_PER_RATING⌋`, never below 0 (D-046). */
export function youthPremium(unit: Pick<Unit, 'role' | 'age'>): number {
  return Math.max(0, Math.floor(seasonsLeft(unit) / TUNABLES.YOUTH_SEASONS_PER_RATING));
}

/**
 * Stats (or `SUPPORT_BASE_RATING`), plus `ABILITY_RATING` per point of ability power,
 * plus the youth premium (§4).
 */
export function rating(unit: Unit): number {
  const base = unit.role === 'mc' ? unit.flow + unit.confidence : TUNABLES.SUPPORT_BASE_RATING;
  const power = unit.abilities.reduce((sum, ability) => sum + ability.power, 0);
  return base + TUNABLES.ABILITY_RATING * power + youthPremium(unit);
}

/** The asking price: the minimum bid, and the price of a scouted signing. */
export function askPrice(unit: Unit): number {
  return Math.ceil(rating(unit) * TUNABLES.ASK_PER_RATING);
}

/** The salary the unit's current value is worth, set at signing and each season end (§5.1). */
export function salaryFor(unit: Unit): number {
  return Math.ceil(rating(unit) * TUNABLES.SALARY_PER_RATING);
}

/** What a salary costs on the bench: half, rounded down. */
export function benchSalary(salary: number): number {
  return Math.floor(salary * TUNABLES.BENCH_SALARY_FACTOR);
}
