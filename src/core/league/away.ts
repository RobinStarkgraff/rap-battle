/**
 * The "while you were away" summary (§7 AI managers, D-030): what happened to a player's crew
 * while an AI manager ran it, from the league the player last saw and the league now.
 */

import { allUnits, type Crew, type CrewId, type Title, type Unit } from '../model';
import { divisionStandings } from './standings';
import type { League } from './types';

export interface AwaySummary {
  /** League rounds played without the player. */
  readonly rounds: number;
  readonly wins: number;
  readonly losses: number;
  readonly seasonsEnded: number;
  readonly titles: readonly Title[];
  readonly walletBefore: number;
  readonly walletAfter: number;
  /** Units the crew has now that it didn't have before. */
  readonly signed: readonly Unit[];
  /** Units that left the crew, other than by retiring. */
  readonly released: readonly Unit[];
  readonly retired: readonly Unit[];
  /** The crew's division (0 is the top) and place in it (1 is first) now, if it plays. */
  readonly standing: { readonly division: number; readonly position: number } | null;
}

/**
 * What changed for the crew between `before` and `after`, two copies of the same league;
 * `null` if no round was played in between or the crew isn't in both.
 */
export function awaySummary(before: League, after: League, crewId: CrewId): AwaySummary | null {
  const rounds = after.completedRounds - before.completedRounds;
  const was = before.crews.find((crew) => crew.id === crewId);
  const now = after.crews.find((crew) => crew.id === crewId);
  if (rounds <= 0 || was === undefined || now === undefined) return null;
  const record = { before: lifeRecord(before, was), after: lifeRecord(after, now) };
  const hadIds = new Set(allUnits(was).map((unit) => unit.id));
  const hasIds = new Set(allUnits(now).map((unit) => unit.id));
  const retiredBefore = new Set(was.hallOfFame.map((entry) => entry.unit.id));
  const retired = now.hallOfFame
    .map((entry) => entry.unit)
    .filter((unit) => !retiredBefore.has(unit.id) && hadIds.has(unit.id));
  const retiredIds = new Set(retired.map((unit) => unit.id));
  const hadTitle = new Set(was.record.titles.map(titleKey));
  return {
    rounds,
    wins: record.after.wins - record.before.wins,
    losses: record.after.losses - record.before.losses,
    seasonsEnded: after.season.number - before.season.number,
    titles: now.record.titles.filter((title) => !hadTitle.has(titleKey(title))),
    walletBefore: was.wallet,
    walletAfter: now.wallet,
    signed: allUnits(now).filter((unit) => !hadIds.has(unit.id)),
    released: allUnits(was).filter((unit) => !hasIds.has(unit.id) && !retiredIds.has(unit.id)),
    retired,
    standing: standingOf(after, crewId),
  };
}

/** Wins and losses over the crew's whole life: finished seasons plus the current one. */
function lifeRecord(league: League, crew: Crew): { wins: number; losses: number } {
  const finished = crew.record.seasons.reduce(
    (total, season) => ({
      wins: total.wins + season.wins,
      losses: total.losses + season.losses,
    }),
    { wins: 0, losses: 0 },
  );
  const current = standingOf(league, crew.id);
  if (current === null) return finished;
  const row = divisionStandings(league, current.division)[current.position - 1];
  return {
    wins: finished.wins + (row?.wins ?? 0),
    losses: finished.losses + (row?.losses ?? 0),
  };
}

function standingOf(
  league: League,
  crewId: CrewId,
): { readonly division: number; readonly position: number } | null {
  const division = league.season.divisions.findIndex((candidate) =>
    candidate.crewIds.includes(crewId),
  );
  if (division < 0) return null;
  const position = divisionStandings(league, division).findIndex((row) => row.crewId === crewId);
  return position < 0 ? null : { division, position: position + 1 };
}

function titleKey(title: Title): string {
  return `${title.kind}/${String(title.season)}/${String(title.division)}`;
}
