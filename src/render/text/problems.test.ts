import { describe, expect, it } from 'vitest';
import { problemText } from './problems';

describe('problemText', () => {
  it('explains known reasons and names unknown ones', () => {
    expect(problemText('biddingOpen')).toBe('Finish the bidding rounds first.');
    expect(problemText('somethingNew')).toContain('somethingNew');
  });
});
