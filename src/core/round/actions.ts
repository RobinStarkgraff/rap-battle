/**
 * What a crew can do in the shop phase (§3 step 2, §4), and the host's steps: revealing a
 * bidding round and lock-in. Every action returns a `Result`, so the UI can show why an
 * action is refused.
 */

import type { CrewEvent } from '../abilities';
import { leagueRanking } from '../league';
import { addFreeAgent } from '../market';
import type { Crew, CrewId, Unit, UnitId } from '../model';
import { fail, ok, type Result } from '../result';
import { createRng } from '../rng';
import { bidSeed, signSeed } from '../seeds';
import {
  afterBidRound,
  forceLockIn,
  lockIn,
  resolveBidRound,
  shopMove,
  shopRelease,
  shopScout,
  signScouted,
  submitBids,
  type Award,
  type Bid,
  type BidError,
  type BreaksBids,
  type MoveError,
  type Place,
  type ShopCrew,
  type SignError,
} from '../shop';
import { takenNames, type RoundState } from './start';

/** Why a crew can't act at all right now. */
export type ShopClosed = 'unknownCrew' | 'lockedIn';

/** The crew's shop, if it may still act. */
export function shopOf(state: RoundState, crewId: CrewId): Result<ShopCrew, ShopClosed> {
  const shop = state.shops.find((candidate) => candidate.crew.id === crewId);
  if (shop === undefined) return fail('unknownCrew');
  return state.lockedIn.includes(crewId) ? fail('lockedIn') : ok(shop);
}

function withShop(state: RoundState, shop: ShopCrew): RoundState {
  return {
    ...state,
    shops: state.shops.map((candidate) => (candidate.crew.id === shop.crew.id ? shop : candidate)),
  };
}

export function roundScout(
  state: RoundState,
  crewId: CrewId,
): Result<RoundState, ShopClosed | 'notEnoughGold' | BreaksBids> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  const context = { leagueSeed: state.league.seed, round: state.round };
  const scouted = shopScout(shop.value, state.market, context, takenNames(state));
  return scouted.ok ? ok(withShop(state, scouted.value)) : scouted;
}

export interface RoundSigned {
  readonly state: RoundState;
  readonly events: readonly CrewEvent[];
}

export function roundSignScouted(
  state: RoundState,
  crewId: CrewId,
  unitId: UnitId,
): Result<RoundSigned, ShopClosed | 'unknownUnit' | SignError | BreaksBids> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  const rng = createRng(signSeed(state.league.seed, state.round, unitId));
  const signed = signScouted(shop.value, state.market, unitId, rng, takenNames(state, unitId));
  if (!signed.ok) return signed;
  return ok({ state: withShop(state, signed.value.shop), events: signed.value.events });
}

/** Releases a unit; it joins the public list at once as its newest free agent (§4). */
export function roundRelease(
  state: RoundState,
  crewId: CrewId,
  unitId: UnitId,
): Result<RoundState, ShopClosed | 'unknownUnit'> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  const released = shopRelease(shop.value, unitId);
  if (!released.ok) return released;
  const next = withShop(state, released.value.shop);
  return ok({ ...next, market: addFreeAgent(state.market, released.value.unit) });
}

export function roundMove(
  state: RoundState,
  crewId: CrewId,
  unitId: UnitId,
  to: Place,
): Result<RoundState, ShopClosed | MoveError | BreaksBids> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  const moved = shopMove(shop.value, state.market, unitId, to);
  return moved.ok ? ok(withShop(state, moved.value)) : moved;
}

/** Places the crew's sealed bids for the open bidding round; an empty list passes. */
export function roundBid(
  state: RoundState,
  crewId: CrewId,
  bids: readonly Bid[],
): Result<RoundState, ShopClosed | 'biddingEnded' | BidError> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  if (state.bidding.ended) return fail('biddingEnded');
  const placed = submitBids(shop.value, state.market, bids);
  return placed.ok ? ok(withShop(state, placed.value)) : placed;
}

