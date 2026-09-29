/**
 * Determinism and property tests over many random battles (T-015): the same seed always
 * gives the same log, and every battle ends with exactly one winner after a consistent log.
 */
import { describe, expect, it } from 'vitest';
import type { BattleEvent, BattleLineup, Side, UnitId } from '../model';
import { createRng } from '../rng';
import { describeEvents, eventsOf } from '../testing/battle';
import { randomLineup, type RandomLineupOptions } from '../testing/randomLineup';
import { TUNABLES } from '../tunables';
import { battleEnd, simulateBattle } from '.';

const BATTLES = 400;

interface Case {
  readonly a: BattleLineup;
  readonly b: BattleLineup;
  readonly seed: number;
}

function randomCases(count: number, seed: number, options: RandomLineupOptions = {}): Case[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => ({
    a: randomLineup('a', rng, options),
    b: randomLineup('b', rng, options),
    seed: rng.nextUint32(),
  }));
}

// Real battles are short (D-054), so marathon lineups with extra confidence reach MAX_TURNS.
const CASES = [
  ...randomCases(BATTLES, 2026),
  ...randomCases(BATTLES / 4, 2027, { confidenceBonus: 20 }),
];
const RESULTS = CASES.map((each) => ({
  ...each,
  events: simulateBattle(each.a, each.b, each.seed),
}));

function stageIds(lineup: BattleLineup): UnitId[] {
  return lineup.mcSlots.flatMap((unit) => (unit === null ? [] : [unit.id]));
}

/** Replays which MCs are still on stage from the start lineup and the `choke` events. */
function remainingOnStage(
  lineup: BattleLineup,
  side: Side,
  events: readonly BattleEvent[],
): UnitId[] {
  const choked = new Set(
    eventsOf(events, 'choke')
      .filter((event) => event.side === side)
      .map((event) => event.unitId),
  );
  return stageIds(lineup).filter((id) => !choked.has(id));
}

describe('determinism', () => {
  it('gives the same log for the same lineups and seed', () => {
    for (const { a, b, seed, events } of RESULTS.slice(0, 100)) {
      expect(simulateBattle(a, b, seed)).toEqual(events);
    }
  });

  it('gives different logs for different seeds, at least sometimes', () => {
    const differ = RESULTS.slice(0, 50).filter(
      ({ a, b, seed, events }) =>
        JSON.stringify(simulateBattle(a, b, seed + 1)) !== JSON.stringify(events),
    );
    expect(differ.length).toBeGreaterThan(25);
  });

  it('pins one battle log, so a change to the rules or the RNG shows up here', () => {
    const [first] = RESULTS;
    expect(describeEvents(first?.events ?? [])).toMatchSnapshot();
  });
});

describe('every battle', () => {
  it('ends with exactly one end event, last, naming one winner', () => {
    for (const { events } of RESULTS) {
      expect(eventsOf(events, 'end')).toHaveLength(1);
      const end = battleEnd(events);
      expect(['a', 'b']).toContain(end.winner);
    }
  });

  it('starts with the coin flip and keeps turns alternating from the opener', () => {
    for (const { events } of RESULTS) {
      const [start] = events;
      if (start?.kind !== 'start') throw new Error('no start event');
      const turns = eventsOf(events, 'turn');
      expect(turns.length).toBeLessThanOrEqual(TUNABLES.MAX_TURNS);
      turns.forEach((turn, index) => {
        expect(turn.turn).toBe(index + 1);
        expect(turn.side === start.opener).toBe(index % 2 === 0);
      });
    }
  });

  it('ends in a way that matches the stage', () => {
    for (const { a, b, events } of RESULTS) {
      const end = battleEnd(events);
      const loser: Side = end.winner === 'a' ? 'b' : 'a';
      const lineups = { a, b };
      const winnerLeft = remainingOnStage(lineups[end.winner], end.winner, events);
      const loserLeft = remainingOnStage(lineups[loser], loser, events);
      expect(end.margin).toBe(winnerLeft.length);
      if (end.reason === 'wipeout') {
        expect(loserLeft).toEqual([]);
        expect(end.margin).toBeGreaterThan(0);
      }
      if (end.reason === 'noMcs') {
        expect(stageIds(lineups[loser])).toEqual([]);
      }
      if (end.reason === 'turnLimit') {
        expect(eventsOf(events, 'turn')).toHaveLength(TUNABLES.MAX_TURNS);
        expect(loserLeft.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps hype within 0 and HYPE_MAX, and damage never negative', () => {
    for (const { events } of RESULTS) {
      for (const event of eventsOf(events, 'hype')) {
        expect(event.hype).toBeGreaterThanOrEqual(0);
        expect(event.hype).toBeLessThanOrEqual(TUNABLES.HYPE_MAX);
        expect(event.change).not.toBe(0);
      }
      for (const event of eventsOf(events, 'bar', 'diss')) {
        expect(event.damage).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('only lets MCs on stage drop bars and chokes each MC at most once', () => {
    for (const { events } of RESULTS) {
      const choked = new Set<UnitId>();
      for (const event of events) {
        if (event.kind === 'bar') {
          expect(choked.has(event.unitId)).toBe(false);
          expect(choked.has(event.targetId)).toBe(false);
        }
        if (event.kind === 'choke') {
          expect(choked.has(event.unitId)).toBe(false);
          choked.add(event.unitId);
        }
      }
    }
  });

  it('covers every end reason and every ability across the random battles', () => {
    const reasons = new Set(RESULTS.map(({ events }) => battleEnd(events).reason));
    expect(reasons).toEqual(new Set(['wipeout', 'noMcs', 'turnLimit']));
    const resolved = new Set(
      RESULTS.flatMap(({ events }) => eventsOf(events, 'ability').map((event) => event.abilityId)),
    );
    // Every ability that can trigger in a battle (not sign or upkeep ones).
    expect(resolved.size).toBe(32 - 4);
  });
});
