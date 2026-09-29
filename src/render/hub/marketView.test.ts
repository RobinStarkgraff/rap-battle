import { describe, expect, it } from 'vitest';
import { askPrice, createLeague, startRound, type CrewIdentity, type Unit } from '../../core';
import {
  abilityText,
  createMarketUi,
  draftBids,
  draftProblem,
  marketTable,
  sortRows,
  statsText,
  statsValue,
} from './marketView';
import type { HubState } from './types';

const IDENTITY: CrewIdentity = {
  name: 'Soggy Biscuits',
  mainColour: 'teal',
  trimColour: 'white',
  logo: 'crown',
};

function hubState(): HubState {
  const created = createLeague(5, [{ playerName: 'You', identity: IDENTITY }], 3);
  if (!created.ok) throw new Error(created.error);
  const started = startRound(created.value);
  return {
    league: created.value,
    round: started.state,
    crewId: 'c1',
    start: started.report,
    lastAwards: null,
  };
}

describe('market table', () => {
  const state = hubState();

  it('lists the public list, sorted by ask with the priciest first', () => {
    const table = marketTable(state, createMarketUi());
    expect(table.scouted).toEqual([]);
    expect(table.publicList).toHaveLength(state.round.market.publicList.length);
    const asks = table.publicList.map((row) => row.ask);
    expect(asks).toEqual([...asks].sort((x, y) => y - x));
  });

  it('filters by role and archetype', () => {
    const ui = { ...createMarketUi(), role: 'mc' as const };
    expect(marketTable(state, ui).publicList.every((row) => row.unit.role === 'mc')).toBe(true);
    const archetype = state.round.market.publicList[0]?.archetype ?? 'dj';
    const byType = marketTable(state, { ...createMarketUi(), archetype }).publicList;
    expect(byType.length).toBeGreaterThan(0);
    expect(byType.every((row) => row.unit.archetype === archetype)).toBe(true);
  });

  it('sorts by every column both ways, keeping market order on ties', () => {
    const rows = marketTable(state, createMarketUi()).publicList;
    const names = sortRows(rows, 'name', false).map((row) => row.unit.stageName);
    expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y)));
    expect(sortRows(rows, 'name', true).map((row) => row.unit.stageName)).toEqual(
      [...names].reverse(),
    );
    for (const key of ['type', 'stats', 'abilities', 'age', 'ask', 'salary'] as const) {
      expect(sortRows(rows, key, false)).toHaveLength(rows.length);
    }
    const ties = sortRows(
      rows.map((row) => ({ ...row, ask: 1 })),
      'ask',
      false,
    );
    expect(ties.map((row) => row.unit.id)).toEqual(rows.map((row) => row.unit.id));
  });

  it('marks draft bids and checks them against the bid rules', () => {
    const unit = state.round.market.publicList[0];
    if (unit === undefined) throw new Error('empty market');
    const ui = createMarketUi();
    expect(draftProblem(state, ui, { unitId: unit.id, amount: askPrice(unit) - 1 })).toBe(
      'belowAsk',
    );
    expect(draftProblem(state, ui, { unitId: unit.id, amount: askPrice(unit) })).toBeNull();
    ui.draft.set(unit.id, askPrice(unit));
    ui.draft.set('gone', 3);
    expect(draftBids(state, ui)).toEqual([{ unitId: unit.id, amount: askPrice(unit) }]);
    expect(marketTable(state, ui).publicList.find((row) => row.unit.id === unit.id)?.bid).toBe(
      askPrice(unit),
    );
    expect(draftProblem(state, ui, { unitId: unit.id, amount: 99 })).toBe('cannotAfford');
  });
});

describe('unit text', () => {
  const mc: Unit = {
    id: 'm',
    role: 'mc',
    archetype: 'lyricist',
    flow: 4,
    confidence: 2,
    abilities: [{ id: 'wordplay', power: 1 }],
    xp: 0,
    age: 19,
    salary: 3,
    look: 1,
    stageName: 'Lil Syntax',
    record: { battles: 0, barsLanded: 0, chokes: 0, wins: 0, crews: [] },
  };

  it('shows stats and ability values', () => {
    expect(statsText(mc)).toBe('4 / 2');
    expect(statsValue(mc)).toBe(6);
    expect(abilityText({ id: 'wordplay', power: 1 })).toBe(
      'After its bar: diss the enemy front MC for a third of the hype (hype ÷ 3 damage)',
    );
    expect(abilityText({ id: 'hype-wave', power: 3 })).toContain('(+hype ÷ 3 + 2 flow)');
    expect(abilityText({ id: 'street-poet', power: 1 })).toContain('(+2 flow, +2 confidence)');
    expect(abilityText({ id: 'negotiator', power: 3 })).toContain('(2 gold)');
    expect(abilityText({ id: 'studio-session', power: 1 })).toContain('(1 xp)');
    expect(abilityText({ id: 'crowd-mix', power: 2 })).toContain('(2 hype)');
  });
});