/** The crews that have neither bid nor passed in the open bidding round. */
export function stillBidding(state: RoundState): CrewId[] {
  if (state.bidding.ended) return [];
  return state.shops
    .filter((shop) => shop.bids === null && !state.lockedIn.includes(shop.crew.id))
    .map((shop) => shop.crew.id);
}

export interface BidsRevealed {
  readonly state: RoundState;
  readonly awards: readonly Award[];
}

/**
 * The host reveals the open bidding round (§4): each unit goes to its highest bid, ties to
 * the crew ranked lower at the start of the round. A crew that hasn't bid passes. Bids are
 * cleared for the next round, and the bidding ends after `BID_ROUNDS` or a round without bids.
 */
export function resolveBids(state: RoundState): Result<BidsRevealed, 'biddingEnded'> {
  if (state.bidding.ended) return fail('biddingEnded');
  const entries = state.shops.map((shop) => ({ crew: shop.crew, bids: shop.bids ?? [] }));
  const rng = createRng(bidSeed(state.league.seed, state.round, state.bidding.round));
  const result = resolveBidRound(state.market, entries, leagueRanking(state.league), rng);
  const shops = state.shops.map((shop, index) => ({
    ...shop,
    crew: result.crews[index] ?? shop.crew,
    bids: null,
  }));
  return ok({
    state: {
      ...state,
      market: result.market,
      shops,
      bidding: afterBidRound(state.bidding, result.anyBids),
    },
    awards: result.awards,
  });
}

/**
 * Locks the crew in once the bidding has ended (§3 step 3): the payroll is paid, and its
 * unsigned scouted units vanish.
 */
export function lockInCrew(
  state: RoundState,
  crewId: CrewId,
): Result<RoundState, ShopClosed | 'biddingOpen' | 'cannotAffordPayroll'> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  if (!state.bidding.ended) return fail('biddingOpen');
  const locked = lockIn(shop.value.crew);
  if (!locked.ok) return locked;
  return ok(markLockedIn(state, shop.value, locked.value.crew));
}

export interface ForcedLock {
  readonly state: RoundState;
  readonly released: readonly Unit[];
}

/**
 * Locks the crew's current lineup in whatever happens (the shop timer, a dropped player):
 * units are released until the payroll fits (§7), and they join the public list. It works
 * during the bidding too: a locked-in crew passes in the remaining bidding rounds.
 */
export function forceLockInCrew(state: RoundState, crewId: CrewId): Result<ForcedLock, ShopClosed> {
  const shop = shopOf(state, crewId);
  if (!shop.ok) return shop;
  const forced = forceLockIn(shop.value.crew);
  const next = markLockedIn(state, shop.value, forced.crew);
  return ok({
    state: { ...next, market: forced.released.reduce(addFreeAgent, next.market) },
    released: forced.released,
  });
}

function markLockedIn(state: RoundState, shop: ShopCrew, crew: Crew): RoundState {
  const next = withShop(state, { crew, scouting: { ...shop.scouting, units: [] }, bids: null });
  return { ...next, lockedIn: [...state.lockedIn, crew.id] };
}

/** The crews that haven't locked in yet: the lobby shows them as still shopping (§7). */
export function stillShopping(state: RoundState): CrewId[] {
  return state.shops.map((shop) => shop.crew.id).filter((id) => !state.lockedIn.includes(id));
}

/**
 * Locks the crew in if it can pay, and forces the lock-in otherwise (§7): for AI-run crews
 * after their last shop actions. A crew that is already locked in stays as it is.
 */
export function lockInOrForce(state: RoundState, crewId: CrewId): RoundState {
  if (state.lockedIn.includes(crewId)) return state;
  const locked = lockInCrew(state, crewId);
  if (locked.ok) return locked.value;
  const forced = forceLockInCrew(state, crewId);
  return forced.ok ? forced.value.state : state;
}
