import { describe, expect, it } from 'vitest';
import {
  createRng,
  CROWD_VOTE,
  simulateBattle,
  type BattleEvent,
  type BattleLineup,
} from '../../core';
import { seedWhereOpens } from '../../core/testing/battle';
import { mc, plainMc, support } from '../../core/testing/fixtures';
import { randomLineup } from '../../core/testing/randomLineup';
import {
  BIG_HYPE_SWING,
  buildPlayback,
  MAX_STRETCH,
  TARGET_MAX_MS,
  TARGET_MIN_MS,
  type Beat,
  type Playback,
} from './playback';

function lineup(id: string, mcs: BattleLineup['mcSlots']): BattleLineup {
  return { id, mcSlots: mcs, supportSlots: [null, null] };
}

function play(a: BattleLineup, b: BattleLineup, seed: number): Playback {
  const events = simulateBattle(a, b, seed);
  return buildPlayback({ name: 'Crew A', lineup: a }, { name: 'Crew B', lineup: b }, events, seed);
}

function kinds(playback: Playback): string[] {
  return playback.beats.map((beat) => beat.action.kind);
}

function randomBattles(count: number): { playback: Playback; events: readonly BattleEvent[] }[] {
  const rng = createRng(31);
  return Array.from({ length: count }, (_, index) => {
    const a = randomLineup('a', rng);
    const b = randomLineup('b', rng);
    const events = simulateBattle(a, b, index);
    const playback = buildPlayback(
      { name: 'A', lineup: a },
      { name: 'B', lineup: b },
      events,
      index,
    );
    return { playback, events };
  });
}

describe('buildPlayback', () => {
  const a = lineup('a', [plainMc('a1', 3, 2), plainMc('a2', 1, 1), null]);
  const b = lineup('b', [plainMc('b1', 2, 3), null, null]);

  it('starts with the intro and ends with the end, with the stage as it opened', () => {
    const playback = play(a, b, 1);
    expect(playback.start.stage).toEqual({ a: ['a1', 'a2'], b: ['b1'] });
    expect(playback.start.stats['a1']).toEqual({ flow: 3, confidence: 2 });
    expect(kinds(playback)[0]).toBe('intro');
    expect(kinds(playback).at(-1)).toBe('end');
  });

  it('tracks confidence, chokes and the stage from the events', () => {
    const playback = play(a, b, 1);
    const last = playback.beats.at(-1)?.after;
    const events = simulateBattle(a, b, 1);
    const end = events.at(-1);
    expect(end?.kind).toBe('end');
    for (const choke of events.filter((event) => event.kind === 'choke')) {
      expect(last?.stage[choke.side]).not.toContain(choke.unitId);
      expect(last?.stats[choke.unitId]?.confidence).toBe(0);
    }
  });

  it('gives each bar and diss a word, and a choke a word and a taunt', () => {
    const playback = play(a, b, 1);
    for (const { action } of playback.beats) {
      if (action.kind === 'bar' || action.kind === 'diss')
        expect(action.word.length).toBeGreaterThan(0);
      if (action.kind === 'choke') {
        expect(action.word.length).toBeGreaterThan(0);
        expect(action.speech.text).not.toMatch(/[{}]/);
      }
    }
    expect(kinds(playback)).toContain('choke');
  });

  it('lets the rival front MC taunt a choke, by name', () => {
    const playback = play(a, b, 1);
    const choke = playback.beats.find((beat) => beat.action.kind === 'choke');
    if (choke?.action.kind !== 'choke') throw new Error('no choke');
    expect(choke.action.speech.side).not.toBe(choke.action.side);
  });

  it('shows no beat for the opening front MCs, but one when an MC moves up', () => {
    const playback = play(a, b, 1);
    const fronts = playback.beats.filter((beat) => beat.action.kind === 'front');
    const events = simulateBattle(a, b, 1);
    const frontEvents = events.filter((event) => event.kind === 'front');
    expect(fronts.length).toBe(frontEvents.length - 2);
  });

  it('names the ability and says a line only when it had an effect', () => {
    const clapper = lineup('a', [
      mc({ id: 'a1', flow: 1, confidence: 5, abilities: ['clapback'] }),
      null,
      null,
    ]);
    const playback = play(clapper, lineup('b', [plainMc('b1', 1, 5), null, null]), 3);
    const ability = playback.beats.find((beat) => beat.action.kind === 'ability');
    if (ability?.action.kind !== 'ability') throw new Error('no ability');
    expect(ability.action.name).toBe('Clapback');
    expect(ability.action.speech?.speaker).toBe('a1');
  });

  it('is deterministic', () => {
    expect(play(a, b, 5)).toEqual(play(a, b, 5));
  });
});

