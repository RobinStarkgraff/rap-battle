/**
 * How the AI manager judges units (§7 AI managers, T-019): what a unit is worth in battle,
 * and what it is worth for its price.
 */

import { ABILITIES } from '../data';
import { askPrice } from '../market';
import type { Crew, McSlot, Unit } from '../model';
import { freePlaceFor, payroll, putUnit } from '../shop';
import { TUNABLES } from '../tunables';

/** Battle strength: the rating without the youth premium, so stats and ability power only. */
export function strength(unit: Unit): number {
  const base = unit.role === 'mc' ? unit.flow + unit.confidence : TUNABLES.SUPPORT_BASE_RATING;
  const power = unit.abilities.reduce((sum, ability) => sum + ability.power, 0);
  return base + TUNABLES.ABILITY_RATING * power;
}

/**
 * **Best value**: strength per gold of the unit's ask plus one salary, so a cheap solid unit
 * beats an expensive star that the crew can't keep.
 */
export function valueForMoney(unit: Unit): number {
  return strength(unit) / (askPrice(unit) + Math.max(1, unit.salary));
}

/**
 * How well an MC suits a starting slot: the Opener takes the first hits and any setup disses,
 * so confidence counts double there; the Closer is the last word, so flow counts double; an
 * `inSlot` ability for the slot adds `SLOT_ABILITY_BONUS`.
 */
export function slotFit(unit: Unit, slot: McSlot): number {
  if (unit.role !== 'mc') return 0;
  const stats =
    slot === 'opener'
      ? 2 * unit.confidence + unit.flow
      : slot === 'closer'
        ? 2 * unit.flow + unit.confidence
        : unit.flow + unit.confidence;
  const slotAbility = unit.abilities.some(
    (ability) => ABILITIES[ability.id].conditions?.inSlot === slot,
  );
  return stats + (slotAbility ? SLOT_ABILITY_BONUS : 0);
}

export const SLOT_ABILITY_BONUS = 4;

/** The payroll after signing `units` into the places they would go, in order. */
export function payrollWith(crew: Crew, units: readonly Unit[]): number | null {
  let placed = crew;
  for (const unit of units) {
    const place = freePlaceFor(placed, unit.role);
    if (place === null) return null;
    placed = putUnit(placed, unit, place);
  }
  return payroll(placed);
}
