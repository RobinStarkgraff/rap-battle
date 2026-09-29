import { describe, expect, it } from 'vitest';
import { createRng, EFFECT_KINDS, TUNABLES } from '../../core';
import {
  ABILITY_LINES,
  BUFF_WORDS,
  CHOKE_LINES,
  CHOKE_WORDS,
  HIT_WORDS,
  hitWordsFor,
  HYPE_DROP_LINES,
  HYPE_SWING_LINES,
  VERDICT_LINES,
  SELF_CHOKE_LINES,
  battleTextRng,
} from './battleText';
import { headline, headlineKind, HEADLINES } from './headlines';
import { fillTemplate, pickLine, SLOTS, slotsOf, type Slot } from './template';

const ALL_VALUES: Readonly<Record<Slot, string>> = {
  speaker: 'MC Waffle',
  target: 'Big Pretzel',
  crew: 'The Soggy Biscuits',
  enemyCrew: 'Rowdy Llamas',
  ability: 'Clapback',
  winner: 'The Soggy Biscuits',
  loser: 'Rowdy Llamas',
  mvp: 'MC Waffle',
};

/** Every table, with the slots its templates may use. */
const TABLES: readonly (readonly [string, readonly string[], readonly Slot[]])[] = [
  ['choke', CHOKE_LINES, ['speaker', 'target', 'crew']],
  ['self choke', SELF_CHOKE_LINES, ['speaker', 'crew']],
  ...EFFECT_KINDS.map(
    (kind) =>
      [
        `ability ${kind}`,
        ABILITY_LINES[kind],
        ['speaker', 'ability', 'crew', 'enemyCrew'],
      ] as const,
  ),
  ['hype swing', HYPE_SWING_LINES, ['crew']],
  ['hype drop', HYPE_DROP_LINES, ['crew']],
  ['verdict', VERDICT_LINES, ['crew']],
  ...Object.entries(HEADLINES).map(
    ([kind, templates]) =>
      [`headline ${kind}`, templates, ['winner', 'loser', 'mvp', 'target']] as const,
  ),
];

describe('text tables', () => {
  it.each(TABLES)('%s lines use only the slots they are given', (_, templates, allowed) => {
    expect(templates.length).toBeGreaterThan(0);
    expect(new Set(templates).size).toBe(templates.length);
    for (const template of templates) {
      for (const slot of slotsOf(template)) expect(allowed).toContain(slot);
      expect(fillTemplate(template, ALL_VALUES)).not.toMatch(/[{}]/);
    }
  });

  it('has words for every kind of hit', () => {
    for (const words of [...Object.values(HIT_WORDS), CHOKE_WORDS, BUFF_WORDS]) {
      expect(words.length).toBeGreaterThan(1);
    }
    expect(hitWordsFor(0)).toBe(HIT_WORDS.none);
    expect(hitWordsFor(1)).toBe(HIT_WORDS.light);
    expect(hitWordsFor(2)).toBe(HIT_WORDS.solid);
    expect(hitWordsFor(9)).toBe(HIT_WORDS.huge);
  });
});

describe('fillTemplate', () => {
  it('fills every slot, and names are inserted literally', () => {
    expect(fillTemplate('{target}, {target}!', { target: 'Lil $& Syntax' })).toBe(
      'Lil $& Syntax, Lil $& Syntax!',
    );
    expect(slotsOf('{a} and {b}')).toEqual(['a', 'b']);
  });

  it('refuses a template with a missing or unknown slot', () => {
    expect(() => fillTemplate('{target}', {})).toThrow(RangeError);
    expect(() => fillTemplate('{nobody}', ALL_VALUES)).toThrow(RangeError);
    expect(SLOTS).toContain('mvp');
  });

  it('picks the same line from the same seed', () => {
    const line = (seed: number) => pickLine(createRng(seed), CHOKE_LINES, ALL_VALUES);
    expect(line(5)).toBe(line(5));
    const lines = new Set(Array.from({ length: 40 }, (_, seed) => line(seed)));
    expect(lines.size).toBeGreaterThan(5);
  });

  it('forks the battle text stream from the battle seed', () => {
    expect(battleTextRng(9).nextUint32()).toBe(battleTextRng(9).nextUint32());
    expect(battleTextRng(9).nextUint32()).not.toBe(battleTextRng(10).nextUint32());
  });
});

describe('headline', () => {
  const names = {
    winner: 'Soggy Biscuits',
    loser: 'Rowdy Llamas',
    mvp: 'MC Waffle',
    target: 'Big Pretzel',
  };

  it('picks the kind from the end reason and margin', () => {
    expect(headlineKind('noMcs', 0)).toBe('forfeit');
    expect(headlineKind('turnLimit', 2)).toBe('decision');
    expect(headlineKind('crowdVote', 1)).toBe('crowd');
    expect(headlineKind('wipeout', 3)).toBe('blowout');
    expect(headlineKind('wipeout', 2)).toBe('standard');
    expect(headlineKind('wipeout', 1)).toBe('close');
  });

  it('is in capitals, seeded and filled with the names', () => {
    const text = headline(77, 'wipeout', 3, names);
    expect(text).toBe(text.toUpperCase());
    expect(text).toBe(headline(77, 'wipeout', 3, names));
    expect(text).not.toMatch(/[{}]/);
    const all = new Set(
      Array.from({ length: 30 }, (_, seed) => headline(seed, 'wipeout', 3, names)),
    );
    expect(all.size).toBe(HEADLINES.blowout.length);
  });

  it('names only the crews when there is no MVP', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const reason of ['wipeout', 'turnLimit', 'noMcs'] as const) {
        const text = headline(seed, reason, 1, { winner: 'A', loser: 'B' });
        expect(text).not.toMatch(/[{}]/);
      }
    }
  });

  it('fits on the result screen with the longest names', () => {
    const long = 'X'.repeat(TUNABLES.CREW_NAME_MAX);
    const longest = {
      winner: long,
      loser: long,
      mvp: 'Professor Alliteration',
      target: 'Professor Alliteration II',
    };
    for (const templates of Object.values(HEADLINES)) {
      for (const template of templates) {
        expect(fillTemplate(template, longest).length).toBeLessThanOrEqual(80);
      }
    }
  });
});
