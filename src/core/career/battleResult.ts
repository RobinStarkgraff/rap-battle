/** After a battle (§3 step 5): career records from the event log, and xp with growth. */

import { gainXp, type GrowthEvent } from '../growth';
import {
  activeUnits,
  replaceUnit,
  type BattleEvent,
  type Crew,
  type CrewId,
  type Unit,
  type UnitRecord,
} from '../model';
import type { Rng } from '../rng';

export interface BattleResultOutcome {
  readonly crew: Crew;
  /** Growth steps and learned abilities, for the result screen. */
  readonly growth: readonly GrowthEvent[];
}

/**
 * Updates the crew that played `events` (its active units are the locked-in lineup): each
 * active unit's record counts the battle, its bars, chokes and a win, its stint with the
 * crew counts the battle, and it gains 1 xp with any growth that brings (D-041). Benched
 * units get nothing.
 */
export function applyBattleResult(
  crew: Crew,
  events: readonly BattleEvent[],
  won: boolean,
  rng: Rng,
): BattleResultOutcome {
  let current = crew;
  const growth: GrowthEvent[] = [];
  for (const unit of activeUnits(crew)) {
    const recorded: Unit = { ...unit, record: countBattle(unit, crew.id, events, won) };
    const grown = gainXp(recorded, 1, rng);
    growth.push(...grown.events);
    current = replaceUnit(current, grown.unit);
  }
  return { crew: current, growth };
}

function countBattle(
  unit: Unit,
  crewId: CrewId,
  events: readonly BattleEvent[],
  won: boolean,
): UnitRecord {
  const count = (kind: 'bar' | 'choke'): number =>
    events.filter((event) => event.kind === kind && event.unitId === unit.id).length;
  const { record } = unit;
  const hasStint = record.crews.some((stint) => stint.crewId === crewId);
  const stints = hasStint ? record.crews : [...record.crews, { crewId, battles: 0, seasons: 0 }];
  return {
    battles: record.battles + 1,
    barsLanded: record.barsLanded + count('bar'),
    chokes: record.chokes + count('choke'),
    wins: record.wins + (won ? 1 : 0),
    crews: stints.map((stint) =>
      stint.crewId === crewId ? { ...stint, battles: stint.battles + 1 } : stint,
    ),
  };
}
