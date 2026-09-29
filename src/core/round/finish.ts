/**
 * The end of a league round (§3 steps 4 and 5): every battle of the round, the results,
 * records and xp, and the season end after the season's last round.
 */

import { BATTLE_STYLES, battleEnd, simulateBattle, type BattleStyleId } from '../battle';
import { applyBattleResult } from '../career';
import type { GrowthEvent } from '../growth';
import {
  endSeason,
  roundBattleStyle,
  seasonComplete,
  type League,
  type MatchResult,
  type Pairing,
  type SeasonEndReport,
} from '../league';
import type { BattleEvent, Crew, CrewId } from '../model';
import { fail, ok, type Result } from '../result';
import { createRng } from '../rng';
import { growthSeed, localBattleSeed } from '../seeds';
import { battleLineup } from '../shop';
import { stillShopping } from './actions';
import type { RoundState } from './start';

/** One battle of the round: its division, schedule slots and crews. */
export interface ScheduledBattle {
  readonly division: number;
  readonly pairing: Pairing;
  readonly crewA: CrewId;
  readonly crewB: CrewId;
}

/** Gives each battle its seed, agreed after lock-in in multiplayer (T-027). */
export type BattleSeeds = (battle: ScheduledBattle) => number;

/** Seeds from the league seed, for the local league and headless runs. */
export function localBattleSeeds(state: RoundState): BattleSeeds {
  return (battle) => localBattleSeed(state.league.seed, state.round, battle.division, battle.crewA);
}

/** The battles of the round, division by division in schedule order. */
export function roundBattles(state: RoundState): ScheduledBattle[] {
  const { divisions, schedule } = state.league.season;
  return divisions.flatMap((division, index) =>
    (schedule[index]?.[state.seasonRound - 1] ?? []).map((pairing) => ({
      division: index,
      pairing,
      crewA: division.crewIds[pairing.a] ?? '',
      crewB: division.crewIds[pairing.b] ?? '',
    })),
  );
}

export interface BattleReport extends ScheduledBattle {
  readonly seed: number;
  readonly style: BattleStyleId;
  readonly events: readonly BattleEvent[];
  readonly winner: CrewId;
  readonly margin: number;
}

export interface CrewGrowth {
  readonly crewId: CrewId;
  readonly events: readonly GrowthEvent[];
}

export interface RoundFinished {
  /** The league after the round, and after the season end if the season is over. */
  readonly league: League;
  readonly battles: readonly BattleReport[];
  readonly growth: readonly CrewGrowth[];
  readonly seasonEnd: SeasonEndReport | null;
}

/**
 * Plays every battle of the round once every crew has locked in, records the results, updates
 * records and xp, and runs the season end after the season's last round. The round is then
 * complete (§3 step 5).
 */
export function finishRound(
  state: RoundState,
  seeds: BattleSeeds = localBattleSeeds(state),
): Result<RoundFinished, 'notAllLockedIn'> {
  if (stillShopping(state).length > 0) return fail('notAllLockedIn');
  const crews = new Map<CrewId, Crew>(state.league.crews.map((crew) => [crew.id, crew]));
  for (const shop of state.shops) crews.set(shop.crew.id, shop.crew);
  const battles: BattleReport[] = [];
  const growth: CrewGrowth[] = [];
  const results: MatchResult[] = [];
  const style = roundBattleStyle(state.league, state.seasonRound);
  for (const battle of roundBattles(state)) {
    const crewA = crews.get(battle.crewA);
    const crewB = crews.get(battle.crewB);
    if (crewA === undefined || crewB === undefined) {
      throw new RangeError(`finishRound: no crew for ${battle.crewA} or ${battle.crewB}`);
    }
    const seed = seeds(battle);
    const events = simulateBattle(
      battleLineup(crewA),
      battleLineup(crewB),
      seed,
      BATTLE_STYLES[style],
    );
    const end = battleEnd(events);
    for (const [side, crew] of [
      ['a', crewA],
      ['b', crewB],
    ] as const) {
      const rng = createRng(growthSeed(state.league.seed, state.round, crew.id));
      const after = applyBattleResult(crew, events, end.winner === side, rng);
      crews.set(crew.id, after.crew);
      growth.push({ crewId: crew.id, events: after.growth });
    }
    const winner: CrewId = end.winner === 'a' ? crewA.id : crewB.id;
    battles.push({ ...battle, seed, style, events, winner, margin: end.margin });
    const { a, b } = battle.pairing;
    results.push({
      seasonRound: state.seasonRound,
      division: battle.division,
      a,
      b,
      winner: end.winner,
      margin: end.margin,
    });
  }
  const played = new Set(state.shops.map((shop) => shop.crew.id));
  const league: League = {
    ...state.league,
    crews: state.league.crews.map((crew) => crews.get(crew.id) ?? crew),
    market: state.market,
    season: {
      ...state.league.season,
      results: [...state.league.season.results, ...results],
    },
    completedRounds: state.round,
    lastRoundWinners: battles.map((battle) => battle.winner),
    freshCrews: state.league.freshCrews.filter((id) => !played.has(id)),
  };
  if (!seasonComplete(league.season)) {
    return ok({ league, battles, growth, seasonEnd: null });
  }
  const ended = endSeason(league);
  return ok({ league: ended.league, battles, growth, seasonEnd: ended.report });
}
