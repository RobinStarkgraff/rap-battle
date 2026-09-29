/**
 * The steps of a round in a sitting (D-083). The host decides their order and sends every step
 * to everyone as an op; each peer applies the same ops to its own copy of the round with the
 * pure round functions of `core/`, so all copies stay the same without sending round state.
 * Sealed bids stay sealed: a `bidPlaced` op carries the bids only to the crew that placed them,
 * and everyone learns the others' bids in the `reveal` op.
 */

import {
  agreedBattleSeed,
  AI_MANAGER,
  fail,
  forceLockInCrew,
  lockInCrew,
  lockInOrForce,
  ok,
  resolveBids,
  roundBid,
  roundMove,
  roundRelease,
  roundScout,
  roundSignScouted,
  roundBattles,
  type Award,
  type BattleSeeds,
  type Bid,
  type CrewId,
  type Place,
  type Result,
  type RoundState,
  type UnitId,
} from '../core';

/** What a player asks the host to do for their crew. */
export type ShopAction =
  | { readonly kind: 'scout' }
  | { readonly kind: 'signScouted'; readonly unitId: UnitId }
  | { readonly kind: 'release'; readonly unitId: UnitId }
  | { readonly kind: 'move'; readonly unitId: UnitId; readonly to: Place }
  | { readonly kind: 'bid'; readonly bids: readonly Bid[] }
  /** `commit` is the SHA-256 of the crew's secret battle-seed nonce (D-084). */
  | { readonly kind: 'lockIn'; readonly commit: string };

/** A shop action as the player asks for it; the client adds the commitment to a lock-in. */
export type PlayerAction = Exclude<ShopAction, { readonly kind: 'lockIn' }>;

export interface CrewBids {
  readonly crewId: CrewId;
  readonly bids: readonly Bid[];
}

export type RoundOp =
  | { readonly kind: 'scout'; readonly crewId: CrewId }
  | { readonly kind: 'signScouted'; readonly crewId: CrewId; readonly unitId: UnitId }
  | { readonly kind: 'release'; readonly crewId: CrewId; readonly unitId: UnitId }
  | {
      readonly kind: 'move';
      readonly crewId: CrewId;
      readonly unitId: UnitId;
      readonly to: Place;
    }
  /** A crew's sealed bids; `bids` is only there for the crew itself (and the host). */
  | { readonly kind: 'bidPlaced'; readonly crewId: CrewId; readonly bids: readonly Bid[] | null }
  /** Every human crew's bids of the bidding round, then the reveal. */
  | { readonly kind: 'reveal'; readonly bids: readonly CrewBids[] }
  /** Every lock-in carries the crew's seed commitment (D-084). */
  | { readonly kind: 'lockIn'; readonly crewId: CrewId; readonly commit: string }
  /**
   * The shop timer ran out or the player left: the current lineup is locked in (§7), and the
   * host commits to a nonce for the crew.
   */
  | { readonly kind: 'forceLockIn'; readonly crewId: CrewId; readonly commit: string }
  /** The AI manager's bids for an AI-run crew, as a bidding round opens. */
  | { readonly kind: 'aiBid'; readonly crewId: CrewId }
  /**
   * The AI manager's last shop actions and lock-in for an AI-run crew, after the bidding; the
   * host stands in for its seed commitment.
   */
  | { readonly kind: 'aiLineup'; readonly crewId: CrewId; readonly commit: string };

/** The op as a crew other than `crewId` may see it: other crews' bids stay sealed. */
export function sealedFor(op: RoundOp, crewId: CrewId | null): RoundOp {
  return op.kind === 'bidPlaced' && op.crewId !== crewId ? { ...op, bids: null } : op;
}

export interface OpApplied {
  readonly state: RoundState;
  /** The awards of a `reveal`. */
  readonly awards: readonly Award[] | null;
}

/** The op a player's action becomes (a bid's op carries the bids; the host strips them). */
export function opFor(crewId: CrewId, action: ShopAction): RoundOp {
  switch (action.kind) {
    case 'scout':
      return { kind: 'scout', crewId };
    case 'signScouted':
      return { kind: 'signScouted', crewId, unitId: action.unitId };
    case 'release':
      return { kind: 'release', crewId, unitId: action.unitId };
    case 'move':
      return { kind: 'move', crewId, unitId: action.unitId, to: action.to };
    case 'bid':
      return { kind: 'bidPlaced', crewId, bids: action.bids };
    case 'lockIn':
      return { kind: 'lockIn', crewId, commit: action.commit };
  }
}

