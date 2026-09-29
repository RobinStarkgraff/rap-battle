/**
 * Statistics over AI-played rounds for the balance pass (T-031, §5 Pacing, §5.1, §6): battle
 * length per style, setup knockouts, how often the stronger lineup wins, lineups filled,
 * gold, salary and careers. Pure, so the headless tests can hold the numbers to their targets.
 */

import type { BattleStyleId } from '../battle';
import { ABILITIES } from '../data';
import { activeUnits, type BattleEvent, type Crew, type CrewId } from '../model';
import type { RoundPlayed } from '../round';
import { payroll } from '../shop';
import { strength } from './value';

export interface Spread {
  readonly mean: number;
  readonly p10: number;
  readonly median: number;
  readonly p90: number;
}

export interface StyleStats {
  readonly battles: number;
  readonly turns: Spread;
  /** Share of battles won before the first bar: a wipeout in setup. */
  readonly setupKnockouts: number;
  /** Share of battles that reached `MAX_TURNS`. */
  readonly turnLimit: number;
  /** Share of battles between unequal lineups that the stronger one won. */
  readonly strongerWins: number;
  /** Share of battles by how they ended. */
  readonly endReasons: Readonly<Record<string, number>>;
}

export interface SeasonStats {
  readonly season: number;
  /** Active slots filled (of 5) after each round, averaged over crews and rounds. */
  readonly filledSlots: number;
  readonly wallet: number;
  readonly payroll: number;
  /** Mean salary of the units in crews. */
  readonly salary: number;
  readonly retired: number;
  /** Gold lost to the wallet cap per crew and upkeep. */
  readonly lostToCap: number;
}

/** How often a lineup with the ability in an active slot won its battle. */
export interface AbilityWins {
  readonly battles: number;
  readonly winRate: number;
}

/** What the `upkeep` abilities gave, per crew and upkeep, over every crew. */
export interface UpkeepGains {
  readonly xp: number;
  readonly confidence: number;
  readonly gold: number;
}

export interface BalanceStats {
  readonly styles: Partial<Record<BattleStyleId, StyleStats>>;
  readonly seasons: readonly SeasonStats[];
  /** Per battle where Drop the Beat resolved: the most flow one MC got from it. */
  readonly dropTheBeatFlow: Spread | null;
  /** Share of all resolved abilities, per ability, over every battle. */
  readonly abilityShare: Readonly<Record<string, number>>;
  readonly abilityWins: Readonly<Record<string, AbilityWins>>;
  readonly upkeep: UpkeepGains;
}

export function balanceStats(rounds: readonly RoundPlayed[]): BalanceStats {
  return {
    styles: styleStats(rounds),
    seasons: seasonStats(rounds),
    dropTheBeatFlow: dropTheBeat(rounds),
    abilityShare: abilityShare(rounds),
    abilityWins: abilityWins(rounds),
    upkeep: upkeepGains(rounds),
  };
}

function styleStats(rounds: readonly RoundPlayed[]): Partial<Record<BattleStyleId, StyleStats>> {
  const byStyle = new Map<
    BattleStyleId,
    { events: readonly BattleEvent[]; stronger: boolean | null }[]
  >();
  for (const round of rounds) {
    const crews = new Map(round.league.crews.map((crew) => [crew.id, crew]));
    for (const battle of round.battles) {
      const list = byStyle.get(battle.style) ?? [];
      // Crews are measured after the round, so rounds with a season end (retirements) are left out.
      const stronger =
        round.seasonEnd === null
          ? strongerWon(crews, battle.crewA, battle.crewB, battle.winner)
          : null;
      list.push({ events: battle.events, stronger });
      byStyle.set(battle.style, list);
    }
  }
  return Object.fromEntries(
    [...byStyle].map(([style, battles]) => {
      const turns = battles.map(({ events }) => countKind(events, 'turn'));
      const ends = battles.map(({ events }) => events.at(-1));
      const judged = battles.flatMap(({ stronger }) => (stronger === null ? [] : [stronger]));
      return [
        style,
        {
          battles: battles.length,
          turns: spread(turns),
          setupKnockouts: share(
            ends.filter(
              (end, index) => end?.kind === 'end' && end.reason === 'wipeout' && turns[index] === 0,
            ).length,
            battles.length,
          ),
          turnLimit: share(
            ends.filter((end) => end?.kind === 'end' && end.reason === 'turnLimit').length,
            battles.length,
          ),
          strongerWins: share(judged.filter(Boolean).length, judged.length),
          endReasons: shares(ends.flatMap((end) => (end?.kind === 'end' ? [end.reason] : []))),
        },
      ];
    }),
  );
}

