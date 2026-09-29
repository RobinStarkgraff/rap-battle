import { describe, expect, it } from 'vitest';
import { askPrice, bidsProblem, shopOf, type Bid, type CrewIdentity } from '../core';
import { createMemoryNetwork, type Network } from '../net';
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

function flowWith(
  store: KeyValueStore | null = memoryStore(),
  network: Network = createMemoryNetwork(),
): GameFlow {
  return createGameFlow({ store, newSeed: () => 1234, network, random: () => 0.3 });
}

/** Lets the memory network deliver everything that is queued. */
async function settle(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
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

describe('sittings', () => {
  const GUEST: CrewIdentity = {
    name: 'Rowdy Llamas',
    mainColour: 'pink',
    trimColour: 'black',
    logo: 'flame',
  };

  /** A flow with a saved local league (one player, three bots) that hosts a sitting. */
  async function hostWithLeague(network: Network): Promise<{ host: GameFlow; code: string }> {
    const store = memoryStore();
    founded(flowWith(store, network));
    const host = flowWith(store, network);
    host.hostSitting();
    await settle();
    const code = host.lobby()?.state().code;
    if (code === null || code === undefined) throw new Error('no room code');
    return { host, code };
  }

  async function joined(
    network: Network,
    code: string,
    store = memoryStore(),
  ): Promise<{ guest: GameFlow; store: ReturnType<typeof memoryStore> }> {
    const guest = flowWith(store, network);
    guest.joinSitting();
    expect(guest.join(code.toLowerCase())).toEqual({ ok: true, value: null });
    await settle();
    return { guest, store };
  }

  /** Every flow in the hub bids cheaply until the bidding ends, then all lock in. */
  async function playSittingRound(flows: readonly GameFlow[]): Promise<void> {
    for (;;) {
      const open = flows.filter((flow) => flow.hub()?.state().round.bidding.ended === false);
      if (open.length === 0) break;
      for (const flow of open) {
        const hub = flow.hub();
        if (hub === null) throw new Error('no hub');
        const { round, crewId } = hub.state();
        const shop = shopOf(round, crewId);
        if (!shop.ok) throw new Error(shop.error);
        const bids: Bid[] = [];
        for (const unit of [...round.market.publicList].sort((x, y) => askPrice(x) - askPrice(y))) {
          const bid = { unitId: unit.id, amount: askPrice(unit) };
          if (bidsProblem(shop.value.crew, [...bids, bid], round.market) === null) bids.push(bid);
        }
        expect(hub.bid(bids)).toBeNull();
      }
      await settle();
    }
    for (const flow of flows) expect(flow.hub()?.lockIn()).toBeNull();
    await settle();
  }

  it('offers hosting only with a saved league', () => {
    const flow = flowWith();
    flow.hostSitting();
    expect(flow.screen().kind).toBe('title');
  });

  it('opens a room with a code; a newcomer joins by it and founds a crew', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(host.lobby()?.state()).toMatchObject({ role: 'host', phase: 'open', canStart: true });
    expect(host.lobby()?.state().seats).toEqual([
      { crew: IDENTITY, isHost: true, isYou: true, status: null },
    ]);

    const guest = flowWith(memoryStore(), network);
    guest.joinSitting();
    expect(guest.screen()).toEqual({ kind: 'join', codeLength: 4 });
    expect(guest.join('xx')).toEqual({ ok: false, error: 'badCode' });
    guest.join(code);
    await settle();
    // No saved league: the guest founds a crew to join the host's league.
    expect(guest.screen()).toEqual({ kind: 'founding', joining: { replaces: null }, notice: null });
    guest.found(IDENTITY, 3);
    await settle();
    expect(guest.screen()).toMatchObject({ kind: 'founding', notice: 'taken' });
    guest.found(GUEST, 3);
    await settle();
    expect(guest.screen().kind).toBe('lobby');
    expect(guest.lobby()?.state().seats).toEqual([
      { crew: IDENTITY, isHost: true, isYou: false, status: null },
      { crew: GUEST, isHost: false, isYou: true, status: null },
    ]);
    expect(
      host
        .lobby()
        ?.state()
        .seats.map((seat) => seat.crew?.name),
    ).toEqual(['Soggy Biscuits', 'Rowdy Llamas']);
  });

  it('plays rounds together: hub, battle, result, saves, and the lobby between rounds', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    const { guest, store } = await joined(network, code);
    guest.found(GUEST, 3);
    await settle();
    host.lobby()?.start();
    await settle();
    expect(host.screen().kind).toBe('hub');
    expect(guest.screen().kind).toBe('hub');
    expect(guest.hub()?.state().sitting?.waitingFor).toEqual(['Soggy Biscuits']);

    const hostHub = host.hub();
    if (hostHub === null) throw new Error('no hub');
    expect(hostHub.bid([])).toBeNull();
    await settle();
    // The host has passed; the round waits for the guest.
    expect(host.hub()?.state().sitting?.waitingFor).toEqual(['Rowdy Llamas']);

    await playSittingRound([host, guest]);
    expect(host.screen().kind).toBe('battle');
    expect(guest.screen().kind).toBe('battle');
    guest.battleWatched();
    const result = guest.screen();
    if (result.kind !== 'result') throw new Error('no result');
    expect(result.saved).toBe(true);
    expect(result.played.finished.league.completedRounds).toBe(1);
    expect(flowWith(store, network).screen()).toMatchObject({ canContinue: true });

    guest.nextRound();
    expect(guest.screen().kind).toBe('lobby');
    host.battleWatched();
    host.nextRound();
    expect(host.lobby()?.state().canStart).toBe(true);
    host.lobby()?.start();
    await settle();
    expect(guest.hub()?.state().round.round).toBe(2);
  });

  it('warns a guest whose saved league joining would replace', async () => {
    const network = createMemoryNetwork();
    const { code } = await hostWithLeague(network);
    const other = memoryStore();
    const flow = createGameFlow({
      store: other,
      newSeed: () => 999,
      network,
      random: () => 0.9,
    });
    flow.newLeague();
    flow.found(GUEST, 3);
    const { guest } = await joined(network, code, other);
    expect(guest.screen()).toEqual({
      kind: 'founding',
      joining: { replaces: 'Rowdy Llamas' },
      notice: null,
    });
    guest.cancelFounding();
    expect(guest.screen().kind).toBe('title');
  });

  it('shows a returning player what happened while they were away', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    const { guest, store } = await joined(network, code);
    guest.found(GUEST, 3);
    await settle();
    guest.lobby()?.leave();
    await settle();
    // Two rounds without the guest: the AI manager runs its crew.
    for (let round = 0; round < 2; round++) {
      host.lobby()?.start();
      await settle();
      await playSittingRound([host]);
      host.battleWatched();
      host.nextRound();
    }
    const back = await joined(network, code, store);
    const away = back.guest.lobby()?.state().away;
    expect(away?.rounds).toBe(2);
    expect((away?.wins ?? 0) + (away?.losses ?? 0)).toBe(2);
  });

  it('tells a guest about a wrong code, and when the host leaves', async () => {
    const network = createMemoryNetwork();
    const lost = flowWith(memoryStore(), network);
    lost.joinSitting();
    lost.join('WXYZ');
    await settle();
    expect(lost.lobby()?.state()).toMatchObject({ phase: 'closed', notice: 'noSuchRoom' });

    const { host, code } = await hostWithLeague(network);
    const { guest } = await joined(network, code);
    host.lobby()?.leave();
    expect(host.screen().kind).toBe('title');
    await settle();
    expect(guest.lobby()?.state()).toMatchObject({ phase: 'closed', notice: 'hostLeft' });
    guest.lobby()?.leave();
    expect(guest.screen().kind).toBe('title');
  });

  it('shows who is still shopping, passes nudges, and lets the host turn on the timer', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    const { guest } = await joined(network, code);
    guest.found(GUEST, 3);
    await settle();
    expect(host.lobby()?.state().timerSeconds).toBeNull();
    host.lobby()?.toggleTimer();
    await settle();
    expect(host.lobby()?.state().timerSeconds).toBe(120);
    expect(guest.lobby()?.state().timerSeconds).toBe(120);
    host.lobby()?.start();
    await settle();
    expect(guest.hub()?.state().sitting?.timerEndsAt).toBeGreaterThan(0);
    host.hub()?.bid([]);
    await settle();
    const players = guest.hub()?.state().sitting?.players;
    expect(players?.map((player) => [player.name, player.status, player.isYou])).toEqual([
      ['Soggy Biscuits', 'bidIn', false],
      ['Rowdy Llamas', 'bidding', true],
    ]);
    const crewId = players?.find((player) => player.isYou)?.crewId ?? '';
    host.hub()?.nudge(crewId);
    await settle();
    expect(guest.hub()?.state().sitting?.nudge).toEqual({ from: 'Soggy Biscuits', count: 1 });
  });

  it('voids the round when the host leaves in the middle of it', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    const { guest, store } = await joined(network, code);
    guest.found(GUEST, 3);
    await settle();
    host.lobby()?.start();
    await settle();
    expect(guest.screen().kind).toBe('hub');
    host.hub()?.quitToTitle();
    await settle();
    expect(guest.screen().kind).toBe('lobby');
    expect(guest.lobby()?.state()).toMatchObject({ phase: 'closed', notice: 'roundVoided' });
    // The guest's save is still the last completed round, ready for anyone to host again.
    const saved = flowWith(store, network);
    saved.hostSitting();
    await settle();
    expect(saved.lobby()?.state().phase).toBe('open');
  });

  it('keeps playing when a guest drops out, and saves the round at once', async () => {
    const network = createMemoryNetwork();
    const { host, code } = await hostWithLeague(network);
    const { guest } = await joined(network, code);
    guest.found(GUEST, 3);
    await settle();
    host.lobby()?.start();
    await settle();
    guest.hub()?.quitToTitle();
    await settle();
    expect(host.hub()?.state().sitting?.left).toEqual(['Rowdy Llamas']);
    await playSittingRound([host]);
    expect(host.screen().kind).toBe('battle');
  });

  it('goes back from joining to the title', () => {
    const flow = flowWith();
    flow.joinSitting();
    flow.cancelJoin();
    expect(flow.screen().kind).toBe('title');
  });
});
