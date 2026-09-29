/**
 * Builders for tests: units and crews with sensible defaults, so each test only states
 * what it is about. Only test files import this module.
 */

import type {
  AbilityId,
  Crew,
  LearnedAbility,
  McArchetypeId,
  McUnit,
  Power,
  SupportArchetypeId,
  SupportUnit,
  Unit,
  UnitAbilities,
  UnitRecord,
} from '../model';

const EMPTY_RECORD: UnitRecord = { battles: 0, barsLanded: 0, chokes: 0, wins: 0, crews: [] };

type AbilitySpec = AbilityId | readonly [AbilityId, Power];

function learned(spec: AbilitySpec): LearnedAbility {
  return typeof spec === 'string' ? { id: spec, power: 1 } : { id: spec[0], power: spec[1] };
}

function toAbilities(
  specs: readonly [AbilitySpec] | readonly [AbilitySpec, AbilitySpec],
): UnitAbilities {
  const [first, second] = specs;
  return second === undefined ? [learned(first)] : [learned(first), learned(second)];
}

export interface McSpec {
  readonly id: string;
  readonly flow?: number;
  readonly confidence?: number;
  readonly archetype?: McArchetypeId;
  readonly abilities?: readonly [AbilitySpec] | readonly [AbilitySpec, AbilitySpec];
  readonly xp?: number;
  readonly age?: number;
}

/** An MC with 2 flow, 3 confidence and Clapback unless the spec says otherwise. */
export function mc(spec: McSpec): McUnit {
  return {
    id: spec.id,
    role: 'mc',
    archetype: spec.archetype ?? 'battle-rapper',
    flow: spec.flow ?? 2,
    confidence: spec.confidence ?? 3,
    abilities: toAbilities(spec.abilities ?? ['clapback']),
    xp: spec.xp ?? 0,
    age: spec.age ?? 20,
    salary: 2,
    look: 0,
    stageName: `MC ${spec.id}`,
    record: EMPTY_RECORD,
  };
}

/** An MC whose only ability can't trigger in battle, for tests about stats alone. */
export function plainMc(id: string, flow: number, confidence: number): McUnit {
  return mc({ id, flow, confidence, archetype: 'hitmaker', abilities: ['feature-verse'] });
}

export interface SupportSpec {
  readonly id: string;
  readonly archetype?: SupportArchetypeId;
  readonly abilities: readonly [AbilitySpec] | readonly [AbilitySpec, AbilitySpec];
  readonly xp?: number;
}

export function support(spec: SupportSpec): SupportUnit {
  return {
    id: spec.id,
    role: 'support',
    archetype: spec.archetype ?? 'dj',
    abilities: toAbilities(spec.abilities),
    xp: spec.xp ?? 0,
    age: 20,
    salary: 2,
    look: 0,
    stageName: `DJ ${spec.id}`,
    record: EMPTY_RECORD,
  };
}

export interface CrewSpec {
  readonly id?: string;
  readonly mcs?: readonly (McUnit | null)[];
  readonly supports?: readonly (SupportUnit | null)[];
  readonly bench?: readonly Unit[];
  readonly wallet?: number;
}

/** A crew with the given units; missing slots are empty. */
export function crew(spec: CrewSpec): Crew {
  const mcs = spec.mcs ?? [];
  const supports = spec.supports ?? [];
  return {
    id: spec.id ?? 'crew',
    identity: { name: 'Test Crew', mainColour: 'red', trimColour: 'black', logo: 'star' },
    mcSlots: [mcs[0] ?? null, mcs[1] ?? null, mcs[2] ?? null],
    supportSlots: [supports[0] ?? null, supports[1] ?? null],
    bench: spec.bench ?? [],
    wallet: spec.wallet ?? 0,
    hallOfFame: [],
    record: { titles: [], seasons: [] },
  };
}
