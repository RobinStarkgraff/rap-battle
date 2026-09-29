import { describe, expect, it } from 'vitest';
import { askPrice, bidsProblem, shopOf, type Bid, type CrewIdentity } from '../core';
import { createGameFlow, type GameFlow } from './flow';
import { LEAGUE_SAVE_KEY, type KeyValueStore } from './leagueStorage';

const IDENTITY: CrewIdentity = {
  name: 'Soggy Biscuits',
  mainColour: 'teal',
  trimColour: 'white',
  logo: 'crown',
};

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

function flowWith(store: KeyValueStore | null = memoryStore()): GameFlow {
  return createGameFlow({ store, newSeed: () => 1234 });
}

function founded(flow: GameFlow): void {
  flow.newLeague();
  const result = flow.found(IDENTITY, 3);
  if (!result.ok) throw new Error(result.error);
}

/** Bids on the cheapest affordable units until the bidding ends, then locks in. */
function playRound(flow: GameFlow): void {
  for (;;) {
    const hub = flow.hub();
    if (hub === null) throw new Error('no hub');
    const { round, crewId } = hub.state();
    if (round.bidding.ended) break;
    const shop = shopOf(round, crewId);
    if (!shop.ok) throw new Error(shop.error);
    const bids: Bid[] = [];
    for (const unit of [...round.market.publicList].sort((x, y) => askPrice(x) - askPrice(y))) {
      const bid = { unitId: unit.id, amount: askPrice(unit) };
      if (bidsProblem(shop.value.crew, [...bids, bid], round.market) === null) bids.push(bid);
    }
    expect(hub.bid(bids)).toBeNull();
  }
  expect(flow.hub()?.lockIn()).toBeNull();
}

describe('game flow', () => {
  it('starts on the title, with nothing to continue', () => {
    const flow = flowWith();
    expect(flow.screen()).toEqual({ kind: 'title', canContinue: false, notice: null });
    expect(flow.hub()).toBeNull();
  });

  it('founds a crew and a league, saves it and opens the first round', () => {
    const store = memoryStore();
    const flow = flowWith(store);
    flow.newLeague();
    expect(flow.screen().kind).toBe('founding');
    expect(flow.found({ ...IDENTITY, name: '' }, 3)).toEqual({ ok: false, error: 'empty' });
    expect(flow.found(IDENTITY, 3)).toEqual({ ok: true, value: null });
    expect(flow.screen().kind).toBe('hub');
    expect(store.items.has(LEAGUE_SAVE_KEY)).toBe(true);
    const state = flow.hub()?.state();
    expect(state?.league.members).toHaveLength(4);
    expect(state?.round.round).toBe(1);
  });

  it('goes back from founding to the title', () => {
    const flow = flowWith();
    flow.newLeague();
    flow.cancelFounding();
    expect(flow.screen().kind).toBe('title');
  });

  it('plays a round: bids, lock-in, battle, result, and the next round', () => {
    const store = memoryStore();
    const flow = flowWith(store);
    founded(flow);
    const changes: string[] = [];
    flow.subscribe(() => changes.push(flow.screen().kind));
    expect(flow.hub()?.lockIn()).toBe('biddingOpen');
    playRound(flow);
    expect(flow.screen().kind).toBe('battle');
    flow.battleWatched();
    const result = flow.screen();
    if (result.kind !== 'result') throw new Error('no result');
    expect(result.saved).toBe(true);
    expect(result.played.finished.league.completedRounds).toBe(1);
    expect(flowWith(store).screen()).toMatchObject({ canContinue: true });
    flow.nextRound();
    expect(flow.hub()?.state().round.round).toBe(2);
    expect(changes).toContain('battle');
    expect(changes.at(-1)).toBe('hub');
  });

  it('refuses shop actions it can’t do, and reports why', () => {
    const flow = flowWith();
    founded(flow);
    const hub = flow.hub();
    expect(hub?.release('nobody')).toBe('unknownUnit');
    expect(hub?.signScouted('nobody')).toBe('unknownUnit');
    expect(hub?.scout()).toBeNull();
    const round = hub?.state().round;
    if (round === undefined) throw new Error('no round');
    const scouted = shopOf(round, 'c1');
    expect(scouted.ok && scouted.value.scouting.units.length).toBe(2);
  });

  it('continues a saved league at its next round', () => {
    const store = memoryStore();
    const first = flowWith(store);
    founded(first);
    playRound(first);
    first.battleWatched();
    const second = flowWith(store);
    second.continueLeague();
    expect(second.hub()?.state().round.round).toBe(2);
  });

  it('shows why a save can’t be continued, and plays on without storage', () => {
    const store = memoryStore();
    store.setItem(LEAGUE_SAVE_KEY, 'not json');
    const flow = flowWith(store);
    expect(flow.screen()).toMatchObject({ canContinue: false });
    flow.continueLeague();
    expect(flow.screen()).toMatchObject({ kind: 'title', notice: 'notJson' });

    const offline = flowWith(null);
    founded(offline);
    playRound(offline);
    offline.battleWatched();
    expect(offline.screen()).toMatchObject({ kind: 'result', saved: false });
  });

  it('quits from the hub to the title', () => {
    const flow = flowWith();
    founded(flow);
    flow.hub()?.quitToTitle();
    expect(flow.screen()).toMatchObject({ kind: 'title', canContinue: true });
  });
});
