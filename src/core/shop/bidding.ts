/**
 * Sealed bidding rounds on the public list (§4 Bidding rounds, D-040). Every crew bids at
 * the same time; the host resolves the round with `resolveBidRound`, so every peer agrees.
 */

import type { CrewEvent } from '../abilities';
import { askPrice, findFreeAgent, removeFromMarket, salaryFor, type Market } from '../market';
import type { Crew, CrewId, UnitId } from '../model';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { freePlaceFor, payroll, putUnit } from './lineup';
import { signUnit } from './signing';

export interface Bid {
  readonly unitId: UnitId;
  readonly amount: number;
}

export type BidError = 'unknownUnit' | 'duplicateBid' | 'belowAsk' | 'noPlace' | 'cannotAfford';

/**
 * Why a crew's bids are not allowed together, or `null` if they are: each is a whole number
 * of at least the unit's ask on a unit of the public list, and the wallet minus all bids
 * covers the payroll with every bid unit placed where it would go (§4, D-059).
 */
export function bidsProblem(crew: Crew, bids: readonly Bid[], market: Market): BidError | null {
  const ids = new Set(bids.map((bid) => bid.unitId));
  if (ids.size !== bids.length) return 'duplicateBid';
  let placed = crew;
  let total = 0;
  // Units are placed in public-list order, the order `resolveBidRound` signs them in.
  for (const unit of market.publicList) {
    const bid = bids.find((candidate) => candidate.unitId === unit.id);
    if (bid === undefined) continue;
    if (!Number.isInteger(bid.amount) || bid.amount < askPrice(unit)) return 'belowAsk';
    const place = freePlaceFor(placed, unit.role);
    if (place === null) return 'noPlace';
    placed = putUnit(placed, { ...unit, salary: salaryFor(unit) }, place);
    total += bid.amount;
  }
  if (bids.some((bid) => findFreeAgent(market, bid.unitId) === undefined)) return 'unknownUnit';
  return crew.wallet - total >= payroll(placed) ? null : 'cannotAfford';
}

export interface CrewBids {
  readonly crew: Crew;
  readonly bids: readonly Bid[];
}

export interface Award {
  readonly unitId: UnitId;
  readonly crewId: CrewId;
  readonly price: number;
  /** What the unit's `sign` abilities did. */
  readonly events: readonly CrewEvent[];
}

export interface BidRoundResult {
  readonly market: Market;
  /** The crews in the order they were given, with their won units. */
  readonly crews: readonly Crew[];
  readonly awards: readonly Award[];
  /** Whether any crew bid at all; a round without bids ends the bidding (§4). */
  readonly anyBids: boolean;
}

/**
 * Reveals one bidding round. Each unit, in public-list order, goes to its highest bid; ties
 * go to the crew ranked lower in `ranking` (top crew first; crews not in it rank lowest),
 * then to a seeded coin flip. The winner pays its bid and the unit joins it at once. A bid
 * its crew can no longer honour is skipped for the next best.
 */
export function resolveBidRound(
  market: Market,
  entries: readonly CrewBids[],
  ranking: readonly CrewId[],
  rng: Rng,
): BidRoundResult {
  const crews = new Map(entries.map((entry) => [entry.crew.id, entry.crew]));
  const rank = (crewId: CrewId): number => {
    const index = ranking.indexOf(crewId);
    return index < 0 ? ranking.length : index;
  };
  let remaining = market;
  const awards: Award[] = [];
  for (const unit of market.publicList) {
    let bidders = entries.flatMap(({ crew, bids }) =>
      bids
        .filter((bid) => bid.unitId === unit.id)
        .map((bid) => ({ crewId: crew.id, amount: bid.amount })),
    );
    while (bidders.length > 0) {
      const best = pickWinner(bidders, rank, rng);
      bidders = bidders.filter((bidder) => bidder !== best);
      const crew = crews.get(best.crewId);
      if (crew === undefined) continue;
      const signed = signUnit(crew, unit, best.amount, rng.fork(unit.id));
      if (!signed.ok) continue;
      crews.set(best.crewId, signed.value.crew);
      remaining = removeFromMarket(remaining, unit.id);
      awards.push({
        unitId: unit.id,
        crewId: best.crewId,
        price: best.amount,
        events: signed.value.events,
      });
      break;
    }
  }
  return {
    market: remaining,
    crews: entries.map((entry) => crews.get(entry.crew.id) ?? entry.crew),
    awards,
    anyBids: entries.some((entry) => entry.bids.length > 0),
  };
}

interface Bidder {
  readonly crewId: CrewId;
  readonly amount: number;
}

function pickWinner(
  bidders: readonly Bidder[],
  rank: (crewId: CrewId) => number,
  rng: Rng,
): Bidder {
  const top = Math.max(...bidders.map((bidder) => bidder.amount));
  const highest = bidders.filter((bidder) => bidder.amount === top);
  const lowestRank = Math.max(...highest.map((bidder) => rank(bidder.crewId)));
  const tied = highest.filter((bidder) => rank(bidder.crewId) === lowestRank);
  const [only, ...others] = tied;
  // The coin flip is only drawn for a real tie, so it doesn't shift the other draws.
  return only !== undefined && others.length === 0 ? only : rng.pick(tied);
}

/** The bidding of one shop phase: the open round (from 1) and whether it has ended. */
export interface Bidding {
  readonly round: number;
  readonly ended: boolean;
}

export const BIDDING_START: Bidding = { round: 1, ended: false };

/** The bidding after a revealed round: it ends after `BID_ROUNDS`, or after a round without bids. */
export function afterBidRound(bidding: Bidding, anyBids: boolean): Bidding {
  if (!anyBids || bidding.round >= TUNABLES.BID_ROUNDS) {
    return { round: bidding.round, ended: true };
  }
  return { round: bidding.round + 1, ended: false };
}
