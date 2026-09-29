import { describe, expect, it } from 'vitest';
import type { BattleEvent, BattleLineup } from '../model';
import { plainMc } from '../testing/fixtures';
import { battleMvp, damageTable } from './mvp';
import { simulateBattle } from './simulate';

const a: BattleLineup = {
  id: 'a',
  mcSlots: [plainMc('a1', 2, 3), plainMc('a2', 2, 3), null],
  supportSlots: [null, null],
};
const b: BattleLineup = {
  id: 'b',
  mcSlots: [plainMc('b1', 2, 3), null, plainMc('b3', 2, 3)],
  supportSlots: [null, null],
};

function log(winner: 'a' | 'b', hits: readonly [string, number][]): BattleEvent[] {
  return [
    { kind: 'start', opener: 'a' },
    ...hits.map(([unitId, damage]): BattleEvent => ({
      kind: 'bar',
      side: unitId.startsWith('a') ? 'a' : 'b',
      unitId,
      targetId: unitId.startsWith('a') ? 'b1' : 'a1',
      damage,
    })),
    { kind: 'end', winner, reason: 'wipeout', margin: 1 },
  ];
}

describe('battleMvp', () => {
  it('is the MC that dealt the most damage, bars and disses together', () => {
    const events: BattleEvent[] = [
      ...log('a', [
        ['a1', 2],
        ['b1', 3],
      ]).slice(0, -1),
      { kind: 'diss', side: 'a', unitId: 'a2', abilityId: 'clapback', targetId: 'b1', damage: 4 },
      { kind: 'end', winner: 'a', reason: 'wipeout', margin: 1 },
    ];
    expect(battleMvp(events, a, b)).toEqual({ unitId: 'a2', side: 'a', damage: 4 });
  });

  it('breaks ties for the winning crew, then the earlier slot', () => {
    expect(
      battleMvp(
        log('b', [
          ['a1', 2],
          ['b3', 2],
        ]),
        a,
        b,
      )?.unitId,
    ).toBe('b3');
    expect(
      battleMvp(
        log('a', [
          ['a2', 2],
          ['a1', 2],
        ]),
        a,
        b,
      )?.unitId,
    ).toBe('a1');
  });

  it('is nobody when no MC dealt damage', () => {
    expect(battleMvp(log('a', []), a, b)).toBeNull();
  });

  it('lists every MC of both crews', () => {
    const table = damageTable(simulateBattle(a, b, 3), a, b);
    expect(table.map((row) => row.unitId).sort()).toEqual(['a1', 'a2', 'b1', 'b3']);
    const total = simulateBattle(a, b, 3)
      .filter((event) => event.kind === 'bar' || event.kind === 'diss')
      .reduce((sum, event) => sum + event.damage, 0);
    expect(table.reduce((sum, row) => sum + row.damage, 0)).toBe(total);
  });
});
