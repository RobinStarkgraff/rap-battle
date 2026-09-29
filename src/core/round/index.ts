/** A league round (§3): its start, the shop actions, lock-in and the battles. */

export {
  forceLockInCrew,
  lockInCrew,
  lockInOrForce,
  resolveBids,
  roundBid,
  roundMove,
  roundRelease,
  roundScout,
  roundSignScouted,
  shopOf,
  stillBidding,
  stillShopping,
} from './actions';
export type { BidsRevealed, ForcedLock, RoundSigned, ShopClosed } from './actions';
export { finishRound, localBattleSeeds, roundBattles } from './finish';
export type {
  BattleReport,
  BattleSeeds,
  CrewGrowth,
  RoundFinished,
  ScheduledBattle,
} from './finish';
export { IDLE_MANAGER, playRound } from './play';
export type { CrewManager, RoundPlayed } from './play';
export { startRound, takenNames } from './start';
export type { CrewUpkeep, RoundStarted, RoundStartReport, RoundState } from './start';
