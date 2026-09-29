import { describe, expect, it } from 'vitest';
import { HALL_PAGE_SIZE, hallPage, titleSummary } from './hallView';

describe('hallPage', () => {
  const entries = Array.from({ length: 23 }, (_, index) => index);

  it('shows the newest legends first, a page at a time', () => {
    expect(hallPage(entries, 0)).toEqual({
      shown: [22, 21, 20, 19, 18, 17, 16, 15, 14, 13],
      page: 0,
      pages: 3,
    });
    expect(hallPage(entries, 2).shown).toEqual([2, 1, 0]);
    expect(HALL_PAGE_SIZE).toBe(10);
  });

  it('keeps the page within the pages there are', () => {
    expect(hallPage(entries, 7).page).toBe(2);
    expect(hallPage(entries, -1).page).toBe(0);
    expect(hallPage([], 3)).toEqual({ shown: [], page: 0, pages: 1 });
  });
});

describe('titleSummary', () => {
  it('sums the titles up in one line', () => {
    expect(titleSummary([])).toBe('No titles yet.');
    expect(
      titleSummary([
        { kind: 'champion', season: 1, division: 0 },
        { kind: 'division', season: 1, division: 0 },
        { kind: 'champion', season: 3, division: 0 },
        { kind: 'division', season: 3, division: 0 },
        { kind: 'division', season: 5, division: 1 },
      ]),
    ).toBe('Titles: 2 championships (S1, S3) · 3 division titles');
    expect(titleSummary([{ kind: 'division', season: 2, division: 1 }])).toBe(
      'Titles: 1 division title',
    );
  });
});
