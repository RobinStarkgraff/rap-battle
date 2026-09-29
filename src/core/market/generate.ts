/**
 * Unit generation from archetypes (§4 Supply, §6 Starting age, §8 Stage names). The start
 * pool, rookies and scouted units are all made here, with every roll from the seeded RNG.
 */

import {
  MC_ARCHETYPES,
  SHARED_NAME_PREFIXES,
  SHARED_NAME_WORDS,
  SUPPORT_ARCHETYPES,
} from '../data';
import {
  MC_ARCHETYPE_IDS,
  SUPPORT_ARCHETYPE_IDS,
  type ArchetypeDef,
  type McUnit,
  type Role,
  type SupportUnit,
  type Unit,
  type UnitId,
  type UnitRecord,
} from '../model';
import { uniqueName, type NameSet } from '../names';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { retireAge, salaryFor } from './value';

export const EMPTY_UNIT_RECORD: UnitRecord = {
  battles: 0,
  barsLanded: 0,
  chokes: 0,
  wins: 0,
  crews: [],
};

/**
 * A new unit. The rolls come in a fixed order (role, archetype, stats, first ability, age,
 * look, stage name), so the same stream always gives the same unit. The stage name is not
 * in `taken`; the caller adds it before generating the next unit.
 */
export function generateUnit(id: UnitId, rng: Rng, taken: NameSet): Unit {
  const role: Role =
    rng.weightedIndex([TUNABLES.MC_WEIGHT, TUNABLES.SUPPORT_WEIGHT]) === 0 ? 'mc' : 'support';
  return role === 'mc' ? generateMc(id, rng, taken) : generateSupport(id, rng, taken);
}

function generateMc(id: UnitId, rng: Rng, taken: NameSet): McUnit {
  const archetype = MC_ARCHETYPES[rng.pick(MC_ARCHETYPE_IDS)];
  const flow = rng.int(archetype.flow.min, archetype.flow.max);
  const confidence = rng.int(archetype.confidence.min, archetype.confidence.max);
  const unit: McUnit = {
    id,
    role: 'mc',
    archetype: archetype.id,
    flow,
    confidence,
    ...careerStart(archetype, rng, taken),
  };
  return { ...unit, salary: salaryFor(unit) };
}

function generateSupport(id: UnitId, rng: Rng, taken: NameSet): SupportUnit {
  const archetype = SUPPORT_ARCHETYPES[rng.pick(SUPPORT_ARCHETYPE_IDS)];
  const unit: SupportUnit = {
    id,
    role: 'support',
    archetype: archetype.id,
    ...careerStart(archetype, rng, taken),
  };
  return { ...unit, salary: salaryFor(unit) };
}

/** Everything but the stats: the first ability, age, look and stage name. */
function careerStart(archetype: ArchetypeDef, rng: Rng, taken: NameSet) {
  return {
    abilities: [{ id: rng.pick(archetype.abilityPool), power: 1 }] as const,
    xp: 0,
    age: rollAge(archetype.role, rng),
    // The salary is set from the value once the unit is complete.
    salary: 0,
    look: rng.nextUint32(),
    stageName: rollStageName(archetype, rng, taken),
    record: EMPTY_UNIT_RECORD,
  };
}

/**
 * An age from `SIGN_AGE_MIN` to the role's retirement age − 1, younger more likely: the
 * weights fall linearly to 1 at the oldest age (§6).
 */
export function rollAge(role: Role, rng: Rng): number {
  const oldest = retireAge(role) - 1;
  const weights: number[] = [];
  for (let age = TUNABLES.SIGN_AGE_MIN; age <= oldest; age++) {
    weights.push(oldest - age + 1);
  }
  return TUNABLES.SIGN_AGE_MIN + rng.weightedIndex(weights);
}

/** An optional prefix and a word from the shared and the archetype's lists, unique (§8). */
export function rollStageName(archetype: ArchetypeDef, rng: Rng, taken: NameSet): string {
  const prefixes = [...SHARED_NAME_PREFIXES, ...archetype.namePrefixes];
  const words = [...SHARED_NAME_WORDS, ...archetype.nameWords];
  return uniqueName(() => {
    const word = rng.pick(words);
    return rng.chance(TUNABLES.NAME_PREFIX_CHANCE) ? `${rng.pick(prefixes)} ${word}` : word;
  }, taken);
}
