/**
 * How a unit's career shows on its figure (§11 Careers show on the figure): one piece of
 * bling per growth step, and grey hair and a sash on the farewell tour.
 */

import { onFarewellTour, TUNABLES, type Unit } from '../../core';

/** Bling pieces drawn at most; after that the chain gets thicker (§11). */
export const BLING_MAX = 4;

/** The order bling is earned in: a chain, then rings, a cap badge and a gold tooth. */
export const BLING_PIECES = ['chain', 'rings', 'capBadge', 'goldTooth'] as const;
export type BlingPiece = (typeof BLING_PIECES)[number];

export interface CareerLook {
  readonly bling: readonly BlingPiece[];
  /** 1 for the first chain; each growth step past `BLING_MAX` adds 1, up to `CHAIN_MAX`. */
  readonly chainWeight: number;
  readonly farewell: boolean;
}

/** The heaviest chain drawn. */
export const CHAIN_MAX = 4;

export function growthSteps(xp: number): number {
  return Math.floor(xp / TUNABLES.GROWTH_XP);
}

export function careerLook(unit: Unit): CareerLook {
  const steps = growthSteps(unit.xp);
  return {
    bling: BLING_PIECES.slice(0, Math.min(steps, BLING_MAX)),
    chainWeight: Math.min(CHAIN_MAX, 1 + Math.max(0, steps - BLING_MAX)),
    farewell: onFarewellTour(unit),
  };
}

/** A figure with no career on show: a new unit. */
export const ROOKIE_CAREER: CareerLook = { bling: [], chainWeight: 1, farewell: false };
