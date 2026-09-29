/**
 * The league host (§7 League state and hosting, D-031, D-083): any member hosts a sitting of
 * their saved league for the guests who join, in a star. The host seats everyone, adopts a
 * guest's newer copy of the league (D-079), adds newcomers (D-080), and runs each round: it
 * orders every shop action into ops, runs the AI managers for bots and absent players, reveals
 * each bidding round once every human has bid, plays the battles once everyone has locked in,
 * and sends the new league state to everyone.
 */

import {
  canonicalLeague,
  finishRound,
  joinLeague,
  parseLeague,
  serializeLeague,
  shopOf,
  startRound,
  stillBidding,
  stillShopping,
  type CrewId,
  type CrewIdentity,
  type League,
  type Result,
  type RoundState,
} from '../core';
import { awaitHello, refuseGuest, welcomeGuest } from './handshake';
import type { Link } from './link';
import {
  agreedSeeds,
  applyOp,
  commitOf,
  opFor,
  sealedFor,
  seedsFrom,
  type CrewBids,
  type CrewNonce,
  type RoundOp,
  type ShopAction,
} from './ops';
import {
  decodeGuestMessage,
  encodeMessage,
  type Hello,
  type HostMessage,
  type NoticeReason,
  type SeatInfo,
} from './protocol';
import { randomNonce } from './nonce';
import { sha256Hex } from './sha256';

/** The most guests one sitting takes: a league of 12 crews with every crew played by a human. */
export const MAX_GUESTS = 11;

/** The shortest time between two nudges from one crew to another. */
export const NUDGE_GAP_MS = 10_000;

export interface LeagueHostOptions {
  /** The host's saved league. */
  readonly league: League;
  /** The crew the host plays. */
  readonly hostCrewId: CrewId;
  readonly handshakeTimeoutMs?: number;
  /** A fresh secret nonce for the crews the host stands in for (D-084). */
  readonly newNonce?: () => string;
  /** The shop timer at the start, in seconds; `null` (the default) is off (D-032). */
  readonly timerSeconds?: number | null;
}

export type StartError = 'roundRunning';

export interface LeagueHost {
  /** Seats a new link after its handshake. The host's own client comes in with `isHost`. */
  addLink(link: Link, isHost?: boolean): void;
  /** Everyone at the sitting, in the order they arrived. */
  seats(): readonly SeatInfo[];
  /** The league as it stands after the last completed round. */
  league(): League;
  /** Whether a round is being played. */
  roundRunning(): boolean;
  /** Starts the next round for everyone. */
  startRound(): Result<null, StartError>;
  /** The host's shop timer for the sitting, in seconds, or `null` when it is off. */
  timerSeconds(): number | null;
  /** Turns the shop timer on or off; it applies from the next bidding round or lineup. */
  setTimer(seconds: number | null): void;
  /** Called after every change of the seats, the league or the round. */
  onChange(listener: () => void): () => void;
  /** Closes every link. */
  close(): void;
}

interface Seat {
  readonly seat: number;
  readonly link: Link;
  readonly isHost: boolean;
  crewId: CrewId | null;
  /** The crew the guest's saved league says it plays, for claiming after an adoption. */
  readonly wants: CrewId | null;
}

interface RunningRound {
  state: RoundState;
  /** The crews whose players shop for themselves this round; AI managers run the rest. */
  readonly humans: readonly CrewId[];
  /** Every message of the round so far, for guests who arrive during it. */
  readonly messages: HostMessage[];
  /** Each locked-in crew's seed commitment. */
  readonly commits: Map<CrewId, string>;
  /** The nonces known so far: the host's stand-ins, and those its players revealed. */
  readonly nonces: Map<CrewId, CrewNonce>;
  /** Whether everyone has locked in and the players were asked for their nonces. */
  revealing: boolean;
}

