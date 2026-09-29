/** The shop phase (§3, §4): places and payroll, signing, bidding rounds and lock-in. */

export { afterBidRound, BIDDING_START, bidsProblem, resolveBidRound } from './bidding';
export type { Award, Bid, BidError, Bidding, BidRoundResult, CrewBids } from './bidding';
export { freePlaceFor, moveUnit, payroll, placeOf, putUnit, takeUnit } from './lineup';
export type { MoveError, Place } from './lineup';
export { battleLineup, forceLockIn, lockIn } from './lockIn';
export type { ForcedLockIn, LockedIn } from './lockIn';
export { openShop, shopMove, shopRelease, shopScout, signScouted, submitBids } from './shopCrew';
export type { BreaksBids, ReleasedFromShop, ShopCrew, SignedScouted } from './shopCrew';
export { releaseUnit, signUnit } from './signing';
export type { Released, SignError } from './signing';
