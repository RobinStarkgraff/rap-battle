/**
 * How the AI manager sets its lineup (T-019): its strongest units play, the MCs in the order
 * that suits them best, and bench units weaker than its whole active line are released.
 */

import { MC_SLOTS, type Crew, type McUnit, type Unit, type UnitId } from '../model';
import type { Place } from '../shop';
import { slotFit, strength } from './value';

/** Where each unit should play: MCs in slot order, then supports. Missing units leave a gap. */
export interface LineupPlan {
  readonly mcs: readonly (McUnit | null)[];
  readonly supports: readonly Unit[];
}

/** The strongest 3 MCs, in the order with the best total slot fit, and the strongest 2 supports. */
export function planLineup(units: readonly Unit[]): LineupPlan {
  const byStrength = [...units].sort((x, y) => strength(y) - strength(x));
  const mcs = byStrength.filter((unit): unit is McUnit => unit.role === 'mc').slice(0, 3);
  const supports = byStrength.filter((unit) => unit.role === 'support').slice(0, 2);
  return { mcs: bestOrder(mcs), supports };
}

function bestOrder(mcs: readonly McUnit[]): (McUnit | null)[] {
  const padded: (McUnit | null)[] = [...mcs, null, null, null].slice(0, 3);
  let best = padded;
  let bestScore = -Infinity;
  for (const order of permutations(padded)) {
    const score = order.reduce(
      (sum, unit, index) => sum + (unit === null ? 0 : slotFit(unit, MC_SLOTS[index] ?? 'middle')),
      0,
    );
    // Units fill the front first: an empty Opener only skips to the next MC anyway.
    const gapsLast = order.findIndex((unit) => unit === null);
    const packed = gapsLast < 0 || order.slice(gapsLast).every((unit) => unit === null);
    if (packed && score > bestScore) {
      best = order;
      bestScore = score;
    }
  }
  return best;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

/** The moves that turn the crew's lineup into the plan, one unit at a time. */
export function movesFor(plan: LineupPlan): { unitId: UnitId; to: Place }[] {
  const mcMoves = ([0, 1, 2] as const).flatMap((index) => {
    const unit = plan.mcs[index];
    return unit === null || unit === undefined
      ? []
      : [{ unitId: unit.id, to: { area: 'mc', index } as const }];
  });
  const supportMoves = ([0, 1] as const).flatMap((index) => {
    const unit = plan.supports[index];
    return unit === undefined ? [] : [{ unitId: unit.id, to: { area: 'support', index } as const }];
  });
  return [...mcMoves, ...supportMoves];
}

/** Bench units weaker than every active unit of their role, when that role's slots are full. */
export function surplus(crew: Crew): Unit[] {
  const activeMcs = crew.mcSlots.filter((unit) => unit !== null);
  const activeSupports = crew.supportSlots.filter((unit) => unit !== null);
  const weakest = (units: readonly Unit[]): number => Math.min(...units.map(strength));
  return crew.bench.filter((unit) => {
    const active = unit.role === 'mc' ? activeMcs : activeSupports;
    const slots = unit.role === 'mc' ? 3 : 2;
    return active.length === slots && strength(unit) < weakest(active);
  });
}
