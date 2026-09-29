import { describe, expect, it } from 'vitest';
import { askPrice, salaryFor, type Market } from '../market';
import { findUnit, type Crew, type Unit } from '../model';
import { nameSet } from '../names';
import { createRng } from '../rng';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { afterBidRound, BIDDING_START, bidsProblem, resolveBidRound } from './bidding';
import { freePlaceFor, moveUnit, payroll, placeOf } from './lineup';
import { forceLockIn, lockIn } from './lockIn';
import { openShop, shopMove, shopRelease, shopScout, signScouted, submitBids } from './shopCrew';
import { releaseUnit, signUnit } from './signing';

const rng = createRng(1);

function withSalary<T extends Unit>(unit: T, salary: number): T {
  return { ...unit, salary };
}

function market(...units: Unit[]): Market {
  return { publicList: units, nextUnitNumber: 100 };
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function ids(subject: Crew): (string | null)[] {
  return [
    ...subject.mcSlots.map((unit) => unit?.id ?? null),
    ...subject.supportSlots.map((unit) => unit?.id ?? null),
    ...subject.bench.map((unit) => unit.id),
  ];
}

describe('payroll', () => {
  it('pays active salaries in full and bench salaries halved, rounded down', () => {
    const subject = crew({
      mcs: [withSalary(mc({ id: 'm1' }), 3), null, withSalary(mc({ id: 'm3' }), 2)],
      supports: [withSalary(support({ id: 's1', abilities: ['scratch'] }), 4)],
      bench: [withSalary(mc({ id: 'b1' }), 3), withSalary(mc({ id: 'b2' }), 1)],
    });
    expect(payroll(subject)).toBe(3 + 2 + 4 + 1 + 0);
  });
});

describe('places', () => {
  const full = crew({
    mcs: [mc({ id: 'm1' }), null, mc({ id: 'm3' })],
    supports: [
      support({ id: 's1', abilities: ['scratch'] }),
      support({ id: 's2', abilities: ['remix'] }),
    ],
    bench: [mc({ id: 'b1' })],
  });

  it('puts a new unit in the first free active slot of its role, else on the bench', () => {
    expect(freePlaceFor(full, 'mc')).toEqual({ area: 'mc', index: 1 });
    expect(freePlaceFor(full, 'support')).toEqual({ area: 'bench', index: 1 });
    const packed = crew({
      bench: [mc({ id: 'x' }), mc({ id: 'y' }), mc({ id: 'z' })],
      supports: full.supportSlots,
    });
    expect(freePlaceFor(packed, 'support')).toBeNull();
    expect(placeOf(full, 'b1')).toEqual({ area: 'bench', index: 0 });
    expect(placeOf(full, 'nobody')).toBeUndefined();
  });

  it('moves a unit into a free slot', () => {
    const moved = unwrap(moveUnit(full, 'b1', { area: 'mc', index: 1 }));
    expect(ids(moved)).toEqual(['m1', 'b1', 'm3', 's1', 's2']);
  });

  it('swaps with the unit in the target place', () => {
    const swapped = unwrap(moveUnit(full, 'm3', { area: 'mc', index: 0 }));
    expect(ids(swapped)).toEqual(['m3', null, 'm1', 's1', 's2', 'b1']);
    const benched = unwrap(moveUnit(full, 'b1', { area: 'mc', index: 0 }));
    expect(ids(benched)).toEqual(['b1', null, 'm3', 's1', 's2', 'm1']);
  });

  it('refuses a slot of the other role, and a swap that would put a unit in one', () => {
    expect(moveUnit(full, 's1', { area: 'mc', index: 1 })).toEqual({
      ok: false,
      error: 'wrongRole',
    });
    expect(moveUnit(full, 's1', { area: 'bench', index: 0 })).toEqual({
      ok: false,
      error: 'wrongRole',
    });
    expect(moveUnit(full, 'nobody', { area: 'mc', index: 1 })).toEqual({
      ok: false,
      error: 'unknownUnit',
    });
  });

  it('appends to the bench, reorders it, and refuses when it is full', () => {
    const appended = unwrap(moveUnit(full, 'm1', { area: 'bench', index: 5 }));
    expect(appended.bench.map((unit) => unit.id)).toEqual(['b1', 'm1']);
    const reordered = unwrap(moveUnit(appended, 'm1', { area: 'bench', index: 0 }));
    expect(reordered.bench.map((unit) => unit.id)).toEqual(['m1', 'b1']);
    const packed = unwrap(moveUnit(appended, 'm3', { area: 'bench', index: 2 }));
    expect(moveUnit(packed, 's1', { area: 'bench', index: 3 })).toEqual({
      ok: false,
      error: 'benchFull',
    });
  });
});

describe('signUnit', () => {
  const rookie = withSalary(mc({ id: 'r', flow: 3, confidence: 3, age: 18 }), 0);

  it('pays the price, places the unit, sets its salary and starts a stint', () => {
    const signed = unwrap(
      signUnit(crew({ id: 'c', wallet: 10, mcs: [mc({ id: 'm1' })] }), rookie, 6, rng),
    );
    expect(signed.crew.wallet).toBe(4);
    expect(signed.crew.mcSlots[1]?.id).toBe('r');
    expect(signed.crew.mcSlots[1]?.salary).toBe(2);
    expect(signed.crew.mcSlots[1]?.record.crews).toEqual([{ crewId: 'c', battles: 0, seasons: 0 }]);
  });

  it('keeps the old stint when a unit rejoins a crew', () => {
    const veteran: Unit = {
      ...rookie,
      record: { ...rookie.record, crews: [{ crewId: 'c', battles: 7, seasons: 2 }] },
    };
    const signed = unwrap(signUnit(crew({ id: 'c', wallet: 5 }), veteran, 5, rng));
    expect(findUnit(signed.crew, 'r')?.record.crews).toEqual([
      { crewId: 'c', battles: 7, seasons: 2 },
    ]);
  });

  it('resolves sign abilities', () => {
    const hitmaker = mc({ id: 'h', archetype: 'hitmaker', abilities: ['feature-verse'] });
    const signed = unwrap(
      signUnit(crew({ wallet: 5, bench: [plainMc('b', 1, 1)] }), hitmaker, 3, rng),
    );
    const benched = findUnit(signed.crew, 'b');
    expect(benched?.role === 'mc' && benched.confidence).toBe(2);
    expect(signed.events[0]).toEqual({ kind: 'ability', unitId: 'h', abilityId: 'feature-verse' });
  });

  it('refuses without the gold or a free place', () => {
    expect(signUnit(crew({ wallet: 2 }), rookie, 3, rng)).toEqual({
      ok: false,
      error: 'notEnoughGold',
    });
    const full = crew({
      wallet: 9,
      mcs: [mc({ id: 'a' }), mc({ id: 'b' }), mc({ id: 'c' })],
      bench: [mc({ id: 'd' }), mc({ id: 'e' }), mc({ id: 'f' })],
    });
    expect(signUnit(full, rookie, 1, rng)).toEqual({ ok: false, error: 'noPlace' });
  });
});

describe('releaseUnit', () => {
  it('takes the unit out with no refund', () => {
    const subject = crew({ wallet: 3, mcs: [mc({ id: 'm1' }), mc({ id: 'm2' })] });
    const released = unwrap(releaseUnit(subject, 'm1'));
    expect(released.unit.id).toBe('m1');
    expect(ids(released.crew)).toEqual([null, 'm2', null, null, null]);
    expect(released.crew.wallet).toBe(3);
    expect(releaseUnit(subject, 'x')).toEqual({ ok: false, error: 'unknownUnit' });
  });
});

describe('bids', () => {
  // Rating 3 + 3 + 2 + 2 = 10: ask 5, salary 2.
  const star = mc({ id: 'star', flow: 3, confidence: 3, age: 18 });
  // Rating 4 + 2 + 0 = 6 at 24 of 25: ask 3, salary 2.
  const dj = { ...support({ id: 'dj', abilities: ['scratch'] }), age: 24 };
  const list = market(star, dj);

  it('allows bids of at least the ask that the wallet covers with the new payroll', () => {
    // 5 + 3 in bids and a payroll of 2 + 2.
    expect(
      bidsProblem(
        crew({ wallet: 12 }),
        [
          { unitId: 'star', amount: 5 },
          { unitId: 'dj', amount: 3 },
        ],
        list,
      ),
    ).toBeNull();
    expect(
      bidsProblem(
        crew({ wallet: 11 }),
        [
          { unitId: 'star', amount: 5 },
          { unitId: 'dj', amount: 3 },
        ],
        list,
      ),
    ).toBe('cannotAfford');
    expect(bidsProblem(crew({ wallet: 0 }), [], list)).toBeNull();
  });

  it('counts the current payroll and bench placement', () => {
    const benchOnly = crew({
      wallet: 7,
      mcs: [
        withSalary(mc({ id: 'a' }), 1),
        withSalary(mc({ id: 'b' }), 1),
        withSalary(mc({ id: 'c' }), 1),
      ],
    });
    // The star goes to the bench at half its salary of 3: a payroll of 3 + 1 after a bid of 5.
    expect(bidsProblem(benchOnly, [{ unitId: 'star', amount: 5 }], list)).toBe('cannotAfford');
    expect(
      bidsProblem({ ...benchOnly, wallet: 9 }, [{ unitId: 'star', amount: 5 }], list),
    ).toBeNull();
  });

  it('refuses bids below the ask, twice on one unit, on unknown units or without a place', () => {
    const rich = crew({ wallet: 99 });
    expect(bidsProblem(rich, [{ unitId: 'star', amount: 4 }], list)).toBe('belowAsk');
    expect(bidsProblem(rich, [{ unitId: 'star', amount: 5.5 }], list)).toBe('belowAsk');
    expect(
      bidsProblem(
        rich,
        [
          { unitId: 'star', amount: 5 },
          { unitId: 'star', amount: 6 },
        ],
        list,
      ),
    ).toBe('duplicateBid');
    expect(bidsProblem(rich, [{ unitId: 'ghost', amount: 5 }], list)).toBe('unknownUnit');
    const full = crew({
      wallet: 99,
      mcs: [mc({ id: 'a' }), mc({ id: 'b' }), mc({ id: 'c' })],
      bench: [mc({ id: 'd' }), mc({ id: 'e' }), mc({ id: 'f' })],
    });
    expect(bidsProblem(full, [{ unitId: 'star', amount: 5 }], list)).toBe('noPlace');
  });
});

describe('resolveBidRound', () => {
  const star = mc({ id: 'star', flow: 3, confidence: 3, age: 18 });
  const other = mc({ id: 'other', flow: 2, confidence: 2, age: 22 });
  const list = market(star, other);

  it('gives each unit to its highest bid; the others keep their gold', () => {
    const result = resolveBidRound(
      list,
      [
        { crew: crew({ id: 'a', wallet: 20 }), bids: [{ unitId: 'star', amount: 7 }] },
        {
          crew: crew({ id: 'b', wallet: 20 }),
          bids: [
            { unitId: 'star', amount: 6 },
            { unitId: 'other', amount: 3 },
          ],
        },
      ],
      ['a', 'b'],
      createRng(1),
    );
    expect(result.awards.map(({ unitId, crewId, price }) => [unitId, crewId, price])).toEqual([
      ['star', 'a', 7],
      ['other', 'b', 3],
    ]);
    const [a, b] = result.crews;
    expect(a?.wallet).toBe(13);
    expect(b?.wallet).toBe(17);
    expect(a?.mcSlots[0]?.id).toBe('star');
    expect(result.market.publicList).toEqual([]);
    expect(result.anyBids).toBe(true);
  });

  it('breaks ties for the crew ranked lower', () => {
    const entries = [
      { crew: crew({ id: 'top', wallet: 20 }), bids: [{ unitId: 'star', amount: 6 }] },
      { crew: crew({ id: 'bottom', wallet: 20 }), bids: [{ unitId: 'star', amount: 6 }] },
    ];
    expect(resolveBidRound(list, entries, ['top', 'bottom'], createRng(1)).awards[0]?.crewId).toBe(
      'bottom',
    );
    expect(resolveBidRound(list, entries, ['bottom', 'top'], createRng(1)).awards[0]?.crewId).toBe(
      'top',
    );
  });

  it('flips a seeded coin between crews of the same rank', () => {
    const entries = [
      { crew: crew({ id: 'x', wallet: 20 }), bids: [{ unitId: 'star', amount: 6 }] },
      { crew: crew({ id: 'y', wallet: 20 }), bids: [{ unitId: 'star', amount: 6 }] },
    ];
    const winners = new Set(
      Array.from(
        { length: 20 },
        (_, seed) => resolveBidRound(list, entries, [], createRng(seed)).awards[0]?.crewId,
      ),
    );
    expect(winners).toEqual(new Set(['x', 'y']));
    const once = resolveBidRound(list, entries, [], createRng(5));
    expect(resolveBidRound(list, entries, [], createRng(5))).toEqual(once);
  });

  it('skips a bid its crew can no longer honour and gives the unit to the next best', () => {
    const full = crew({
      id: 'full',
      wallet: 20,
      mcs: [mc({ id: 'a' }), mc({ id: 'b' }), mc({ id: 'c' })],
      bench: [mc({ id: 'd' }), mc({ id: 'e' }), mc({ id: 'f' })],
    });
    const result = resolveBidRound(
      list,
      [
        { crew: full, bids: [{ unitId: 'star', amount: 9 }] },
        { crew: crew({ id: 'b', wallet: 20 }), bids: [{ unitId: 'star', amount: 5 }] },
      ],
      [],
      createRng(1),
    );
    expect(result.awards.map((award) => award.crewId)).toEqual(['b']);
  });

  it('reports a round without bids', () => {
    const result = resolveBidRound(list, [{ crew: crew({ id: 'a' }), bids: [] }], [], createRng(1));
    expect(result.anyBids).toBe(false);
    expect(result.market).toEqual(list);
  });
});

describe('bidding rounds', () => {
  it('ends after BID_ROUNDS or after a round without bids', () => {
    const second = afterBidRound(BIDDING_START, true);
    expect(second).toEqual({ round: 2, ended: false });
    expect(afterBidRound(second, false)).toEqual({ round: 2, ended: true });
    expect(afterBidRound(afterBidRound(second, true), true)).toEqual({ round: 3, ended: true });
  });
});

describe('shop crew', () => {
  const star = mc({ id: 'star', flow: 3, confidence: 3, age: 18 });
  const list = market(star);
  const context = { leagueSeed: 1, round: 2 };

  it('keeps open bids valid while arranging', () => {
    const benched = withSalary(mc({ id: 'b' }), 4);
    const shop = unwrap(
      submitBids(openShop(crew({ wallet: 12, mcs: [mc({ id: 'm1' })], bench: [benched] })), list, [
        { unitId: 'star', amount: 5 },
      ]),
    );
    // 12 − 5 covers a payroll of 2 + 2 (benched) + 3 (star), but not 2 + 4 + 3 once it plays.
    expect(shopMove(shop, list, 'b', { area: 'mc', index: 1 })).toEqual({
      ok: false,
      error: 'breaksBids',
    });
    expect(shopMove(openShop(shop.crew), list, 'b', { area: 'mc', index: 1 }).ok).toBe(true);
  });

  it('scouts, and signs a scouted unit at its ask', () => {
    const shop = unwrap(
      shopScout(openShop(crew({ id: 'c', wallet: 12 })), list, context, nameSet([])),
    );
    expect(shop.crew.wallet).toBe(11);
    const [first] = shop.scouting.units;
    if (first === undefined) throw new Error('no scouts');
    const signed = unwrap(signScouted(shop, list, first.id, rng, nameSet([])));
    expect(signed.shop.crew.wallet).toBe(11 - askPrice(first));
    expect(findUnit(signed.shop.crew, first.id)?.salary).toBe(salaryFor(first));
    expect(signed.shop.scouting.units).toHaveLength(1);
    expect(signScouted(signed.shop, list, first.id, rng, nameSet([]))).toEqual({
      ok: false,
      error: 'unknownUnit',
    });
  });

  it('renames a scouted unit whose name was taken since it was scouted', () => {
    const shop = unwrap(
      shopScout(openShop(crew({ id: 'c', wallet: 12 })), list, context, nameSet([])),
    );
    const [first] = shop.scouting.units;
    if (first === undefined) throw new Error('no scouts');
    const signed = unwrap(signScouted(shop, list, first.id, rng, nameSet([first.stageName])));
    expect(findUnit(signed.shop.crew, first.id)?.stageName).toBe(`${first.stageName} II`);
  });

  it('refuses scouting that would break an open bid', () => {
    const shop = unwrap(
      submitBids(openShop(crew({ wallet: 7 })), list, [{ unitId: 'star', amount: 5 }]),
    );
    expect(shopScout(shop, list, context, nameSet([]))).toEqual({ ok: false, error: 'breaksBids' });
  });

  it('releases a unit and hands it back for the public list', () => {
    const released = unwrap(shopRelease(openShop(crew({ mcs: [mc({ id: 'm1' })] })), 'm1'));
    expect(released.unit.id).toBe('m1');
    expect(released.shop.crew.mcSlots[0]).toBeNull();
  });

  it('refuses invalid bids', () => {
    expect(
      submitBids(openShop(crew({ wallet: 1 })), list, [{ unitId: 'star', amount: 5 }]),
    ).toEqual({
      ok: false,
      error: 'cannotAfford',
    });
  });
});

describe('lock-in', () => {
  it('pays the payroll and fixes the lineup', () => {
    const subject = crew({ id: 'c', wallet: 5, mcs: [withSalary(mc({ id: 'm1' }), 3)] });
    const locked = unwrap(lockIn(subject));
    expect(locked.crew.wallet).toBe(2);
    expect(locked.lineup).toEqual({
      id: 'c',
      mcSlots: subject.mcSlots,
      supportSlots: subject.supportSlots,
    });
    expect(lockIn({ ...subject, wallet: 2 })).toEqual({ ok: false, error: 'cannotAffordPayroll' });
  });

  it('releases the cheapest units until the payroll fits when forced', () => {
    const subject = crew({
      wallet: 5,
      mcs: [
        withSalary(mc({ id: 'm1' }), 3),
        withSalary(mc({ id: 'm2' }), 2),
        withSalary(mc({ id: 'm3' }), 2),
      ],
      supports: [withSalary(support({ id: 's1', abilities: ['scratch'] }), 4)],
      // Costs 1 on the bench, and a free bench unit is kept.
      bench: [withSalary(mc({ id: 'b1' }), 2), withSalary(mc({ id: 'b2' }), 1)],
    });
    // Payroll 3 + 2 + 2 + 4 + 1 = 12: release b1 (1, bench), m3 (2, higher slot), m2 (2): 12 → 11 → 9 → 7, then m1 (3) → 4.
    const forced = forceLockIn(subject);
    expect(forced.released.map((unit) => unit.id)).toEqual(['b1', 'm3', 'm2', 'm1']);
    expect(forced.crew.wallet).toBe(1);
    expect(ids(forced.crew)).toEqual([null, null, null, 's1', null, 'b2']);
    expect(forceLockIn({ ...subject, wallet: 12 }).released).toEqual([]);
  });
});
