/**
 * The game-flow state machine (§3, §11 Screens): title → crew founding → home hub → battle →
 * result → hub, with the league saved in the browser after every completed round (D-031). It
 * holds the session's state and knows nothing about Phaser; `director.ts` shows its screens.
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
  type Place,
  type Result,
  type RoundState,
  type UnitId,
} from '../core';
import type { HubController, HubState, Refusal } from '../render';
import { loadLeague, saveLeague, type KeyValueStore, type StorageError } from './leagueStorage';
import {
  lockInAndPlay,
  newLocalLeague,
  openRound,
  playerBids,
  playerCrewId,
  type BotCount,
  type PlayedRound,
  type PlayerBattle,
} from './localLeague';

/** Why the title screen shows a note. */
export type TitleNotice = Exclude<StorageError, 'noSave'> | 'noPlayer';

export type Screen =
  | { readonly kind: 'title'; readonly canContinue: boolean; readonly notice: TitleNotice | null }
  | { readonly kind: 'founding' }
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
}

export interface GameFlow {
  screen(): Screen;
  /** Calls `listener` after every change of screen or hub state. */
  subscribe(listener: () => void): () => void;
  /** Title: found a new crew and league. It replaces the saved league once founded. */
  newLeague(): void;
  /** Title: carry on with the saved league. */
  continueLeague(): void;
  /** Founding: create the league with the player's crew and the bots. */
  found(identity: CrewIdentity, bots: BotCount): Result<null, CrewNameError>;
  /** Founding: back to the title. */
  cancelFounding(): void;
  /** The hub's state and actions, while the hub is shown. */
  hub(): HubController | null;
  /** Battle: the playback is over. */
  battleWatched(): void;
  /** Result: on to the next round. */
  nextRound(): void;
}

interface Session {
  crewId: CrewId;
  hub: HubState;
}

export function createGameFlow(deps: FlowDeps): GameFlow {
  let screen: Screen = titleScreen(null);
  let session: Session | null = null;
  /** The result screen that follows the battle being watched. */
  let pendingResult: Screen | null = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of [...listeners]) listener();
  }
  function show(next: Screen): void {
    screen = next;
    notify();
  }
  function titleScreen(notice: TitleNotice | null): Screen {
    const saved = deps.store === null ? null : loadLeague(deps.store);
    return { kind: 'title', canContinue: saved?.ok === true, notice };
  }
  function enterRound(league: League): void {
    const crewId = playerCrewId(league);
    if (crewId === null) {
      session = null;
      show(titleScreen('noPlayer'));
      return;
    }
    const opened = openRound(league, crewId);
    session = {
      crewId,
      hub: { league, round: opened.state, crewId, start: opened.report, lastAwards: null },
    };
    show({ kind: 'hub' });
  }
  function save(league: League): boolean {
    return deps.store !== null && saveLeague(deps.store, league).ok;
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

  const controller: HubController = {
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
      const saved = save(played.value.finished.league);
      const result: Screen = {
        kind: 'result',
        crewId: session.crewId,
        played: played.value,
        saved,
      };
      pendingResult = result;
      show(played.value.battle === null ? result : { kind: 'battle', battle: played.value.battle });
      return null;
    },
    quitToTitle: () => {
      session = null;
      show(titleScreen(null));
    },
  };
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    screen: () => screen,
    subscribe,
    newLeague: () => {
      if (screen.kind === 'title') show({ kind: 'founding' });
    },
    continueLeague: () => {
      if (screen.kind !== 'title') return;
      if (deps.store === null) {
        show(titleScreen('unavailable'));
        return;
      }
      const loaded = loadLeague(deps.store);
      if (!loaded.ok) {
        show(titleScreen(loaded.error === 'noSave' ? null : loaded.error));
        return;
      }
      enterRound(loaded.value);
    },
    found: (identity, bots) => {
      if (screen.kind !== 'founding') return { ok: true, value: null };
      const created = newLocalLeague(deps.newSeed(), identity, bots);
      if (!created.ok) return created;
      save(created.value);
      enterRound(created.value);
      return { ok: true, value: null };
    },
    cancelFounding: () => {
      if (screen.kind === 'founding') show(titleScreen(null));
    },
    hub: () => (session !== null && screen.kind === 'hub' ? controller : null),
    battleWatched: () => {
      if (screen.kind === 'battle' && pendingResult !== null) show(pendingResult);
    },
    nextRound: () => {
      if (screen.kind !== 'result') return;
      pendingResult = null;
      enterRound(screen.played.finished.league);
    },
  };
}
