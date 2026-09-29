import type { BattleEvent, BattleLineup } from '../model';
import { createRng } from '../rng';
import { FRONT_MCS_CLASH } from './frontMcsClash';
import type { BattleStyle } from './style';

/**
 * Plays a battle between two locked-in lineups (CLAUDE.md rule 2). Pure: the same lineups,
 * seed and style always give the same event log, on every peer.
 */
export function simulateBattle(
  crewA: BattleLineup,
  crewB: BattleLineup,
  seed: number,
  style: BattleStyle = FRONT_MCS_CLASH,
): BattleEvent[] {
  return style.simulate(crewA, crewB, createRng(seed));
}

export type BattleEnd = Extract<BattleEvent, { kind: 'end' }>;

/** The `end` event of a battle's log: the winner, why and the MC margin. */
export function battleEnd(events: readonly BattleEvent[]): BattleEnd {
  const last = events.at(-1);
  if (last?.kind !== 'end') {
    throw new RangeError('battleEnd: the event log does not end with an end event');
  }
  return last;
}
