/**
 * One test (or more) per ability (T-015). The table is keyed by `AbilityId`, so the
 * compiler fails when an ability has no test. Each case plays a small battle against
 * plain opponents and checks the ability's part of the log.
 */
import { describe, expect, it } from 'vitest';
import { applySignAbilities, applyUpkeepAbilities } from '../abilities';
import { findUnit, type AbilityId, type McUnit, type Side, type SupportUnit } from '../model';
import { createRng } from '../rng';
import { describeEvents, seedWhereOpens } from '../testing/battle';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { simulateBattle } from '.';

interface Lineups {
  readonly a: readonly (McUnit | null)[];
  readonly aSupports?: readonly SupportUnit[];
  readonly b?: readonly (McUnit | null)[];
  readonly bSupports?: readonly SupportUnit[];
  readonly opener?: Side;
}

/** Plays a battle and returns its log as lines. Crew B defaults to one sturdy plain MC. */
function play(lineups: Lineups): string[] {
  const a = crew({ id: 'A', mcs: lineups.a, supports: lineups.aSupports ?? [] });
  const b = crew({
    id: 'B',
    mcs: lineups.b ?? [plainMc('b1', 1, 30)],
    supports: lineups.bSupports ?? [],
  });
  return describeEvents(simulateBattle(a, b, seedWhereOpens(lineups.opener ?? 'a')));
}

/** Asserts that `lines` appear back to back in `log`, starting at the first `lines[0]`. */
function expectRun(log: readonly string[], lines: readonly string[]): void {
  const [first] = lines;
  const start = first === undefined ? -1 : log.indexOf(first);
  expect(start, `"${String(first)}" is not in the log:\n${log.join('\n')}`).toBeGreaterThanOrEqual(
    0,
  );
  expect(log.slice(start, start + lines.length)).toEqual(lines);
}

function count(log: readonly string[], line: string): number {
  return log.filter((each) => each === line).length;
}

const sturdy = (id: string) => plainMc(id, 1, 30);

