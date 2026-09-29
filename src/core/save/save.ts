/**
 * The league save (D-031): the league state as versioned JSON. Every member stores it after
 * each round, and the host sends the same text to everyone, so one format serves both.
 */

import { z } from 'zod';
import type { League } from '../league';
import { fail, ok, type Result } from '../result';
import { leagueSchema } from './schema';

/** Marks the text as a Mic Drop League save. */
export const SAVE_FORMAT = 'mic-drop-league';

/**
 * The version of the save format. Bump it with every change to the league state's shape,
 * and add a migration from the old version to `MIGRATIONS` so older saves still load.
 */
export const SAVE_VERSION = 2;

/** Upgrades the `league` of a save of version `from` to version `from + 1`. */
type Migration = (league: unknown) => unknown;

const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Version 2 added the league's battle style (D-088); older leagues only knew the clash.
  1: (league) => (isRecord(league) ? { ...league, battleStyle: 'frontMcsClash' } : league),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const envelopeSchema = z.object({
  format: z.literal(SAVE_FORMAT),
  version: z.number().int().min(1),
  league: z.unknown(),
});

export type LoadError = 'notJson' | 'notASave' | 'newerVersion' | 'invalid';

export function serializeLeague(league: League): string {
  return JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, league });
}

/**
 * Reads a save: it must be JSON in the save format, of this version or an older one that
 * migrates to it, with a league that matches the schema.
 */
export function parseLeague(text: string): Result<League, LoadError> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('notJson');
  }
  const envelope = envelopeSchema.safeParse(data);
  if (!envelope.success) return fail('notASave');
  const { version: saved } = envelope.data;
  if (saved > SAVE_VERSION) return fail('newerVersion');
  let league = envelope.data.league;
  for (let version = saved; version < SAVE_VERSION; version++) {
    const migrate = MIGRATIONS[version];
    if (migrate === undefined) return fail('invalid');
    league = migrate(league);
  }
  const parsed = leagueSchema.safeParse(league);
  return parsed.success ? ok(parsed.data) : fail('invalid');
}

/**
 * The league as JSON with every object's keys sorted, so two equal leagues give the same text
 * however they were built (a parsed save has its keys in schema order). For comparing copies.
 */
export function canonicalLeague(league: League): string {
  return JSON.stringify(league, (_key, value: unknown) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    const entries = Object.entries(value).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
    return Object.fromEntries(entries);
  });
}
