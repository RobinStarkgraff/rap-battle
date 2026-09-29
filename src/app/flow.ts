/**
 * The game-flow state machine (§3, §11 Screens): title → crew founding → home hub → battle →
 * result → hub, with the league saved in the browser after every completed round (D-031). A
 * league is played either locally against bots or in a sitting with friends (`sitting.ts`),
 * which shows the same hub, battle and result screens plus the lobby. The flow holds the
 * session's state and knows nothing about Phaser; `director.ts` shows its screens.
 */

import {
  roundMove,
  roundRelease,
  roundScout,
  roundSignScouted,
  type Bid,
  type CrewId,
  type CrewIdentity,
  type CrewNameError,
  type League,
  type LeagueBattleStyle,
  type Place,
  type Result,
  type RoundState,
  type UnitId,
} from '../core';
import { parseRoomCode, ROOM_CODE_LENGTH, type Network } from '../net';
import type { HubController, HubState, LobbyController, Refusal } from '../render';
import {
  loadLeague,
  savedCrewId,
  saveLeague,
  type KeyValueStore,
  type StorageError,
} from './leagueStorage';
import {
  lockInAndPlay,
  newLocalLeague,
  openRound,
  playerBids,
  type BotCount,
  type PlayedRound,
  type PlayerBattle,
} from './localLeague';
import { hostSitting, joinSitting, type Sitting, type SittingScreen } from './sitting';

/** Why the title screen shows a note. */
export type TitleNotice = Exclude<StorageError, 'noSave'> | 'noPlayer';

export type Screen =
  | { readonly kind: 'title'; readonly canContinue: boolean; readonly notice: TitleNotice | null }
  | {
      readonly kind: 'founding';
      /** Set when the crew is founded to join a friend's league (D-080). */
      readonly joining: { readonly replaces: string | null } | null;
      readonly notice: string | null;
    }
  | { readonly kind: 'join'; readonly codeLength: number }
  | { readonly kind: 'lobby' }
  | { readonly kind: 'hub' }
  | { readonly kind: 'battle'; readonly battle: PlayerBattle }
  | {
      readonly kind: 'result';
      readonly crewId: CrewId;
      readonly played: PlayedRound;
      /** Whether the completed round reached the browser's storage. */
      readonly saved: boolean;
    };

export interface FlowDeps {
  /** `null` where the browser blocks storage: the game still plays, but can't be continued. */
  readonly store: KeyValueStore | null;
  /** A fresh league seed. */
  readonly newSeed: () => number;
  /** Where sittings with friends connect (PeerJS, or in memory in tests). */
  readonly network: Network;
  /** Uniform in [0, 1), for room codes. */
  readonly random: () => number;
}

export interface GameFlow {
  screen(): Screen;
  /** Calls `listener` after every change of screen or hub state. */
  subscribe(listener: () => void): () => void;
  /** Title: found a new crew and league. It replaces the saved league once founded. */
  newLeague(): void;
  /** Title: carry on with the saved league. */
  continueLeague(): void;
  /**
   * Founding: create the league with the player's crew and the bots, or, when joining, ask
   * the host to add the crew (the answer comes later).
   */
  found(
    identity: CrewIdentity,
    bots: BotCount,
    battleStyle?: LeagueBattleStyle,
  ): Result<null, CrewNameError>;
  /** Founding: back to the title (leaving the sitting when joining). */
  cancelFounding(): void;
  /** Title: host a sitting of the saved league. */
  hostSitting(): void;
  /** Title: join a sitting by its room code. */
  joinSitting(): void;
  /** Join: connect to the room with the typed code. */
  join(code: string): Result<null, 'badCode'>;
  /** Join: back to the title. */
  cancelJoin(): void;
  /** The lobby's state and actions, while the lobby is shown. */
  lobby(): LobbyController | null;
  /** The hub's state and actions, while the hub is shown. */
  hub(): HubController | null;
  /** Battle: the playback is over. */
  battleWatched(): void;
  /** Result: on to the next round. */
  nextRound(): void;
  /** The page is going away: leave the sitting at once, so the others know (D-085). */
  shutdown(): void;
}

/** A local league's round in progress. */
interface Session {
  crewId: CrewId;
  hub: HubState;
}

