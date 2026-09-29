/** The league (§7): members, divisions, seasons, standings, joining and leaving. */

export { awaySummary } from './away';
export type { AwaySummary } from './away';
export { createLeague } from './create';
export type { NewPlayer } from './create';
export { botIdentity, crewId, crewNameProblem, foundCrew } from './crews';
export type { CrewNameError } from './crews';
export { addBot, divisionSizes, formDivisions, paddedSize, scheduleSeason } from './divisions';
export { joinLeague, leaveLeague } from './membership';
export type { Joined } from './membership';
export { doubleRoundRobin } from './schedule';
export { endSeason } from './seasonEnd';
export type { SeasonEnded, SeasonEndReport } from './seasonEnd';
export { divisionStandings, leagueRanking, seasonComplete, winnerSlot } from './standings';
export type { Standing } from './standings';
export type { Division, League, MatchResult, Member, Pairing, Season } from './types';
