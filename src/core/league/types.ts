/**
 * The league state (§7 League state and hosting, D-031): the whole league, which every member
 * keeps a copy of. It only changes between rounds, so it is always a clean place to stop.
 */

import type { Market } from '../market';
import type { Crew, CrewId, Side } from '../model';

/** A crew plus who runs it (§7 Members). */
export type Member =
  | { readonly kind: 'player'; readonly crewId: CrewId; readonly playerName: string }
  | { readonly kind: 'bot'; readonly crewId: CrewId };

/**
 * A division's schedule slots, top of the table order at the season start. Results and
 * pairings refer to slots, so a newcomer who takes over a bot's slot keeps its points (§7).
 */
export interface Division {
  readonly crewIds: readonly CrewId[];
}

/** Two slots of a division that meet in a round. Slot `a` is crew A of the battle. */
export interface Pairing {
  readonly a: number;
  readonly b: number;
}

export interface MatchResult {
  /** The round of the season, from 1. */
  readonly seasonRound: number;
  readonly division: number;
  readonly a: number;
  readonly b: number;
  readonly winner: Side;
  /** The winner's MCs still on stage (§5 End). */
  readonly margin: number;
}

export interface Season {
  /** From 1. One season is one year of the units' age. */
  readonly number: number;
  /** Top division first. Every division has the same even size (D-057). */
  readonly divisions: readonly Division[];
  /** Per division, the pairings of each season round (index 0 is round 1). */
  readonly schedule: readonly (readonly (readonly Pairing[])[])[];
  readonly results: readonly MatchResult[];
}

export interface League {
  /** Rolled once when the league is created; every seed outside a battle derives from it (§3). */
  readonly seed: number;
  readonly members: readonly Member[];
  /** Every member's crew, and the crews of players waiting to join. */
  readonly crews: readonly Crew[];
  readonly market: Market;
  readonly season: Season;
  /** League rounds completed over the league's life; the copy with the most wins (§7). */
  readonly completedRounds: number;
  /** The crews that won their battle in the last completed round, for `WIN_BONUS`. */
  readonly lastRoundWinners: readonly CrewId[];
  /** Crews that haven't played a round yet; they skip their first upkeep (§3). */
  readonly freshCrews: readonly CrewId[];
  /** Players who joined when no division had a bot; they join at the next season start. */
  readonly waiting: readonly CrewId[];
  /** The number in the id of the next crew. */
  readonly nextCrewNumber: number;
}
