import { describe, expect, it } from 'vitest';
import { createLeague, type League } from '../core';
import {
  deleteLeague,
  LEAGUE_SAVE_KEY,
  loadLeague,
  saveLeague,
  type KeyValueStore,
} from './leagueStorage';

function memoryStore(): KeyValueStore & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

const blocked: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

function league(): League {
  const created = createLeague(
    9,
    [
      {
        playerName: 'Robin',
        identity: { name: 'Waffles', mainColour: 'pink', trimColour: 'white', logo: 'heart' },
      },
    ],
    1,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

describe('league storage', () => {
  it('saves and loads the league', () => {
    const store = memoryStore();
    expect(loadLeague(store)).toEqual({ ok: false, error: 'noSave' });
    expect(saveLeague(store, league())).toEqual({ ok: true, value: null });
    expect(loadLeague(store)).toEqual({ ok: true, value: league() });
    deleteLeague(store);
    expect(store.items.size).toBe(0);
  });

  it('reports a broken save', () => {
    const store = memoryStore();
    store.setItem(LEAGUE_SAVE_KEY, '{"format":"mic-drop-league"');
    expect(loadLeague(store)).toEqual({ ok: false, error: 'notJson' });
  });

  it('copes with a browser that blocks storage', () => {
    expect(saveLeague(blocked, league())).toEqual({ ok: false, error: 'unavailable' });
    expect(loadLeague(blocked)).toEqual({ ok: false, error: 'unavailable' });
    expect(() => {
      deleteLeague(blocked);
    }).not.toThrow();
  });
});
