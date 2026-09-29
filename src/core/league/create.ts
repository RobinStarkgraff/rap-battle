/** Creating a league (§7): the founding players' crews, bots, divisions, market and season 1. */

import { createMarket } from '../market';
import type { CrewIdentity } from '../model';
import { nameSet } from '../names';
import { fail, ok, type Result } from '../result';
import { createRng, deriveSeed } from '../rng';
import { startPoolSeed } from '../seeds';
import { crewId, crewNameProblem, foundCrew, type CrewNameError } from './crews';
import { addBot, formDivisions, scheduleSeason } from './divisions';
import type { League, LeagueBattleStyle } from './types';

export interface NewPlayer {
  readonly playerName: string;
  readonly identity: CrewIdentity;
}

export interface LeagueOptions {
  /** Every battle is a clash unless the founder picks another (D-088). */
  readonly battleStyle?: LeagueBattleStyle;
}

/**
 * A new league from its seed, the founding players and how many bots the host adds. The
 * members are ordered by a seeded shuffle and split into divisions, which bots pad (D-057).
 * The start pool has `POOL_START_PER_MEMBER` units per member, bots included.
 */
export function createLeague(
  seed: number,
  players: readonly NewPlayer[],
  bots: number,
  options: LeagueOptions = {},
): Result<League, CrewNameError> {
  const taken = nameSet([]);
  for (const player of players) {
    const problem = crewNameProblem(player.identity.name, taken);
    if (problem !== null) return fail(problem);
    taken.add(player.identity.name.trim());
  }
  const crews = players.map((player, index) =>
    foundCrew(crewId(index + 1), { ...player.identity, name: player.identity.name.trim() }),
  );
  let league: League = {
    seed,
    battleStyle: options.battleStyle ?? 'frontMcsClash',
    members: players.map((player, index) => ({
      kind: 'player',
      crewId: crewId(index + 1),
      playerName: player.playerName,
    })),
    crews,
    market: { publicList: [], nextUnitNumber: 1 },
    season: { number: 1, divisions: [], schedule: [], results: [] },
    completedRounds: 0,
    lastRoundWinners: [],
    freshCrews: crews.map((crew) => crew.id),
    waiting: [],
    nextCrewNumber: players.length + 1,
  };
  for (let bot = 0; bot < bots; bot++) {
    league = addBot(league).league;
  }
  const order = createRng(deriveSeed(seed, 'order')).shuffle(league.crews.map((crew) => crew.id));
  const formed = formDivisions(league, order);
  const names = nameSet([]);
  const market = createMarket(formed.league.members.length, createRng(startPoolSeed(seed)), names);
  return ok({
    ...formed.league,
    market,
    season: {
      number: 1,
      divisions: formed.divisions,
      schedule: scheduleSeason(seed, 1, formed.divisions),
      results: [],
    },
  });
}
