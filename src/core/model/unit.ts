/** A unit: one individual with a career (§2 Unit state, D-039, D-041, D-049). */

import type { AbilityId, Power } from './ability';
import type { McArchetypeId, SupportArchetypeId } from './archetype';

/** Unique within a league. */
export type UnitId = string;

/** Unique within a league. */
export type CrewId = string;

/** An ability a unit has learned, with its current power. */
export interface LearnedAbility {
  readonly id: AbilityId;
  readonly power: Power;
}

/** A unit's first ability, and its second once it reaches `SECOND_ABILITY_XP`, in learned order. */
export type UnitAbilities = readonly [LearnedAbility] | readonly [LearnedAbility, LearnedAbility];

/** A unit's time with one crew, kept for the hall of fame (D-056). */
export interface CrewStint {
  readonly crewId: CrewId;
  readonly battles: number;
  readonly seasons: number;
}

/** Career stats, updated from the event log after each battle. Cosmetic. */
export interface UnitRecord {
  readonly battles: number;
  readonly barsLanded: number;
  readonly chokes: number;
  readonly wins: number;
  /** Every crew it played for, in the order it joined them. */
  readonly crews: readonly CrewStint[];
}

interface UnitBase {
  readonly id: UnitId;
  readonly abilities: UnitAbilities;
  readonly xp: number;
  /** In years; one season is one year. */
  readonly age: number;
  /** Set at signing, renegotiated at each season end. */
  readonly salary: number;
  /** A 32-bit seed that `render/` draws the unit's whole appearance from. No rule uses it. */
  readonly look: number;
  readonly stageName: string;
  readonly record: UnitRecord;
}

export interface McUnit extends UnitBase {
  readonly role: 'mc';
  readonly archetype: McArchetypeId;
  /** Damage dealt per bar. */
  readonly flow: number;
  /** Damage it can take before it chokes. */
  readonly confidence: number;
}

export interface SupportUnit extends UnitBase {
  readonly role: 'support';
  readonly archetype: SupportArchetypeId;
}

export type Unit = McUnit | SupportUnit;
