/**
 * Keeps the league save in the browser (D-031): each player stores the league state after
 * every completed round and loads it when they come back.
 */

import {
  fail,
  ok,
  parseLeague,
  serializeLeague,
  type CrewId,
  type League,
  type LoadError,
  type Result,
} from '../core';

/** The part of the Web Storage API the save needs; `localStorage` has it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEAGUE_SAVE_KEY = 'mic-drop-league/league';
/** Which crew of the saved league this browser's player plays (a league can have many). */
export const CREW_KEY = 'mic-drop-league/crew';

export type StorageError = 'noSave' | 'unavailable' | LoadError;

/** The browser's `localStorage`, or `null` where it is blocked (private windows, settings). */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Saves the league, replacing the saved one, and the player's crew in it if given. Fails if
 * the browser refuses (for example quota).
 */
export function saveLeague(
  store: KeyValueStore,
  league: League,
  crewId?: CrewId,
): Result<null, 'unavailable'> {
  try {
    store.setItem(LEAGUE_SAVE_KEY, serializeLeague(league));
    if (crewId === undefined) store.removeItem(CREW_KEY);
    else store.setItem(CREW_KEY, crewId);
    return ok(null);
  } catch {
    return fail('unavailable');
  }
}

/** Loads the saved league, checked against the save schema. */
export function loadLeague(store: KeyValueStore): Result<League, StorageError> {
  let text: string | null;
  try {
    text = store.getItem(LEAGUE_SAVE_KEY);
  } catch {
    return fail('unavailable');
  }
  return text === null ? fail('noSave') : parseLeague(text);
}

/**
 * The player's crew in the saved league: the one saved with it if it is still a player crew
 * there, else the league's first player (a league founded on this machine).
 */
export function savedCrewId(store: KeyValueStore, league: League): CrewId | null {
  let saved: string | null = null;
  try {
    saved = store.getItem(CREW_KEY);
  } catch {
    // Blocked storage has no crew saved.
  }
  const member = league.members.find((candidate) => candidate.crewId === saved);
  if (member?.kind === 'player') return member.crewId;
  return league.members.find((candidate) => candidate.kind === 'player')?.crewId ?? null;
}

export function deleteLeague(store: KeyValueStore): void {
  try {
    store.removeItem(LEAGUE_SAVE_KEY);
    store.removeItem(CREW_KEY);
  } catch {
    // Nothing to delete if the storage is blocked.
  }
}
