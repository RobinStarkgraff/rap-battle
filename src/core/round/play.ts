/**
 * `playRound()`: a whole league round in one pure function (§3), with every crew's shop
 * decisions made by a `CrewManager`. The headless test and the AI-run crews use it; the
 * local league and the host drive the same phase functions one step at a time.
 */

import type { League } from '../league';
import type { CrewId } from '../model';
import type { Award } from '../shop';
import { forceLockInCrew, lockInCrew, resolveBids } from './actions';
import { finishRound, type BattleSeeds, type RoundFinished } from './finish';
import { startRound, type RoundStartReport, type RoundState } from './start';

/**
 * Makes one crew's shop decisions through the shop actions. Each call returns the round with
 * the crew's actions applied; a manager that does nothing passes and keeps its lineup.
 */
export interface CrewManager {
  /** Before each bidding round: any shop actions, ending with the crew's sealed bids. */
  bid(state: RoundState, crewId: CrewId): RoundState;
  /** After the bidding: the last shop actions before lock-in. */
  lineup(state: RoundState, crewId: CrewId): RoundState;
}

/** A manager that never acts: it passes every bidding round and keeps its lineup. */
export const IDLE_MANAGER: CrewManager = {
  bid: (state) => state,
  lineup: (state) => state,
};

export interface RoundPlayed extends RoundFinished {
  readonly start: RoundStartReport;
  /** The awards of each bidding round, in order. */
  readonly bidRounds: readonly (readonly Award[])[];
}

/**
 * Plays one league round: upkeep and rookies, the bidding rounds with every crew's manager
 * bidding in league order, the last shop actions, lock-in (forced if a manager left the
 * payroll unaffordable), the battles from `seeds`, the results and the season end.
 */
export function playRound(
  league: League,
  managerFor: (crewId: CrewId) => CrewManager,
  seeds?: BattleSeeds,
): RoundPlayed {
  const started = startRound(league);
  let state = started.state;
  const crewIds = state.shops.map((shop) => shop.crew.id);
  const bidRounds: (readonly Award[])[] = [];
  while (!state.bidding.ended) {
    for (const crewId of crewIds) state = managerFor(crewId).bid(state, crewId);
    const revealed = resolveBids(state);
    if (!revealed.ok) break;
    state = revealed.value.state;
    bidRounds.push(revealed.value.awards);
  }
  for (const crewId of crewIds) {
    state = managerFor(crewId).lineup(state, crewId);
    state = lockOrForce(state, crewId);
  }
  const finished = finishRound(state, seeds);
  if (!finished.ok) {
    // Unreachable: every crew was locked in above.
    throw new RangeError(`playRound: ${finished.error}`);
  }
  return { ...finished.value, start: started.report, bidRounds };
}

function lockOrForce(state: RoundState, crewId: CrewId): RoundState {
  if (state.lockedIn.includes(crewId)) return state;
  const locked = lockInCrew(state, crewId);
  if (locked.ok) return locked.value;
  const forced = forceLockInCrew(state, crewId);
  return forced.ok ? forced.value.state : state;
}
