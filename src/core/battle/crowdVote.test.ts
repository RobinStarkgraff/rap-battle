import { describe, expect, it } from 'vitest';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { describeEvents, eventsOf, seedWhereOpens } from '../testing/battle';
import { TUNABLES } from '../tunables';
import { battleEnd, CROWD_VOTE, simulateBattle } from '.';

const A_OPENS = seedWhereOpens('a');

describe('the crowd vote style', () => {
  it('plays verses of TURNS_PER_VERSE turns and gives a tied verse to the crew that did not open', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 1, 30)] });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 30)] });
    expect(describeEvents(simulateBattle(a, b, A_OPENS, CROWD_VOTE))).toEqual([
      'start a',
      'front a1',
      'front b1',
      'verse 1',
      'turn 1 a',
      'bar a1>b1 1',
      'hype a +1=1',
      'turn 2 b',
      'bar b1>a1 1',
      'hype b +1=1',
      'turn 3 a',
      'bar a1>b1 1',
      'hype a +1=2',
      'turn 4 b',
      'bar b1>a1 1',
      'hype b +1=2',
      'verdict 1 b 2:2 0-1',
      'hype a -1=1',
      'hype b -1=1',
      'verse 2',
      'turn 5 a',
      'bar a1>b1 1',
      'hype a +1=2',
      'turn 6 b',
      'bar b1>a1 1',
      'hype b +1=2',
      'turn 7 a',
      'bar a1>b1 1',
      'hype a +1=3',
      'turn 8 b',
      'bar b1>a1 1',
      'hype b +1=3',
      'verdict 2 b 2:2 0-2',
      'end b crowdVote 1',
    ]);
  });

  it('gives a verse to the crew whose hype rose more', () => {
    const a = crew({
      id: 'A',
      mcs: [mc({ id: 'a1', flow: 1, confidence: 30, abilities: ['chart-topper'] })],
    });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 30)] });
    const verdicts = eventsOf(simulateBattle(a, b, A_OPENS, CROWD_VOTE), 'verdict');
    expect(verdicts.map((verdict) => [verdict.winner, verdict.gain.a, verdict.gain.b])).toEqual([
      ['a', 4, 2],
      ['a', 4, 2],
    ]);
  });

  it('breaks a tie in hype by the confidence taken in the verse', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 2, 30)] });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 30)] });
    const events = simulateBattle(a, b, A_OPENS, CROWD_VOTE);
    expect(eventsOf(events, 'verdict').map((verdict) => verdict.winner)).toEqual(['a', 'a']);
    expect(battleEnd(events)).toMatchObject({ winner: 'a', reason: 'crowdVote' });
  });

  it('counts setup hype for the first verse', () => {
    const a = crew({
      id: 'A',
      mcs: [plainMc('a1', 1, 30)],
      supports: [support({ id: 'am', archetype: 'manager', abilities: ['hometown-crowd'] })],
    });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 30)] });
    const [first] = eventsOf(simulateBattle(a, b, A_OPENS, CROWD_VOTE), 'verdict');
    expect(first).toMatchObject({ winner: 'a', gain: { a: 3, b: 2 } });
  });

  it('plays the third verse when the first two are split', () => {
    // A gets hype from Chart Topper in the first verse only: its MC chokes in the second.
    const a = crew({
      id: 'A',
      mcs: [
        mc({ id: 'a1', flow: 1, confidence: 3, abilities: ['chart-topper'] }),
        plainMc('a2', 1, 30),
        plainMc('a3', 1, 30),
      ],
    });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 30)] });
    const events = simulateBattle(a, b, A_OPENS, CROWD_VOTE);
    const verdicts = eventsOf(events, 'verdict');
    expect(verdicts.map((verdict) => verdict.winner)).toEqual(['a', 'b', 'b']);
    expect(verdicts.at(-1)?.verses).toEqual({ a: 1, b: 2 });
    expect(eventsOf(events, 'turn')).toHaveLength(TUNABLES.VERSES * TUNABLES.TURNS_PER_VERSE);
  });

  it('still ends at once when a crew is wiped out', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 3, 30)] });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 5)] });
    const events = simulateBattle(a, b, A_OPENS, CROWD_VOTE);
    expect(battleEnd(events)).toMatchObject({ winner: 'a', reason: 'wipeout', margin: 1 });
    expect(eventsOf(events, 'verdict')).toHaveLength(0);
    expect(describeEvents(events).slice(-4)).toEqual([
      'choke b1',
      'hype b -1=0',
      'hype a +2=4',
      'end a wipeout 1',
    ]);
  });

  it('lets a crew without MCs lose before the first verse', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 1, 3)] });
    const events = simulateBattle(a, crew({ id: 'B' }), A_OPENS, CROWD_VOTE);
    expect(describeEvents(events)).toEqual(['start a', 'end a noMcs 1']);
  });
});
