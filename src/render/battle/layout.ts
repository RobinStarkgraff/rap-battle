/**
 * Where everything stands on the battle stage (§11 Battle): the side view with crew A on the
 * left facing right and crew B on the right facing left, the front MCs at the mics in the
 * middle and the support units on a stoop behind their crew.
 */

import type { Side } from '../../core';
import { DESIGN_WIDTH } from '../config';

/** The foot of the brick wall. */
export const WALL_FOOT_Y = 440;
/** MCs stand here, on the sidewalk. */
export const STAGE_Y = 575;
/** Support units stand on the stoop. */
export const STOOP_Y = 470;
export const CROWD_Y = 706;
export const HYPE_METER_Y = 632;

const CENTRE = DESIGN_WIDTH / 2;
const FRONT_GAP = 95;
const QUEUE_STEP = 118;
const SUPPORT_XS = [185, 80] as const;

/** Which way a side faces: crew A looks right (+1), crew B left (-1). */
export function facing(side: Side): 1 | -1 {
  return side === 'a' ? 1 : -1;
}

/** The x of the MC at stage `place` (0 is the front) of a side. */
export function mcX(side: Side, place: number): number {
  return CENTRE - facing(side) * (FRONT_GAP + place * QUEUE_STEP);
}

/** The x of support slot `slot` (0 or 1) of a side. */
export function supportX(side: Side, slot: number): number {
  const fromEdge = SUPPORT_XS[slot === 0 ? 0 : 1];
  return side === 'a' ? fromEdge : DESIGN_WIDTH - fromEdge;
}

/** The x of a side's microphone stand. */
export function micX(side: Side): number {
  return CENTRE - facing(side) * 45;
}

/** The left edge of a side's half of the screen. */
export function halfLeft(side: Side): number {
  return side === 'a' ? 0 : CENTRE;
}
