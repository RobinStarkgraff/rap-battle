/**
 * The headless league (T-019, M4 exit criteria): AI managers play several seasons of a whole
 * league through `playRound()`, and the league stays consistent round after round.
 */

import { describe, expect, it } from 'vitest';
import { createLeague, type League } from '../league';
import { allUnits, type BattleEvent } from '../model';
import { playRound, type RoundPlayed } from '../round';
import { parseLeague, serializeLeague } from '../save';
import { TUNABLES } from '../tunables';
import { balanceStats } from './balance';
import { AI_MANAGER } from './manager';

function newLeague(players: number, bots: number, seed: number): League {
  const created = createLeague(
    seed,
    Array.from({ length: players }, (_, index) => ({
      playerName: `Player ${String(index + 1)}`,
      identity: {
        name: `Crew ${String(index + 1)}`,
        mainColour: 'red',
        trimColour: 'white',
        logo: 'star',
      } as const,
    })),
    bots,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function playSeasons(league: League, seasons: number): { league: League; rounds: RoundPlayed[] } {
  let current = league;
  const rounds: RoundPlayed[] = [];
  while (current.season.number <= seasons) {
    const played = playRound(current, () => AI_MANAGER);
    rounds.push(played);
    current = played.league;
  }
  return { league: current, rounds };
}

function endOf(events: readonly BattleEvent[]): Extract<BattleEvent, { kind: 'end' }> | undefined {
  const last = events.at(-1);
  return last?.kind === 'end' ? last : undefined;
}

function turns(events: readonly BattleEvent[]): number {
  return events.filter((event) => event.kind === 'turn').length;
}

describe('a headless league of AI managers', () => {
  // 9 crews split 5 + 4 and are padded to two divisions of 6, so 10 rounds a season.
  const start = newLeague(3, 6, 2026);
  const { league, rounds } = playSeasons(start, 4);

  it('plays four whole seasons', () => {
    expect(start.season.divisions.map((division) => division.crewIds.length)).toEqual([6, 6]);
    expect(rounds).toHaveLength(40);
    expect(league.season.number).toBe(5);
    expect(league.completedRounds).toBe(40);
    expect(rounds.filter((round) => round.seasonEnd !== null)).toHaveLength(4);
    for (const round of rounds) expect(round.battles).toHaveLength(6);
  });

  it('crowns one champion and one winner per division each season', () => {
    const titles = league.crews.flatMap((crew) => crew.record.titles);
    expect(titles.filter((title) => title.kind === 'champion')).toHaveLength(4);
    expect(titles.filter((title) => title.kind === 'division')).toHaveLength(8);
    for (const crew of league.crews) expect(crew.record.seasons).toHaveLength(4);
  });

  it('fills its lineups in the first season, never fields an empty stage, and pays its way', () => {
    // Crews are measured after rounds without a season end, because retirement empties slots.
    const firstSeason = rounds.filter((round) => round.league.season.number === 1);
    const filled = firstSeason
      .slice(1)
      .flatMap((round) =>
        round.league.crews.map(
          (crew) => [...crew.mcSlots, ...crew.supportSlots].filter((unit) => unit !== null).length,
        ),
      );
    expect(filled.reduce((sum, count) => sum + count, 0) / filled.length).toBeGreaterThan(4.5);
    const battles = rounds.flatMap((round) => round.battles);
    expect(battles.filter((battle) => endOf(battle.events)?.reason === 'noMcs')).toEqual([]);
    for (const round of rounds) {
      for (const crew of round.league.crews) expect(crew.wallet).toBeGreaterThanOrEqual(0);
    }
  });

  it('retires veterans into halls of fame and keeps living units unique', () => {
    expect(league.crews.some((crew) => crew.hallOfFame.length > 0)).toBe(true);
    const living = [...league.crews.flatMap(allUnits), ...league.market.publicList];
    expect(new Set(living.map((unit) => unit.id)).size).toBe(living.length);
    const names = living.map((unit) => unit.stageName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const unit of living) {
      expect(unit.age).toBeLessThan(
        unit.role === 'mc' ? TUNABLES.MC_RETIRE_AGE : TUNABLES.SUPPORT_RETIRE_AGE,
      );
    }
  });

  it('lets units grow and learn a second ability', () => {
    const living = league.crews.flatMap(allUnits);
    expect(living.some((unit) => unit.xp >= TUNABLES.GROWTH_XP)).toBe(true);
    const everyone = [
      ...living,
      ...league.crews.flatMap((crew) => crew.hallOfFame.map((entry) => entry.unit)),
    ];
    expect(everyone.some((unit) => unit.abilities.length === 2)).toBe(true);
  });

  it('ends battles before the turn limit', () => {
    const battles = rounds.flatMap((round) => round.battles);
    const limited = battles.filter((battle) => endOf(battle.events)?.reason === 'turnLimit');
    expect(limited.length / battles.length).toBeLessThan(0.02);
    const average = battles.reduce((sum, battle) => sum + turns(battle.events), 0) / battles.length;
    expect(average).toBeGreaterThan(2);
  });

  it('meets the balance targets of T-031 (§5 Pacing, D-054, D-090)', () => {
    const stats = balanceStats(rounds);
    const clash = stats.styles.frontMcsClash;
    if (clash === undefined) throw new Error('no clash battles');
    expect(clash.turns.mean).toBeGreaterThanOrEqual(6);
    expect(clash.turns.mean).toBeLessThanOrEqual(12);
    expect(clash.setupKnockouts).toBeLessThan(0.03);
    expect(clash.turnLimit).toBeLessThan(0.01);
    // Skill-led with some luck: the stronger lineup wins most of the time, not always.
    expect(clash.strongerWins).toBeGreaterThan(0.55);
    expect(clash.strongerWins).toBeLessThan(0.9);
    for (const season of stats.seasons) expect(season.filledSlots).toBeGreaterThan(4.4);
  });

  it('saves and loads the league after four seasons', () => {
    expect(parseLeague(serializeLeague(league))).toEqual({ ok: true, value: league });
  });

  it('is deterministic', () => {
    expect(playSeasons(newLeague(3, 6, 2026), 1).league).toEqual(playSeasons(start, 1).league);
  });
});

describe('a headless crowd vote league', () => {
  const start = newLeague(2, 4, 11);
  const { rounds } = playSeasons({ ...start, battleStyle: 'crowdVote' }, 2);

  it('lets the crowd decide a good share of battles, which stay short', () => {
    const votes = balanceStats(rounds).styles.crowdVote;
    if (votes === undefined) throw new Error('no crowd votes');
    expect(votes.endReasons['crowdVote'] ?? 0).toBeGreaterThan(0.1);
    expect(votes.turns.mean).toBeGreaterThanOrEqual(6);
    expect(votes.turns.p90).toBeLessThanOrEqual(12);
  });
});

describe('a small headless league over five seasons', () => {
  const { league, rounds } = playSeasons(newLeague(2, 2, 7), 5);

  it('keeps every crew on stage and the save valid', () => {
    expect(league.season.number).toBe(6);
    expect(rounds).toHaveLength(30);
    const battles = rounds.flatMap((round) => round.battles);
    expect(battles.filter((battle) => endOf(battle.events)?.reason === 'noMcs')).toEqual([]);
    expect(parseLeague(serializeLeague(league))).toEqual({ ok: true, value: league });
  });
});
