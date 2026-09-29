/**
 * The mutable state of one battle while it is simulated. It is created from the locked-in
 * lineups and never leaves `simulateBattle`, so the function stays pure.
 */

import type {
  BattleEvent,
  BattleLineup,
  EndReason,
  LearnedAbility,
  McSlot,
  Side,
  UnitAbilities,
  UnitId,
} from '../model';
import { MC_SLOTS } from '../model';
import type { Rng } from '../rng';

export interface BattleMc {
  readonly role: 'mc';
  readonly id: UnitId;
  readonly side: Side;
  /** The starting slot, which `inSlot` conditions check (§2). */
  readonly slot: McSlot;
  readonly abilities: UnitAbilities;
  flow: number;
  confidence: number;
  /** The place it held on stage when it choked (D-055); `null` while it is on stage. */
  chokedAt: number | null;
}

export interface BattleSupport {
  readonly role: 'support';
  readonly id: UnitId;
  readonly side: Side;
  readonly abilities: UnitAbilities;
}

export type BattleUnit = BattleMc | BattleSupport;

export interface CrewState {
  readonly side: Side;
  /** The MCs on stage, front first. */
  readonly stage: BattleMc[];
  /** Every unit that listens for triggers, in resolution order: MC slots 1–3, support 1–2. */
  readonly units: readonly BattleUnit[];
  hype: number;
  /** Confidence its MCs actually lost, for the turn limit (§5 End). */
  confidenceLost: number;
  /** Whether an MC of this crew has already triggered `takeFront` in this battle. */
  hasTakenFront: boolean;
}

/** An ability waiting on the FIFO queue. Its targets are picked when it resolves. */
export interface QueuedAbility {
  readonly unit: BattleUnit;
  readonly ability: LearnedAbility;
  /** The MC whose event triggered it, if any. */
  readonly triggeringId: UnitId | null;
}

export interface BattleState {
  readonly crews: Readonly<Record<Side, CrewState>>;
  readonly opener: Side;
  readonly rng: Rng;
  readonly queue: QueuedAbility[];
  readonly events: BattleEvent[];
  /** `unitId:abilityId` of every `oncePerBattle` ability that has triggered. */
  readonly usedOnce: Set<string>;
  /** The crew that lost confidence first, for the turn limit. */
  firstToLose: Side | null;
  winner: Side | null;
}

export function otherSide(side: Side): Side {
  return side === 'a' ? 'b' : 'a';
}

/** The two crews in resolution order: the opening crew first (§5 Setup). */
export function sidesInOrder(state: BattleState): readonly [Side, Side] {
  return [state.opener, otherSide(state.opener)];
}

export function isOver(state: BattleState): boolean {
  return state.winner !== null;
}

export function emit(state: BattleState, event: BattleEvent): void {
  state.events.push(event);
}

/** Ends the battle; nothing happens after this (§5 End). */
export function endBattle(state: BattleState, winner: Side, reason: EndReason): void {
  if (isOver(state)) {
    return;
  }
  state.winner = winner;
  emit(state, { kind: 'end', winner, reason, margin: state.crews[winner].stage.length });
}

export function createBattleState(
  lineups: Readonly<Record<Side, BattleLineup>>,
  opener: Side,
  rng: Rng,
): BattleState {
  assertUniqueIds(lineups);
  return {
    crews: { a: createCrewState('a', lineups.a), b: createCrewState('b', lineups.b) },
    opener,
    rng,
    queue: [],
    events: [],
    usedOnce: new Set(),
    firstToLose: null,
    winner: null,
  };
}

function createCrewState(side: Side, lineup: BattleLineup): CrewState {
  const mcs: BattleMc[] = [];
  lineup.mcSlots.forEach((unit, index) => {
    const slot = MC_SLOTS[index];
    if (unit !== null && slot !== undefined) {
      const { id, abilities, flow, confidence } = unit;
      mcs.push({ role: 'mc', id, side, slot, abilities, flow, confidence, chokedAt: null });
    }
  });
  const supports: BattleSupport[] = lineup.supportSlots
    .filter((unit) => unit !== null)
    .map(({ id, abilities }) => ({ role: 'support', id, side, abilities }));
  return {
    side,
    stage: [...mcs],
    units: [...mcs, ...supports],
    hype: 0,
    confidenceLost: 0,
    hasTakenFront: false,
  };
}

function assertUniqueIds(lineups: Readonly<Record<Side, BattleLineup>>): void {
  const ids = [lineups.a, lineups.b].flatMap((lineup) =>
    [...lineup.mcSlots, ...lineup.supportSlots].flatMap((unit) => (unit === null ? [] : [unit.id])),
  );
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('simulateBattle: unit ids must be unique across both lineups');
  }
}
