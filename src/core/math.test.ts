import { describe, expect, it } from 'vitest';
import { clamp } from './math';

describe('clamp', () => {
  it('returns the value when it is inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('limits values below the range to min', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('limits values above the range to max', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('accepts a range of a single value', () => {
    expect(clamp(7, 3, 3)).toBe(3);
  });

  it('throws when min is greater than max', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
  });
});
