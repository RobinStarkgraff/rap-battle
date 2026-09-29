/** Battle styles (D-010): `simulateBattle` runs one through this interface (T-037 adds more). */

import type { BattleEvent, BattleLineup } from '../model';
import type { Rng } from '../rng';

export const BATTLE_STYLE_IDS = ['frontMcsClash'] as const;
export type BattleStyleId = (typeof BATTLE_STYLE_IDS)[number];

export interface BattleStyle {
  readonly id: BattleStyleId;
  readonly name: string;
  /**
   * Plays a whole battle and returns its event log, which ends with exactly one `end`
   * event. It must be pure: the same lineups and stream give the same log.
   */
  readonly simulate: (crewA: BattleLineup, crewB: BattleLineup, rng: Rng) => BattleEvent[];
}
