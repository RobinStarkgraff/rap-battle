/** What the hub shows, derived from its state (§11 Screens). Pure, so it is unit-tested. */

import {
  allUnits,
  divisionStandings,
  payroll,
  roundBattles,
  roundBattleStyle,
  TUNABLES,
  type BattleStyleId,
  type Crew,
  type CrewId,
  type League,
  type ShopCrew,
  type Standing,
  type Unit,
  type UnitId,
} from '../../core';
import type { HubState } from './types';

/** The player's shop this round. */
export function playerShop(state: HubState): ShopCrew {
  const shop = state.round.shops.find((candidate) => candidate.crew.id === state.crewId);
  if (shop === undefined) throw new RangeError(`hub: crew ${state.crewId} has no shop this round`);
  return shop;
}

/** A crew as it stands now: its live shop crew if it plays this round, else the league's. */
export function liveCrew(state: HubState, crewId: CrewId): Crew | undefined {
  return (
    state.round.shops.find((shop) => shop.crew.id === crewId)?.crew ??
    state.league.crews.find((crew) => crew.id === crewId)
  );
}

/**
 * The crew the player meets in this round's battle, as it stood at the round's start: its
 * shop moves stay sealed until lock-in (D-004).
 */
export function nextOpponent(state: HubState): Crew | null {
  const battle = roundBattles(state.round).find(
    (candidate) => candidate.crewA === state.crewId || candidate.crewB === state.crewId,
  );
  if (battle === undefined) return null;
  const opponentId = battle.crewA === state.crewId ? battle.crewB : battle.crewA;
  return state.league.crews.find((crew) => crew.id === opponentId) ?? null;
}

/** The style of this round's battles, known from the league before the shop (D-088). */
export function roundStyle(state: HubState): BattleStyleId {
  return roundBattleStyle(state.league, state.round.seasonRound);
}

export interface WalletView {
  readonly wallet: number;
  /** What lock-in costs now (§5.1), bench salaries halved. */
  readonly payroll: number;
  /** Gold left after the payroll and every open bid. */
  readonly spare: number;
}

export function walletView(state: HubState): WalletView {
  const shop = playerShop(state);
  const bids = (shop.bids ?? []).reduce((sum, bid) => sum + bid.amount, 0);
  const due = payroll(shop.crew);
  return { wallet: shop.crew.wallet, payroll: due, spare: shop.crew.wallet - due - bids };
}

export interface SeasonView {
  readonly season: number;
  readonly round: number;
  readonly rounds: number;
  readonly division: number;
  readonly divisions: number;
}

export function seasonView(state: HubState): SeasonView {
  const { season } = state.league;
  const division = Math.max(0, divisionOf(state.league, state.crewId));
  return {
    season: season.number,
    round: state.round.seasonRound,
    rounds: season.schedule[division]?.length ?? 0,
    division,
    divisions: season.divisions.length,
  };
}

/** The player's division, from 0 at the top, or -1 while waiting to join. */
export function divisionOf(league: League, crewId: CrewId): number {
  return league.season.divisions.findIndex((division) => division.crewIds.includes(crewId));
}

/** A crew's line in its division table, if it plays in one. */
export function standingOf(league: League, crewId: CrewId): Standing | null {
  const division = divisionOf(league, crewId);
  if (division < 0) return null;
  return divisionStandings(league, division).find((row) => row.crewId === crewId) ?? null;
}

/** 1 for first place. */
export function positionOf(league: League, crewId: CrewId): number {
  const division = divisionOf(league, crewId);
  return division < 0
    ? 0
    : divisionStandings(league, division).findIndex((row) => row.crewId === crewId) + 1;
}

export type BiddingView =
  | { readonly kind: 'open'; readonly round: number; readonly of: number; readonly placed: boolean }
  | { readonly kind: 'ended' }
  | { readonly kind: 'lockedIn' };

export function biddingView(state: HubState): BiddingView {
  if (state.round.lockedIn.includes(state.crewId)) return { kind: 'lockedIn' };
  if (state.round.bidding.ended) return { kind: 'ended' };
  return {
    kind: 'open',
    round: state.round.bidding.round,
    of: TUNABLES.BID_ROUNDS,
    placed: playerShop(state).bids !== null,
  };
}

/** Finds a unit anywhere the hub can see: crews in the round, the market, scouting. */
export function findAnyUnit(state: HubState, unitId: UnitId): Unit | undefined {
  for (const shop of state.round.shops) {
    const found =
      allUnits(shop.crew).find((unit) => unit.id === unitId) ??
      shop.scouting.units.find((unit) => unit.id === unitId);
    if (found !== undefined) return found;
  }
  return state.round.market.publicList.find((unit) => unit.id === unitId);
}

/** The last bidding round in words: the player's signings first, then how many others. */
export function awardLines(state: HubState): string[] {
  const awards = state.lastAwards;
  if (awards === null) return [];
  const mine = awards.filter((award) => award.crewId === state.crewId);
  const lines = mine.map(
    (award) =>
      `You signed ${findAnyUnit(state, award.unitId)?.stageName ?? 'a unit'} for ${String(award.price)} gold.`,
  );
  const others = awards.length - mine.length;
  if (others > 0)
    lines.push(`Other crews signed ${String(others)} unit${others === 1 ? '' : 's'}.`);
  if (awards.length === 0) lines.push('Nobody signed anyone in that bidding round.');
  return lines;
}
