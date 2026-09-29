/**
 * The crew and market steps of the season end (§7 Season end, steps 1 to 4): titles,
 * retirement into every former crew's hall of fame, ageing and salaries. The league's
 * steps (divisions, schedule) come after these.
 */

import { onFarewellTour, salaryFor, type Market } from '../market';
import {
  allUnits,
  type Crew,
  type CrewId,
  type SeasonResult,
  type Title,
  type Unit,
  type UnitId,
} from '../model';
import { takeUnit } from '../shop';

/** Step 1: a crew's final result of the season and any titles it won go into its record. */
export function recordSeason(crew: Crew, result: SeasonResult, titles: readonly Title[]): Crew {
  return {
    ...crew,
    record: {
      titles: [...crew.record.titles, ...titles],
      seasons: [...crew.record.seasons, result],
    },
  };
}

export interface Retirement {
  /** The unit as it retired, with its final record. */
  readonly unit: Unit;
  /** The crew it retired from, or `null` for a free agent. */
  readonly fromCrewId: CrewId | null;
}

export interface SeasonCrews {
  readonly crews: readonly Crew[];
  readonly market: Market;
}

export interface Retired extends SeasonCrews {
  readonly retired: readonly Retirement[];
}

/**
 * Step 2: every crew unit counts the season with its crew, then every unit on its farewell
 * tour retires, from the crews and from the public list, and enters the hall of fame of
 * every crew in `crews` it played for (D-056).
 */
export function retireUnits(crews: readonly Crew[], market: Market, season: number): Retired {
  const retired: Retirement[] = [];
  const remaining = crews.map((crew) => {
    let current = countSeason(crew);
    for (const unit of allUnits(current).filter(onFarewellTour)) {
      current = takeUnit(current, unit.id).crew;
      retired.push({ unit, fromCrewId: crew.id });
    }
    return current;
  });
  for (const unit of market.publicList.filter(onFarewellTour)) {
    retired.push({ unit, fromCrewId: null });
  }
  const retiredIds = new Set(retired.map((retirement) => retirement.unit.id));
  return {
    crews: remaining.map((crew) => withHallOfFame(crew, retired, season)),
    market: {
      ...market,
      publicList: market.publicList.filter((unit) => !retiredIds.has(unit.id)),
    },
    retired,
  };
}

/** Adds a season to each unit's stint with its current crew. */
function countSeason(crew: Crew): Crew {
  return mapUnits(crew, (unit) => ({
    ...unit,
    record: {
      ...unit.record,
      crews: unit.record.crews.map((stint) =>
        stint.crewId === crew.id ? { ...stint, seasons: stint.seasons + 1 } : stint,
      ),
    },
  }));
}

function withHallOfFame(crew: Crew, retired: readonly Retirement[], season: number): Crew {
  const inducted = retired.filter(({ unit }) =>
    unit.record.crews.some((stint) => stint.crewId === crew.id),
  );
  if (inducted.length === 0) return crew;
  return {
    ...crew,
    hallOfFame: [
      ...crew.hallOfFame,
      ...inducted.map(({ unit }) => ({ unit, retiredAfterSeason: season })),
    ],
  };
}

export interface Aged extends SeasonCrews {
  /** The units whose last season starts now, announced with the season results. */
  readonly farewellTours: readonly UnitId[];
}

/** Step 3: every remaining unit, in crews and on the public list, gets one year older. */
export function ageUnits(crews: readonly Crew[], market: Market): Aged {
  const older: UnitUpdate = (unit) => ({ ...unit, age: unit.age + 1 });
  const aged = crews.map((crew) => mapUnits(crew, older));
  const publicList = market.publicList.map(older);
  const everyone = [...aged.flatMap(allUnits), ...publicList];
  return {
    crews: aged,
    market: { ...market, publicList },
    farewellTours: everyone.filter(onFarewellTour).map((unit) => unit.id),
  };
}

export interface SalaryChange {
  readonly unitId: UnitId;
  readonly from: number;
  readonly to: number;
}

/**
 * Step 4: every crew unit's salary is renegotiated from its value (§5.1). Free agents' listed
 * salaries are refreshed too, so the market shows what they would cost.
 */
export function renegotiateSalaries(
  crews: readonly Crew[],
  market: Market,
): SeasonCrews & { readonly changes: readonly SalaryChange[] } {
  const changes: SalaryChange[] = [];
  const reprice: UnitUpdate = (unit) => ({ ...unit, salary: salaryFor(unit) });
  const repriced = crews.map((crew) =>
    mapUnits(crew, <T extends Unit>(unit: T): T => {
      const to = salaryFor(unit);
      if (to !== unit.salary) changes.push({ unitId: unit.id, from: unit.salary, to });
      return reprice(unit);
    }),
  );
  return {
    crews: repriced,
    market: { ...market, publicList: market.publicList.map(reprice) },
    changes,
  };
}

/** Changes a unit's shared fields, so its role and type stay the same. */
type UnitUpdate = <T extends Unit>(unit: T) => T;

/** Applies `update` to every unit of the crew where it sits. */
function mapUnits(crew: Crew, update: UnitUpdate): Crew {
  const inSlot = <T extends Unit>(unit: T | null): T | null =>
    unit === null ? null : update(unit);
  const [opener, middle, closer] = crew.mcSlots;
  const [first, second] = crew.supportSlots;
  return {
    ...crew,
    mcSlots: [inSlot(opener), inSlot(middle), inSlot(closer)],
    supportSlots: [inSlot(first), inSlot(second)],
    bench: crew.bench.map(update),
  };
}