const CASES: Readonly<Record<AbilityId, () => void>> = {
  punchliner: () => {
    const log = play({
      a: [
        mc({ id: 'a1', flow: 1, confidence: 9, archetype: 'lyricist', abilities: ['punchliner'] }),
      ],
      b: [sturdy('b1'), sturdy('b2')],
    });
    expectRun(log, [
      'bar a1>b1 1',
      'hype a +1=1',
      'ability a1 punchliner',
      'diss a1>b2 1',
      'hype a +1=2',
    ]);
  },
  wordplay: () => {
    const log = play({
      a: [
        mc({ id: 'a1', flow: 1, confidence: 30, archetype: 'lyricist', abilities: ['wordplay'] }),
      ],
    });
    // Hype after each of a1's bars: 1, 2, 3, then 5 (the diss at 3 hype cheers).
    const disses = log.filter((line) => line.startsWith('diss a1'));
    expect(disses.slice(0, 4)).toEqual([
      'diss a1>b1 0',
      'diss a1>b1 0',
      'diss a1>b1 1',
      'diss a1>b1 1',
    ]);
  },
  multisyllabic: () => {
    const log = play({
      a: [
        mc({
          id: 'a1',
          flow: 1,
          confidence: 9,
          archetype: 'lyricist',
          abilities: ['multisyllabic'],
        }),
      ],
    });
    expectRun(log, [
      'front a1',
      'front b1',
      'ability a1 multisyllabic',
      'buff a1 +1/+0',
      'turn 1 a',
      'bar a1>b1 2',
    ]);
  },
  'battle-kid': () => {
    const log = play({ a: [mc({ id: 'a1', flow: 1, confidence: 9, abilities: ['battle-kid'] })] });
    expectRun(log, ['ability a1 battle-kid', 'diss a1>b1 2', 'hype a +1=1', 'turn 1 a']);
  },
  headliner: () => {
    const opener = play({
      a: [mc({ id: 'a1', flow: 1, confidence: 9, abilities: ['headliner'] })],
      b: [sturdy('b1'), sturdy('b2'), sturdy('b3')],
    });
    expectRun(opener, [
      'start a',
      'ability a1 headliner',
      'diss a1>b1 1',
      'diss a1>b2 1',
      'diss a1>b3 1',
      'hype a +1=1',
    ]);
    const middle = play({
      a: [sturdy('a1'), mc({ id: 'a2', flow: 1, confidence: 9, abilities: ['headliner'] })],
    });
    expect(count(middle, 'ability a2 headliner')).toBe(0);
  },
  'comeback-line': () => {
    const log = play({
      a: [mc({ id: 'a1', flow: 1, confidence: 9, abilities: ['comeback-line'] })],
      opener: 'b',
    });
    expectRun(log, ['bar b1>a1 1', 'hype b +1=1', 'ability a1 comeback-line', 'hype b -1=0']);
  },
  'street-poet': () => {
    const log = play({
      a: [
        mc({
          id: 'a1',
          flow: 1,
          confidence: 1,
          archetype: 'storyteller',
          abilities: ['street-poet'],
        }),
        sturdy('a2'),
        sturdy('a3'),
      ],
      opener: 'b',
    });
    // a1 chokes at the front; the MC that was behind it (a2, now in front) gets the mic.
    expectRun(log, [
      'choke a1',
      'hype b +2=3',
      'front a2',
      'ability a1 street-poet',
      'buff a2 +2/+2',
    ]);
  },
  'the-og': () => {
    const log = play({
      a: [
        mc({ id: 'a1', flow: 1, confidence: 9, archetype: 'storyteller', abilities: ['the-og'] }),
        sturdy('a2'),
        sturdy('a3'),
      ],
      opener: 'b',
    });
    expectRun(log, ['ability a1 the-og', 'buff a2 +1/+0', 'buff a3 +1/+0']);
  },
  'long-verse': () => {
    const middle = play({
      a: [
        sturdy('a1'),
        mc({
          id: 'a2',
          flow: 1,
          confidence: 9,
          archetype: 'storyteller',
          abilities: ['long-verse'],
        }),
      ],
    });
    expectRun(middle, ['start a', 'ability a2 long-verse', 'buff a2 +0/+2', 'front a1']);
    const opener = play({
      a: [
        mc({
          id: 'a1',
          flow: 1,
          confidence: 9,
          archetype: 'storyteller',
          abilities: ['long-verse'],
        }),
      ],
    });
    expect(count(opener, 'ability a1 long-verse')).toBe(0);
  },
  'off-the-top': () => {
    const closer = play({
      a: [
        sturdy('a1'),
        null,
        mc({
          id: 'a3',
          flow: 1,
          confidence: 9,
          archetype: 'freestyler',
          abilities: ['off-the-top'],
        }),
      ],
    });
    // The slot counts, not the place on stage: a3 is a Closer behind an empty Middle.
    expectRun(closer, ['start a', 'ability a3 off-the-top', 'buff a3 +2/+2']);
  },
  'crowd-surfer': () => {
    const log = play({
      a: [
        mc({
          id: 'a1',
          flow: 1,
          confidence: 9,
          archetype: 'freestyler',
          abilities: ['crowd-surfer'],
        }),
      ],
      aSupports: [support({ id: 'am', archetype: 'manager', abilities: [['hometown-crowd', 3]] })],
    });
    expectRun(log, ['ability a1 crowd-surfer', 'buff a1 +1/+0']);
  },
  wildcard: () => {
    const targets = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const a = crew({
        mcs: [
          mc({
            id: 'a1',
            flow: 1,
            confidence: 30,
            archetype: 'freestyler',
            abilities: ['wildcard'],
          }),
        ],
      });
      const b = crew({ mcs: [sturdy('b1'), sturdy('b2')] });
      const log = describeEvents(simulateBattle(a, b, seed));
      for (const line of log.filter((each) => each.startsWith('diss a1>'))) {
        targets.add(line.split(' ')[1] ?? '');
      }
    }
    expect([...targets].sort()).toEqual(['a1>b1', 'a1>b2']);
  },
  'chart-topper': () => {
    const log = play({
      a: [
        mc({
          id: 'a1',
          flow: 1,
          confidence: 9,
          archetype: 'hitmaker',
          abilities: ['chart-topper'],
        }),
      ],
    });
    expectRun(log, ['bar a1>b1 1', 'hype a +1=1', 'ability a1 chart-topper', 'hype a +1=2']);
  },
  'feature-verse': () => {
    const signed = mc({ id: 'new', archetype: 'hitmaker', abilities: ['feature-verse'] });
    const subject = crew({ mcs: [signed, plainMc('old', 1, 3)] });
    const after = applySignAbilities(subject, 'new', createRng(1)).crew;
    expect(findUnit(after, 'old')).toMatchObject({ confidence: 4 });
    // It never triggers in a battle.
    expect(play({ a: [signed] }).some((line) => line.startsWith('ability'))).toBe(false);
  },
  encore: () => {
    const log = play({
      a: [
        mc({ id: 'a1', flow: 1, confidence: 2, archetype: 'hitmaker', abilities: ['encore'] }),
        sturdy('a2'),
      ],
      aSupports: [support({ id: 'am', archetype: 'manager', abilities: [['hometown-crowd', 3]] })],
      b: [plainMc('b1', 2, 30)],
    });
    // Hype 3, +1 for a1's bar, −2 when it chokes: ⌊2 / 2⌋ = 1.
    expectRun(log, [
      'choke a1',
      'hype a -2=2',
      'hype b +2=3',
      'front a2',
      'ability a1 encore',
      'diss a1>b1 1',
    ]);
  },
  clapback: () => {
    const log = play({
      a: [mc({ id: 'a1', flow: 1, confidence: 20, abilities: ['clapback'] })],
      opener: 'b',
    });
    expectRun(log, ['bar b1>a1 1', 'hype b +1=1', 'ability a1 clapback', 'diss a1>b1 1']);
    expect(count(log, 'ability a1 clapback')).toBe(1);
  },
  'drop-the-beat': () => {
    const log = play({
      a: [sturdy('a1')],
      aSupports: [support({ id: 'ad', abilities: [['drop-the-beat', 2]] })],
    });
    expectRun(log, [
      'bar a1>b1 1',
      'hype a +1=1',
      'ability ad drop-the-beat',
      'buff a1 +2/+0',
      'turn 2 b',
    ]);
    expect(log).toContain('bar a1>b1 3');
  },
  scratch: () => {
    const log = play({
      a: [sturdy('a1'), sturdy('a2')],
      aSupports: [support({ id: 'ad', abilities: [['scratch', 3]] })],
    });
    expectRun(log, ['front a1', 'front b1', 'ability ad scratch', 'diss ad>b1 2', 'hype a +1=1']);
  },
  'crowd-mix': () => {
    const log = play({
      a: [sturdy('a1')],
      aSupports: [support({ id: 'ad', abilities: [['crowd-mix', 3]] })],
    });
    expectRun(log, ['start a', 'ability ad crowd-mix', 'hype a +4=4']);
  },
  'get-up': () => {
    const log = play({
      a: [plainMc('a1', 1, 1), sturdy('a2')],
      aSupports: [support({ id: 'ah', archetype: 'hype-man', abilities: [['get-up', 2]] })],
      opener: 'b',
    });
    expectRun(log, ['choke a1', 'hype b +2=3', 'front a2', 'ability ah get-up', 'buff a2 +0/+4']);
  },
  'make-some-noise': () => {
    const log = play({
      a: [sturdy('a1')],
      aSupports: [support({ id: 'ah', archetype: 'hype-man', abilities: ['make-some-noise'] })],
    });
    expectRun(log, ['front a1', 'front b1', 'ability ah make-some-noise', 'hype a +1=1']);
  },
  'hype-wave': () => {
    const log = play({
      a: [plainMc('a1', 1, 1), sturdy('a2')],
      aSupports: [
        support({ id: 'am', archetype: 'manager', abilities: [['hometown-crowd', 3]] }),
        support({ id: 'ah', archetype: 'hype-man', abilities: [['hype-wave', 3]] }),
      ],
      opener: 'b',
    });
    // Hype 3, −2 on the choke: ⌊1 / 3⌋ + 2.
    expectRun(log, [
      'choke a1',
      'hype a -2=1',
      'hype b +2=3',
      'front a2',
      'ability ah hype-wave',
      'buff a2 +2/+0',
    ]);
  },
  beatmaker: () => {
    const log = play({
      a: [sturdy('a1'), sturdy('a2')],
      aSupports: [support({ id: 'ap', archetype: 'producer', abilities: [['beatmaker', 2]] })],
    });
    expectRun(log, ['start a', 'ability ap beatmaker', 'buff a1 +2/+0']);
  },
  'studio-session': () => {
    const producer = support({ id: 'p', archetype: 'producer', abilities: ['studio-session'] });
    const subject = crew({ mcs: [plainMc('m', 1, 3)], supports: [producer] });
    expect(findUnit(applyUpkeepAbilities(subject, createRng(1)).crew, 'm')?.xp).toBe(1);
    expect(
      play({ a: [sturdy('a1')], aSupports: [producer] }).some((line) => line.startsWith('ability')),
    ).toBe(false);
  },
  remix: () => {
    const log = play({
      a: [plainMc('a1', 1, 1), sturdy('a2')],
      aSupports: [support({ id: 'ap', archetype: 'producer', abilities: [['remix', 3]] })],
      opener: 'b',
    });
    expectRun(log, ['front a2', 'ability ap remix', 'buff a2 +3/+0']);
  },
  'warm-up': () => {
    const log = play({
      a: [sturdy('a1'), sturdy('a2')],
      aSupports: [support({ id: 'av', archetype: 'vocal-coach', abilities: [['warm-up', 3]] })],
    });
    expectRun(log, ['start a', 'ability av warm-up', 'buff a1 +0/+3']);
  },
  breathe: () => {
    const log = play({
      a: [plainMc('a1', 1, 5)],
      aSupports: [support({ id: 'av', archetype: 'vocal-coach', abilities: [['breathe', 3]] })],
      opener: 'b',
    });
    expectRun(log, ['bar b1>a1 1', 'hype b +1=1', 'ability av breathe', 'buff a1 +0/+4']);
    expect(count(log, 'ability av breathe')).toBe(1);
  },
  'voice-lessons': () => {
    const coach = support({ id: 'c', archetype: 'vocal-coach', abilities: [['voice-lessons', 3]] });
    const subject = crew({ mcs: [plainMc('m', 1, 3)], supports: [coach] });
    expect(findUnit(applyUpkeepAbilities(subject, createRng(1)).crew, 'm')).toMatchObject({
      confidence: 5,
    });
    expect(
      play({ a: [sturdy('a1')], aSupports: [coach] }).some((line) => line.startsWith('ability')),
    ).toBe(false);
  },
  'hometown-crowd': () => {
    const log = play({
      a: [sturdy('a1')],
      aSupports: [
        support({ id: 'ad', abilities: ['crowd-mix'] }),
        support({ id: 'am', archetype: 'manager', abilities: [['hometown-crowd', 2]] }),
      ],
    });
    // beforeBattle comes before battleStart, whatever the slot order.
    expectRun(log, [
      'start a',
      'ability am hometown-crowd',
      'hype a +2=2',
      'ability ad crowd-mix',
      'hype a +2=4',
    ]);
  },
  'paid-hecklers': () => {
    const log = play({
      a: [plainMc('a1', 1, 1), sturdy('a2')],
      aSupports: [support({ id: 'am', archetype: 'manager', abilities: [['paid-hecklers', 2]] })],
      opener: 'b',
    });
    expectRun(log, [
      'choke a1',
      'hype b +2=3',
      'front a2',
      'ability am paid-hecklers',
      'hype b -2=1',
    ]);
  },
  negotiator: () => {
    const manager = support({ id: 'boss', archetype: 'manager', abilities: [['negotiator', 2]] });
    expect(
      applyUpkeepAbilities(crew({ supports: [manager], wallet: 3 }), createRng(1)).crew.wallet,
    ).toBe(5);
    expect(
      play({ a: [sturdy('a1')], aSupports: [manager] }).some((line) => line.startsWith('ability')),
    ).toBe(false);
  },
  'shout-out': () => {
    const targets = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const a = crew({
        mcs: [sturdy('a1'), sturdy('a2')],
        supports: [support({ id: 'as', abilities: [['shout-out', 2]] })],
      });
      const log = describeEvents(simulateBattle(a, crew({ mcs: [sturdy('b1')] }), seed));
      const buff = log[log.indexOf('ability as shout-out') + 1] ?? '';
      expect(buff).toMatch(/^buff a[12] \+0\/\+2$/);
      targets.add(buff);
    }
    expect(targets.size).toBe(2);
  },
};

describe('every ability', () => {
  it.each(Object.entries(CASES))('%s', (_id, test) => {
    test();
  });
});

describe('units with two abilities', () => {
  it('resolve both in learned order', () => {
    const log = play({
      a: [mc({ id: 'a1', flow: 1, confidence: 9, abilities: ['multisyllabic', 'battle-kid'] })],
    });
    expectRun(log, [
      'ability a1 multisyllabic',
      'buff a1 +1/+0',
      'ability a1 battle-kid',
      'diss a1>b1 2',
    ]);
  });
});
