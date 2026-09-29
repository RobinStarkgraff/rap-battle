import { describe, expect, it } from 'vitest';
import {
  AI_MANAGER,
  createLeague,
  IDLE_MANAGER,
  lockInCrew,
  playRound,
  resolveBids,
  roundBid,
  startRound,
  type League,
  type RoundState,
} from '../../core';
import { HINT_MAX_LENGTH, HINTS, onboardingHint } from './hints';
import type { HubState } from './types';

function newLeague(): League {
  const created = createLeague(
    5,
    [
      {
        playerName: 'You',
        identity: {
          name: 'Soggy Biscuits',
          mainColour: 'teal',
          trimColour: 'white',
          logo: 'crown',
        },
      },
    ],
    3,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function hub(league: League, round: RoundState = startRound(league).state): HubState {
  const start = startRound(league).report;
  return { league, round, crewId: 'c1', start, lastAwards: null, sitting: null };
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** Every crew passes until the bidding is over. */
function endBidding(state: RoundState): RoundState {
  let current = state;
  while (!current.bidding.ended) {
    for (const shop of current.shops) {
      const placed = roundBid(current, shop.crew.id, []);
      if (placed.ok) current = placed.value;
    }
    current = unwrap(resolveBids(current)).state;
  }
  return current;
}

describe('onboardingHint', () => {
  const league = newLeague();
  const opening = startRound(league).state;

  it('tells a new crew to bid in the market, and what a bid needs there', () => {
    expect(onboardingHint(hub(league), 'home')?.id).toBe('firstBids');
    expect(onboardingHint(hub(league), 'market')?.id).toBe('marketBids');
    expect(onboardingHint(hub(league), 'market')?.text).toContain('PAYROLL');
  });

  it('keeps every hint short enough for its note', () => {
    for (const text of Object.values(HINTS))
      expect(text.length).toBeLessThanOrEqual(HINT_MAX_LENGTH);
  });

  it('says when the bids are in', () => {
    const bid = unwrap(roundBid(opening, 'c1', []));
    expect(onboardingHint(hub(league, bid), 'market')?.id).toBe('bidsIn');
  });

  it('points to the lineup and the Lock in button after the bidding, then waits', () => {
    const ended = endBidding(opening);
    expect(onboardingHint(hub(league, ended), 'home')?.id).toBe('lineup');
    expect(onboardingHint(hub(league, ended), 'lineup')?.id).toBe('lineupTab');
    expect(onboardingHint(hub(league, ended), 'league')?.id).toBe('lockIn');
    const locked = unwrap(lockInCrew(ended, 'c1'));
    expect(onboardingHint(hub(league, locked), 'home')?.id).toBe('lockedIn');
  });

  it('stops once the crew has played two battles', () => {
    const once = playRound(league, () => IDLE_MANAGER).league;
    expect(onboardingHint(hub(once), 'home')).not.toBeNull();
    const twice = playRound(once, () => AI_MANAGER).league;
    expect(onboardingHint(hub(twice), 'home')).toBeNull();
  });
});
