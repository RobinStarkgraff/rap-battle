import { describe, expect, it } from 'vitest';
import {
  AI_MANAGER,
  createLeague,
  finishRound,
  lockInOrForce,
  resolveBids,
  startRound,
  type Crew,
  type CrewIdentity,
  type League,
  type RoundFinished,
} from '../../core';
import { growthLine, resultView, type ResultInput } from './view';

const IDENTITY: CrewIdentity = {
  name: 'Soggy Biscuits',
  mainColour: 'teal',
  trimColour: 'white',
  logo: 'crown',
};

/** Plays a round with the AI manager for every crew and keeps the crews as they locked in. */
function playRound(league: League): { finished: RoundFinished; locked: Map<string, Crew> } {
  let state = startRound(league).state;
  const ids = state.shops.map((shop) => shop.crew.id);
  while (!state.bidding.ended) {
    for (const id of ids) state = AI_MANAGER.bid(state, id);
    const revealed = resolveBids(state);
    if (!revealed.ok) throw new Error(revealed.error);
    state = revealed.value.state;
  }
  for (const id of ids) state = lockInOrForce(AI_MANAGER.lineup(state, id), id);
  const locked = new Map(state.shops.map((shop) => [shop.crew.id, shop.crew]));
  const finished = finishRound(state);
  if (!finished.ok) throw new Error(finished.error);
  return { finished: finished.value, locked };
}

function inputFor(finished: RoundFinished, locked: Map<string, Crew>): ResultInput {
  const report = finished.battles.find((battle) => battle.crewA === 'c1' || battle.crewB === 'c1');
  if (report === undefined) throw new Error('no battle');
  const a = locked.get(report.crewA);
  const b = locked.get(report.crewB);
  if (a === undefined || b === undefined) throw new Error('no crews');
  return {
    crewId: 'c1',
    finished,
    battle: { report, crews: { a, b }, playerSide: report.crewA === 'c1' ? 'a' : 'b' },
  };
}

function newLeague(): League {
  const created = createLeague(8, [{ playerName: 'You', identity: IDENTITY }], 3);
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

describe('resultView', () => {
  it('has a headline, an MVP, the player’s lines, the other battle and the table', () => {
    const { finished, locked } = playRound(newLeague());
    const view = resultView(inputFor(finished, locked));
    expect(view.headline).toBe(view.headline.toUpperCase());
    expect(view.headline).not.toMatch(/[{}]/);
    expect(view.mvp?.damage).toBeGreaterThan(0);
    expect(view.won).toBe(finished.battles.some((battle) => battle.winner === 'c1'));
    expect(view.crewLines[0]).toMatch(/^\+1 xp for each of your \d active units\.$/);
    expect(view.otherBattles).toHaveLength(1);
    expect(view.standings).toHaveLength(4);
    expect(view.standings.filter((row) => row.mine)).toHaveLength(1);
    expect(view.seasonLines).toEqual([]);
  });

  it('sums up the season after its last round', () => {
    let league = newLeague();
    let last = playRound(league);
    for (let round = 1; round < 6; round++) {
      league = last.finished.league;
      last = playRound(league);
    }
    expect(last.finished.seasonEnd).not.toBeNull();
    const view = resultView(inputFor(last.finished, last.locked));
    expect(view.seasonLines[0]).toBe('SEASON 1 IS OVER!');
    expect(view.seasonLines.some((line) => line.startsWith('Champions: '))).toBe(true);
    expect(view.standings.every((row) => row.played === 6)).toBe(true);
  });

  it('says so when the player had no battle', () => {
    const { finished } = playRound(newLeague());
    expect(resultView({ crewId: 'c1', finished, battle: null })).toMatchObject({
      won: null,
      mvp: null,
      headline: 'NO BATTLE FOR YOU THIS ROUND',
    });
  });

  it('describes every kind of growth', () => {
    const name = () => 'MC Waffle';
    expect(growthLine({ kind: 'statUp', unitId: 'u', stat: 'flow' }, name)).toBe(
      'MC Waffle grew: +1 flow.',
    );
    expect(growthLine({ kind: 'powerUp', unitId: 'u', abilityId: 'scratch', power: 2 }, name)).toBe(
      'MC Waffle: Scratch is now power 2.',
    );
    expect(growthLine({ kind: 'learn', unitId: 'u', abilityId: 'clapback' }, name)).toBe(
      'MC Waffle learned Clapback!',
    );
  });
});
