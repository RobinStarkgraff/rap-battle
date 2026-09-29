/**
 * Keeps the league save in the browser (D-031): each player stores the league state after
 * every completed round and loads it when they come back.
 */

import {
  fail,
  ok,
  parseLeague,
  serializeLeague,
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

export type StorageError = 'noSave' | 'unavailable' | LoadError;

/** The browser's `localStorage`, or `null` where it is blocked (private windows, settings). */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Saves the league, replacing the saved one. Fails if the browser refuses (for example quota). */
export function saveLeague(store: KeyValueStore, league: League): Result<null, 'unavailable'> {
  try {
    store.setItem(LEAGUE_SAVE_KEY, serializeLeague(league));
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

export function deleteLeague(store: KeyValueStore): void {
  try {
    store.removeItem(LEAGUE_SAVE_KEY);
  } catch {
    // Nothing to delete if the storage is blocked.
  }
}
