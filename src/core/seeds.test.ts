import { describe, expect, it } from 'vitest';
import { agreedBattleSeed, localBattleSeed } from './seeds';

describe('battle seeds', () => {
  it('agrees a seed from both nonces, so changing either changes it', () => {
    const seed = agreedBattleSeed(7, 3, 0, 'aa', 'bb');
    expect(agreedBattleSeed(7, 3, 0, 'aa', 'bb')).toBe(seed);
    expect(agreedBattleSeed(7, 3, 0, 'ab', 'bb')).not.toBe(seed);
    expect(agreedBattleSeed(7, 3, 0, 'aa', 'bc')).not.toBe(seed);
    // The two crews' nonces aren't interchangeable, and the round and division count.
    expect(agreedBattleSeed(7, 3, 0, 'bb', 'aa')).not.toBe(seed);
    expect(agreedBattleSeed(7, 4, 0, 'aa', 'bb')).not.toBe(seed);
    expect(agreedBattleSeed(7, 3, 1, 'aa', 'bb')).not.toBe(seed);
    expect(seed).not.toBe(localBattleSeed(7, 3, 0, 'c1'));
  });
});
