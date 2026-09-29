/**
 * Splitting the league into divisions (§7 Divisions): the fewest divisions that keep everyone
 * at or below `DIVISION_MAX`, sized as evenly as possible, then padded with bots to one
 * even size (D-057), so there are no byes and every division ends the season together.
 */

import type { CrewId } from '../model';
import { nameSet } from '../names';
import { createRng, deriveSeed } from '../rng';
import { TUNABLES } from '../tunables';
import { botIdentity, crewId, foundCrew } from './crews';
import { doubleRoundRobin } from './schedule';
import type { Division, League, Pairing } from './types';

/** Division sizes for `count` members, top division first; the larger ones are on top. */
export function divisionSizes(count: number): number[] {
  const divisions = Math.max(1, Math.ceil(count / TUNABLES.DIVISION_MAX));
  const base = Math.floor(count / divisions);
  const extra = count % divisions;
  return Array.from({ length: divisions }, (_, index) => base + (index < extra ? 1 : 0));
}

/** The size every division is padded to: the largest, rounded up to even (at least 2). */
export function paddedSize(sizes: readonly number[]): number {
  const largest = Math.max(1, ...sizes);
  return largest + (largest % 2);
}

/** Adds a new bot crew to the league (§7 Members); it isn't in a division yet. */
export function addBot(league: League): { league: League; crewId: CrewId } {
  const number = league.nextCrewNumber;
  const id = crewId(number);
  const taken = nameSet(league.crews.map((crew) => crew.identity.name));
  const crew = foundCrew(id, botIdentity(league.seed, number, taken));
  return {
    league: {
      ...league,
      members: [...league.members, { kind: 'bot', crewId: id }],
      crews: [...league.crews, crew],
      freshCrews: [...league.freshCrews, id],
      nextCrewNumber: number + 1,
    },
    crewId: id,
  };
}

/**
 * Places the ranked crews (best first) into divisions by rank and pads each division with
 * new bots at its bottom. Returns the league with the bots added, and the divisions.
 */
export function formDivisions(
  league: League,
  ranked: readonly CrewId[],
): { league: League; divisions: Division[] } {
  const sizes = divisionSizes(ranked.length);
  const size = paddedSize(sizes);
  let current = league;
  const divisions: Division[] = [];
  let start = 0;
  for (const count of sizes) {
    const crewIds = ranked.slice(start, start + count);
    start += count;
    while (crewIds.length < size) {
      const added = addBot(current);
      current = added.league;
      crewIds.push(added.crewId);
    }
    divisions.push({ crewIds });
  }
  return { league: current, divisions };
}

/** Each division's pairings for a season, from the season seed (§7 Pairing). */
export function scheduleSeason(
  leagueSeed: number,
  season: number,
  divisions: readonly Division[],
): Pairing[][][] {
  const rng = createRng(deriveSeed(leagueSeed, 'season', season));
  return divisions.map((division, index) =>
    doubleRoundRobin(division.crewIds.length, rng.fork(index)),
  );
}
