/** Joining and leaving the league (§7 Joining and leaving). */

import { addFreeAgent } from '../market';
import { allUnits, type CrewId } from '../model';
import { nameSet } from '../names';
import { fail, ok, type Result } from '../result';
import { crewId, crewNameProblem, foundCrew, type CrewNameError } from './crews';
import type { NewPlayer } from './create';
import { divisionStandings } from './standings';
import type { League, Member } from './types';

export interface Joined {
  readonly league: League;
  readonly crewId: CrewId;
  /** `now`: it took over a bot's slot; `nextSeason`: it waits for the next season start. */
  readonly starts: 'now' | 'nextSeason';
}

/**
 * A new player founds a crew. If a division has a bot, the newcomer takes over the slot of
 * the lowest-placed bot in the lowest such division at once: the slot's points stay, and
 * the bot's crew is dropped, its units becoming free agents (D-068). Otherwise the newcomer
 * waits and joins the bottom division at the next season start.
 */
export function joinLeague(league: League, player: NewPlayer): Result<Joined, CrewNameError> {
  const name = player.identity.name.trim();
  const problem = crewNameProblem(name, nameSet(league.crews.map((crew) => crew.identity.name)));
  if (problem !== null) return fail(problem);
  const id = crewId(league.nextCrewNumber);
  const joined: League = {
    ...league,
    members: [...league.members, { kind: 'player', crewId: id, playerName: player.playerName }],
    crews: [...league.crews, foundCrew(id, { ...player.identity, name })],
    freshCrews: [...league.freshCrews, id],
    nextCrewNumber: league.nextCrewNumber + 1,
  };
  const bot = botToReplace(league);
  if (bot === null) {
    return ok({
      league: { ...joined, waiting: [...joined.waiting, id] },
      crewId: id,
      starts: 'nextSeason',
    });
  }
  return ok({ league: replaceBot(joined, bot, id), crewId: id, starts: 'now' });
}

/** The lowest-placed bot of the lowest division that has one. */
function botToReplace(league: League): CrewId | null {
  const bots = new Set(
    league.members.filter((member) => member.kind === 'bot').map((member) => member.crewId),
  );
  for (let division = league.season.divisions.length - 1; division >= 0; division--) {
    const table = divisionStandings(league, division);
    const bot = table.reverse().find((standing) => bots.has(standing.crewId));
    if (bot !== undefined) return bot.crewId;
  }
  return null;
}

function replaceBot(league: League, botId: CrewId, newcomerId: CrewId): League {
  const bot = league.crews.find((crew) => crew.id === botId);
  const market = (bot === undefined ? [] : allUnits(bot)).reduce(addFreeAgent, league.market);
  const without = (ids: readonly CrewId[]): CrewId[] => ids.filter((id) => id !== botId);
  return {
    ...league,
    members: league.members.filter((member) => member.crewId !== botId),
    crews: league.crews.filter((crew) => crew.id !== botId),
    market,
    season: {
      ...league.season,
      divisions: league.season.divisions.map((division) => ({
        crewIds: division.crewIds.map((id) => (id === botId ? newcomerId : id)),
      })),
    },
    lastRoundWinners: without(league.lastRoundWinners),
    freshCrews: without(league.freshCrews),
  };
}

/**
 * A player leaves for good: their crew becomes a bot, keeping its identity, and an AI manager
 * runs it from then on, so the counts stay even. A waiting newcomer is simply removed.
 */
export function leaveLeague(league: League, id: CrewId): League {
  if (league.waiting.includes(id)) {
    return {
      ...league,
      members: league.members.filter((member) => member.crewId !== id),
      crews: league.crews.filter((crew) => crew.id !== id),
      waiting: league.waiting.filter((waiting) => waiting !== id),
      freshCrews: league.freshCrews.filter((fresh) => fresh !== id),
    };
  }
  const asBot = (member: Member): Member =>
    member.crewId === id ? { kind: 'bot', crewId: id } : member;
  return { ...league, members: league.members.map(asBot) };
}
