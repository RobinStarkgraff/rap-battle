/**
 * The start of a league round (§3 steps 1 and 2): upkeep for every crew, the round's
 * rookies, and the shop phase opening with the first bidding round.
 */

import type { CrewEvent } from '../abilities';
import { upkeep } from '../career';
import type { League } from '../league';
import { addRookies, type Market } from '../market';
import { allUnits, type Crew, type CrewId, type Unit, type UnitId } from '../model';
import { nameSet, type NameSet } from '../names';
import { createRng } from '../rng';
import { rookieSeed, upkeepSeed } from '../seeds';
import { BIDDING_START, openShop, type Bidding, type ShopCrew } from '../shop';

/** A round in its shop phase. It only exists between the start and the end of a round. */
export interface RoundState {
  /** The league at the start of the round, after upkeep. The live crews are in `shops`. */
  readonly league: League;
  /** The league round, counted from 1 over the league's life. */
  readonly round: number;
  /** The round of the season, from 1. */
  readonly seasonRound: number;
  readonly market: Market;
  /** One per crew that plays this round (every crew in a division), in league order. */
  readonly shops: readonly ShopCrew[];
  readonly bidding: Bidding;
  readonly lockedIn: readonly CrewId[];
}

export interface CrewUpkeep {
  readonly crewId: CrewId;
  readonly income: number;
  readonly lostToCap: number;
  readonly events: readonly CrewEvent[];
}

export interface RoundStartReport {
  readonly round: number;
  readonly seasonRound: number;
  /** Crews that skipped it (new crews, and everyone in the league's first round) are missing. */
  readonly upkeep: readonly CrewUpkeep[];
  readonly rookies: readonly Unit[];
  readonly leftGame: readonly Unit[];
}

export interface RoundStarted {
  readonly state: RoundState;
  readonly report: RoundStartReport;
}

/**
 * Upkeep for every crew that plays (new crews skip their first; the league's first round has
 * none, and no rookies either, because the start pool takes their place), then the rookies
 * enter and the shop phase opens (§3).
 */
export function startRound(league: League): RoundStarted {
  const round = league.completedRounds + 1;
  const playing = new Set(league.season.divisions.flatMap((division) => division.crewIds));
  const upkeepReports: CrewUpkeep[] = [];
  const crews = league.crews.map((crew) => {
    if (!playing.has(crew.id) || league.freshCrews.includes(crew.id)) return crew;
    const rng = createRng(upkeepSeed(league.seed, round, crew.id));
    const outcome = upkeep(crew, league.lastRoundWinners.includes(crew.id), rng);
    const { income, lostToCap, events } = outcome;
    upkeepReports.push({ crewId: crew.id, income, lostToCap, events });
    return outcome.crew;
  });
  const entered =
    league.completedRounds === 0
      ? { market: league.market, rookies: [], leftGame: [] }
      : addRookies(
          league.market,
          createRng(rookieSeed(league.seed, round)),
          nameSet(livingNames(crews, league.market)),
        );
  const afterUpkeep: League = { ...league, crews, market: entered.market };
  const state: RoundState = {
    league: afterUpkeep,
    round,
    seasonRound: playedSeasonRounds(league) + 1,
    market: entered.market,
    shops: crews.filter((crew) => playing.has(crew.id)).map(openShop),
    bidding: BIDDING_START,
    lockedIn: [],
  };
  return {
    state,
    report: {
      round,
      seasonRound: state.seasonRound,
      upkeep: upkeepReports,
      rookies: entered.rookies,
      leftGame: entered.leftGame,
    },
  };
}

function playedSeasonRounds(league: League): number {
  return new Set(league.season.results.map((result) => result.seasonRound)).size;
}

/** The stage names of every living unit: in crews and on the public list. */
function livingNames(crews: readonly Crew[], market: Market): string[] {
  return [...crews.flatMap(allUnits), ...market.publicList].map((unit) => unit.stageName);
}

/**
 * The names new and scouted units must avoid during the shop phase: every living unit and
 * every scouted one, except `exceptUnitId` (a scouted unit being signed keeps its own name).
 */
export function takenNames(state: RoundState, exceptUnitId?: UnitId): NameSet {
  const shopIds = new Set(state.shops.map((shop) => shop.crew.id));
  const crews = [
    ...state.shops.map((shop) => shop.crew),
    ...state.league.crews.filter((crew) => !shopIds.has(crew.id)),
  ];
  const scouted = state.shops
    .flatMap((shop) => shop.scouting.units)
    .filter((unit) => unit.id !== exceptUnitId);
  return nameSet([...livingNames(crews, state.market), ...scouted.map((unit) => unit.stageName)]);
}