describe('playback over random battles', () => {
  const battles = randomBattles(300);

  it('has one beat per shown event and snapshots within the rules', () => {
    for (const { playback, events } of battles) {
      const shown = events.filter((event) => event.kind !== 'front').length;
      const beats = playback.beats.filter((beat) => !['front', 'swing'].includes(beat.action.kind));
      expect(beats.length).toBe(shown);
      for (const beat of playback.beats) {
        expect(beat.duration).toBeGreaterThan(0);
        for (const side of ['a', 'b'] as const) {
          expect(beat.after.hype[side]).toBeGreaterThanOrEqual(0);
          expect(beat.after.hype[side]).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('marks big hype swings, and only those', () => {
    const swings = battles.flatMap(({ playback }) =>
      playback.beats.filter(
        (beat): beat is Beat & { action: { kind: 'swing' } } => beat.action.kind === 'swing',
      ),
    );
    expect(swings.length).toBeGreaterThan(0);
    for (const swing of swings) expect(swing.action.speech.text).not.toMatch(/[{}]/);
    expect(BIG_HYPE_SWING).toBe(3);
  });

  it('plays most battles in 30 to 60 seconds, and never longer', () => {
    const lengths = battles.map(({ playback }) => playback.totalMs).sort((x, y) => x - y);
    for (const length of lengths) expect(length).toBeLessThanOrEqual(TARGET_MAX_MS + 50);
    const inTarget = lengths.filter((length) => length >= TARGET_MIN_MS).length;
    // Setup knockouts and no-MC forfeits stay short even when stretched by `MAX_STRETCH`.
    expect(inTarget / lengths.length).toBeGreaterThan(0.6);
    expect(MAX_STRETCH).toBeGreaterThan(1);
  });
});

describe('buildPlayback for a crowd vote', () => {
  const a = lineup('a', [plainMc('a1', 1, 30), null, null]);
  const b = lineup('b', [plainMc('b1', 1, 30), null, null]);
  const seed = seedWhereOpens('a');
  const events = simulateBattle(a, b, seed, CROWD_VOTE);
  const playback = buildPlayback(
    { name: 'Crew A', lineup: a },
    { name: 'Crew B', lineup: b },
    events,
    seed,
  );

  it('shows each verse and each verdict, with the tally in the snapshots', () => {
    expect(kinds(playback).filter((kind) => kind === 'verse' || kind === 'verdict')).toEqual([
      'verse',
      'verdict',
      'verse',
      'verdict',
    ]);
    const verdicts = playback.beats.filter((beat) => beat.action.kind === 'verdict');
    expect(verdicts.map((beat) => beat.after.verses)).toEqual([
      { a: 0, b: 1 },
      { a: 0, b: 2 },
    ]);
    const [first] = verdicts;
    if (first?.action.kind !== 'verdict') throw new Error('no verdict');
    expect(first.action.speech).toMatchObject({ speaker: null, side: 'b' });
    expect(first.action.speech.text).toContain('Crew B');
    expect(playback.beats.at(-1)?.after.verse).toBe(2);
  });

  it('gives no crowd line for the crowd settling between verses', () => {
    const rising: BattleLineup = {
      id: 'a',
      mcSlots: [mc({ id: 'a1', flow: 1, confidence: 30, abilities: ['chart-topper'] }), null, null],
      supportSlots: [
        support({ id: 'as', archetype: 'manager', abilities: [['hometown-crowd', 3]] }),
        null,
      ],
    };
    const log = simulateBattle(rising, b, 1, CROWD_VOTE);
    const settle = log.filter((event) => event.kind === 'hype' && event.cause === 'verseBreak');
    expect(settle.some((event) => event.kind === 'hype' && event.change <= -BIG_HYPE_SWING)).toBe(
      true,
    );
    const beats = buildPlayback(
      { name: 'A', lineup: rising },
      { name: 'B', lineup: b },
      log,
      1,
    ).beats;
    const drops = beats.filter((beat) => beat.action.kind === 'swing' && !beat.action.rising);
    expect(drops).toEqual([]);
  });
});
