import { describe, expect, it } from 'vitest';
import { TUNABLES } from '../../core';
import { mc, support } from '../../core/testing/fixtures';
import { BLING_MAX, careerLook, CHAIN_MAX, growthSteps } from './career';

describe('careerLook', () => {
  it('adds one piece of bling per growth step, in order', () => {
    const at = (steps: number) => careerLook(mc({ id: 'm', xp: steps * TUNABLES.GROWTH_XP })).bling;
    expect(at(0)).toEqual([]);
    expect(at(1)).toEqual(['chain']);
    expect(at(2)).toEqual(['chain', 'rings']);
    expect(at(3)).toEqual(['chain', 'rings', 'capBadge']);
    expect(at(4)).toEqual(['chain', 'rings', 'capBadge', 'goldTooth']);
    expect(at(9)).toHaveLength(BLING_MAX);
  });

  it('thickens the chain after the last piece, up to a limit', () => {
    const weight = (xp: number) => careerLook(mc({ id: 'm', xp })).chainWeight;
    expect(weight(0)).toBe(1);
    expect(weight(BLING_MAX * TUNABLES.GROWTH_XP)).toBe(1);
    expect(weight((BLING_MAX + 1) * TUNABLES.GROWTH_XP)).toBe(2);
    expect(weight(100 * TUNABLES.GROWTH_XP)).toBe(CHAIN_MAX);
  });

  it('counts only whole growth steps', () => {
    expect(growthSteps(TUNABLES.GROWTH_XP - 1)).toBe(0);
    expect(growthSteps(TUNABLES.GROWTH_XP)).toBe(1);
  });

  it('shows the farewell tour in the last season of each role', () => {
    expect(careerLook(mc({ id: 'm', age: TUNABLES.MC_RETIRE_AGE - 1 })).farewell).toBe(true);
    expect(careerLook(mc({ id: 'm', age: TUNABLES.MC_RETIRE_AGE - 2 })).farewell).toBe(false);
    const coach = support({ id: 's', abilities: ['warm-up'] });
    expect(careerLook({ ...coach, age: TUNABLES.SUPPORT_RETIRE_AGE - 1 }).farewell).toBe(true);
    expect(careerLook({ ...coach, age: TUNABLES.MC_RETIRE_AGE - 1 }).farewell).toBe(false);
  });
});
