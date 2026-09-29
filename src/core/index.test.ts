import { describe, expect, it } from 'vitest';
import { GAME_TITLE } from '.';

describe('GAME_TITLE', () => {
  it('is the game’s name (D-048)', () => {
    expect(GAME_TITLE).toBe('Mic Drop League');
  });
});
