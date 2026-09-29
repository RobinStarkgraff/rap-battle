/**
 * The battle's MVP for the result screen (§11 Result screen): the MC that dealt the most
 * damage in bars and disses, counting only confidence actually lost. Ties go to the winning
 * crew, then to the earlier slot. Cosmetic: no rule reads it.
 */

import type { BattleEvent, BattleLineup, Side, UnitId } from '../model';
import { battleEnd } from './simulate';

export interface DamageDealt {
  readonly unitId: UnitId;
  readonly side: Side;
  readonly damage: number;
}

/**
 * Every MC of both lineups with the damage it dealt, best first: most damage, then the
 * winning crew, then the earlier slot (crew A's before crew B's within a crew rank).
 */
export function damageTable(
  events: readonly BattleEvent[],
  a: BattleLineup,
  b: BattleLineup,
): DamageDealt[] {
  const dealt = new Map<UnitId, number>();
  for (const event of events) {
    if (event.kind === 'bar' || event.kind === 'diss') {
      dealt.set(event.unitId, (dealt.get(event.unitId) ?? 0) + event.damage);
    }
  }
  const winner = battleEnd(events).winner;
  const rows = (['a', 'b'] as const).flatMap((side) =>
    (side === 'a' ? a : b).mcSlots
      .map((unit, slot) => ({ unit, slot }))
      .filter((entry) => entry.unit !== null)
      .map(({ unit, slot }) => ({
        unitId: unit?.id ?? '',
        side,
        slot,
        damage: dealt.get(unit?.id ?? '') ?? 0,
      })),
  );
  const rank = (side: Side): number => (side === winner ? 0 : 1);
  return rows
    .sort((x, y) => y.damage - x.damage || rank(x.side) - rank(y.side) || x.slot - y.slot)
    .map(({ unitId, side, damage }) => ({ unitId, side, damage }));
}

/** The MVP, or `null` if no MC dealt any damage. */
export function battleMvp(
  events: readonly BattleEvent[],
  a: BattleLineup,
  b: BattleLineup,
): DamageDealt | null {
  const best = damageTable(events, a, b)[0];
  return best !== undefined && best.damage > 0 ? best : null;
}
