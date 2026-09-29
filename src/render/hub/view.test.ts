import { describe, expect, it } from 'vitest';
import {
  askPrice,
  createLeague,
  resolveBids,
  roundBid,
  startRound,
  TUNABLES,
  type CrewIdentity,
  type RoundState,
} from '../../core';
import type { HubState } from './types';
import {
  awardLines,
  biddingView,
  divisionOf,
  liveCrew,
  nextOpponent,
  positionOf,
  roundStyle,
  seasonView,
  walletView,
} from './view';

const IDENTITY: CrewIdentity = {
  name: 'Soggy Biscuits',
  mainColour: 'teal',
  trimColour: 'white',
  logo: 'crown',
};

function hubState(bots = 3): HubState {
  const created = createLeague(5, [{ playerName: 'You', identity: IDENTITY }], bots);
  if (!created.ok) throw new Error(created.error);
  const started = startRound(created.value);
  return {
    league: created.value,
    round: started.state,
    crewId: 'c1',
    start: started.report,
    lastAwards: null,
    sitting: null,
  };
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('hub view', () => {
  it('knows the opponent, the season and the wallet', () => {
    const state = hubState();
    const opponent = nextOpponent(state);
    expect(opponent).not.toBeNull();
    expect(opponent?.id).not.toBe('c1');
    expect(seasonView(state)).toEqual({
      season: 1,
      round: 1,
      rounds: 6,
      division: 0,
      divisions: 1,
    });
    expect(walletView(state)).toEqual({
      wallet: TUNABLES.STARTING_GOLD,
      payroll: 0,
      spare: TUNABLES.STARTING_GOLD,
    });
    expect(divisionOf(state.league, 'c1')).toBe(0);
    expect(positionOf(state.league, 'c1')).toBeGreaterThan(0);
    expect(liveCrew(state, 'c1')?.identity.name).toBe('Soggy Biscuits');
  });

  it('counts open bids against the spare gold and shows the bidding round', () => {
    const state = hubState();
    expect(biddingView(state)).toEqual({
      kind: 'open',
      round: 1,
      of: TUNABLES.BID_ROUNDS,
      placed: false,
    });
    const unit = state.round.market.publicList[0];
    if (unit === undefined) throw new Error('empty market');
    const round: RoundState = unwrap(
      roundBid(state.round, 'c1', [{ unitId: unit.id, amount: askPrice(unit) }]),
    );
    const bid = { ...state, round };
    expect(biddingView(bid)).toMatchObject({ placed: true });
    expect(walletView(bid).spare).toBe(TUNABLES.STARTING_GOLD - askPrice(unit));
  });

  it('describes the awards of the last bidding round', () => {
    const state = hubState();
    expect(awardLines(state)).toEqual([]);
    const unit = state.round.market.publicList[0];
    if (unit === undefined) throw new Error('empty market');
    const revealed = unwrap(
      resolveBids(
        unwrap(roundBid(state.round, 'c1', [{ unitId: unit.id, amount: askPrice(unit) }])),
      ),
    );
    const after = { ...state, round: revealed.state, lastAwards: revealed.awards };
    expect(awardLines(after)).toEqual([
      `You signed ${unit.stageName} for ${String(askPrice(unit))} gold.`,
    ]);
    expect(awardLines({ ...after, lastAwards: [] })).toEqual([
      'Nobody signed anyone in that bidding round.',
    ]);
    expect(biddingView(after)).toMatchObject({ kind: 'open', round: 2 });
  });
});

describe('roundStyle', () => {
  it('reads the style of the round from the league before any battle', () => {
    const state = hubState();
    expect(roundStyle(state)).toBe('frontMcsClash');
    expect(roundStyle({ ...state, league: { ...state.league, battleStyle: 'crowdVote' } })).toBe(
      'crowdVote',
    );
    const third = { ...state, round: { ...state.round, seasonRound: 3 } };
    expect(roundStyle({ ...third, league: { ...third.league, battleStyle: 'mixed' } })).toBe(
      'crowdVote',
    );
  });
});
