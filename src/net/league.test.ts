import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_MANAGER,
  askPrice,
  bidsProblem,
  createLeague,
  playRound,
  canonicalLeague,
  shopOf,
  type Bid,
  type CrewId,
  type CrewIdentity,
  type League,
  type RoundState,
  agreedBattleSeed,
} from '../core';
import { connectLeagueClient, type ClientEvent, type LeagueClient } from './leagueClient';
import { createLeagueHost, NUDGE_GAP_MS, type LeagueHost } from './leagueHost';
import type { Link } from './link';
import { linkedPair } from './memoryNetwork';
import { sha256Hex } from './sha256';

function identity(name: string, logo: CrewIdentity['logo'] = 'star'): CrewIdentity {
  return { name, mainColour: 'teal', trimColour: 'white', logo };
}

/** A league of two players (c1 hosts, c2 is a guest) and two bots (c3, c4). */
function twoPlayerLeague(): League {
  const created = createLeague(
    2024,
    [
      { playerName: 'Host', identity: identity('Soggy Biscuits') },
      { playerName: 'Guest', identity: identity('Rowdy Llamas', 'flame') },
    ],
    2,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 200; i++) await Promise.resolve();
}

interface Peer {
  readonly client: LeagueClient;
  readonly events: ClientEvent[];
}

/** Rewrites the texts that pass a link, both ways, to play a peer that cheats or breaks. */
interface Tamper {
  readonly outgoing?: (text: string) => string;
  readonly incoming?: (text: string) => string;
  /** Every text that arrived, after rewriting. */
  readonly seen?: string[];
}

function tampered(link: Link, tamper: Tamper): Link {
  return {
    ...link,
    send: (text) => {
      link.send(tamper.outgoing?.(text) ?? text);
    },
    onMessage: (listener) =>
      link.onMessage((text) => {
        const arrived = tamper.incoming?.(text) ?? text;
        tamper.seen?.push(arrived);
        listener(arrived);
      }),
  };
}

async function connect(
  host: LeagueHost,
  saved: League | null,
  savedCrewId: CrewId | null,
  isHost = false,
  options: { readonly nonce?: string; readonly tamper?: Tamper } = {},
): Promise<Peer> {
  const [clientEnd, hostEnd] = linkedPair();
  host.addLink(hostEnd, isHost);
  const { nonce, tamper } = options;
  const connected = await connectLeagueClient(
    tamper === undefined ? clientEnd : tampered(clientEnd, tamper),
    {
      saved,
      savedCrewId,
      ...(nonce === undefined ? {} : { newNonce: () => nonce }),
    },
  );
  if (!connected.ok) throw new Error(connected.error);
  const events: ClientEvent[] = [];
  connected.value.onEvent((event) => events.push(event));
  await settle();
  return { client: connected.value, events };
}

async function sitting(league: League = twoPlayerLeague()): Promise<{
  host: LeagueHost;
  hostPeer: Peer;
  guest: Peer;
}> {
  const host = createLeagueHost({ league, hostCrewId: 'c1' });
  const hostPeer = await connect(host, league, 'c1', true);
  const guest = await connect(host, league, 'c2');
  return { host, hostPeer, guest };
}

/** The cheapest affordable units at their ask, as a simple human would bid. */
function cheapBids(client: LeagueClient): Bid[] {
  const round = client.round();
  const crewId = client.crewId();
  if (round === null || crewId === null) throw new Error('no round');
  const shop = shopOf(round.state, crewId);
  if (!shop.ok) return [];
  const bids: Bid[] = [];
  const units = [...round.state.market.publicList].sort((x, y) => askPrice(x) - askPrice(y));
  for (const unit of units) {
    const bid = { unitId: unit.id, amount: askPrice(unit) };
    if (bidsProblem(shop.value.crew, [...bids, bid], round.state.market) === null) bids.push(bid);
  }
  return bids;
}

