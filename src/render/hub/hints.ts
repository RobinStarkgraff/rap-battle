/**
 * Onboarding hints for a player's first rounds (M7, T-056): one short line at a time about
 * what to do now — the first bidding round, what the payroll means, where to lock in. Pure, so
 * every situation is unit-tested; the hub draws the hint and remembers which ones were closed.
 */

import { TUNABLES } from '../../core';
import type { HubState, HubTab } from './types';
import { biddingView, divisionOf, playerShop } from './view';

/** Hints show until the player's crew has played this many battles. */
export const ONBOARDING_BATTLES = 2;

export type HintId =
  'firstBids' | 'marketBids' | 'bidsIn' | 'lineup' | 'lineupTab' | 'lockIn' | 'lockedIn';

export interface Hint {
  readonly id: HintId;
  readonly text: string;
}

export const HINTS: Readonly<Record<HintId, string>> = {
  firstBids:
    'Your crew is empty! Open the MARKET and bid on 3 MCs and 2 support units. All crews bid at once, in secret.',
  marketBids:
    'Pick a unit, bid at least its ASK, then SUBMIT (or PASS). Keep gold for the PAYROLL: the salaries due at lock-in.',
  bidsIn: `Bids are in. They are revealed once every crew has bid; up to ${String(TUNABLES.BID_ROUNDS)} bidding rounds, so try again for units you lost.`,
  lineup:
    'Bidding is over. Check your LINEUP, then press LOCK IN (top right). It pays the PAYROLL from your wallet.',
  lineupTab:
    'Drag units between slots and the bench. The Opener raps first; benched units sit out at half salary.',
  lockIn:
    'LOCK IN is at the top right. The PAYROLL in the header comes out of your wallet when you press it.',
  lockedIn: 'Locked in! The battles start as soon as every crew has locked in.',
};

/** Every hint fits the note beside the tab bar. */
export const HINT_MAX_LENGTH = 130;

/** The battles the player's crew has played this season. */
function battlesPlayed(state: HubState): number {
  const { league, crewId } = state;
  if (league.crews.find((crew) => crew.id === crewId)?.record.seasons.length !== 0) {
    return Number.POSITIVE_INFINITY;
  }
  const division = divisionOf(league, crewId);
  const slot = league.season.divisions[division]?.crewIds.indexOf(crewId) ?? -1;
  return league.season.results.filter(
    (result) => result.division === division && (result.a === slot || result.b === slot),
  ).length;
}

/** The hint for what the player is looking at now, or `null` once they know the ropes. */
export function onboardingHint(state: HubState, tab: HubTab): Hint | null {
  if (battlesPlayed(state) >= ONBOARDING_BATTLES) return null;
  const bidding = biddingView(state);
  const id = hintFor(state, tab, bidding);
  return id === null ? null : { id, text: HINTS[id] };
}

function hintFor(
  state: HubState,
  tab: HubTab,
  bidding: ReturnType<typeof biddingView>,
): HintId | null {
  switch (bidding.kind) {
    case 'open':
      if (bidding.placed) return 'bidsIn';
      if (tab === 'market') return 'marketBids';
      return bidding.round === 1 && isEmpty(state) ? 'firstBids' : 'marketBids';
    case 'ended':
      return tab === 'lineup' ? 'lineupTab' : tab === 'home' ? 'lineup' : 'lockIn';
    case 'lockedIn':
      return 'lockedIn';
  }
}

function isEmpty(state: HubState): boolean {
  const { crew } = playerShop(state);
  return [...crew.mcSlots, ...crew.supportSlots, ...crew.bench].every((unit) => unit === null);
}
