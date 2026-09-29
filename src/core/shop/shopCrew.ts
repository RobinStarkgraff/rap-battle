/**
 * One crew in the shop phase (§4): its crew, its scouted units and its sealed bids. Scouting,
 * signing scouted units, releasing and arranging are allowed at any time, but while bids
 * are open only in ways that keep every open bid valid (D-059).
 */

import type { CrewEvent } from '../abilities';
import {
  askPrice,
  NO_SCOUTING,
  scout,
  type Market,
  type ScoutContext,
  type Scouting,
} from '../market';
import type { Crew, Unit, UnitId } from '../model';
import { uniqueName, type NameSet } from '../names';
import { fail, ok, type Result } from '../result';
import type { Rng } from '../rng';
import { bidsProblem, type Bid, type BidError } from './bidding';
import { moveUnit, type MoveError, type Place } from './lineup';
import { releaseUnit, signUnit, type SignError } from './signing';

export interface ShopCrew {
  readonly crew: Crew;
  readonly scouting: Scouting;
  /** The sealed bids for the open bidding round; `null` until the crew bids or passes. */
  readonly bids: readonly Bid[] | null;
}

/** A crew at the start of its shop phase. */
export function openShop(crew: Crew): ShopCrew {
  return { crew, scouting: NO_SCOUTING, bids: null };
}

/** The action would make an open bid invalid. */
export type BreaksBids = 'breaksBids';

/** Keeps a changed crew only if its open bids are still valid with it. */
function keepingBids(shop: ShopCrew, crew: Crew, market: Market): Result<Crew, BreaksBids> {
  if (shop.bids !== null && bidsProblem(crew, shop.bids, market) !== null) {
    return fail('breaksBids');
  }
  return ok(crew);
}

/** Scouts `SCOUT_COUNT` new private units for `SCOUT_COST`, replacing the old ones. */
export function shopScout(
  shop: ShopCrew,
  market: Market,
  context: ScoutContext,
  taken: NameSet,
): Result<ShopCrew, 'notEnoughGold' | BreaksBids> {
  const scouted = scout(shop.crew, shop.scouting, context, taken);
  if (!scouted.ok) return scouted;
  const crew = keepingBids(shop, scouted.value.crew, market);
  if (!crew.ok) return crew;
  return ok({ ...shop, crew: crew.value, scouting: scouted.value.scouting });
}

export interface SignedScouted {
  readonly shop: ShopCrew;
  readonly events: readonly CrewEvent[];
}

/**
 * Signs one of the crew's scouted units at its ask, with no bidding. If another unit has
 * taken its stage name since it was scouted, it gets the smallest free numeral (§8).
 */
export function signScouted(
  shop: ShopCrew,
  market: Market,
  unitId: UnitId,
  rng: Rng,
  taken: NameSet,
): Result<SignedScouted, 'unknownUnit' | SignError | BreaksBids> {
  const unit = shop.scouting.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return fail('unknownUnit');
  const named: Unit = { ...unit, stageName: uniqueName(() => unit.stageName, taken) };
  const signed = signUnit(shop.crew, named, askPrice(unit), rng);
  if (!signed.ok) return signed;
  const crew = keepingBids(shop, signed.value.crew, market);
  if (!crew.ok) return crew;
  const units = shop.scouting.units.filter((candidate) => candidate.id !== unitId);
  return ok({
    shop: { ...shop, crew: crew.value, scouting: { ...shop.scouting, units } },
    events: signed.value.events,
  });
}

export interface ReleasedFromShop {
  readonly shop: ShopCrew;
  /** The caller adds it to the public list as a free agent. */
  readonly unit: Unit;
}

/** Releases a unit. It lowers the payroll and frees a place, so it never breaks a bid. */
export function shopRelease(
  shop: ShopCrew,
  unitId: UnitId,
): Result<ReleasedFromShop, 'unknownUnit'> {
  const released = releaseUnit(shop.crew, unitId);
  if (!released.ok) return released;
  return ok({ shop: { ...shop, crew: released.value.crew }, unit: released.value.unit });
}

/** Moves a unit to another place, swapping with the unit there (§4 Arrange). */
export function shopMove(
  shop: ShopCrew,
  market: Market,
  unitId: UnitId,
  to: Place,
): Result<ShopCrew, MoveError | BreaksBids> {
  const moved = moveUnit(shop.crew, unitId, to);
  if (!moved.ok) return moved;
  const crew = keepingBids(shop, moved.value, market);
  if (!crew.ok) return crew;
  return ok({ ...shop, crew: crew.value });
}

/** Places the crew's sealed bids for the open bidding round. An empty list is a pass. */
export function submitBids(
  shop: ShopCrew,
  market: Market,
  bids: readonly Bid[],
): Result<ShopCrew, BidError> {
  const problem = bidsProblem(shop.crew, bids, market);
  return problem === null ? ok({ ...shop, bids }) : fail(problem);
}
