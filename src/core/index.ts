/**
 * Pure, deterministic game rules. Nothing in `core/` may import Phaser, PeerJS,
 * the DOM, `Math.random`, `Date` or timers (see CLAUDE.md, D-005).
 */

export { clamp } from './math';
export { createRng, deriveSeed } from './rng';
export type { Rng } from './rng';
export * from './model';
export * from './data';
export { TUNABLES } from './tunables';
export * from './abilities';
export { gainXp } from './growth';
export type { GrowthEvent, Grown } from './growth';
export type { TunableName } from './tunables';

/** Game title shown until the final name is decided. */
export const GAME_TITLE = 'rap-battle';
export * from './battle';
