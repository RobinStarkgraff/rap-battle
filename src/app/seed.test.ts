import { describe, expect, it } from 'vitest';
import { seedSource } from './seed';

describe('seedSource', () => {
  it('uses the seed from the address', () => {
    expect(seedSource('?seed=2026')()).toBe(2026);
  });

  it('rolls a 32-bit seed otherwise', () => {
    expect(seedSource('', () => 0.5)()).toBe(0x8000_0000);
    expect(seedSource('?seed=abc', () => 0)()).toBe(0);
    expect(seedSource('?seed=1.5', () => 0.25)()).toBe(0x4000_0000);
  });
});
