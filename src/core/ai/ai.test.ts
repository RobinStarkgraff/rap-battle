import { describe, expect, it } from 'vitest';
import { askPrice } from '../market';
import { crew, mc, plainMc, support } from '../testing/fixtures';
import { planLineup, surplus } from './lineup';
import { slotFit, strength, valueForMoney } from './value';

describe('unit value', () => {
  it('rates battle strength from stats and ability power, without the youth premium', () => {
    expect(strength(mc({ id: 'm', flow: 3, confidence: 4, age: 18 }))).toBe(3 + 4 + 2);
    expect(strength(support({ id: 's', abilities: [['scratch', 2], 'remix'] }))).toBe(4 + 2 * 3);
  });

  it('prefers a cheap solid unit per gold of ask and salary', () => {
    const cheap = { ...mc({ id: 'c', flow: 2, confidence: 2, age: 22 }), salary: 2 };
    const star = { ...mc({ id: 's', flow: 5, confidence: 6, age: 18 }), salary: 5 };
    expect(valueForMoney(cheap)).toBeCloseTo(strength(cheap) / (askPrice(cheap) + 2));
    expect(valueForMoney(cheap)).toBeGreaterThan(valueForMoney(star));
  });

  it('fits sturdy MCs to the Opener, hard hitters to the Closer and slot abilities to their slot', () => {
    const tank = plainMc('t', 1, 5);
    expect(slotFit(tank, 'opener')).toBeGreaterThan(slotFit(tank, 'closer'));
    const headliner = mc({ id: 'h', flow: 2, confidence: 2, abilities: ['headliner'] });
    expect(slotFit(headliner, 'opener') - slotFit(headliner, 'middle')).toBe(2 + 4);
  });
});

describe('planLineup', () => {
  it('plays the three strongest MCs in their best order and the two strongest supports', () => {
    const tank = plainMc('tank', 1, 6);
    const hitter = plainMc('hitter', 6, 1);
    const middle = plainMc('mid', 3, 3);
    const weak = plainMc('weak', 1, 1);
    const supports = [
      support({ id: 's1', abilities: ['remix'] }),
      support({ id: 's2', abilities: [['scratch', 3]] }),
      support({ id: 's3', abilities: [['warm-up', 2]] }),
    ];
    const plan = planLineup([weak, hitter, middle, tank, ...supports]);
    expect(plan.mcs.map((unit) => unit?.id)).toEqual(['tank', 'mid', 'hitter']);
    expect(plan.supports.map((unit) => unit.id)).toEqual(['s2', 's3']);
  });

  it('puts a slot ability in its slot and fills the front first', () => {
    const offTheTop = mc({
      id: 'ott',
      flow: 3,
      confidence: 3,
      archetype: 'freestyler',
      abilities: ['off-the-top'],
    });
    const tank = plainMc('tank', 1, 6);
    expect(planLineup([offTheTop, tank]).mcs.map((unit) => unit?.id ?? null)).toEqual([
      'tank',
      'ott',
      null,
    ]);
    const withThird = planLineup([offTheTop, tank, plainMc('x', 3, 3)]);
    expect(withThird.mcs[2]?.id).toBe('ott');
  });
});

describe('surplus', () => {
  it('releases bench units weaker than the whole active line of their role', () => {
    const lineup = crew({
      mcs: [plainMc('a', 3, 3), plainMc('b', 2, 3), plainMc('c', 3, 3)],
      supports: [support({ id: 's1', abilities: ['remix'] })],
      bench: [
        plainMc('weak', 1, 1),
        plainMc('backup', 4, 4),
        support({ id: 's2', abilities: ['scratch'] }),
      ],
    });
    // The support slots aren't full, so the benched support is kept.
    expect(surplus(lineup).map((unit) => unit.id)).toEqual(['weak']);
  });
});
