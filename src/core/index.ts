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
export * from './market';
export { nameSet, uniqueName } from './names';
export type { NameSet } from './names';
export { fail, ok } from './result';
export type { Result } from './result';
export * from './seeds';
export * from './shop';
export * from './career';
export * from './league';
export * from './round';
export * from './save';
export * from './ai';
