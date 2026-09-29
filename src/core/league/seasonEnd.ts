/**
 * The season end for the whole league (§7 Season end), in its order: titles, retirement,
 * ageing, salaries, divisions and the new schedule.
 */

import {
  ageUnits,
  recordSeason,
  renegotiateSalaries,
  retireUnits,
  type Retirement,
  type SalaryChange,
} from '../career';
import type { Crew, CrewId, Title, UnitId } from '../model';
import { TUNABLES } from '../tunables';
import { formDivisions, scheduleSeason } from './divisions';
import { divisionStandings, type Standing } from './standings';
import type { League } from './types';

export interface SeasonEndReport {
  /** The season that ended. */
  readonly season: number;
  readonly titles: readonly { readonly crewId: CrewId; readonly title: Title }[];
  /** Final tables, top division first. */
  readonly standings: readonly (readonly Standing[])[];
  readonly retired: readonly Retirement[];
  readonly farewellTours: readonly UnitId[];
  readonly salaryChanges: readonly SalaryChange[];
  readonly promoted: readonly CrewId[];
  readonly relegated: readonly CrewId[];
}

export interface SeasonEnded {
  readonly league: League;
  readonly report: SeasonEndReport;
}

/** Runs the season end after the season's last round and starts the next season. */
export function endSeason(league: League): SeasonEnded {
  const season = league.season.number;
  const standings = league.season.divisions.map((_, division) =>
    divisionStandings(league, division),
  );
  const titles = seasonTitles(standings, season);
  const recorded = league.crews.map((crew) => withSeasonRecord(crew, standings, titles, season));
  const retired = retireUnits(recorded, league.market, season);
  const aged = ageUnits(retired.crews, retired.market);
  const priced = renegotiateSalaries(aged.crews, aged.market);
  const moves = promotionAndRelegation(standings);
  const ranked = [...moves.ranking, ...league.waiting];
  const formed = formDivisions({ ...league, crews: priced.crews, market: priced.market }, ranked);
  return {
    league: {
      ...formed.league,
      waiting: [],
      season: {
        number: season + 1,
        divisions: formed.divisions,
        schedule: scheduleSeason(league.seed, season + 1, formed.divisions),
        results: [],
      },
    },
    report: {
      season,
      titles,
      standings,
      retired: retired.retired,
      farewellTours: aged.farewellTours,
      salaryChanges: priced.changes,
      promoted: moves.promoted,
      relegated: moves.relegated,
    },
  };
}

/** Every division winner gets a title, and the top division's winner is also champion. */
function seasonTitles(
  standings: readonly (readonly Standing[])[],
  season: number,
): { crewId: CrewId; title: Title }[] {
  return standings.flatMap((table, division) => {
    const winner = table[0];
    if (winner === undefined) return [];
    const divisionTitle: Title = { kind: 'division', season, division };
    const champion: Title = { kind: 'champion', season, division };
    const won = division === 0 ? [champion, divisionTitle] : [divisionTitle];
    return won.map((title) => ({ crewId: winner.crewId, title }));
  });
}

function withSeasonRecord(
  crew: Crew,
  standings: readonly (readonly Standing[])[],
  titles: readonly { crewId: CrewId; title: Title }[],
  season: number,
): Crew {
  for (const [division, table] of standings.entries()) {
    const position = table.findIndex((standing) => standing.crewId === crew.id);
    const standing = table[position];
    if (standing === undefined) continue;
    const { wins, losses, points } = standing;
    const won = titles.filter((entry) => entry.crewId === crew.id).map((entry) => entry.title);
    return recordSeason(
      crew,
      { season, division, position: position + 1, wins, losses, points },
      won,
    );
  }
  return crew;
}

/**
 * The league ranking after promotion and relegation: the top `PROMOTE_COUNT` of each lower
 * division swap places with the bottom `PROMOTE_COUNT` of the division above.
 */
function promotionAndRelegation(standings: readonly (readonly Standing[])[]): {
  ranking: CrewId[];
  promoted: CrewId[];
  relegated: CrewId[];
} {
  const tables = standings.map((table) => table.map((standing) => standing.crewId));
  const promoted: CrewId[] = [];
  const relegated: CrewId[] = [];
  for (let lower = 1; lower < tables.length; lower++) {
    const upper = tables[lower - 1] ?? [];
    const below = tables[lower] ?? [];
    const count = Math.min(
      TUNABLES.PROMOTE_COUNT,
      Math.floor(upper.length / 2),
      Math.floor(below.length / 2),
    );
    const down = upper.splice(upper.length - count, count);
    const up = below.splice(0, count);
    upper.push(...up);
    below.unshift(...down);
    promoted.push(...up);
    relegated.push(...down);
  }
  return { ranking: tables.flat(), promoted, relegated };
}
