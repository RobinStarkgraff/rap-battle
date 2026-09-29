/**
 * A player's side of a sitting (D-083): the host's own client and every guest run one. It
 * greets the host, keeps its own copy of the league and of the running round by applying the
 * host's ops, checks its player's shop actions against that copy before sending them, and
 * tells the app what happened.
 */

import {
  canonicalLeague,
  finishRound,
  lockInCrew,
  parseLeague,
  roundBid,
  serializeLeague,
  startRound,
  type Award,
  type Crew,
  type CrewId,
  type CrewIdentity,
  type League,
  type Result,
  type RoundFinished,
  type RoundStartReport,
  type RoundState,
} from '../core';
import { greetHost, type GuestHandshakeError } from './handshake';
import type { Link } from './link';
import { randomNonce } from './nonce';
import {
  agreedSeeds,
  applyOp,
  commitOf,
  opFor,
  seedsFrom,
  type CrewNonce,
  type PlayerAction,
} from './ops';
import { sha256Hex } from './sha256';
import {
  decodeHostMessage,
  encodeMessage,
  type GuestMessage,
  type HostMessage,
  type NoticeReason,
  type SeatInfo,
} from './protocol';

export interface ClientRound {
  readonly state: RoundState;
  readonly start: RoundStartReport;
  /** The crews whose players shop for themselves this round. */
  readonly humans: readonly CrewId[];
  /** The awards of the last revealed bidding round. */
  readonly lastAwards: readonly Award[] | null;
}

export interface ClientTimer {
  readonly phase: 'bidding' | 'lineup';
  /** When it runs out, in `Date.now()` milliseconds. */
  readonly endsAt: number;
}

export interface ClientPlayed {
  readonly finished: RoundFinished;
  /** Every crew as it locked in, for the battle playback. */
  readonly crews: ReadonlyMap<CrewId, Crew>;
}

export type ClientEvent =
  /** The sitting's league arrived: at the start, after a founding or adoption, after a round. */
  | { readonly kind: 'league'; readonly league: League; readonly you: CrewId | null }
  | { readonly kind: 'roundStarted' }
  /** The round or the seats changed. */
  | { readonly kind: 'changed' }
  | { readonly kind: 'played'; readonly played: ClientPlayed }
  /** The host didn't do what this player asked. */
  | { readonly kind: 'refused'; readonly reason: string }
  /**
   * This copy no longer matched the host's: `result` if the round's result differed (the host's
   * league is used), otherwise the round broke and is being sent again.
   */
  | { readonly kind: 'desync'; readonly reason: string }
  /** Another player dropped out, or was out of sync (D-085). */
  | { readonly kind: 'notice'; readonly reason: NoticeReason; readonly crewId: CrewId }
  /** Another player nudged this one to get on with their shopping. */
  | { readonly kind: 'nudged'; readonly from: CrewId }
  | { readonly kind: 'hostLeft' };

export interface LeagueClient {
  readonly seat: number;
  seats(): readonly SeatInfo[];
  /** The crew this player plays in the sitting's league, once it has one. */
  crewId(): CrewId | null;
  /** The sitting's league after the last completed round, once the host sent it. */
  league(): League | null;
  round(): ClientRound | null;
  /**
   * Asks the host for a shop action for this player's crew. It is checked against this copy
   * first, so the reason comes back at once if it would be refused; the change itself
   * arrives with the host's op.
   */
  act(action: PlayerAction): string | null;
  /**
   * Locks the crew in, committing to a fresh secret nonce for the battle seed, which the
   * client reveals once everyone has locked in (D-084).
   */
  lockIn(): string | null;
  /** A newcomer founds a crew; the league with it arrives from the host. */
  found(identity: CrewIdentity): void;
  /** Nudges the player of another crew who is still shopping. */
  nudge(crewId: CrewId): void;
  /** The host's shop timer for the sitting, in seconds, or `null` when it is off. */
  timerSeconds(): number | null;
  /** The running shop timer, with its end in this browser's clock (`Date.now()`). */
  timer(): ClientTimer | null;
  onEvent(listener: (event: ClientEvent) => void): () => void;
  leave(): void;
}

