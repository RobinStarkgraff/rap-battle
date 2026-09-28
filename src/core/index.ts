/**
 * Pure, deterministic game rules. Nothing in `core/` may import Phaser, PeerJS,
 * the DOM, `Math.random`, `Date` or timers (see CLAUDE.md, D-005).
 */

export { clamp } from './math';

/** Game title shown until the final name is decided. */
export const GAME_TITLE = 'rap-battle';
