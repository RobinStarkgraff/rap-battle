/**
 * The public list (§4 The market, §4 Supply): the league-wide pool of free agents, fed by
 * the start pool, the rookies of each upkeep and released units, and capped at `poolMax`.
 */

import type { Unit, UnitId } from '../model';
import { nameSet, type NameSet } from '../names';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { generateUnit } from './generate';

export interface Market {
  /** The free agents, the one that has been on the list longest first. */
  readonly publicList: readonly Unit[];
  /** The number in the id of the next unit generated for the public list. */
  readonly nextUnitNumber: number;
}

/** The id of the `number`-th unit generated for the public list. */
export function publicUnitId(number: number): UnitId {
  return `u${String(number)}`;
}

/**
 * A new league's market: `POOL_START_PER_MEMBER` units per member (§4 Supply). It may hold
 * more than `POOL_MAX`, which is only checked at upkeep.
 */
export function createMarket(memberCount: number, rng: Rng, taken: NameSet): Market {
  const empty: Market = { publicList: [], nextUnitNumber: 1 };
  return generateInto(empty, memberCount * TUNABLES.POOL_START_PER_MEMBER, rng, taken).market;
}

export interface RookiesEntered {
  readonly market: Market;
  readonly rookies: readonly Unit[];
  /** Units that had been on the list longest and left the game to fit `POOL_MAX`. */
  readonly leftGame: readonly Unit[];
}

/**
 * How many rookies enter at each upkeep: `ROOKIES_PER_MEMBER` per member, rounded up, and at
 * least `ROOKIES_PER_ROUND`, so a big league's supply keeps up with its retirements (T-031).
 */
export function rookieCount(memberCount: number): number {
  return Math.max(TUNABLES.ROOKIES_PER_ROUND, Math.ceil(memberCount * TUNABLES.ROOKIES_PER_MEMBER));
}

/** The most units the public list keeps at upkeep: `POOL_MAX`, or more in a big league. */
export function poolMax(memberCount: number): number {
  return Math.max(TUNABLES.POOL_MAX, memberCount * TUNABLES.POOL_MAX_PER_MEMBER);
}

/** Upkeep step 4: the rookies enter, then the list is capped (§3, §4 Supply). */
export function addRookies(
  market: Market,
  memberCount: number,
  rng: Rng,
  taken: NameSet,
): RookiesEntered {
  const { market: grown, generated } = generateInto(market, rookieCount(memberCount), rng, taken);
  const excess = Math.max(0, grown.publicList.length - poolMax(memberCount));
  return {
    market: { ...grown, publicList: grown.publicList.slice(excess) },
    rookies: generated,
    leftGame: grown.publicList.slice(0, excess),
  };
}

/** Adds a released unit as the newest free agent (§4 Release). */
export function addFreeAgent(market: Market, unit: Unit): Market {
  return { ...market, publicList: [...market.publicList, unit] };
}

/** Takes a unit off the public list; the list is unchanged if it isn't there. */
export function removeFromMarket(market: Market, unitId: UnitId): Market {
  return { ...market, publicList: market.publicList.filter((unit) => unit.id !== unitId) };
}

export function findFreeAgent(market: Market, unitId: UnitId): Unit | undefined {
  return market.publicList.find((unit) => unit.id === unitId);
}

function generateInto(
  market: Market,
  count: number,
  rng: Rng,
  taken: NameSet,
): { market: Market; generated: Unit[] } {
  const names = nameSet([]);
  const takenHere: NameSet = { has: (name) => taken.has(name) || names.has(name) };
  const generated: Unit[] = [];
  for (let i = 0; i < count; i++) {
    const unit = generateUnit(publicUnitId(market.nextUnitNumber + i), rng, takenHere);
    names.add(unit.stageName);
    generated.push(unit);
  }
  return {
    market: {
      publicList: [...market.publicList, ...generated],
      nextUnitNumber: market.nextUnitNumber + count,
    },
    generated,
  };
}
