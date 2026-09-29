/**
 * A local league (M5): one player and bots on this machine. The player drives the round's
 * phase functions one action at a time (D-069), and the AI manager plays every bot around them:
 * it bids when a bidding round opens and sets its lineup when the player locks in.
 */

import {
  AI_MANAGER,
  createLeague,
  finishRound,
  lockInCrew,
  lockInOrForce,
  ok,
  resolveBids,
  roundBid,
  startRound,
  type Award,
  type BattleReport,
  type Bid,
  type BidError,
  type Crew,
  type CrewId,
  type CrewIdentity,
  type CrewNameError,
  type League,
  type Result,
  type RoundFinished,
  type RoundStartReport,
  type RoundState,
  type ShopClosed,
  type Side,
} from '../core';

/** The player's name in a local league; it only shows in the league state. */
export const PLAYER_NAME = 'You';

/** How many bots a new local league can have: leagues of 4, 6, 8 or 12 crews. */
export const BOT_CHOICES = [3, 5, 7, 11] as const;
export type BotCount = (typeof BOT_CHOICES)[number];
export const DEFAULT_BOTS: BotCount = 5;

export function newLocalLeague(
  seed: number,
  identity: CrewIdentity,
  bots: BotCount,
): Result<League, CrewNameError> {
  return createLeague(seed, [{ playerName: PLAYER_NAME, identity }], bots);
}

/** The crew of the league's first player: the one this machine plays. */
export function playerCrewId(league: League): CrewId | null {
  return league.members.find((member) => member.kind === 'player')?.crewId ?? null;
}

export interface OpenedRound {
  readonly state: RoundState;
  readonly report: RoundStartReport;
}

/** Starts the next round: upkeep and rookies, then the bots place their first bids. */
export function openRound(league: League, playerId: CrewId): OpenedRound {
  const started = startRound(league);
  return { state: botsBid(started.state, playerId), report: started.report };
}

export interface BidRoundDone {
  readonly state: RoundState;
  readonly awards: readonly Award[];
}

/**
 * The player's sealed bids for the open bidding round (an empty list passes). The round is
 * revealed at once, and the bots bid again if another bidding round follows.
 */
export function playerBids(
  state: RoundState,
  playerId: CrewId,
  bids: readonly Bid[],
): Result<BidRoundDone, ShopClosed | 'biddingEnded' | BidError> {
  const placed = roundBid(state, playerId, bids);
  if (!placed.ok) return placed;
  const revealed = resolveBids(placed.value);
  if (!revealed.ok) return revealed;
  const next = revealed.value.state;
  return ok({
    state: next.bidding.ended ? next : botsBid(next, playerId),
    awards: revealed.value.awards,
  });
}

/** The player's battle, with the crews as they locked in, for the playback. */
export interface PlayerBattle {
  readonly report: BattleReport;
  readonly crews: Readonly<Record<Side, Crew>>;
  readonly playerSide: Side;
}

export interface PlayedRound {
  readonly finished: RoundFinished;
  /** `null` if the player's crew had no battle this round (a waiting newcomer). */
  readonly battle: PlayerBattle | null;
}

/**
 * Locks the player in, lets every bot set its lineup and lock in, and plays the round's
 * battles. The round is then complete (§3 step 5).
 */
export function lockInAndPlay(
  state: RoundState,
  playerId: CrewId,
): Result<PlayedRound, ShopClosed | 'biddingOpen' | 'cannotAffordPayroll'> {
  const locked = lockInCrew(state, playerId);
  if (!locked.ok) return locked;
  let next = locked.value;
  for (const botId of botIds(next, playerId)) {
    next = lockInOrForce(AI_MANAGER.lineup(next, botId), botId);
  }
  const lockedCrews = new Map(next.shops.map((shop) => [shop.crew.id, shop.crew]));
  const finished = finishRound(next);
  if (!finished.ok) {
    // Unreachable: the player and every bot were locked in above.
    throw new RangeError(`lockInAndPlay: ${finished.error}`);
  }
  return ok(playedRound(finished.value, lockedCrews, playerId));
}

/** The round as the player saw it: the results, and their own battle for the playback. */
export function playedRound(
  finished: RoundFinished,
  lockedCrews: ReadonlyMap<CrewId, Crew>,
  playerId: CrewId,
): PlayedRound {
  const report = finished.battles.find(
    (battle) => battle.crewA === playerId || battle.crewB === playerId,
  );
  const crewA = report === undefined ? undefined : lockedCrews.get(report.crewA);
  const crewB = report === undefined ? undefined : lockedCrews.get(report.crewB);
  const battle: PlayerBattle | null =
    report === undefined || crewA === undefined || crewB === undefined
      ? null
      : {
          report,
          crews: { a: crewA, b: crewB },
          playerSide: report.crewA === playerId ? 'a' : 'b',
        };
  return { finished, battle };
}

/** Every crew in the round except the player's, in league order. */
function botIds(state: RoundState, playerId: CrewId): CrewId[] {
  return state.shops.map((shop) => shop.crew.id).filter((id) => id !== playerId);
}

function botsBid(state: RoundState, playerId: CrewId): RoundState {
  return botIds(state, playerId).reduce(
    (current, botId) =>
      current.lockedIn.includes(botId) ? current : AI_MANAGER.bid(current, botId),
    state,
  );
}
