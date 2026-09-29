/** Division tables (§7 Seasons): points, then head-to-head, total MC margin and a coin flip. */

import type { CrewId } from '../model';
import { deriveSeed } from '../rng';
import { TUNABLES } from '../tunables';
import type { League, MatchResult, Season } from './types';

export interface Standing {
  readonly slot: number;
  readonly crewId: CrewId;
  readonly played: number;
  readonly wins: number;
  readonly losses: number;
  readonly points: number;
  /** Total MC margin of its wins. */
  readonly margin: number;
}

/**
 * A division's table, first place first. Ties on points are broken by the points in the
 * games between the tied crews, then total MC margin, then a seeded coin flip (a fixed
 * random key per crew and season, so the order is stable).
 */
export function divisionStandings(league: League, division: number): Standing[] {
  const { season } = league;
  const crewIds = season.divisions[division]?.crewIds ?? [];
  const results = season.results.filter((result) => result.division === division);
  const rows = crewIds.map((crewId, slot) => standingOf(slot, crewId, results));
  const coin = (crewId: CrewId): number =>
    deriveSeed(league.seed, 'tiebreak', season.number, crewId);
  return [...rows].sort((x, y) => {
    if (x.points !== y.points) return y.points - x.points;
    const tied = new Set(rows.filter((row) => row.points === x.points).map((row) => row.slot));
    const headToHead = pointsAmong(y.slot, tied, results) - pointsAmong(x.slot, tied, results);
    if (headToHead !== 0) return headToHead;
    if (x.margin !== y.margin) return y.margin - x.margin;
    return coin(x.crewId) - coin(y.crewId);
  });
}

function standingOf(slot: number, crewId: CrewId, results: readonly MatchResult[]): Standing {
  const games = results.filter((result) => result.a === slot || result.b === slot);
  const won = games.filter((result) => winnerSlot(result) === slot);
  return {
    slot,
    crewId,
    played: games.length,
    wins: won.length,
    losses: games.length - won.length,
    points: won.length * TUNABLES.POINTS_WIN,
    margin: won.reduce((sum, result) => sum + result.margin, 0),
  };
}

/** Points a slot won in games against the other slots of `tied`. */
function pointsAmong(
  slot: number,
  tied: ReadonlySet<number>,
  results: readonly MatchResult[],
): number {
  return (
    results.filter((result) => winnerSlot(result) === slot && tied.has(loserSlot(result))).length *
    TUNABLES.POINTS_WIN
  );
}

export function winnerSlot(result: MatchResult): number {
  return result.winner === 'a' ? result.a : result.b;
}

function loserSlot(result: MatchResult): number {
  return result.winner === 'a' ? result.b : result.a;
}

/**
 * Every crew in divisions, from the top of the top division to the bottom of the bottom one
 * (§7). Used to place crews into divisions and to break bid ties (§4). Waiting newcomers
 * come last.
 */
export function leagueRanking(league: League): CrewId[] {
  const ranked = league.season.divisions.flatMap((_, division) =>
    divisionStandings(league, division).map((standing) => standing.crewId),
  );
  return [...ranked, ...league.waiting];
}

/** Whether every round of the season has been played. */
export function seasonComplete(season: Season): boolean {
  const played = new Set(season.results.map((result) => result.seasonRound));
  return season.schedule.every((rounds) => rounds.every((_, index) => played.has(index + 1)));
}
