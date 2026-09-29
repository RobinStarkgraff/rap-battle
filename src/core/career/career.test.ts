import { describe, expect, it } from 'vitest';
import { salaryFor, type Market } from '../market';
import { findUnit, type BattleEvent, type Crew, type Unit } from '../model';
import { createRng } from '../rng';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { TUNABLES } from '../tunables';
import { applyBattleResult } from './battleResult';
import { ageUnits, recordSeason, renegotiateSalaries, retireUnits } from './seasonEnd';
import { upkeep } from './upkeep';

const rng = createRng(1);

function market(...units: Unit[]): Market {
  return { publicList: units, nextUnitNumber: 1 };
}

function withStints<T extends Unit>(unit: T, ...crewIds: string[]): T {
  return {
    ...unit,
    record: {
      ...unit.record,
      crews: crewIds.map((crewId) => ({ crewId, battles: 1, seasons: 0 })),
    },
  };
}

describe('upkeep', () => {
  it('pays BASE_INCOME, plus WIN_BONUS after a win', () => {
    const { BASE_INCOME, WIN_BONUS } = TUNABLES;
    expect(upkeep(crew({ wallet: 1 }), false, rng)).toMatchObject({
      income: BASE_INCOME,
      lostToCap: 0,
    });
    expect(upkeep(crew({ wallet: 1 }), false, rng).crew.wallet).toBe(1 + BASE_INCOME);
    expect(upkeep(crew({ wallet: 1 }), true, rng).crew.wallet).toBe(1 + BASE_INCOME + WIN_BONUS);
  });

  it('resolves upkeep abilities before the wallet cap', () => {
    const manager = support({ id: 'boss', archetype: 'manager', abilities: [['negotiator', 3]] });
    const subject = crew({ wallet: 5, supports: [manager] });
    const outcome = upkeep(subject, true, rng);
    // 5 + 18 + 2 + Negotiator's 3 = 28, capped at 25.
    expect(outcome.crew.wallet).toBe(TUNABLES.WALLET_CAP);
    expect(outcome.lostToCap).toBe(3);
    expect(outcome.events).toContainEqual({
      kind: 'gold',
      unitId: 'boss',
      abilityId: 'negotiator',
      amount: 3,
    });
  });

  it('gives Studio Session xp, which can grow the MC at once', () => {
    const producer = support({
      id: 'p',
      archetype: 'producer',
      abilities: [['studio-session', 3]],
    });
    const subject = crew({ supports: [producer], bench: [mc({ id: 'm', xp: 1, flow: 2 })] });
    const after = upkeep(subject, false, rng).crew;
    const grown = findUnit(after, 'm');
    expect(grown?.xp).toBe(4);
    if (grown?.role !== 'mc') throw new Error('not an MC');
    expect(grown.flow + grown.confidence).toBe(2 + 3 + 1);
  });
});

describe('applyBattleResult', () => {
  const opener = mc({ id: 'm1' });
  const closer = mc({ id: 'm3', xp: TUNABLES.GROWTH_XP - 1 });
  const dj = support({ id: 's1', abilities: ['scratch'] });
  const benched = mc({ id: 'b1' });
  const subject = crew({ id: 'c', mcs: [opener, null, closer], supports: [dj], bench: [benched] });
  const events: BattleEvent[] = [
    { kind: 'start', opener: 'a' },
    { kind: 'bar', side: 'a', unitId: 'm1', targetId: 'x', damage: 2 },
    { kind: 'bar', side: 'b', unitId: 'x', targetId: 'm1', damage: 3 },
    { kind: 'choke', side: 'a', unitId: 'm1' },
    { kind: 'bar', side: 'a', unitId: 'm3', targetId: 'x', damage: 2 },
    { kind: 'bar', side: 'a', unitId: 'm3', targetId: 'x', damage: 2 },
    { kind: 'end', winner: 'a', reason: 'wipeout', margin: 1 },
  ];

  it('counts battles, bars, chokes and wins for active units and their stint', () => {
    const { crew: after } = applyBattleResult(subject, events, true, rng);
    expect(findUnit(after, 'm1')?.record).toEqual({
      battles: 1,
      barsLanded: 1,
      chokes: 1,
      wins: 1,
      crews: [{ crewId: 'c', battles: 1, seasons: 0 }],
    });
    expect(findUnit(after, 'm3')?.record).toMatchObject({ battles: 1, barsLanded: 2, chokes: 0 });
    expect(findUnit(after, 's1')?.record).toMatchObject({ battles: 1, barsLanded: 0, wins: 1 });
    expect(findUnit(after, 'b1')).toEqual(benched);
    expect(applyBattleResult(subject, events, false, rng).crew.mcSlots[0]?.record.wins).toBe(0);
  });

  it('gives 1 xp per active unit, with growth steps', () => {
    const { crew: after, growth } = applyBattleResult(subject, events, true, createRng(4));
    expect(findUnit(after, 'm1')?.xp).toBe(1);
    const grown = findUnit(after, 'm3');
    expect(grown?.xp).toBe(TUNABLES.GROWTH_XP);
    expect(growth).toHaveLength(1);
    expect(growth[0]).toMatchObject({ kind: 'statUp', unitId: 'm3' });
    if (grown?.role !== 'mc') throw new Error('not an MC');
    expect(grown.flow + grown.confidence).toBe(closer.flow + closer.confidence + 1);
  });
});

