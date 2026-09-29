/** What the hall of fame tab shows (§6 Hall of fame). Pure, so it is unit-tested. */

import type { Crew } from '../../core';

export const HALL_PER_ROW = 5;
/** Portraits per page: two rows. */
export const HALL_PAGE_SIZE = HALL_PER_ROW * 2;

/** The hall tab's own view state, kept by the hub scene. */
export interface HallUi {
  page: number;
}

export function createHallUi(): HallUi {
  return { page: 0 };
}

export interface HallPage<T> {
  readonly shown: readonly T[];
  /** From 0, clamped to the pages there are. */
  readonly page: number;
  readonly pages: number;
}

/** The portraits of one page, newest legends first. Pure, so it is unit-tested. */
export function hallPage<T>(entries: readonly T[], page: number): HallPage<T> {
  const pages = Math.max(1, Math.ceil(entries.length / HALL_PAGE_SIZE));
  const clamped = Math.min(Math.max(0, page), pages - 1);
  const newestFirst = [...entries].reverse();
  return {
    shown: newestFirst.slice(clamped * HALL_PAGE_SIZE, (clamped + 1) * HALL_PAGE_SIZE),
    page: clamped,
    pages,
  };
}

/** The crew's titles in one line: championships with their seasons, then division titles. */
export function titleSummary(titles: Crew['record']['titles']): string {
  if (titles.length === 0) return 'No titles yet.';
  const championships = titles.filter((title) => title.kind === 'champion');
  const divisions = titles.filter((title) => title.kind === 'division').length;
  const parts: string[] = [];
  if (championships.length > 0) {
    const seasons = championships.map((title) => `S${String(title.season)}`).join(', ');
    parts.push(
      `${String(championships.length)} championship${championships.length === 1 ? '' : 's'} (${seasons})`,
    );
  }
  if (divisions > 0) parts.push(`${String(divisions)} division title${divisions === 1 ? '' : 's'}`);
  return `Titles: ${parts.join(' · ')}`;
}
