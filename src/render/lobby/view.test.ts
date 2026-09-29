import { describe, expect, it } from 'vitest';
import type { AwaySummary } from '../../core';
import { mc } from '../../core/testing/fixtures';

function named(stageName: string) {
  return { ...mc({ id: stageName }), stageName };
}
import { awayLines } from './view';

const QUIET: AwaySummary = {
  rounds: 1,
  wins: 1,
  losses: 0,
  seasonsEnded: 0,
  titles: [],
  walletBefore: 12,
  walletAfter: 14,
  signed: [],
  released: [],
  retired: [],
  standing: { division: 0, position: 1 },
};

describe('away lines', () => {
  it('sums up a quiet round', () => {
    expect(awayLines(QUIET)).toEqual([
      '1 round played: 1 win, 0 losses.',
      'Wallet: 12 → 14 gold.',
      'Now 1st in division 1.',
    ]);
  });

  it('lists seasons, titles and every unit that came or went', () => {
    const lines = awayLines({
      ...QUIET,
      rounds: 12,
      wins: 7,
      losses: 5,
      seasonsEnded: 2,
      titles: [
        { kind: 'champion', season: 1, division: 0 },
        { kind: 'division', season: 2, division: 1 },
      ],
      signed: [named('Lil Waffle'), named('Big Mood')],
      released: [named('Echo')],
      retired: [named('The OG')],
      standing: { division: 1, position: 12 },
    });
    expect(lines).toEqual([
      '12 rounds played: 7 wins, 5 losses.',
      '2 seasons ended.',
      'Champions of season 1!',
      'Won division 2 in season 2!',
      'Wallet: 12 → 14 gold.',
      'Signed: Lil Waffle, Big Mood.',
      'Released: Echo.',
      'Retired: The OG.',
      'Now 12th in division 2.',
    ]);
    expect(
      awayLines({ ...QUIET, seasonsEnded: 1, standing: { division: 0, position: 2 } }),
    ).toContain('A season ended.');
    expect(awayLines({ ...QUIET, standing: null }).at(-1)).toBe('Wallet: 12 → 14 gold.');
  });
});
