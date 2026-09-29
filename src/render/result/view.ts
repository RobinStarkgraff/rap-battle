/**
 * What the result screen says (§11 Result screen, D-050): the headline, the MVP, the player's
 * growth and win bonus, the round's other battles and the standings. Pure, so it is tested.
 */

import {
  ABILITIES,
  activeUnits,
  battleEnd,
  battleMvp,
  damageTable,
  divisionStandings,
  TUNABLES,
  type BattleReport,
  type Crew,
  type CrewId,
  type DamageDealt,
  type GrowthEvent,
  type League,
  type RoundFinished,
  type Side,
  type Standing,
  type Unit,
} from '../../core';
import { headline } from '../text';

export interface ResultBattle {
  readonly report: BattleReport;
  /** The crews as they locked in. */
  readonly crews: Readonly<Record<Side, Crew>>;
  readonly playerSide: Side;
}

export interface ResultInput {
  readonly crewId: CrewId;
  readonly finished: RoundFinished;
  readonly battle: ResultBattle | null;
}

export interface Mvp {
  readonly unit: Unit;
  readonly crew: Crew;
  readonly damage: number;
}

export interface StandingRow extends Standing {
  readonly name: string;
  readonly mine: boolean;
}

export interface ResultView {
  readonly headline: string;
  readonly won: boolean | null;
  readonly mvp: Mvp | null;
  readonly crewLines: readonly string[];
  readonly otherBattles: readonly string[];
  /** The player's division table after the round (the final one after a season end). */
  readonly standings: readonly StandingRow[];
  readonly seasonLines: readonly string[];
}

export function resultView(input: ResultInput): ResultView {
  const { finished, battle, crewId } = input;
  const before = finished.seasonEnd;
  const names = crewNames(finished.league);
  return {
    headline: battle === null ? 'NO BATTLE FOR YOU THIS ROUND' : battleHeadline(battle),
    won: battle === null ? null : battle.report.winner === crewId,
    mvp: battle === null ? null : mvpOf(battle),
    crewLines: crewLines(input),
    otherBattles: finished.battles
      .filter((report) => report !== battle?.report)
      .map((report) => {
        const loser = report.winner === report.crewA ? report.crewB : report.crewA;
        return `${names(report.winner)} beat ${names(loser)}${report.margin > 0 ? ` (${String(report.margin)} MC${report.margin === 1 ? '' : 's'} standing)` : ''}`;
      }),
    standings: standingsAfter(finished, crewId).map((row) => ({
      ...row,
      name: names(row.crewId),
      mine: row.crewId === crewId,
    })),
    seasonLines: before === null ? [] : seasonLines(input),
  };
}

function battleHeadline(battle: ResultBattle): string {
  const { report, crews } = battle;
  const end = battleEnd(report.events);
  const loserSide: Side = end.winner === 'a' ? 'b' : 'a';
  const mvp = battleMvp(report.events, crews.a, crews.b);
  const target = damageTable(report.events, crews.a, crews.b).find((row) => row.side === loserSide);
  const mvpName = mvp === null ? undefined : unitName(crews, mvp);
  const targetName = target === undefined ? undefined : unitName(crews, target);
  return headline(report.seed, end.reason, end.margin, {
    winner: crews[end.winner].identity.name,
    loser: crews[loserSide].identity.name,
    ...(mvpName === undefined || targetName === undefined
      ? {}
      : { mvp: mvpName, target: targetName }),
  });
}

function mvpOf(battle: ResultBattle): Mvp | null {
  const { report, crews } = battle;
  const mvp = battleMvp(report.events, crews.a, crews.b);
  if (mvp === null) return null;
  const crew = crews[mvp.side];
  const unit = activeUnits(crew).find((candidate) => candidate.id === mvp.unitId);
  return unit === undefined ? null : { unit, crew, damage: mvp.damage };
}

function unitName(crews: Readonly<Record<Side, Crew>>, row: DamageDealt): string | undefined {
  return activeUnits(crews[row.side]).find((unit) => unit.id === row.unitId)?.stageName;
}

function crewLines(input: ResultInput): string[] {
  const { finished, battle, crewId } = input;
  const crew = finished.league.crews.find((candidate) => candidate.id === crewId);
  const lines: string[] = [];
  if (battle !== null) {
    const played = activeUnits(battle.crews[battle.playerSide]).length;
    if (played > 0) lines.push(`+1 xp for each of your ${String(played)} active units.`);
    if (battle.report.winner === crewId)
      lines.push(`+${String(TUNABLES.WIN_BONUS)} gold win bonus at the next upkeep.`);
  }
  const growth = finished.growth.find((entry) => entry.crewId === crewId)?.events ?? [];
  for (const event of growth)
    lines.push(growthLine(event, (id) => unitIn(crew, id)?.stageName ?? 'A unit'));
  return lines;
}

export function growthLine(event: GrowthEvent, nameOf: (unitId: string) => string): string {
  switch (event.kind) {
    case 'statUp':
      return `${nameOf(event.unitId)} grew: +1 ${event.stat}.`;
    case 'powerUp':
      return `${nameOf(event.unitId)}: ${ABILITIES[event.abilityId].name} is now power ${String(event.power)}.`;
    case 'learn':
      return `${nameOf(event.unitId)} learned ${ABILITIES[event.abilityId].name}!`;
  }
}

function unitIn(crew: Crew | undefined, unitId: string): Unit | undefined {
  if (crew === undefined) return undefined;
  return [...activeUnits(crew), ...crew.bench].find((unit) => unit.id === unitId);
}

function standingsAfter(finished: RoundFinished, crewId: CrewId): readonly Standing[] {
  if (finished.seasonEnd !== null) {
    return (
      finished.seasonEnd.standings.find((table) => table.some((row) => row.crewId === crewId)) ?? []
    );
  }
  const division = finished.league.season.divisions.findIndex((candidate) =>
    candidate.crewIds.includes(crewId),
  );
  return division < 0 ? [] : divisionStandings(finished.league, division);
}

function seasonLines(input: ResultInput): string[] {
  const report = input.finished.seasonEnd;
  if (report === null) return [];
  const names = crewNames(input.finished.league);
  const lines = [`SEASON ${String(report.season)} IS OVER!`];
  const champion = report.titles.find((entry) => entry.title.kind === 'champion');
  if (champion !== undefined) lines.push(`Champions: ${names(champion.crewId)}.`);
  const table = report.standings.findIndex((rows) =>
    rows.some((row) => row.crewId === input.crewId),
  );
  const position =
    (report.standings[table] ?? []).findIndex((row) => row.crewId === input.crewId) + 1;
  if (position > 0)
    lines.push(`You finished #${String(position)} in division ${String(table + 1)}.`);
  if (report.promoted.includes(input.crewId)) lines.push('Promoted!');
  if (report.relegated.includes(input.crewId)) lines.push('Relegated.');
  const retired = report.retired.filter((entry) => entry.fromCrewId === input.crewId);
  for (const entry of retired)
    lines.push(`${entry.unit.stageName} retired into your hall of fame.`);
  const farewell = report.farewellTours.length;
  if (farewell > 0) lines.push(`${String(farewell)} units start their farewell tour.`);
  return lines;
}

function crewNames(league: League): (crewId: CrewId) => string {
  return (crewId) => league.crews.find((crew) => crew.id === crewId)?.identity.name ?? crewId;
}
