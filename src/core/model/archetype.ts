/** Archetypes: the fixed data every unit is generated from (§2, §8, D-039, D-043). */

import type { AbilityId, Role } from './ability';

export const MC_ARCHETYPE_IDS = [
  'lyricist',
  'battle-rapper',
  'storyteller',
  'freestyler',
  'hitmaker',
] as const;
export type McArchetypeId = (typeof MC_ARCHETYPE_IDS)[number];

export const SUPPORT_ARCHETYPE_IDS = [
  'dj',
  'hype-man',
  'producer',
  'vocal-coach',
  'manager',
] as const;
export type SupportArchetypeId = (typeof SUPPORT_ARCHETYPE_IDS)[number];

export type ArchetypeId = McArchetypeId | SupportArchetypeId;

/** An inclusive range that stats are rolled uniformly from. */
export interface StatRange {
  readonly min: number;
  readonly max: number;
}

interface ArchetypeBase {
  readonly name: string;
  readonly personality: string;
  readonly role: Role;
  /** The signature abilities plus the role's shared one; a unit rolls its abilities from it. */
  readonly abilityPool: readonly AbilityId[];
  /** Stage name prefixes of this archetype, on top of the shared ones (§8 Stage names). */
  readonly namePrefixes: readonly string[];
  /** Stage name words of this archetype, on top of the shared ones. */
  readonly nameWords: readonly string[];
}

export interface McArchetypeDef extends ArchetypeBase {
  readonly id: McArchetypeId;
  readonly role: 'mc';
  readonly flow: StatRange;
  readonly confidence: StatRange;
}

export interface SupportArchetypeDef extends ArchetypeBase {
  readonly id: SupportArchetypeId;
  readonly role: 'support';
}

export type ArchetypeDef = McArchetypeDef | SupportArchetypeDef;
