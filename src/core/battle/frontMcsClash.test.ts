import { describe, expect, it } from 'vitest';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { describeEvents, eventsOf, seedWhereOpens } from '../testing/battle';
import { battleEnd, simulateBattle } from '.';

const A_OPENS = seedWhereOpens('a');
const B_OPENS = seedWhereOpens('b');

describe('a plain battle', () => {
  it('alternates bars from the opener until a crew is wiped out', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 2, 3)] });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 5)] });
    expect(describeEvents(simulateBattle(a, b, A_OPENS))).toEqual([
      'start a',
      'front a1',
      'front b1',
      'turn 1 a',
      'bar a1>b1 2',
      'hype a +1=1',
      'turn 2 b',
      'bar b1>a1 1',
      'hype b +1=1',
      'turn 3 a',
      'bar a1>b1 2',
      'hype a +1=2',
      'turn 4 b',
      'bar b1>a1 1',
      'hype b +1=2',
      'turn 5 a',
      'bar a1>b1 1',
      'hype a +1=3',
      'choke b1',
      'hype b -2=0',
      'hype a +2=5',
      'end a wipeout 1',
    ]);
  });

  it('lets the other crew open on the other coin flip', () => {
    const a = crew({ id: 'A', mcs: [plainMc('a1', 1, 1)] });
    const b = crew({ id: 'B', mcs: [plainMc('b1', 1, 1)] });
    expect(describeEvents(simulateBattle(a, b, B_OPENS)).slice(0, 5)).toEqual([
      'start b',
      'front b1',
      'front a1',
      'turn 1 b',
      'bar b1>a1 1',
    ]);
    expect(battleEnd(simulateBattle(a, b, B_OPENS)).winner).toBe('b');
  });

  it('moves the next MC up after a front choke; it answers on its next turn', () => {
    const a = crew({ mcs: [plainMc('a1', 3, 9)] });
    const b = crew({ mcs: [plainMc('b1', 1, 3), plainMc('b2', 1, 9)] });
    const log = describeEvents(simulateBattle(a, b, A_OPENS));
    expect(log.slice(3, 11)).toEqual([
      'turn 1 a',
      'bar a1>b1 3',
      'hype a +1=1',
      'choke b1',
      'hype a +2=3',
      'front b2',
      'turn 2 b',
      'bar b2>a1 1',
    ]);
  });

  it('skips empty MC slots, and the margin counts the MCs left on stage', () => {
    const a = crew({ mcs: [null, plainMc('a2', 5, 5), plainMc('a3', 1, 1)] });
    const b = crew({ mcs: [plainMc('b1', 1, 1)] });
    const events = simulateBattle(a, b, A_OPENS);
    expect(eventsOf(events, 'bar')[0]).toMatchObject({ unitId: 'a2' });
    expect(battleEnd(events)).toEqual({ kind: 'end', winner: 'a', reason: 'wipeout', margin: 2 });
  });

  it('does not change the lineups it was given', () => {
    const a = crew({ mcs: [mc({ id: 'a1', abilities: ['multisyllabic'] })] });
    const b = crew({ mcs: [plainMc('b1', 1, 20)] });
    const before = JSON.stringify([a, b]);
    simulateBattle(a, b, 3);
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('rejects unit ids used twice', () => {
    const a = crew({ mcs: [plainMc('x', 1, 1)] });
    expect(() => simulateBattle(a, a, 1)).toThrow(RangeError);
  });
});

describe('hype meter', () => {
  it('never goes above HYPE_MAX or below 0', () => {
    const a = crew({ mcs: [plainMc('a1', 1, 40)] });
    const b = crew({ mcs: [plainMc('b1', 1, 40)] });
    const hype = eventsOf(simulateBattle(a, b, A_OPENS), 'hype');
    expect(Math.max(...hype.map((event) => event.hype))).toBe(10);
    // At 10 a bar changes nothing, so no event is emitted for it.
    expect(hype.filter((event) => event.side === 'a')).toHaveLength(10);
  });

  it('loses hype on an own choke, never below 0', () => {
    const a = crew({ mcs: [plainMc('a1', 1, 1), plainMc('a2', 1, 1)] });
    const b = crew({ mcs: [plainMc('b1', 1, 9)] });
    const events = simulateBattle(a, b, B_OPENS);
    // b opens and chokes a1 before a has any hype: no ownChoke event.
    expect(eventsOf(events, 'hype').filter((event) => event.cause === 'ownChoke')).toEqual([
      { kind: 'hype', side: 'a', change: -1, hype: 0, cause: 'ownChoke' },
    ]);
  });
});

