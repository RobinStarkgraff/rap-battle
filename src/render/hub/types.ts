/**
 * What the home hub shows and what it can ask for (§11 Screens, D-050). The app implements
 * `HubController`; the hub scene only reads the state and calls the actions.
 */

import type {
  Award,
  Bid,
  CrewId,
  League,
  Place,
  RoundStartReport,
  RoundState,
  UnitId,
} from '../../core';

export const HUB_TABS = ['home', 'market', 'lineup', 'league', 'hall'] as const;
export type HubTab = (typeof HUB_TABS)[number];

export interface HubState {
  /** The league at the start of the round: standings, schedule and the other crews. */
  readonly league: League;
  /** The live round: the market, every crew's shop and the bidding. */
  readonly round: RoundState;
  readonly crewId: CrewId;
  readonly start: RoundStartReport;
  /** The awards of the last revealed bidding round, until the next one. */
  readonly lastAwards: readonly Award[] | null;
}

/** `null` if the action happened, else the reason code it was refused with. */
export type Refusal = string | null;

export interface HubController {
  /** Whether the hub is still the current screen; its state is only valid while it is. */
  isOpen(): boolean;
  state(): HubState;
  /** Calls `listener` after every change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Places the sealed bids for the open bidding round; an empty list passes. */
  bid(bids: readonly Bid[]): Refusal;
  scout(): Refusal;
  signScouted(unitId: UnitId): Refusal;
  release(unitId: UnitId): Refusal;
  move(unitId: UnitId, to: Place): Refusal;
  lockIn(): Refusal;
  quitToTitle(): void;
}