export function createGameFlow(deps: FlowDeps): GameFlow {
  let screen: Screen = titleScreen(null);
  let session: Session | null = null;
  /** The result screen that follows the battle being watched, in a local league. */
  let pendingResult: Screen | null = null;
  let sitting: Sitting | null = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of [...listeners]) listener();
  }
  function show(next: Screen): void {
    screen = next;
    notify();
  }
  function saved(): Result<League, StorageError> {
    return deps.store === null ? { ok: false, error: 'unavailable' } : loadLeague(deps.store);
  }
  function titleScreen(notice: TitleNotice | null): Screen {
    return { kind: 'title', canContinue: saved().ok, notice };
  }
  function toTitle(notice: TitleNotice | null): void {
    session = null;
    sitting?.close();
    sitting = null;
    show(titleScreen(notice));
  }
  function crewOf(league: League): CrewId | null {
    return deps.store === null ? null : savedCrewId(deps.store, league);
  }
  function save(league: League, crewId?: CrewId): boolean {
    return deps.store !== null && saveLeague(deps.store, league, crewId).ok;
  }

  function enterRound(league: League, crewId: CrewId): void {
    const opened = openRound(league, crewId);
    session = {
      crewId,
      hub: {
        league,
        round: opened.state,
        crewId,
        start: opened.report,
        lastAwards: null,
        sitting: null,
      },
    };
    show({ kind: 'hub' });
  }

  /** Applies a shop action to the live round and reports a refusal by its reason. */
  function act(change: (round: RoundState, crewId: CrewId) => Result<RoundState, string>): Refusal {
    if (session === null || screen.kind !== 'hub') return 'noRound';
    const changed = change(session.hub.round, session.crewId);
    if (!changed.ok) return changed.error;
    session.hub = { ...session.hub, round: changed.value };
    notify();
    return null;
  }

  const localHub: HubController = {
    isOpen: () => session !== null && screen.kind === 'hub',
    state: () => {
      if (session === null) throw new RangeError('hub: no round is open');
      return session.hub;
    },
    subscribe: (listener) => subscribe(listener),
    bid: (bids: readonly Bid[]) => {
      if (session === null || screen.kind !== 'hub') return 'noRound';
      const done = playerBids(session.hub.round, session.crewId, bids);
      if (!done.ok) return done.error;
      session.hub = { ...session.hub, round: done.value.state, lastAwards: done.value.awards };
      notify();
      return null;
    },
    scout: () => act((round, crewId) => roundScout(round, crewId)),
    signScouted: (unitId: UnitId) =>
      act((round, crewId) => {
        const signed = roundSignScouted(round, crewId, unitId);
        return signed.ok ? { ok: true, value: signed.value.state } : signed;
      }),
    release: (unitId: UnitId) => act((round, crewId) => roundRelease(round, crewId, unitId)),
    move: (unitId: UnitId, to: Place) =>
      act((round, crewId) => roundMove(round, crewId, unitId, to)),
    lockIn: () => {
      if (session === null || screen.kind !== 'hub') return 'noRound';
      const played = lockInAndPlay(session.hub.round, session.crewId);
      if (!played.ok) return played.error;
      const result: Screen = {
        kind: 'result',
        crewId: session.crewId,
        played: played.value,
        saved: save(played.value.finished.league, session.crewId),
      };
      pendingResult = result;
      show(played.value.battle === null ? result : { kind: 'battle', battle: played.value.battle });
      return null;
    },
    // A local league has nobody to nudge.
    nudge: () => undefined,
    quitToTitle: () => {
      toTitle(null);
    },
  };
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /** How a sitting shows its screens and saves its league. */
  const shell = {
    show: (next: SittingScreen): void => {
      show(next);
    },
    changed: notify,
    left: () => {
      sitting = null;
      show(titleScreen(null));
    },
    save: (league: League, crewId: CrewId) => save(league, crewId),
  };

  return {
    screen: () => screen,
    subscribe,
    newLeague: () => {
      if (screen.kind === 'title') show({ kind: 'founding', joining: null, notice: null });
    },
    continueLeague: () => {
      if (screen.kind !== 'title') return;
      const loaded = saved();
      if (!loaded.ok) {
        show(titleScreen(loaded.error === 'noSave' ? null : loaded.error));
        return;
      }
      const crewId = crewOf(loaded.value);
      if (crewId === null) show(titleScreen('noPlayer'));
      else enterRound(loaded.value, crewId);
    },
    found: (identity, bots, battleStyle) => {
      if (screen.kind !== 'founding') return { ok: true, value: null };
      if (screen.joining !== null) {
        sitting?.found(identity);
        return { ok: true, value: null };
      }
      const created = newLocalLeague(deps.newSeed(), identity, bots, battleStyle);
      if (!created.ok) return created;
      const crewId = crewOf(created.value) ?? 'c1';
      save(created.value, crewId);
      enterRound(created.value, crewId);
      return { ok: true, value: null };
    },
    cancelFounding: () => {
      if (screen.kind === 'founding') toTitle(null);
    },
    hostSitting: () => {
      if (screen.kind !== 'title') return;
      const loaded = saved();
      if (!loaded.ok) {
        show(titleScreen(loaded.error === 'noSave' ? null : loaded.error));
        return;
      }
      const crewId = crewOf(loaded.value);
      if (crewId === null) {
        show(titleScreen('noPlayer'));
        return;
      }
      sitting = hostSitting(
        { network: deps.network, random: deps.random, league: loaded.value, crewId },
        shell,
      );
      show({ kind: 'lobby' });
    },
    joinSitting: () => {
      if (screen.kind === 'title') show({ kind: 'join', codeLength: ROOM_CODE_LENGTH });
    },
    join: (typed) => {
      if (screen.kind !== 'join') return { ok: true, value: null };
      const code = parseRoomCode(typed);
      if (code === null) return { ok: false, error: 'badCode' };
      const loaded = saved();
      const league = loaded.ok ? loaded.value : null;
      sitting = joinSitting(
        {
          network: deps.network,
          code,
          saved: league,
          savedCrewId: league === null ? null : crewOf(league),
        },
        shell,
      );
      show({ kind: 'lobby' });
      return { ok: true, value: null };
    },
    cancelJoin: () => {
      if (screen.kind === 'join') show(titleScreen(null));
    },
    lobby: () => (sitting !== null && screen.kind === 'lobby' ? sitting.lobby : null),
    hub: () => {
      if (screen.kind !== 'hub') return null;
      if (sitting !== null) return sitting.hub();
      return session !== null ? localHub : null;
    },
    battleWatched: () => {
      if (screen.kind !== 'battle') return;
      if (sitting !== null) sitting.battleWatched();
      else if (pendingResult !== null) show(pendingResult);
    },
    nextRound: () => {
      if (screen.kind !== 'result') return;
      if (sitting !== null) {
        sitting.nextRound();
        return;
      }
      pendingResult = null;
      enterRound(screen.played.finished.league, screen.crewId);
    },
    shutdown: () => {
      sitting?.close();
      sitting = null;
    },
  };
}
