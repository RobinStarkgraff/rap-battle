import { describe, expect, it } from 'vitest';
import { createLeague, type League } from '../league';
import { askPrice } from '../market';
import { playRound, roundBid, shopOf, type CrewManager } from '../round';
import { bidsProblem, type Bid } from '../shop';
import { canonicalLeague, parseLeague, SAVE_FORMAT, SAVE_VERSION, serializeLeague } from './save';

/** Bids the ask on every unit it can add, oldest first. */
const BUYER: CrewManager = {
  bid: (state, crewId) => {
    const shop = shopOf(state, crewId);
    if (!shop.ok) return state;
    const bids: Bid[] = [];
    for (const unit of state.market.publicList) {
      const next = [...bids, { unitId: unit.id, amount: askPrice(unit) }];
      if (bidsProblem(shop.value.crew, next, state.market) === null)
        bids.splice(0, bids.length, ...next);
    }
    const placed = roundBid(state, crewId, bids);
    return placed.ok ? placed.value : state;
  },
  lineup: (state) => state,
};

/** A league a whole season in: units with records, growth, titles and a hall of fame. */
function playedLeague(): League {
  const created = createLeague(
    4,
    [
      {
        playerName: 'A',
        identity: { name: 'Alpha', mainColour: 'red', trimColour: 'black', logo: 'star' },
      },
      {
        playerName: 'B',
        identity: { name: 'Beta', mainColour: 'lime', trimColour: 'white', logo: 'flame' },
      },
    ],
    2,
  );
  if (!created.ok) throw new Error(created.error);
  let league = created.value;
  for (let round = 0; round < 8; round++) league = playRound(league, () => BUYER).league;
  return league;
}

function envelope(league: unknown, version = SAVE_VERSION): string {
  return JSON.stringify({ format: SAVE_FORMAT, version, league });
}

describe('league save', () => {
  const league = playedLeague();

  it('round-trips a league that has played a season', () => {
    expect(league.season.number).toBe(2);
    expect(league.crews.some((crew) => crew.record.titles.length > 0)).toBe(true);
    expect(parseLeague(serializeLeague(league))).toEqual({ ok: true, value: league });
  });

  it('writes the same canonical text for equal leagues, however their keys are ordered', () => {
    const parsed = parseLeague(serializeLeague(league));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(canonicalLeague(parsed.value)).toBe(canonicalLeague(league));
    const reordered = Object.fromEntries(Object.entries(league).reverse()) as unknown as League;
    expect(canonicalLeague(reordered)).toBe(canonicalLeague(league));
    expect(canonicalLeague({ ...league, completedRounds: 99 })).not.toBe(canonicalLeague(league));
  });

  it('refuses text that is not a save', () => {
    expect(parseLeague('not json')).toEqual({ ok: false, error: 'notJson' });
    expect(parseLeague('{"league": {}}')).toEqual({ ok: false, error: 'notASave' });
    expect(parseLeague(JSON.stringify({ format: 'other', version: 1, league }))).toEqual({
      ok: false,
      error: 'notASave',
    });
    expect(parseLeague(envelope(league, 0))).toEqual({ ok: false, error: 'notASave' });
  });

  it('refuses saves from a newer version', () => {
    expect(parseLeague(envelope(league, SAVE_VERSION + 1))).toEqual({
      ok: false,
      error: 'newerVersion',
    });
  });

  it.each([
    ['a missing field', (data: League) => ({ ...data, market: undefined })],
    [
      'a negative wallet',
      (data: League) => ({ ...data, crews: data.crews.map((crew) => ({ ...crew, wallet: -1 })) }),
    ],
    [
      'an unknown ability',
      (data: League) => ({
        ...data,
        market: {
          ...data.market,
          publicList: data.market.publicList.map((unit) => ({
            ...unit,
            abilities: [{ id: 'fireball', power: 1 }],
          })),
        },
      }),
    ],
    [
      'a support unit in an MC slot',
      (data: League) => ({
        ...data,
        crews: data.crews.map((crew) => ({
          ...crew,
          mcSlots: [crew.supportSlots[0] ?? crew.bench[0] ?? null, null, null],
        })),
      }),
    ],
    [
      'a bench that is too long',
      (data: League) => ({
        ...data,
        crews: data.crews.map((crew) => ({
          ...crew,
          bench: [...data.market.publicList.slice(0, 4)],
        })),
      }),
    ],
    ['a fractional seed', (data: League) => ({ ...data, seed: 1.5 })],
  ])('refuses a league with %s', (_name, corrupt) => {
    expect(parseLeague(envelope(corrupt(league)))).toEqual({ ok: false, error: 'invalid' });
  });
});
