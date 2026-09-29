import { describe, expect, it } from 'vitest';
import { AI_MANAGER } from '../ai';
import { allUnits } from '../model';
import { playRound } from '../round';
import { awaySummary } from './away';
import { createLeague } from './create';
import type { League } from './types';

function newLeague(): League {
  const created = createLeague(
    77,
    [
      {
        playerName: 'P1',
        identity: {
          name: 'Soggy Biscuits',
          mainColour: 'teal',
          trimColour: 'white',
          logo: 'crown',
        },
      },
    ],
    3,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function played(league: League, rounds: number): League {
  let current = league;
  for (let round = 0; round < rounds; round++) {
    current = playRound(current, () => AI_MANAGER).league;
  }
  return current;
}

describe('away summary', () => {
  const start = newLeague();
  // 4 crews play a season of 6 rounds, so round 7 is in the second season.
  const later = played(start, 7);

  it('sums up the rounds the crew played without its player', () => {
    const summary = awaySummary(start, later, 'c1');
    if (summary === null) throw new Error('no summary');
    expect(summary.rounds).toBe(7);
    expect(summary.wins + summary.losses).toBe(7);
    expect(summary.seasonsEnded).toBe(1);
    expect(summary.walletBefore).toBe(40);
    const crew = later.crews.find((candidate) => candidate.id === 'c1');
    if (crew === undefined) throw new Error('no crew');
    expect(summary.walletAfter).toBe(crew.wallet);
    // The crew started with no units, so everything it has now was signed while away.
    expect(summary.signed.map((unit) => unit.id)).toEqual(allUnits(crew).map((unit) => unit.id));
    expect(summary.released).toEqual([]);
    expect(summary.standing?.division).toBe(0);
  });

  it('counts wins across a season end and lists what left the crew', () => {
    const midway = played(start, 5);
    const summary = awaySummary(midway, later, 'c1');
    if (summary === null) throw new Error('no summary');
    expect(summary.rounds).toBe(2);
    expect(summary.wins + summary.losses).toBe(2);
    const before = midway.crews.find((crew) => crew.id === 'c1');
    const after = later.crews.find((crew) => crew.id === 'c1');
    if (before === undefined || after === undefined) throw new Error('no crew');
    const kept = new Set(allUnits(after).map((unit) => unit.id));
    const gone = allUnits(before).filter((unit) => !kept.has(unit.id));
    expect([...summary.released, ...summary.retired].map((unit) => unit.id).sort()).toEqual(
      gone.map((unit) => unit.id).sort(),
    );
    expect(summary.titles.every((title) => title.season === 1)).toBe(true);
  });

  it('is empty without a round in between or without the crew', () => {
    expect(awaySummary(later, later, 'c1')).toBeNull();
    expect(awaySummary(start, later, 'c99')).toBeNull();
  });
});
