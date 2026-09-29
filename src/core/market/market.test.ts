import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../data';
import type { Unit } from '../model';
import { nameSet, uniqueName } from '../names';
import { createRng } from '../rng';
import { crew, mc, support } from '../testing/fixtures';
import { TUNABLES } from '../tunables';
import { generateUnit, rollAge, rollStageName } from './generate';
import { addFreeAgent, addRookies, createMarket, removeFromMarket } from './market';
import { NO_SCOUTING, scout } from './scouting';
import {
  askPrice,
  benchSalary,
  onFarewellTour,
  rating,
  salaryFor,
  seasonsLeft,
  youthPremium,
} from './value';

const NONE = nameSet([]);

function generateMany(count: number, seed: number): Unit[] {
  const rng = createRng(seed);
  const taken = nameSet([]);
  const units: Unit[] = [];
  for (let i = 0; i < count; i++) {
    const unit = generateUnit(`u${String(i)}`, rng, taken);
    taken.add(unit.stageName);
    units.push(unit);
  }
  return units;
}

describe('value', () => {
  it('rates an 18-year-old 3 / 3 MC with one ability at 10: ask 5, salary 3 (§4, §5.1)', () => {
    const young = mc({ id: 'm', flow: 3, confidence: 3, age: 18 });
    expect(seasonsLeft(young)).toBe(5);
    expect(youthPremium(young)).toBe(2);
    expect(rating(young)).toBe(10);
    expect(askPrice(young)).toBe(5);
    expect(salaryFor(young)).toBe(3);
  });

  it('rates the same MC at 22 at 8 and asks 4; it is on its farewell tour', () => {
    const old = mc({ id: 'm', flow: 3, confidence: 3, age: 22 });
    expect(onFarewellTour(old)).toBe(true);
    expect(rating(old)).toBe(8);
    expect(askPrice(old)).toBe(4);
    expect(salaryFor(old)).toBe(2);
  });

  it('rates support units from SUPPORT_BASE_RATING and every point of power', () => {
    const young = support({ id: 's', abilities: [['scratch', 2], 'crowd-mix'] });
    // Age 20 of 25: 5 seasons left, so +2.
    expect(rating(young)).toBe(4 + 2 * 3 + 2);
    expect(youthPremium({ role: 'support', age: 18 })).toBe(3);
    expect(youthPremium({ role: 'support', age: 24 })).toBe(0);
    expect(onFarewellTour({ role: 'support', age: 23 })).toBe(false);
  });

  it('halves the bench salary, rounding down', () => {
    expect([0, 1, 2, 3, 5].map(benchSalary)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe('generateUnit', () => {
  const units = generateMany(2000, 7);

  it('is deterministic', () => {
    expect(generateMany(50, 7)).toEqual(units.slice(0, 50));
    expect(generateMany(50, 8)).not.toEqual(units.slice(0, 50));
  });

  it('draws roles about 3 : 2', () => {
    const mcShare = units.filter((unit) => unit.role === 'mc').length / units.length;
    expect(mcShare).toBeGreaterThan(0.56);
    expect(mcShare).toBeLessThan(0.64);
  });

  it('rolls stats in the archetype range, one pool ability at power 1, and a fresh career', () => {
    for (const unit of units) {
      const archetype = ARCHETYPES[unit.archetype];
      expect(archetype.role).toBe(unit.role);
      if (unit.role === 'mc' && archetype.role === 'mc') {
        expect(unit.flow).toBeGreaterThanOrEqual(archetype.flow.min);
        expect(unit.flow).toBeLessThanOrEqual(archetype.flow.max);
        expect(unit.confidence).toBeGreaterThanOrEqual(archetype.confidence.min);
        expect(unit.confidence).toBeLessThanOrEqual(archetype.confidence.max);
      }
      expect(unit.abilities).toHaveLength(1);
      expect(archetype.abilityPool).toContain(unit.abilities[0].id);
      expect(unit.abilities[0].power).toBe(1);
      expect(unit.xp).toBe(0);
      expect(unit.salary).toBe(salaryFor(unit));
      expect(unit.record).toEqual({ battles: 0, barsLanded: 0, chokes: 0, wins: 0, crews: [] });
      expect(Number.isInteger(unit.look) && unit.look >= 0 && unit.look < 2 ** 32).toBe(true);
    }
  });

  it('uses every archetype', () => {
    expect(new Set(units.map((unit) => unit.archetype)).size).toBe(10);
  });

  it('gives every unit a unique stage name', () => {
    expect(new Set(units.map((unit) => unit.stageName.toLowerCase())).size).toBe(units.length);
  });

  it('pins the first units, because saved leagues depend on the rolls', () => {
    expect(generateMany(3, 1).map((unit) => [unit.archetype, unit.stageName, unit.age])).toEqual([
      ['dj', 'Comet', 24],
      ['producer', 'Queen Waffle', 19],
      ['storyteller', 'Sir Static', 18],
    ]);
  });
});

describe('rollAge', () => {
  it('rolls from 18 to the retirement age − 1, with weights falling linearly to 1', () => {
    const rng = createRng(3);
    const counts = new Map<number, number>();
    const draws = 30_000;
    for (let i = 0; i < draws; i++) {
      const age = rollAge('mc', rng);
      counts.set(age, (counts.get(age) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([18, 19, 20, 21, 22]);
    // Weights 5 : 4 : 3 : 2 : 1 out of 15.
    for (const [age, weight] of [
      [18, 5],
      [20, 3],
      [22, 1],
    ] as const) {
      expect((counts.get(age) ?? 0) / draws).toBeCloseTo(weight / 15, 1);
    }
    const supportAges = new Set(Array.from({ length: 2000 }, () => rollAge('support', rng)));
    expect([...supportAges].sort()).toEqual([18, 19, 20, 21, 22, 23, 24]);
  });
});

describe('stage names', () => {
  it('uses the shared and the archetype lists, with the prefix about 60% of the time', () => {
    const rng = createRng(5);
    const dj = ARCHETYPES.dj;
    const names = Array.from({ length: 3000 }, () => rollStageName(dj, rng, NONE));
    const prefixed = names.filter((name) => name.includes(' ')).length / names.length;
    // A few words have a space of their own, so this is a little above 0.6.
    expect(prefixed).toBeGreaterThan(0.55);
    expect(prefixed).toBeLessThan(0.66);
    expect(names).toContain('DJ Vinyl');
    expect(names.some((name) => name.startsWith('Lil '))).toBe(true);
  });

  it('rerolls a taken name, then adds the smallest free numeral', () => {
    let rolls = 0;
    const roll = (): string => {
      rolls++;
      return 'Biscuit';
    };
    expect(uniqueName(roll, nameSet(['Glitter']))).toBe('Biscuit');
    rolls = 0;
    expect(uniqueName(roll, nameSet(['biscuit']))).toBe('Biscuit II');
    expect(rolls).toBe(1 + TUNABLES.NAME_REROLLS);
    expect(uniqueName(roll, nameSet(['Biscuit', 'Biscuit II']))).toBe('Biscuit III');
    const many = [
      'Biscuit',
      ...['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(
        (numeral) => `Biscuit ${numeral}`,
      ),
    ];
    expect(uniqueName(roll, nameSet(many))).toBe('Biscuit 11');
  });

  it('returns the first free reroll', () => {
    const queue = ['Echo', 'Echo', 'Comet'];
    expect(uniqueName(() => queue.shift() ?? 'none', nameSet(['Echo']))).toBe('Comet');
  });
});

describe('market', () => {
  it('starts with POOL_START_PER_MEMBER units per member, even above POOL_MAX', () => {
    const market = createMarket(4, createRng(1), NONE);
    expect(market.publicList).toHaveLength(24);
    expect(market.publicList.map((unit) => unit.id).slice(0, 3)).toEqual(['u1', 'u2', 'u3']);
    expect(market.nextUnitNumber).toBe(25);
  });

  it('adds rookies as the newest units, then drops the oldest down to POOL_MAX', () => {
    const start = createMarket(3, createRng(1), NONE);
    const { market, rookies, leftGame } = addRookies(start, createRng(2), NONE);
    expect(rookies.map((unit) => unit.id)).toEqual(['u19', 'u20', 'u21']);
    expect(market.publicList).toHaveLength(TUNABLES.POOL_MAX);
    expect(leftGame.map((unit) => unit.id)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5']);
    expect(market.publicList.at(-1)?.id).toBe('u21');
  });

  it('keeps a short list whole and gives rookies names not taken in the league', () => {
    const start = createMarket(1, createRng(1), NONE);
    const taken = nameSet(start.publicList.map((unit) => unit.stageName));
    const { market, leftGame } = addRookies(start, createRng(2), taken);
    expect(leftGame).toEqual([]);
    expect(market.publicList).toHaveLength(9);
    const names = market.publicList.map((unit) => unit.stageName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('adds a released unit as the newest free agent and removes signed ones', () => {
    const start = createMarket(1, createRng(1), NONE);
    const released = mc({ id: 'veteran' });
    const withIt = addFreeAgent(start, released);
    expect(withIt.publicList.at(-1)).toBe(released);
    expect(removeFromMarket(withIt, 'veteran')).toEqual(start);
  });
});

describe('scout', () => {
  const context = { leagueSeed: 99, round: 4 };

  it('pays SCOUT_COST for SCOUT_COUNT private units', () => {
    const result = scout(crew({ id: 'c1', wallet: 3 }), NO_SCOUTING, context, NONE);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.crew.wallet).toBe(2);
    expect(result.value.scouting.count).toBe(1);
    expect(result.value.scouting.units.map((unit) => unit.id)).toEqual([
      'c1/r4/s0/0',
      'c1/r4/s0/1',
    ]);
  });

  it('replaces the units when scouting again, with new rolls', () => {
    const first = scout(crew({ id: 'c1', wallet: 3 }), NO_SCOUTING, context, NONE);
    if (!first.ok) throw new Error(first.error);
    const second = scout(first.value.crew, first.value.scouting, context, NONE);
    if (!second.ok) throw new Error(second.error);
    expect(second.value.scouting.count).toBe(2);
    expect(second.value.scouting.units.map((unit) => unit.id)).toEqual([
      'c1/r4/s1/0',
      'c1/r4/s1/1',
    ]);
    expect(second.value.crew.wallet).toBe(1);
  });

  it('gives the same scouts when a round is replayed, and different ones per crew', () => {
    const once = scout(crew({ id: 'c1', wallet: 1 }), NO_SCOUTING, context, NONE);
    const again = scout(crew({ id: 'c1', wallet: 1 }), NO_SCOUTING, context, NONE);
    const other = scout(crew({ id: 'c2', wallet: 1 }), NO_SCOUTING, context, NONE);
    expect(again).toEqual(once);
    if (!once.ok || !other.ok) throw new Error('scouting failed');
    expect(other.value.scouting.units.map((unit) => unit.look)).not.toEqual(
      once.value.scouting.units.map((unit) => unit.look),
    );
  });

  it('refuses without the gold', () => {
    expect(scout(crew({ wallet: 0 }), NO_SCOUTING, context, NONE)).toEqual({
      ok: false,
      error: 'notEnoughGold',
    });
  });

  it('avoids taken names', () => {
    const result = scout(crew({ wallet: 1 }), NO_SCOUTING, context, NONE);
    if (!result.ok) throw new Error(result.error);
    const names = result.value.scouting.units.map((unit) => unit.stageName);
    const retry = scout(crew({ wallet: 1 }), NO_SCOUTING, context, nameSet(names));
    if (!retry.ok) throw new Error(retry.error);
    for (const unit of retry.value.scouting.units) {
      expect(names).not.toContain(unit.stageName);
    }
  });
});
