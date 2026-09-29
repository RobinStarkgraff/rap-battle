/**
 * Every seed outside a battle, derived from the league seed (§3 step 2). Each draw has its
 * own labelled seed, so replaying a round gives the same market, scouts and growth, and one
 * draw never shifts another. Changing a label changes every saved league's rolls.
 */

import type { CrewId, UnitId } from './model';
import { deriveSeed } from './rng';

/** The league's start pool, drawn at league creation. */
export function startPoolSeed(leagueSeed: number): number {
  return deriveSeed(leagueSeed, 'start-pool');
}

/** The rookies of league round `round` (counted from 1 over the league's life). */
export function rookieSeed(leagueSeed: number, round: number): number {
  return deriveSeed(leagueSeed, 'rookies', round);
}

/** A crew's `scoutNumber`-th scouting (from 0) in league round `round`. */
export function scoutSeed(
  leagueSeed: number,
  round: number,
  crewId: CrewId,
  scoutNumber: number,
): number {
  return deriveSeed(leagueSeed, 'scout', round, crewId, scoutNumber);
}

/** The coin flips and `sign` abilities of bidding round `bidRound` in league round `round`. */
export function bidSeed(leagueSeed: number, round: number, bidRound: number): number {
  return deriveSeed(leagueSeed, 'bids', round, bidRound);
}

/** The `sign` abilities of a scouted unit signed in league round `round`. */
export function signSeed(leagueSeed: number, round: number, unitId: UnitId): number {
  return deriveSeed(leagueSeed, 'sign', round, unitId);
}

/** A crew's `upkeep` abilities in league round `round`. */
export function upkeepSeed(leagueSeed: number, round: number, crewId: CrewId): number {
  return deriveSeed(leagueSeed, 'upkeep', round, crewId);
}

/** The growth rolls of a crew's units after its battle in league round `round`. */
export function growthSeed(leagueSeed: number, round: number, crewId: CrewId): number {
  return deriveSeed(leagueSeed, 'growth', round, crewId);
}

/**
 * A battle seed for leagues without seed agreement (the local league and headless runs). In
 * multiplayer both crews agree the seed after lock-in instead (T-027).
 */
export function localBattleSeed(
  leagueSeed: number,
  round: number,
  division: number,
  crewA: CrewId,
): number {
  return deriveSeed(leagueSeed, 'battle', round, division, crewA);
}