/** Every human bids until the bidding ends, then locks in. */
async function playHumanRound(peers: readonly Peer[]): Promise<void> {
  for (;;) {
    const round = peers[0]?.client.round();
    if (round === null || round === undefined) throw new Error('no round');
    if (round.state.bidding.ended) break;
    for (const peer of peers)
      expect(peer.client.act({ kind: 'bid', bids: cheapBids(peer.client) })).toBeNull();
    await settle();
  }
  for (const peer of peers) expect(peer.client.lockIn()).toBeNull();
  await settle();
}

function playedLeague(peer: Peer): string {
  const played = peer.events.filter((event) => event.kind === 'played');
  const last = played.at(-1);
  if (last?.kind !== 'played') throw new Error('no battle was played');
  return canonicalLeague(last.played.finished.league);
}

describe('league host and clients', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('seats the host and a guest with their crews and sends them the league', async () => {
    const { host, hostPeer, guest } = await sitting();
    expect(host.seats().map((seat) => [seat.crewId, seat.isHost])).toEqual([
      ['c1', true],
      ['c2', false],
    ]);
    expect(hostPeer.client.crewId()).toBe('c1');
    expect(guest.client.crewId()).toBe('c2');
    expect(guest.client.seats()).toEqual(host.seats());
    expect(canonicalLeague(leagueOf(guest.client))).toBe(canonicalLeague(host.league()));
  });

  it('plays a round: AI bots, sealed bids, reveals, lock-ins, battles and the new league', async () => {
    const { host, hostPeer, guest } = await sitting();
    expect(host.startRound()).toEqual({ ok: true, value: null });
    expect(host.startRound()).toEqual({ ok: false, error: 'roundRunning' });
    await settle();
    const round = guest.client.round();
    expect(round?.humans).toEqual(['c1', 'c2']);
    // The bots have bid already, so the market waits only for the humans.
    expect(guest.client.lockIn()).toBe('biddingOpen');

    hostPeer.client.act({ kind: 'bid', bids: cheapBids(hostPeer.client) });
    await settle();
    // The guest's copy has the host's bids as a pass until the reveal: they stay sealed.
    const sealed = shopOf(stateOf(guest.client), 'c1');
    expect(sealed.ok && sealed.value.bids).toEqual([]);
    const own = shopOf(stateOf(hostPeer.client), 'c1');
    expect(own.ok && (own.value.bids?.length ?? 0)).toBeGreaterThan(0);

    await playHumanRound([hostPeer, guest]);
    expect(host.roundRunning()).toBe(false);
    expect(host.league().completedRounds).toBe(1);
    const expected = canonicalLeague(host.league());
    expect(playedLeague(hostPeer)).toBe(expected);
    expect(playedLeague(guest)).toBe(expected);
    expect(canonicalLeague(leagueOf(guest.client))).toBe(expected);
    expect(guest.events.some((event) => event.kind === 'desync')).toBe(false);
    // The humans got units from the market, and the reveals reported awards.
    const guestCrew = host.league().crews.find((crew) => crew.id === 'c2');
    expect(guestCrew?.mcSlots.some((unit) => unit !== null)).toBe(true);
  });

  it('plays the crew of an absent player with the AI manager', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    host.startRound();
    await settle();
    expect(hostPeer.client.round()?.humans).toEqual(['c1']);
    await playHumanRound([hostPeer]);
    expect(host.league().completedRounds).toBe(1);
    const absent = host.league().crews.find((crew) => crew.id === 'c2');
    expect(absent?.mcSlots.some((unit) => unit !== null)).toBe(true);
  });

  it('adopts a guest’s newer copy of the league before a round', async () => {
    const league = twoPlayerLeague();
    const newer = playRound(league, () => AI_MANAGER).league;
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    const guest = await connect(host, newer, 'c2');
    expect(host.league().completedRounds).toBe(1);
    expect(canonicalLeague(host.league())).toBe(canonicalLeague(newer));
    expect(hostPeer.client.league()?.completedRounds).toBe(1);
    expect(guest.client.crewId()).toBe('c2');

    // An older copy changes nothing.
    await connect(host, league, null);
    expect(host.league().completedRounds).toBe(1);
  });

  it('adds a newcomer between rounds, taking over a bot’s slot', async () => {
    const { host, hostPeer } = await sitting();
    const newcomer = await connect(host, null, null);
    expect(newcomer.client.crewId()).toBeNull();
    newcomer.client.found(identity('Soggy Biscuits'));
    await settle();
    expect(newcomer.events).toContainEqual({ kind: 'refused', reason: 'taken' });
    newcomer.client.found(identity('Cosmic Crumbs'));
    await settle();
    const crewId = newcomer.client.crewId();
    expect(crewId).toBe('c5');
    expect(host.league().members.filter((member) => member.kind === 'bot')).toHaveLength(1);
    expect(hostPeer.client.league()?.crews.some((crew) => crew.id === 'c5')).toBe(true);
    expect(host.seats().find((seat) => seat.crewId === 'c5')?.crew?.name).toBe('Cosmic Crumbs');

    host.startRound();
    await settle();
    expect(newcomer.client.round()?.humans).toContain('c5');
    newcomer.client.found(identity('Too Late'));
    await settle();
    expect(newcomer.events).toContainEqual({ kind: 'refused', reason: 'roundRunning' });
  });

  it('catches up a guest who arrives during a round, who watches until the next one', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    host.startRound();
    await settle();
    hostPeer.client.act({ kind: 'bid', bids: cheapBids(hostPeer.client) });
    await settle();
    const late = await connect(host, twoPlayerLeague(), 'c2');
    const hostRound = hostPeer.client.round();
    const lateRound = late.client.round();
    expect(lateRound?.humans).toEqual(['c1']);
    expect(lateRound?.state.market).toEqual(hostRound?.state.market);
    expect(late.client.act({ kind: 'scout' })).toBe('noRound');
    await playHumanRound([hostPeer]);
    expect(playedLeague(late)).toBe(canonicalLeague(host.league()));
  });

  it('won’t seat two people on one crew', async () => {
    const { host } = await sitting();
    const twin = await connect(host, twoPlayerLeague(), 'c2');
    expect(twin.client.crewId()).toBeNull();
    expect(twin.events).toContainEqual({ kind: 'refused', reason: 'crewTaken' });
  });

  it('checks a player’s actions before sending them', async () => {
    const { host, guest } = await sitting();
    expect(guest.client.act({ kind: 'scout' })).toBe('noRound');
    host.startRound();
    await settle();
    expect(guest.client.act({ kind: 'release', unitId: 'nobody' })).toBe('unknownUnit');
    expect(guest.client.act({ kind: 'bid', bids: [{ unitId: 'nobody', amount: 1 }] })).toBe(
      'unknownUnit',
    );
    expect(guest.client.act({ kind: 'scout' })).toBeNull();
    await settle();
    const shop = shopOf(stateOf(guest.client), 'c2');
    expect(shop.ok && shop.value.scouting.units).toHaveLength(2);
  });

  it('agrees each battle seed from both crews’ nonces, standing in for the bots', async () => {
    const league = twoPlayerLeague();
    let hostNonces = 0;
    const host = createLeagueHost({
      league,
      hostCrewId: 'c1',
      newNonce: () => (++hostNonces).toString(16).padStart(32, '0'),
    });
    const hostPeer = await connect(host, league, 'c1', true, { nonce: 'a'.repeat(32) });
    const guest = await connect(host, league, 'c2', false, { nonce: 'b'.repeat(32) });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    const played = guest.events.find((event) => event.kind === 'played');
    if (played?.kind !== 'played') throw new Error('no battles');
    const nonces = new Map([
      ['c1', 'a'.repeat(32)],
      ['c2', 'b'.repeat(32)],
      // The host drew one nonce for each bot as it locked in.
      ['c3', '1'.padStart(32, '0')],
      ['c4', '2'.padStart(32, '0')],
    ]);
    for (const battle of played.played.finished.battles) {
      expect(battle.seed).toBe(
        agreedBattleSeed(
          league.seed,
          1,
          battle.division,
          nonces.get(battle.crewA) ?? '',
          nonces.get(battle.crewB) ?? '',
        ),
      );
    }
    expect(guest.events.some((event) => event.kind === 'desync')).toBe(false);
  });

  it('asks for nonces only once everyone has locked in', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    const seen: string[] = [];
    const guest = await connect(host, league, 'c2', false, { tamper: { seen } });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    const types = seen.map((text) => JSON.parse(text) as { type: string; op?: { kind: string } });
    const reveal = types.findIndex((message) => message.type === 'revealNonce');
    const lockIns = types
      .map((message, index) => (message.op?.kind === 'lockIn' ? index : -1))
      .filter((index) => index >= 0);
    expect(lockIns).toHaveLength(2);
    expect(reveal).toBeGreaterThan(Math.max(...lockIns));
  });

  it('stands in for a nonce that doesn’t match its commitment', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    // The guest reveals another nonce than the one it committed to.
    const guest = await connect(host, league, 'c2', false, {
      nonce: 'c'.repeat(32),
      tamper: { outgoing: (text) => text.replace('c'.repeat(32), 'd'.repeat(32)) },
    });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    expect(host.league().completedRounds).toBe(1);
    expect(hostPeer.events.some((event) => event.kind === 'desync')).toBe(false);
    expect(playedLeague(guest)).toBe(canonicalLeague(host.league()));
  });

  it('notices a nonce that the host changed', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true, { nonce: 'e'.repeat(32) });
    const guest = await connect(host, league, 'c2', false, {
      tamper: { incoming: (text) => text.replace('e'.repeat(32), 'f'.repeat(32)) },
    });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    expect(sha256Hex('e'.repeat(32))).not.toBe(sha256Hex('f'.repeat(32)));
    expect(guest.events).toContainEqual({ kind: 'desync', reason: 'badNonce' });
  });

  it('notices a result that differs from the host’s league, and tells the others', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    const guest = await connect(host, league, 'c2', false, {
      tamper: {
        incoming: (text) => text.replace(/"hash":"[0-9a-f]{64}"/, `"hash":"${'0'.repeat(64)}"`),
      },
    });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    expect(guest.events).toContainEqual({ kind: 'desync', reason: 'result' });
    expect(hostPeer.events).toContainEqual({ kind: 'notice', reason: 'outOfSync', crewId: 'c2' });
    // The guest now has the host's league.
    expect(canonicalLeague(leagueOf(guest.client))).toBe(canonicalLeague(host.league()));
    expect(hostPeer.events.some((event) => event.kind === 'desync')).toBe(false);
  });

  it('sends a round again to a player whose copy broke', async () => {
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1' });
    const hostPeer = await connect(host, league, 'c1', true);
    let broken = false;
    // One op arrives damaged: a lock-in for a crew that doesn't exist.
    const guest = await connect(host, league, 'c2', false, {
      tamper: {
        incoming: (text) => {
          if (broken || !text.includes('"kind":"aiLineup"')) return text;
          broken = true;
          return text.replace(/"crewId":"c\d+"/, '"crewId":"c99"');
        },
      },
    });
    host.startRound();
    await settle();
    await playHumanRound([hostPeer, guest]);
    expect(broken).toBe(true);
    expect(guest.events.some((event) => event.kind === 'desync')).toBe(true);
    expect(playedLeague(guest)).toBe(canonicalLeague(host.league()));
  });

  it('locks in the lineup of a player who drops out mid-round', async () => {
    const { host, hostPeer, guest } = await sitting();
    host.startRound();
    await settle();
    guest.client.leave();
    await settle();
    expect(hostPeer.events).toContainEqual({ kind: 'notice', reason: 'playerLeft', crewId: 'c2' });
    expect(hostPeer.client.round()?.state.lockedIn).toContain('c2');
    await playHumanRound([hostPeer]);
    expect(host.league().completedRounds).toBe(1);
  });

  it('stands in for the nonce of a player who drops out after locking in', async () => {
    const { host, hostPeer, guest } = await sitting();
    host.startRound();
    await settle();
    for (;;) {
      if (stateOf(guest.client).bidding.ended) break;
      for (const peer of [hostPeer, guest]) peer.client.act({ kind: 'bid', bids: [] });
      await settle();
    }
    expect(guest.client.lockIn()).toBeNull();
    await settle();
    guest.client.leave();
    await settle();
    expect(hostPeer.client.lockIn()).toBeNull();
    await settle();
    expect(host.league().completedRounds).toBe(1);
    const played = hostPeer.events.find((event) => event.kind === 'played');
    expect(played).toBeDefined();
  });

  it('passes nudges on, at most one every ten seconds from one crew to another', async () => {
    vi.useFakeTimers();
    const { host, hostPeer, guest } = await sitting();
    host.startRound();
    await settle();
    hostPeer.client.nudge('c2');
    hostPeer.client.nudge('c2');
    // Nudging yourself does nothing.
    guest.client.nudge('c2');
    await settle();
    expect(guest.events.filter((event) => event.kind === 'nudged')).toEqual([
      { kind: 'nudged', from: 'c1' },
    ]);
    vi.advanceTimersByTime(NUDGE_GAP_MS);
    hostPeer.client.nudge('c2');
    await settle();
    expect(guest.events.filter((event) => event.kind === 'nudged')).toHaveLength(2);
  });

  it('tells everyone about the host’s shop timer', async () => {
    const { host, hostPeer, guest } = await sitting();
    expect(guest.client.timerSeconds()).toBeNull();
    host.setTimer(120);
    await settle();
    expect(guest.client.timerSeconds()).toBe(120);
    expect(hostPeer.client.timerSeconds()).toBe(120);
    const late = await connect(host, null, null);
    expect(late.client.timerSeconds()).toBe(120);
  });

  it('passes for a slow bidder and locks in a slow lineup when the shop timer runs out', async () => {
    vi.useFakeTimers();
    const league = twoPlayerLeague();
    const host = createLeagueHost({ league, hostCrewId: 'c1', timerSeconds: 30 });
    const hostPeer = await connect(host, league, 'c1', true);
    const guest = await connect(host, league, 'c2');
    host.startRound();
    await settle();
    expect(guest.client.timer()?.phase).toBe('bidding');
    const endsAt = guest.client.timer()?.endsAt ?? 0;
    expect(endsAt - Date.now()).toBe(30_000);
    // The host passes every bidding round at once; the guest does nothing at all.
    for (let step = 0; step < 10 && !stateOf(hostPeer.client).bidding.ended; step++) {
      hostPeer.client.act({ kind: 'bid', bids: [] });
      await settle();
      vi.advanceTimersByTime(30_000);
      await settle();
    }
    expect(stateOf(guest.client).bidding.ended).toBe(true);
    expect(guest.client.timer()?.phase).toBe('lineup');
    expect(hostPeer.client.lockIn()).toBeNull();
    await settle();
    vi.advanceTimersByTime(30_000);
    await settle();
    expect(host.league().completedRounds).toBe(1);
    expect(guest.events.some((event) => event.kind === 'played')).toBe(true);
    expect(guest.client.timer()).toBeNull();
  });

  it('tells the guests when the host closes the sitting', async () => {
    const { host, guest } = await sitting();
    host.close();
    await settle();
    expect(guest.events).toContainEqual({ kind: 'hostLeft' });
  });
});

function stateOf(client: LeagueClient): RoundState {
  const round = client.round();
  if (round === null) throw new Error('no round');
  return round.state;
}

function leagueOf(client: LeagueClient): League {
  const league = client.league();
  if (league === null) throw new Error('no league');
  return league;
}