export function createLeagueHost(options: LeagueHostOptions): LeagueHost {
  let league = options.league;
  let round: RunningRound | null = null;
  /** The last finished round from its start, for a player whose copy of it broke. */
  let lastRound: { readonly league: League; readonly messages: readonly HostMessage[] } | null =
    null;
  const newNonce = options.newNonce ?? randomNonce;
  let timerSeconds = options.timerSeconds ?? null;
  /** The running shop timer: what it waits for (`bidding/<n>` or `lineup`) and until when. */
  let shopTimer: {
    readonly phase: string;
    readonly deadline: number;
    readonly handle: ReturnType<typeof setTimeout>;
  } | null = null;
  const lastNudges = new Map<string, number>();
  let nextSeat = 0;
  const seats: Seat[] = [];
  const listeners = new Set<() => void>();

  const changed = (): void => {
    for (const listener of [...listeners]) listener();
  };
  const send = (seat: Seat, message: HostMessage): void => {
    seat.link.send(encodeMessage(message));
  };
  const seatInfos = (): SeatInfo[] =>
    seats.map((seat) => ({
      seat: seat.seat,
      crewId: seat.crewId,
      crew: league.crews.find((crew) => crew.id === seat.crewId)?.identity ?? null,
      isHost: seat.isHost,
    }));
  const broadcastSeats = (): void => {
    const message: HostMessage = { type: 'seats', seats: seatInfos() };
    for (const seat of seats) send(seat, message);
    changed();
  };
  let hashed: { readonly league: League; readonly hash: string } | null = null;
  /** The SHA-256 of the league's canonical JSON, which every copy must match (D-085). */
  const leagueHash = (): string => {
    if (hashed?.league !== league) hashed = { league, hash: sha256Hex(canonicalLeague(league)) };
    return hashed.hash;
  };
  const sendLeague = (seat: Seat, sent: League = league): void => {
    const hash = sent === league ? leagueHash() : sha256Hex(canonicalLeague(sent));
    send(seat, { type: 'league', save: serializeLeague(sent), you: seat.crewId, hash });
  };
  const broadcastLeague = (): void => {
    for (const seat of seats) sendLeague(seat);
  };
  /** The league at the round's start, then everything of the round so far. */
  const catchUp = (seat: Seat): void => {
    sendLeague(seat);
    for (const message of round?.messages ?? []) send(seat, sealedMessage(message, seat.crewId));
    send(seat, timerMessage());
  };
  /**
   * A player's copy broke: send the round again. If the round is over, the last one is sent
   * from its start, so the player still sees their battle, and then the league now (D-085).
   */
  const resync = (seat: Seat): void => {
    if (round !== null || lastRound === null) {
      catchUp(seat);
      return;
    }
    sendLeague(seat, lastRound.league);
    for (const message of lastRound.messages) send(seat, sealedMessage(message, seat.crewId));
    sendLeague(seat);
  };

  /** A player crew of the league that no other seat plays. */
  const claimable = (crewId: CrewId | null, except: Seat | null): boolean => {
    if (crewId === null) return false;
    const member = league.members.find((candidate) => candidate.crewId === crewId);
    return (
      member?.kind === 'player' && !seats.some((seat) => seat !== except && seat.crewId === crewId)
    );
  };

  const greet = async (link: Link, isHost: boolean): Promise<void> => {
    const hello = await awaitHello(link, options.handshakeTimeoutMs);
    if (!hello.ok) return;
    if (!isHost && seats.filter((seat) => !seat.isHost).length >= MAX_GUESTS) {
      refuseGuest(link, 'sittingFull');
      return;
    }
    const wants = isHost ? options.hostCrewId : claimedBy(hello.value);
    const seat: Seat = { seat: nextSeat++, link, isHost, crewId: null, wants };
    if (claimable(wants, null)) seat.crewId = wants;
    seats.push(seat);
    link.onMessage((text) => {
      handle(seat, text);
    });
    link.onClose(() => {
      seats.splice(seats.indexOf(seat), 1);
      if (seat.crewId !== null) dropped(seat.crewId);
      broadcastSeats();
    });
    welcomeGuest(link, seat.seat);
    send(seat, { type: 'settings', timerSeconds });
    catchUp(seat);
    if (wants !== null && seat.crewId === null) {
      send(seat, { type: 'refusedAction', reason: 'crewTaken' });
    }
    if (round === null && newerCopy(hello.value)) send(seat, { type: 'requestLeague' });
    broadcastSeats();
  };

  function claimedBy(hello: Hello): CrewId | null {
    return hello.league?.seed === league.seed ? hello.league.crewId : null;
  }
  function newerCopy(hello: Hello): boolean {
    return (
      hello.league?.seed === league.seed && hello.league.completedRounds > league.completedRounds
    );
  }

  function handle(seat: Seat, text: string): void {
    const message = decodeGuestMessage(text);
    if (!message.ok) return;
    switch (message.value.type) {
      case 'hello':
        return;
      case 'act':
        act(seat, message.value.action);
        return;
      case 'found':
        found(seat, message.value.identity);
        return;
      case 'offerLeague':
        adopt(message.value.save);
        return;
      case 'nonce':
        revealed(seat, message.value.nonce);
        return;
      case 'resync':
        resync(seat);
        return;
      case 'nudge':
        nudge(seat, message.value.crewId);
        return;
      case 'outOfSync':
        if (seat.crewId !== null) notify('outOfSync', seat.crewId);
        return;
    }
  }

  /** Passes a nudge on, at most once per `NUDGE_GAP_MS` from one crew to another. */
  function nudge(seat: Seat, target: CrewId): void {
    const from = seat.crewId;
    if (from === null || from === target) return;
    const key = `${from}>${target}`;
    const now = Date.now();
    if (now - (lastNudges.get(key) ?? -Infinity) < NUDGE_GAP_MS) return;
    lastNudges.set(key, now);
    for (const other of seats) {
      if (other.crewId === target) send(other, { type: 'nudged', from });
    }
  }

  function notify(reason: NoticeReason, crewId: CrewId): void {
    for (const seat of seats) send(seat, { type: 'notice', reason, crewId });
  }

  /**
   * A player dropped out: if their crew shops this round, its current lineup is locked in and
   * the host stands in for its nonce (§7 League state and hosting, D-085).
   */
  function dropped(crewId: CrewId): void {
    if (!round?.humans.includes(crewId)) return;
    if (!round.state.lockedIn.includes(crewId)) {
      issue({ kind: 'forceLockIn', crewId, commit: standIn(crewId) });
    } else if (!round.nonces.has(crewId)) {
      round.nonces.set(crewId, replacement(crewId));
    }
    notify('playerLeft', crewId);
    advance();
    changed();
  }

  function act(seat: Seat, action: ShopAction): void {
    if (round === null || seat.crewId === null || !round.humans.includes(seat.crewId)) {
      send(seat, { type: 'refusedAction', reason: 'noRound' });
      return;
    }
    const issued = issue(opFor(seat.crewId, action));
    if (!issued.ok) {
      send(seat, { type: 'refusedAction', reason: issued.error });
      return;
    }
    advance();
    changed();
  }

  function found(seat: Seat, identity: CrewIdentity): void {
    if (round !== null) {
      send(seat, { type: 'refusedAction', reason: 'roundRunning' });
      return;
    }
    if (seat.crewId !== null) {
      send(seat, { type: 'refusedAction', reason: 'alreadyInLeague' });
      return;
    }
    const joined = joinLeague(league, { playerName: identity.name, identity });
    if (!joined.ok) {
      send(seat, { type: 'refusedAction', reason: joined.error });
      return;
    }
    league = joined.value.league;
    seat.crewId = joined.value.crewId;
    broadcastLeague();
    broadcastSeats();
  }

  /** Takes a guest's copy of the league if it is newer (D-079). */
  function adopt(save: string): void {
    if (round !== null) return;
    const offered = parseLeague(save);
    if (!offered.ok) return;
    const copy = offered.value;
    if (copy.seed !== league.seed || copy.completedRounds <= league.completedRounds) return;
    league = copy;
    for (const seat of seats) {
      if (seat.crewId !== null && !claimable(seat.crewId, seat)) seat.crewId = null;
    }
    for (const seat of seats) {
      if (seat.crewId === null && claimable(seat.wants, seat)) seat.crewId = seat.wants;
    }
    broadcastLeague();
    broadcastSeats();
  }

  /** Applies an op to the round and sends it to everyone, sealed as each may see it. */
  function issue(op: RoundOp): Result<null, string> {
    if (round === null) return { ok: false, error: 'noRound' };
    const applied = applyOp(round.state, op);
    if (!applied.ok) return applied;
    round.state = applied.value.state;
    const committed = commitOf(op);
    if (committed !== null) round.commits.set(committed.crewId, committed.commit);
    record({ type: 'op', seq: round.messages.length, op });
    return { ok: true, value: null };
  }

  /** A commitment for a crew the host stands in for; the host keeps its nonce (D-084). */
  function standIn(crewId: CrewId): string {
    const nonce = newNonce();
    round?.nonces.set(crewId, { crewId, nonce, replaced: false });
    return sha256Hex(nonce);
  }

  /** A player's nonce: it counts if it matches the crew's commitment, else the host stands in. */
  function revealed(seat: Seat, nonce: string): void {
    const crewId = seat.crewId;
    if (round?.revealing !== true || crewId === null || round.nonces.has(crewId)) return;
    const matches = round.commits.get(crewId) === sha256Hex(nonce);
    round.nonces.set(crewId, matches ? { crewId, nonce, replaced: false } : replacement(crewId));
    advance();
  }

  function replacement(crewId: CrewId): CrewNonce {
    return { crewId, nonce: newNonce(), replaced: true };
  }

  /** Keeps a round message for late arrivals and sends it to everyone. */
  function record(message: HostMessage): void {
    round?.messages.push(message);
    for (const seat of seats) send(seat, sealedMessage(message, seat.crewId));
  }

  function aiCrews(): CrewId[] {
    if (round === null) return [];
    const { humans, state } = round;
    return state.shops
      .map((shop) => shop.crew.id)
      .filter((id) => !humans.includes(id) && !state.lockedIn.includes(id));
  }

  /** Moves the round on as far as it can, then sets the shop timer for where it waits. */
  function advance(): void {
    progress();
    syncTimer();
  }

  /** Reveals bidding rounds and plays the battles as soon as nobody needs to act any more. */
  function progress(): void {
    for (;;) {
      if (round === null) return;
      const { state, humans } = round;
      if (state.bidding.ended) {
        if (stillShopping(state).length === 0) reveal(round);
        return;
      }
      if (stillBidding(state).some((id) => humans.includes(id))) return;
      const bids: CrewBids[] = humans
        .filter((id) => !state.lockedIn.includes(id))
        .map((crewId) => {
          const shop = shopOf(state, crewId);
          return { crewId, bids: shop.ok ? (shop.value.bids ?? []) : [] };
        });
      issue({ kind: 'reveal', bids });
      const ended = round.state.bidding.ended;
      for (const crewId of aiCrews()) {
        issue(
          ended ? { kind: 'aiLineup', crewId, commit: standIn(crewId) } : { kind: 'aiBid', crewId },
        );
      }
    }
  }

  /** What the round waits for now, if the shop timer can run for it. */
  function timerPhase(): string | null {
    if (round === null || round.revealing) return null;
    const { bidding } = round.state;
    return bidding.ended ? 'lineup' : `bidding/${String(bidding.round)}`;
  }

  /**
   * Starts the shop timer when the round moves on to a new bidding round or to the lineup,
   * and stops it when nothing is left to wait for (§7 Slow players, D-032).
   */
  function syncTimer(): void {
    const phase = timerSeconds === null ? null : timerPhase();
    if (phase === shopTimer?.phase) return;
    if (shopTimer !== null) clearTimeout(shopTimer.handle);
    shopTimer = null;
    if (phase === null || timerSeconds === null) {
      broadcastTimer();
      return;
    }
    const ms = timerSeconds * 1000;
    shopTimer = { phase, deadline: Date.now() + ms, handle: setTimeout(timeUp, ms) };
    broadcastTimer();
  }

  function timerMessage(): HostMessage {
    if (shopTimer === null) return { type: 'timer', timer: null };
    const remainingMs = Math.max(0, shopTimer.deadline - Date.now());
    const phase = shopTimer.phase === 'lineup' ? 'lineup' : 'bidding';
    return { type: 'timer', timer: { phase, remainingMs } };
  }

  function broadcastTimer(): void {
    const message = timerMessage();
    for (const seat of seats) send(seat, message);
  }

  /**
   * The shop timer ran out: a human crew that hasn't bid passes, and after the bidding, every
   * human crew's current lineup is locked in (D-032).
   */
  function timeUp(): void {
    shopTimer = null;
    if (round === null) return;
    const { state, humans } = round;
    if (!state.bidding.ended) {
      const passing = stillBidding(state).filter((id) => humans.includes(id));
      for (const crewId of passing) issue({ kind: 'bidPlaced', crewId, bids: [] });
    } else {
      for (const crewId of stillShopping(state).filter((id) => humans.includes(id))) {
        issue({ kind: 'forceLockIn', crewId, commit: standIn(crewId) });
      }
    }
    advance();
    changed();
  }

  /**
   * Everyone has locked in, so every commitment is known: the players reveal their nonces,
   * and the battles are played once all are in (D-084).
   */
  function reveal(running: RunningRound): void {
    if (!running.revealing) {
      running.revealing = true;
      record({ type: 'revealNonce' });
    }
    const waiting = running.state.shops.some((shop) => !running.nonces.has(shop.crew.id));
    if (!waiting) play(running);
  }

  function play(running: RunningRound): void {
    const nonces = [...running.nonces.values()];
    const { state } = running;
    const seeds = agreedSeeds(state, nonces);
    const finished = seeds === null ? null : finishRound(state, seedsFrom(seeds));
    if (finished?.ok !== true) return;
    record({ type: 'play', nonces });
    lastRound = { league, messages: running.messages };
    league = finished.value.league;
    round = null;
    syncTimer();
    broadcastLeague();
    changed();
  }

  return {
    addLink: (link, isHost = false) => {
      void greet(link, isHost);
    },
    seats: seatInfos,
    league: () => league,
    roundRunning: () => round !== null,
    startRound: () => {
      if (round !== null) return { ok: false, error: 'roundRunning' };
      const started = startRound(league);
      const playing = new Set(started.state.shops.map((shop) => shop.crew.id));
      const humans = seats
        .map((seat) => seat.crewId)
        .filter((id): id is CrewId => id !== null && playing.has(id));
      round = {
        state: started.state,
        humans,
        messages: [],
        commits: new Map(),
        nonces: new Map(),
        revealing: false,
      };
      record({ type: 'roundStart', round: started.state.round, humans });
      for (const crewId of aiCrews()) issue({ kind: 'aiBid', crewId });
      advance();
      changed();
      return { ok: true, value: null };
    },
    timerSeconds: () => timerSeconds,
    setTimer: (seconds) => {
      timerSeconds = seconds;
      for (const seat of seats) send(seat, { type: 'settings', timerSeconds });
      syncTimer();
      changed();
    },
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      if (shopTimer !== null) clearTimeout(shopTimer.handle);
      shopTimer = null;
      listeners.clear();
      for (const seat of [...seats]) seat.link.close();
    },
  };
}

/** A round message as the crew `crewId` may see it. */
function sealedMessage(message: HostMessage, crewId: CrewId | null): HostMessage {
  return message.type === 'op' ? { ...message, op: sealedFor(message.op, crewId) } : message;
}