/**
 * Applies an op to a copy of the round. The host only sends ops it applied itself, so a
 * refusal here means the copies differ (a desync).
 */
export function applyOp(state: RoundState, op: RoundOp): Result<OpApplied, string> {
  const done = (next: Result<RoundState, string>): Result<OpApplied, string> =>
    next.ok ? ok({ state: next.value, awards: null }) : next;
  switch (op.kind) {
    case 'scout':
      return done(roundScout(state, op.crewId));
    case 'signScouted': {
      const signed = roundSignScouted(state, op.crewId, op.unitId);
      return done(signed.ok ? ok(signed.value.state) : signed);
    }
    case 'release':
      return done(roundRelease(state, op.crewId, op.unitId));
    case 'move':
      return done(roundMove(state, op.crewId, op.unitId, op.to));
    case 'bidPlaced':
      // Someone else's sealed bids are a pass here until the reveal, which harms nothing:
      // passing never makes a later shop action invalid.
      return done(roundBid(state, op.crewId, op.bids ?? []));
    case 'reveal':
      return reveal(state, op.bids);
    case 'lockIn':
      return done(lockInCrew(state, op.crewId));
    case 'forceLockIn': {
      const forced = forceLockInCrew(state, op.crewId);
      return done(forced.ok ? ok(forced.value.state) : forced);
    }
    case 'aiBid':
      return done(ok(AI_MANAGER.bid(state, op.crewId)));
    case 'aiLineup':
      return done(ok(lockInOrForce(AI_MANAGER.lineup(state, op.crewId), op.crewId)));
  }
}

function reveal(state: RoundState, bids: readonly CrewBids[]): Result<OpApplied, string> {
  let current = state;
  for (const entry of bids) {
    if (current.lockedIn.includes(entry.crewId)) continue;
    const placed = roundBid(current, entry.crewId, entry.bids);
    if (!placed.ok) return fail(placed.error);
    current = placed.value;
  }
  const revealed = resolveBids(current);
  return revealed.ok
    ? ok({ state: revealed.value.state, awards: revealed.value.awards })
    : fail(revealed.error);
}

/** The seed commitment an op makes for its crew, if it locks the crew in. */
export function commitOf(op: RoundOp): { readonly crewId: CrewId; readonly commit: string } | null {
  return op.kind === 'lockIn' || op.kind === 'forceLockIn' || op.kind === 'aiLineup'
    ? { crewId: op.crewId, commit: op.commit }
    : null;
}

/** A crew's revealed nonce. `replaced`: the host stood in because the player couldn't reveal. */
export interface CrewNonce {
  readonly crewId: CrewId;
  readonly nonce: string;
  readonly replaced: boolean;
}

/** Each battle's seed from its two crews' nonces, or `null` if a crew's nonce is missing. */
export function agreedSeeds(state: RoundState, nonces: readonly CrewNonce[]): BattleSeed[] | null {
  const byCrew = new Map(nonces.map((entry) => [entry.crewId, entry.nonce]));
  const seeds: BattleSeed[] = [];
  for (const battle of roundBattles(state)) {
    const nonceA = byCrew.get(battle.crewA);
    const nonceB = byCrew.get(battle.crewB);
    if (nonceA === undefined || nonceB === undefined) return null;
    const { division, crewA } = battle;
    const seed = agreedBattleSeed(state.league.seed, state.round, division, nonceA, nonceB);
    seeds.push({ division, crewA, seed });
  }
  return seeds;
}

/** A battle's seed, for the crews that play it. */
export interface BattleSeed {
  readonly division: number;
  readonly crewA: CrewId;
  readonly seed: number;
}

/** The seed lookup `finishRound` takes, from a list that covers every battle. */
export function seedsFrom(seeds: readonly BattleSeed[]): BattleSeeds {
  const byBattle = new Map(seeds.map((entry) => [battleKey(entry), entry.seed]));
  return (battle) => {
    const seed = byBattle.get(battleKey(battle));
    if (seed === undefined) throw new RangeError(`no seed for the battle of ${battle.crewA}`);
    return seed;
  };
}

function battleKey(battle: { readonly division: number; readonly crewA: CrewId }): string {
  return `${String(battle.division)}/${battle.crewA}`;
}