describe('the end of a battle', () => {
  it('loses at once without an MC on stage', () => {
    const a = crew({ supports: [support({ id: 'dj', abilities: ['crowd-mix'] })] });
    const b = crew({ mcs: [plainMc('b1', 1, 1)] });
    expect(describeEvents(simulateBattle(a, b, A_OPENS))).toEqual(['start a', 'end b noMcs 1']);
  });

  it("makes the coin flip's loser lose when neither crew has an MC", () => {
    const empty = crew({});
    expect(battleEnd(simulateBattle(empty, empty, A_OPENS))).toMatchObject({
      winner: 'a',
      reason: 'noMcs',
      margin: 0,
    });
    expect(battleEnd(simulateBattle(empty, empty, B_OPENS)).winner).toBe('b');
  });

  it('ends at MAX_TURNS; the crew that lost more confidence loses', () => {
    const a = crew({ mcs: [plainMc('a1', 1, 99)] });
    const b = crew({ mcs: [plainMc('b1', 2, 99)] });
    const events = simulateBattle(a, b, A_OPENS);
    expect(eventsOf(events, 'turn')).toHaveLength(40);
    expect(battleEnd(events)).toEqual({ kind: 'end', winner: 'b', reason: 'turnLimit', margin: 1 });
  });

  it('breaks an equal loss at MAX_TURNS against the crew that lost confidence first', () => {
    const a = crew({ mcs: [plainMc('a1', 1, 99)] });
    const b = crew({ mcs: [plainMc('b1', 1, 99)] });
    // The opener lands the first bar, so the other crew lost first.
    expect(battleEnd(simulateBattle(a, b, A_OPENS)).winner).toBe('a');
    expect(battleEnd(simulateBattle(a, b, B_OPENS)).winner).toBe('b');
  });

  it('stops an ability chain once a crew is out, so the winner is never knocked out too', () => {
    // b1's Encore would hit a1 (1 confidence) after b1 chokes, but b is already out.
    const a = crew({ mcs: [plainMc('a1', 5, 1)] });
    const b = crew({
      mcs: [mc({ id: 'b1', flow: 1, confidence: 1, archetype: 'hitmaker', abilities: ['encore'] })],
    });
    const events = simulateBattle(a, b, A_OPENS);
    expect(battleEnd(events)).toMatchObject({ winner: 'a', margin: 1 });
    expect(eventsOf(events, 'ability')).toEqual([]);
  });

  it('ends every log with exactly one end event', () => {
    const a = crew({ mcs: [plainMc('a1', 2, 2)] });
    const b = crew({ mcs: [plainMc('b1', 2, 2)] });
    const events = simulateBattle(a, b, 5);
    expect(eventsOf(events, 'end')).toHaveLength(1);
    expect(events.at(-1)?.kind).toBe('end');
    expect(() => battleEnd(events.slice(0, -1))).toThrow(RangeError);
  });
});