function strongerWon(
  crews: ReadonlyMap<CrewId, Crew>,
  a: CrewId,
  b: CrewId,
  winner: CrewId,
): boolean | null {
  const crewA = crews.get(a);
  const crewB = crews.get(b);
  if (crewA === undefined || crewB === undefined) return null;
  const strengthA = lineupStrength(crewA);
  const strengthB = lineupStrength(crewB);
  if (strengthA === strengthB) return null;
  return (strengthA > strengthB ? a : b) === winner;
}

function lineupStrength(crew: Crew): number {
  return activeUnits(crew).reduce((sum, unit) => sum + strength(unit), 0);
}

function seasonStats(rounds: readonly RoundPlayed[]): SeasonStats[] {
  const seasons = new Map<number, RoundPlayed[]>();
  for (const round of rounds) {
    const season = round.seasonEnd?.season ?? round.league.season.number;
    seasons.set(season, [...(seasons.get(season) ?? []), round]);
  }
  return [...seasons].map(([season, list]) => {
    const measured = list
      .filter((round) => round.seasonEnd === null)
      .flatMap((round) => round.league.crews);
    const units = measured.flatMap((crew) => activeUnits(crew));
    return {
      season,
      filledSlots: mean(measured.map((crew) => activeUnits(crew).length)),
      wallet: mean(measured.map((crew) => crew.wallet)),
      payroll: mean(measured.map(payroll)),
      salary: mean(units.map((unit) => unit.salary)),
      retired: list.reduce((sum, round) => sum + (round.seasonEnd?.retired.length ?? 0), 0),
      lostToCap: mean(list.flatMap((round) => round.start.upkeep.map((entry) => entry.lostToCap))),
    };
  });
}

function dropTheBeat(rounds: readonly RoundPlayed[]): Spread | null {
  const most = rounds.flatMap((round) =>
    round.battles.flatMap((battle) => {
      const gained = new Map<string, number>();
      for (const event of battle.events) {
        if (event.kind === 'buff' && event.abilityId === 'drop-the-beat') {
          gained.set(event.targetId, (gained.get(event.targetId) ?? 0) + event.flow);
        }
      }
      return gained.size === 0 ? [] : [Math.max(...gained.values())];
    }),
  );
  return most.length === 0 ? null : spread(most);
}

function abilityShare(rounds: readonly RoundPlayed[]): Record<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const round of rounds) {
    for (const battle of round.battles) {
      for (const event of battle.events) {
        if (event.kind !== 'ability') continue;
        counts.set(event.abilityId, (counts.get(event.abilityId) ?? 0) + 1);
        total += 1;
      }
    }
  }
  return Object.fromEntries(
    Object.keys(ABILITIES).map((id) => [id, share(counts.get(id) ?? 0, total)]),
  );
}

function abilityWins(rounds: readonly RoundPlayed[]): Record<string, AbilityWins> {
  const tally = new Map<string, { battles: number; wins: number }>();
  for (const round of rounds) {
    if (round.seasonEnd !== null) continue;
    const crews = new Map(round.league.crews.map((crew) => [crew.id, crew]));
    for (const battle of round.battles) {
      for (const crewId of [battle.crewA, battle.crewB]) {
        const crew = crews.get(crewId);
        if (crew === undefined) continue;
        const ids = new Set(
          activeUnits(crew).flatMap((unit) => unit.abilities.map((ability) => ability.id)),
        );
        for (const id of ids) {
          const entry = tally.get(id) ?? { battles: 0, wins: 0 };
          tally.set(id, {
            battles: entry.battles + 1,
            wins: entry.wins + (battle.winner === crewId ? 1 : 0),
          });
        }
      }
    }
  }
  return Object.fromEntries(
    Object.keys(ABILITIES).map((id) => {
      const entry = tally.get(id) ?? { battles: 0, wins: 0 };
      return [id, { battles: entry.battles, winRate: share(entry.wins, entry.battles) }];
    }),
  );
}

function upkeepGains(rounds: readonly RoundPlayed[]): UpkeepGains {
  const entries = rounds.flatMap((round) => round.start.upkeep);
  const events = entries.flatMap((entry) => entry.events);
  const total = (pick: (event: (typeof events)[number]) => number): number =>
    share(
      events.reduce((sum, event) => sum + pick(event), 0),
      entries.length,
    );
  return {
    xp: total((event) => (event.kind === 'xp' ? event.amount : 0)),
    confidence: total((event) => (event.kind === 'buff' ? event.confidence : 0)),
    gold: total((event) => (event.kind === 'gold' ? event.amount : 0)),
  };
}

function shares(values: readonly string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].map(([key, count]) => [key, share(count, values.length)]));
}

function countKind(events: readonly BattleEvent[], kind: BattleEvent['kind']): number {
  return events.filter((event) => event.kind === kind).length;
}

function spread(values: readonly number[]): Spread {
  const sorted = [...values].sort((x, y) => x - y);
  const at = (fraction: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;
  return { mean: mean(values), p10: at(0.1), median: at(0.5), p90: at(0.9) };
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}
