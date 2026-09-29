import { describe, expect, it } from 'vitest';
import { evaluateAmount } from './amount';

describe('evaluateAmount', () => {
  it('takes the value for the power', () => {
    const amount = { byPower: [1, 2, 3] } as const;
    expect([1, 2, 3].map((power) => evaluateAmount(amount, power as 1 | 2 | 3, 9))).toEqual([
      1, 2, 3,
    ]);
  });

  it('adds ⌊H / divisor⌋ for crowd values', () => {
    const amount = { byPower: [0, 1, 2], hypeDivisor: 3 } as const;
    expect(evaluateAmount(amount, 1, 0)).toBe(0);
    expect(evaluateAmount(amount, 1, 2)).toBe(0);
    expect(evaluateAmount(amount, 1, 3)).toBe(1);
    expect(evaluateAmount(amount, 3, 10)).toBe(5);
  });
});