describe('setup', () => {
  it('runs beforeBattle, then battleStart, then takeFront, opener crew first', () => {
    const a = crew({
      mcs: [plainMc('a1', 1, 9)],
      supports: [
        support({ id: 'aw', archetype: 'vocal-coach', abilities: ['warm-up'] }),
        support({ id: 'ah', archetype: 'manager', abilities: ['hometown-crowd'] }),
      ],
    });
    const b = crew({
      mcs: [plainMc('b1', 1, 9)],
      supports: [support({ id: 'bs', abilities: ['scratch', 'hometown-crowd'] })],
    });
    const log = describeEvents(simulateBattle(a, b, B_OPENS));
    expect(log.slice(0, 16)).toEqual([
      'start b',
      'ability bs hometown-crowd',
      'hype b +1=1',
      'ability ah hometown-crowd',
      'hype a +1=1',
      'ability aw warm-up',
      'buff a1 +0/+1',
      'front b1',
      'front a1',
      'ability bs scratch',
      'diss bs>a1 1',
      'hype b +1=2',
      'turn 1 b',
      'bar b1>a1 1',
      'hype b +1=3',
      'turn 2 a',
    ]);
  });

  it('triggers takeFront only once for an MC that moved up during setup', () => {
    const a = crew({
      mcs: [
        mc({ id: 'a1', flow: 1, confidence: 5, abilities: ['headliner'] }),
        plainMc('a2', 1, 5),
      ],
    });
    const b = crew({
      mcs: [
        plainMc('b1', 1, 1),
        mc({ id: 'b2', flow: 1, confidence: 5, abilities: ['battle-kid'] }),
      ],
    });
    const log = describeEvents(simulateBattle(a, b, A_OPENS));
    expect(log.slice(0, 13)).toEqual([
      'start a',
      'ability a1 headliner',
      'diss a1>b1 1',
      'choke b1',
      'hype a +2=2',
      'front b2',
      'diss a1>b2 1',
      'hype a +1=3',
      'ability b2 battle-kid',
      'diss b2>a1 2',
      'hype b +1=1',
      'front a1',
      'turn 1 a',
    ]);
    expect(log.filter((line) => line === 'front b2')).toHaveLength(1);
  });
});

describe('the ability queue', () => {
  it('resolves barLanded, then hurt or choke, then the new front MC takeFront', () => {
    const a = crew({
      mcs: [
        mc({
          id: 'a1',
          flow: 2,
          confidence: 9,
          archetype: 'hitmaker',
          abilities: ['chart-topper'],
        }),
      ],
    });
    const b = crew({
      mcs: [
        mc({ id: 'b1', flow: 1, confidence: 2, archetype: 'hitmaker', abilities: ['encore'] }),
        mc({ id: 'b2', flow: 1, confidence: 9, abilities: ['battle-kid'] }),
      ],
    });
    const log = describeEvents(simulateBattle(a, b, A_OPENS));
    const turn1 = log.slice(log.indexOf('turn 1 a'), log.indexOf('turn 2 b'));
    expect(turn1).toEqual([
      'turn 1 a',
      'bar a1>b1 2',
      'hype a +1=1',
      'choke b1',
      'hype a +2=3',
      'front b2',
      'ability a1 chart-topper',
      'hype a +1=4',
      'ability b1 encore',
      'diss b1>a1 0',
      'ability b2 battle-kid',
      'diss b2>a1 2',
      'hype b +1=1',
    ]);
  });

  it('still resolves an ability queued before its MC choked (D-055)', () => {
    // b1's bar hurts a1 and queues Wildcard (b1), then Clapback (a1). Wildcard chokes a1
    // first; Clapback still resolves, against the enemy front.
    const a = crew({
      mcs: [mc({ id: 'a1', flow: 1, confidence: 3, abilities: ['clapback'] }), plainMc('a2', 1, 9)],
    });
    const b = crew({
      mcs: [
        mc({ id: 'b1', flow: 2, confidence: 9, archetype: 'freestyler', abilities: ['wildcard'] }),
      ],
    });
    const log = describeEvents(simulateBattle(a, b, B_OPENS));
    expect(log.slice(log.indexOf('turn 1 b'), log.indexOf('turn 2 a'))).toEqual([
      'turn 1 b',
      'bar b1>a1 2',
      'hype b +1=1',
      'ability b1 wildcard',
      'diss b1>a1 1',
      'choke a1',
      'hype b +2=3',
      'front a2',
      'hype b +1=4',
      'ability a1 clapback',
      'diss a1>b1 1',
      'hype a +1=1',
    ]);
  });
});
