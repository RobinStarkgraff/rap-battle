/**
 * What the lobby of a sitting shows and what it can ask for (§7 League state and hosting,
 * §11 Screens). The app implements `LobbyController`; the lobby scene only reads and calls.
 */

import type { AwaySummary, CrewIdentity } from '../../core';
import type { PlayerStatus } from '../hub/types';

export type LobbyRole = 'host' | 'guest';

/** `opening`: the room isn't open yet (or the guest is still connecting). */
export type LobbyPhase = 'opening' | 'open' | 'closed';

/**
 * A line about the round: `roundRunning` (the host's round is on; you are in it),
 * `watching` (a round is on without you; you join from the next one), or `needCrew`.
 */
export type LobbyInfo = 'roundRunning' | 'watching' | 'needCrew';

/** One person at the sitting. */
export interface LobbySeat {
  /** The crew they play, once known. */
  readonly crew: CrewIdentity | null;
  readonly isHost: boolean;
  readonly isYou: boolean;
  /** Where the player is in a running round, if their crew shops in it. */
  readonly status: PlayerStatus | null;
}

export interface LobbyState {
  readonly role: LobbyRole;
  /** The room code guests type in; `null` while the room opens. */
  readonly code: string | null;
  readonly phase: LobbyPhase;
  readonly seats: readonly LobbySeat[];
  /** A reason code to explain (see `problemText`), e.g. why the connection failed. */
  readonly notice: string | null;
  /** Whether this player may start the next round now (the host only). */
  readonly canStart: boolean;
  readonly info: LobbyInfo | null;
  /** What happened to the player's crew while an AI manager ran it (§7 AI managers). */
  readonly away: AwaySummary | null;
  /** The host's shop timer in seconds, or `null` when it is off (D-032). */
  readonly timerSeconds: number | null;
}

export interface LobbyController {
  /** Whether the lobby is still the current screen; its state is only valid while it is. */
  isOpen(): boolean;
  state(): LobbyState;
  /** Calls `listener` after every change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** The host starts the next round for everyone. */
  start(): void;
  /** The host turns the shop timer on (`SHOP_TIMER_SECONDS`) or off. */
  toggleTimer(): void;
  /** Leaves the sitting (the host closes it) and goes back to the title. */
  leave(): void;
}