describe('season end', () => {
  it('records the season result and titles', () => {
    const result = { season: 2, division: 0, position: 1, wins: 5, losses: 1, points: 15 };
    const titles = [
      { kind: 'champion', season: 2, division: 0 },
      { kind: 'division', season: 2, division: 0 },
    ] as const;
    expect(recordSeason(crew({}), result, titles).record).toEqual({ titles, seasons: [result] });
  });

  it('retires farewell units from crews and the list into every former crew’s hall of fame', () => {
    // MCs retire at 23, so 22 is the farewell season.
    const veteran = withStints(mc({ id: 'vet', age: 22 }), 'old', 'a');
    const young = withStints(mc({ id: 'kid', age: 19 }), 'a');
    const freeAgent = withStints(mc({ id: 'fa', age: 22 }), 'a', 'b');
    const a = crew({ id: 'a', mcs: [veteran, young] });
    const b = crew({ id: 'b' });
    const old = crew({ id: 'old' });
    const result = retireUnits([a, b, old], market(freeAgent, mc({ id: 'fresh' })), 3);
    expect(result.retired.map(({ unit, fromCrewId }) => [unit.id, fromCrewId])).toEqual([
      ['vet', 'a'],
      ['fa', null],
    ]);
    const [afterA, afterB, afterOld] = result.crews;
    expect(afterA?.mcSlots.map((unit) => unit?.id ?? null)).toEqual([null, 'kid', null]);
    expect(afterA?.hallOfFame.map((entry) => entry.unit.id)).toEqual(['vet', 'fa']);
    expect(afterB?.hallOfFame.map((entry) => entry.unit.id)).toEqual(['fa']);
    expect(afterOld?.hallOfFame.map((entry) => [entry.unit.id, entry.retiredAfterSeason])).toEqual([
      ['vet', 3],
    ]);
    expect(result.market.publicList.map((unit) => unit.id)).toEqual(['fresh']);
  });

  it('counts the season in each crew unit’s stint with its current crew, retirees included', () => {
    const veteran = withStints(mc({ id: 'vet', age: 22 }), 'old', 'a');
    const young = withStints(mc({ id: 'kid', age: 19 }), 'a');
    const result = retireUnits([crew({ id: 'a', mcs: [veteran], bench: [young] })], market(), 1);
    const [a] = result.crews;
    expect(a?.bench[0]?.record.crews).toEqual([{ crewId: 'a', battles: 1, seasons: 1 }]);
    expect(a?.hallOfFame[0]?.unit.record.crews).toEqual([
      { crewId: 'old', battles: 1, seasons: 0 },
      { crewId: 'a', battles: 1, seasons: 1 },
    ]);
  });

  it('ages every remaining unit and announces the new farewell tours', () => {
    const a = crew({ id: 'a', mcs: [mc({ id: 'm', age: 21 })], bench: [mc({ id: 'b', age: 18 })] });
    const supportUnit = { ...support({ id: 's', abilities: ['remix'] }), age: 23 };
    const result = ageUnits([a], market(supportUnit));
    expect(result.crews[0]?.mcSlots[0]?.age).toBe(22);
    expect(result.crews[0]?.bench[0]?.age).toBe(19);
    expect(result.market.publicList[0]?.age).toBe(24);
    expect(result.farewellTours).toEqual(['m', 's']);
  });

  it('renegotiates every crew salary from the unit’s value', () => {
    const grown = { ...plainMc('m', 5, 5), age: 20, salary: 2 };
    const steady = { ...plainMc('n', 1, 1), age: 22 };
    const fair: Crew = crew({ mcs: [grown, { ...steady, salary: salaryFor(steady) }] });
    const listed = { ...mc({ id: 'fa' }), salary: 0 };
    const result = renegotiateSalaries([fair], market(listed));
    expect(result.crews[0]?.mcSlots[0]?.salary).toBe(salaryFor(grown));
    expect(result.changes).toEqual([{ unitId: 'm', from: 2, to: salaryFor(grown) }]);
    expect(result.market.publicList[0]?.salary).toBe(salaryFor(listed));
  });
});
