/** A crew: identity, lineup, wallet, hall of fame and record (§2, D-052, D-056, D-060). */

import type { CrewId, McUnit, SupportUnit, Unit } from './unit';

/** The main colours of `CREW_COLOURS` (§11). A crew's main colour is one of these. */
export const MAIN_COLOUR_IDS = [
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'sky-blue',
  'royal-blue',
  'purple',
  'pink',
] as const;
export type MainColourId = (typeof MAIN_COLOUR_IDS)[number];

/** Colours that may only be used as trim (§11). */
export const TRIM_ONLY_COLOUR_IDS = ['black', 'white'] as const;
export type TrimColourId = MainColourId | (typeof TRIM_ONLY_COLOUR_IDS)[number];

/** The shape logos (§11). */
export const LOGO_IDS = [
  'star',
  'crown',
  'lightning-bolt',
  'flame',
  'diamond',
  'heart',
  'vinyl',
  'spray-can',
] as const;
export type LogoId = (typeof LOGO_IDS)[number];

export interface CrewIdentity {
  /** At most `CREW_NAME_MAX` characters, unique in the league (case-insensitive). */
  readonly name: string;
  readonly mainColour: MainColourId;
  readonly trimColour: TrimColourId;
  readonly logo: LogoId;
}

/** The three MC slots, Opener first. `null` is an empty slot. */
export type McSlots = readonly [McUnit | null, McUnit | null, McUnit | null];

/** The two support slots. `null` is an empty slot. */
export type SupportSlots = readonly [SupportUnit | null, SupportUnit | null];

/** A retired unit in a crew's hall of fame: its final state, including its record. */
export interface HallOfFameEntry {
  readonly unit: Unit;
  /** The season at whose end it retired. */
  readonly retiredAfterSeason: number;
}

export interface Title {
  readonly kind: 'champion' | 'division';
  readonly season: number;
  /** 0 is the top division. */
  readonly division: number;
}

export interface SeasonResult {
  readonly season: number;
  readonly division: number;
  /** 1 is first place. */
  readonly position: number;
  readonly wins: number;
  readonly losses: number;
  readonly points: number;
}

/** A crew's titles and per-season results. Cosmetic. */
export interface CrewRecord {
  readonly titles: readonly Title[];
  readonly seasons: readonly SeasonResult[];
}

export interface Crew {
  readonly id: CrewId;
  readonly identity: CrewIdentity;
  readonly mcSlots: McSlots;
  readonly supportSlots: SupportSlots;
  /** At most `BENCH_SIZE` units, in bench place order. */
  readonly bench: readonly Unit[];
  readonly wallet: number;
  readonly hallOfFame: readonly HallOfFameEntry[];
  readonly record: CrewRecord;
}

/** The part of a crew a battle needs: its locked-in active slots. */
export type BattleLineup = Pick<Crew, 'id' | 'mcSlots' | 'supportSlots'>;
