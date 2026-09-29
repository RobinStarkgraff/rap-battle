import { describe, expect, it } from 'vitest';
import { askPrice, bidsProblem, shopOf, stillBidding, type CrewIdentity } from '../core';
import {
  BOT_CHOICES,
  lockInAndPlay,
  newLocalLeague,
  openRound,
  playerBids,
  playerCrewId,
} from './localLeague';

const IDENTITY: CrewIdentity = {
  name: 'Soggy Biscuits',
  mainColour: 'teal',
  trimColour: 'white',
  logo: 'crown',
};

function league(bots = 5) {
  const created = newLocalLeague(11, IDENTITY, bots as (typeof BOT_CHOICES)[number]);
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('local league', () => {
  it('has one player and the chosen number of bots', () => {
    for (const bots of BOT_CHOICES) {
      const created = league(bots);
      expect(created.members.filter((member) => member.kind === 'player')).toHaveLength(1);
      expect(created.members).toHaveLength(bots + 1);
    }
    expect(playerCrewId(league())).toBe('c1');
  });

  it('refuses a bad crew name', () => {
    expect(newLocalLeague(1, { ...IDENTITY, name: '  ' }, 3)).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('lets the bots bid as soon as a bidding round opens, and waits for the player', () => {
    const { state } = openRound(league(), 'c1');
    expect(stillBidding(state)).toEqual(['c1']);
  });

  it('reveals the round after the player bids, then the bots bid again', () => {
    const { state } = openRound(league(), 'c1');
    const shop = unwrap(shopOf(state, 'c1'));
    const unit = state.market.publicList.find(
      (candidate) =>
        bidsProblem(
          shop.crew,
          [{ unitId: candidate.id, amount: askPrice(candidate) + 3 }],
          state.market,
        ) === null,
    );
    if (unit === undefined) throw new Error('nothing to bid on');
    const done = unwrap(playerBids(state, 'c1', [{ unitId: unit.id, amount: askPrice(unit) + 3 }]));
    expect(done.awards.length).toBeGreaterThan(0);
    expect(done.state.bidding.round).toBe(2);
    expect(stillBidding(done.state)).toEqual(['c1']);
  });

  it('plays a whole round once the player has passed every bidding round and locked in', () => {
    const start = league();
    let { state } = openRound(start, 'c1');
    expect(lockInAndPlay(state, 'c1')).toEqual({ ok: false, error: 'biddingOpen' });
    while (!state.bidding.ended) state = unwrap(playerBids(state, 'c1', [])).state;
    const played = unwrap(lockInAndPlay(state, 'c1'));
    expect(played.finished.league.completedRounds).toBe(1);
    expect(played.battle?.playerSide).toBeDefined();
    const battle = played.battle;
    if (battle === null) throw new Error('no battle');
    expect([battle.report.crewA, battle.report.crewB]).toContain('c1');
    expect(battle.crews[battle.playerSide].id).toBe('c1');
    // The player fielded nobody, so it forfeits.
    expect(battle.report.winner).not.toBe('c1');
    const next = openRound(played.finished.league, 'c1');
    expect(next.report.round).toBe(2);
  });

  it('is deterministic for the same player actions', () => {
    const play = () => {
      let { state } = openRound(league(), 'c1');
      while (!state.bidding.ended) state = unwrap(playerBids(state, 'c1', [])).state;
      return unwrap(lockInAndPlay(state, 'c1')).finished.league;
    };
    expect(play()).toEqual(play());
  });
});
