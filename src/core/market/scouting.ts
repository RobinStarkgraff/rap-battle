/**
 * Personal scouting (§4 The market, D-040): `SCOUT_COST` gold for `SCOUT_COUNT` new units
 * only this crew sees. Scouting again replaces them; unsigned ones vanish at lock-in.
 */

import type { Crew, Unit, UnitId } from '../model';
import { nameSet, type NameSet } from '../names';
import { fail, ok, type Result } from '../result';
import { createRng } from '../rng';
import { scoutSeed } from '../seeds';
import { TUNABLES } from '../tunables';
import { generateUnit } from './generate';

/** A crew's scouting in the current shop phase. */
export interface Scouting {
  /** How often the crew has scouted this round; it is part of the next scout's seed (§3). */
  readonly count: number;
  /** The units of the latest scouting that are not signed yet. */
  readonly units: readonly Unit[];
}

export const NO_SCOUTING: Scouting = { count: 0, units: [] };

/** Where a scouting happens: the league seed and the league round. */
export interface ScoutContext {
  readonly leagueSeed: number;
  readonly round: number;
}

export interface Scouted {
  readonly crew: Crew;
  readonly scouting: Scouting;
}

/** The id of a scouted unit, unique in the league without a shared counter. */
export function scoutedUnitId(
  crew: Crew,
  context: ScoutContext,
  count: number,
  index: number,
): UnitId {
  return `${crew.id}/r${String(context.round)}/s${String(count)}/${String(index)}`;
}

/**
 * Pays `SCOUT_COST` and replaces the crew's scouted units with `SCOUT_COUNT` new ones. Their
 * stage names are free in `taken` (the league's living units) at the time of scouting.
 */
export function scout(
  crew: Crew,
  scouting: Scouting,
  context: ScoutContext,
  taken: NameSet,
): Result<Scouted, 'notEnoughGold'> {
  if (crew.wallet < TUNABLES.SCOUT_COST) {
    return fail('notEnoughGold');
  }
  const rng = createRng(scoutSeed(context.leagueSeed, context.round, crew.id, scouting.count));
  const names = nameSet([]);
  const units: Unit[] = [];
  for (let index = 0; index < TUNABLES.SCOUT_COUNT; index++) {
    const id = scoutedUnitId(crew, context, scouting.count, index);
    const unit = generateUnit(id, rng, { has: (name) => taken.has(name) || names.has(name) });
    names.add(unit.stageName);
    units.push(unit);
  }
  return ok({
    crew: { ...crew, wallet: crew.wallet - TUNABLES.SCOUT_COST },
    scouting: { count: scouting.count + 1, units },
  });
}