export interface ClientOptions {
  /** This browser's saved league, offered to the host if it asks for a newer copy. */
  readonly saved: League | null;
  /** This player's crew in the saved league. */
  readonly savedCrewId: CrewId | null;
  readonly handshakeTimeoutMs?: number;
  /** A fresh secret nonce for each lock-in (D-084). */
  readonly newNonce?: () => string;
}

export async function connectLeagueClient(
  link: Link,
  options: ClientOptions,
): Promise<Result<LeagueClient, GuestHandshakeError>> {
  const { saved } = options;
  const info =
    saved === null
      ? null
      : { seed: saved.seed, completedRounds: saved.completedRounds, crewId: options.savedCrewId };
  const greeted = await greetHost(link, info, options.handshakeTimeoutMs);
  if (!greeted.ok) return greeted;

  let seats: readonly SeatInfo[] = [];
  let you: CrewId | null = null;
  let league: League | null = null;
  let round: ClientRound | null = null;
  let leaving = false;
  /** This round's seed commitments, from the lock-in ops, to check the revealed nonces. */
  const commits = new Map<CrewId, string>();
  /** The secret behind this player's last lock-in, until the host asks for it. */
  let myNonce: string | null = null;
  let nonceRound = 0;
  /** This copy's league after the round's battles, until the host's league arrives. */
  let finished: League | null = null;
  let timerSeconds: number | null = null;
  let timer: ClientTimer | null = null;
  const newNonce = options.newNonce ?? randomNonce;
  const listeners = new Set<(event: ClientEvent) => void>();
  // What happens before the app listens (the league right after the welcome) waits for it.
  const backlog: ClientEvent[] = [];
  const emit = (event: ClientEvent): void => {
    if (listeners.size === 0) backlog.push(event);
    for (const listener of [...listeners]) listener(event);
  };
  const sendToHost = (message: GuestMessage): void => {
    link.send(encodeMessage(message));
  };

  const onLeague = (save: string, crewId: CrewId | null, hash: string): void => {
    const parsed = parseLeague(save);
    if (!parsed.ok) {
      emit({ kind: 'desync', reason: parsed.error });
      return;
    }
    // After a round, this copy's result must be the host's league (D-085).
    if (finished !== null) {
      const ours = sha256Hex(canonicalLeague(finished));
      if (ours !== hash) {
        emit({ kind: 'desync', reason: 'result' });
        sendToHost({ type: 'outOfSync', round: parsed.value.completedRounds });
      }
      finished = null;
    }
    league = parsed.value;
    you = crewId;
    round = null;
    emit({ kind: 'league', league: parsed.value, you: crewId });
  };
  const onRoundStart = (number: number, humans: readonly CrewId[]): void => {
    if (league === null) return;
    commits.clear();
    // A round sent again after a resync keeps this player's nonce; a new round doesn't.
    if (number !== nonceRound) myNonce = null;
    const started = startRound(league);
    if (started.state.round !== number) {
      emit({ kind: 'desync', reason: 'round' });
      return;
    }
    round = { state: started.state, start: started.report, humans, lastAwards: null };
    emit({ kind: 'roundStarted' });
  };
  const onOp = (message: Extract<HostMessage, { type: 'op' }>): void => {
    if (round === null) return;
    const applied = applyOp(round.state, message.op);
    if (!applied.ok) {
      // The copy broke: drop the round and ask the host to send it again.
      round = null;
      emit({ kind: 'desync', reason: applied.error });
      sendToHost({ type: 'resync' });
      return;
    }
    round = {
      ...round,
      state: applied.value.state,
      lastAwards: applied.value.awards ?? round.lastAwards,
    };
    const committed = commitOf(message.op);
    if (committed !== null) commits.set(committed.crewId, committed.commit);
    emit({ kind: 'changed' });
  };
  const onRevealNonce = (): void => {
    if (myNonce !== null) sendToHost({ type: 'nonce', nonce: myNonce });
  };
  const onPlay = (nonces: readonly CrewNonce[]): void => {
    if (round === null) return;
    const { state } = round;
    // A nonce that doesn't match its commitment means the host changed it; it still decides.
    const honest = nonces.every(
      (entry) => entry.replaced || commits.get(entry.crewId) === sha256Hex(entry.nonce),
    );
    if (!honest) emit({ kind: 'desync', reason: 'badNonce' });
    const seeds = agreedSeeds(state, nonces);
    const played = seeds === null ? null : finishRound(state, seedsFrom(seeds));
    if (played?.ok !== true) {
      round = null;
      emit({ kind: 'desync', reason: 'play' });
      sendToHost({ type: 'resync' });
      return;
    }
    finished = played.value.league;
    const crews = new Map(state.shops.map((shop) => [shop.crew.id, shop.crew]));
    emit({ kind: 'played', played: { finished: played.value, crews } });
  };

  link.onMessage((text) => {
    const decoded = decodeHostMessage(text);
    if (!decoded.ok) return;
    const message = decoded.value;
    switch (message.type) {
      case 'welcome':
      case 'refused':
        return;
      case 'seats':
        seats = message.seats;
        emit({ kind: 'changed' });
        return;
      case 'league':
        onLeague(message.save, message.you, message.hash);
        return;
      case 'notice':
        emit({ kind: 'notice', reason: message.reason, crewId: message.crewId });
        return;
      case 'nudged':
        emit({ kind: 'nudged', from: message.from });
        return;
      case 'settings':
        timerSeconds = message.timerSeconds;
        emit({ kind: 'changed' });
        return;
      case 'timer':
        timer =
          message.timer === null
            ? null
            : { phase: message.timer.phase, endsAt: Date.now() + message.timer.remainingMs };
        emit({ kind: 'changed' });
        return;
      case 'requestLeague':
        if (saved !== null) sendToHost({ type: 'offerLeague', save: serializeLeague(saved) });
        return;
      case 'refusedAction':
        emit({ kind: 'refused', reason: message.reason });
        return;
      case 'roundStart':
        onRoundStart(message.round, message.humans);
        return;
      case 'op':
        onOp(message);
        return;
      case 'revealNonce':
        onRevealNonce();
        return;
      case 'play':
        onPlay(message.nonces);
        return;
    }
  });
  link.onClose(() => {
    if (!leaving) emit({ kind: 'hostLeft' });
  });

  const client: LeagueClient = {
    seat: greeted.value.seat,
    seats: () => seats,
    crewId: () => you,
    league: () => league,
    round: () => round,
    act: (action) => {
      if (round === null || you === null || !round.humans.includes(you)) return 'noRound';
      const check =
        action.kind === 'bid'
          ? roundBid(round.state, you, action.bids)
          : applyOp(round.state, opFor(you, action));
      if (!check.ok) return check.error;
      sendToHost({ type: 'act', action });
      return null;
    },
    lockIn: () => {
      if (round === null || you === null || !round.humans.includes(you)) return 'noRound';
      const check = lockInCrew(round.state, you);
      if (!check.ok) return check.error;
      const nonce = newNonce();
      myNonce = nonce;
      nonceRound = round.state.round;
      sendToHost({ type: 'act', action: { kind: 'lockIn', commit: sha256Hex(nonce) } });
      return null;
    },
    found: (identity) => {
      sendToHost({ type: 'found', identity });
    },
    nudge: (crewId) => {
      sendToHost({ type: 'nudge', crewId });
    },
    timerSeconds: () => timerSeconds,
    timer: () => timer,
    onEvent: (listener) => {
      listeners.add(listener);
      for (const event of backlog.splice(0)) listener(event);
      return () => listeners.delete(listener);
    },
    leave: () => {
      leaving = true;
      link.close();
    },
  };
  return { ok: true, value: client };
}
