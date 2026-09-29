import { describe, expect, it } from 'vitest';
import { allUnits, type CrewIdentity, type Side } from '../model';
import { nameSet } from '../names';
import { createRng } from '../rng';
import { mc } from '../testing/fixtures';
import { TUNABLES } from '../tunables';
import { roundBattleStyle } from './battleStyle';
import { createLeague, type NewPlayer } from './create';
import { botIdentity, crewNameProblem } from './crews';
import { divisionSizes, paddedSize } from './divisions';
import { joinLeague, leaveLeague } from './membership';
import { doubleRoundRobin } from './schedule';
import { endSeason } from './seasonEnd';
import { divisionStandings, leagueRanking, seasonComplete } from './standings';
import type { League, MatchResult } from './types';

function identity(name: string): CrewIdentity {
  return { name, mainColour: 'red', trimColour: 'white', logo: 'star' };
}

function players(count: number): NewPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    playerName: `P${String(index + 1)}`,
    identity: identity(`Crew ${String(index + 1)}`),
  }));
}

function league(playerCount: number, bots = 0, seed = 1): League {
  const created = createLeague(seed, players(playerCount), bots);
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

/** Plays every scheduled game of the season; `winner` picks each result's winner. */
function playSeason(
  subject: League,
  winner: (a: string, b: string) => Side = () => 'a',
  rounds = subject.season.schedule[0]?.length ?? 0,
): League {
  const results: MatchResult[] = [...subject.season.results];
  for (const [division, schedule] of subject.season.schedule.entries()) {
    const crewIds = subject.season.divisions[division]?.crewIds ?? [];
    for (const [index, pairings] of schedule.slice(0, rounds).entries()) {
      for (const { a, b } of pairings) {
        const side = winner(crewIds[a] ?? '', crewIds[b] ?? '');
        results.push({ seasonRound: index + 1, division, a, b, winner: side, margin: 1 });
      }
    }
  }
  return { ...subject, season: { ...subject.season, results } };
}

describe('division sizes', () => {
  it.each([
    [1, [1], 2],
    [2, [2], 2],
    [5, [5], 6],
    [6, [6], 6],
    [7, [4, 3], 4],
    [9, [5, 4], 6],
    [13, [5, 4, 4], 6],
  ])('splits %i members into %j, padded to %i', (count, sizes, padded) => {
    expect(divisionSizes(count)).toEqual(sizes);
    expect(paddedSize(sizes)).toBe(padded);
  });
});

describe('doubleRoundRobin', () => {
  it.each([
    [2, 3],
    [4, 6],
    [6, 10],
  ])('gives %i slots %i rounds where each slot plays once per round', (size, rounds) => {
    const schedule = doubleRoundRobin(size, createRng(1));
    expect(schedule).toHaveLength(rounds);
    for (const round of schedule) {
      const slots = round.flatMap(({ a, b }) => [a, b]);
      expect(slots.sort()).toEqual(Array.from({ length: size }, (_, slot) => slot));
    }
  });

  it('lets every pair meet twice, once on each side', () => {
    const schedule = doubleRoundRobin(6, createRng(2));
    const games = schedule.flat().map(({ a, b }) => `${String(a)}-${String(b)}`);
    expect(new Set(games).size).toBe(games.length);
    for (let x = 0; x < 6; x++) {
      for (let y = x + 1; y < 6; y++) {
        expect(games).toContain(`${String(x)}-${String(y)}`);
        expect(games).toContain(`${String(y)}-${String(x)}`);
      }
    }
  });

  it('changes with the seed and refuses odd sizes', () => {
    expect(doubleRoundRobin(6, createRng(1))).not.toEqual(doubleRoundRobin(6, createRng(2)));
    expect(() => doubleRoundRobin(3, createRng(1))).toThrow(RangeError);
  });
});

describe('createLeague', () => {
  it('pads 9 players with 3 bots into two divisions of 6', () => {
    const subject = league(9);
    expect(subject.members).toHaveLength(12);
    expect(subject.members.filter((member) => member.kind === 'bot')).toHaveLength(3);
    expect(subject.season.divisions.map((division) => division.crewIds.length)).toEqual([6, 6]);
    expect(subject.season.schedule.map((rounds) => rounds.length)).toEqual([10, 10]);
    expect(subject.market.publicList).toHaveLength(12 * TUNABLES.POOL_START_PER_MEMBER);
    expect(subject.freshCrews).toHaveLength(12);
    const inDivisions = subject.season.divisions.flatMap((division) => division.crewIds);
    expect(new Set(inDivisions)).toEqual(new Set(subject.crews.map((crew) => crew.id)));
  });

  it('adds the bots the host asks for and gives every crew STARTING_GOLD', () => {
    const subject = league(1, 3);
    expect(subject.season.divisions.map((division) => division.crewIds.length)).toEqual([4]);
    for (const crew of subject.crews) {
      expect(crew.wallet).toBe(TUNABLES.STARTING_GOLD);
      expect(allUnits(crew)).toEqual([]);
    }
    const names = subject.crews.map((crew) => crew.identity.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('is deterministic', () => {
    expect(league(3, 0, 5)).toEqual(league(3, 0, 5));
    expect(league(3, 0, 5).season).not.toEqual(league(3, 0, 6).season);
  });

  it('refuses empty, long and duplicate crew names', () => {
    const named = (...names: string[]) =>
      createLeague(
        1,
        names.map((name) => ({ playerName: name, identity: identity(name) })),
        0,
      );
    expect(named('Waffles', 'waffles ')).toEqual({ ok: false, error: 'taken' });
    expect(named('  ')).toEqual({ ok: false, error: 'empty' });
    expect(named('x'.repeat(TUNABLES.CREW_NAME_MAX + 1))).toEqual({ ok: false, error: 'tooLong' });
    expect(crewNameProblem('Fine', nameSet(['Other']))).toBeNull();
  });
});

describe('battle styles', () => {
  it('founds a league of clashes unless another style is picked', () => {
    expect(league(2).battleStyle).toBe('frontMcsClash');
    const created = createLeague(1, players(2), 0, { battleStyle: 'mixed' });
    expect(created.ok && created.value.battleStyle).toBe('mixed');
  });

  it('uses the league style for every round, or a crowd vote every CROWD_VOTE_EVERY rounds', () => {
    const rounds = [1, 2, 3, 4, 5, 6];
    const styles = (subject: League) => rounds.map((round) => roundBattleStyle(subject, round));
    expect(styles({ ...league(2), battleStyle: 'crowdVote' })).toEqual(
      rounds.map(() => 'crowdVote'),
    );
    expect(styles({ ...league(2), battleStyle: 'frontMcsClash' })).not.toContain('crowdVote');
    expect(TUNABLES.CROWD_VOTE_EVERY).toBe(3);
    expect(styles({ ...league(2), battleStyle: 'mixed' })).toEqual([
      'frontMcsClash',
      'frontMcsClash',
      'crowdVote',
      'frontMcsClash',
      'frontMcsClash',
      'crowdVote',
    ]);
  });
});

describe('botIdentity', () => {
  it('names bots The ⟨adjective⟩ ⟨noun⟩ with two different colours', () => {
    for (let number = 1; number < 50; number++) {
      const bot = botIdentity(7, number, nameSet([]));
      expect(bot.name).toMatch(/^The \w+ \w+$/);
      expect(bot.trimColour).not.toBe(bot.mainColour);
    }
    expect(botIdentity(7, 1, nameSet([]))).toEqual(botIdentity(7, 1, nameSet([])));
  });
});

describe('standings', () => {
  const subject = league(4);

  function withResults(...results: [number, number, Side, number][]): League {
    return {
      ...subject,
      season: {
        ...subject.season,
        results: results.map(([a, b, winner, margin], index) => ({
          seasonRound: index + 1,
          division: 0,
          a,
          b,
          winner,
          margin,
        })),
      },
    };
  }

  it('orders by points', () => {
    const table = divisionStandings(withResults([0, 1, 'b', 1], [2, 3, 'a', 1], [1, 2, 'a', 1]), 0);
    expect(table.slice(0, 2).map((row) => row.slot)).toEqual([1, 2]);
    expect(table[0]).toMatchObject({ slot: 1, played: 2, wins: 2, losses: 0, points: 6 });
  });

  it('breaks a points tie head-to-head before the margin', () => {
    // Slots 0 and 1 have 3 points each; 1 beat 0, though 0 won by more.
    const table = divisionStandings(withResults([0, 2, 'a', 3], [0, 1, 'b', 1]), 0);
    expect(table.slice(0, 2).map((row) => row.slot)).toEqual([1, 0]);
  });

  it('then by total MC margin, then by a stable coin flip', () => {
    const byMargin = divisionStandings(withResults([0, 2, 'a', 1], [1, 3, 'a', 2]), 0);
    expect(byMargin.slice(0, 2).map((row) => row.slot)).toEqual([1, 0]);
    const coin = divisionStandings(withResults([0, 2, 'a', 1], [1, 3, 'a', 1]), 0);
    expect(divisionStandings(withResults([0, 2, 'a', 1], [1, 3, 'a', 1]), 0)).toEqual(coin);
    expect(new Set(coin.slice(0, 2).map((row) => row.slot))).toEqual(new Set([0, 1]));
  });

  it('ranks the league by division, then position', () => {
    const big = playSeason(league(9), (a, b) => (a < b ? 'a' : 'b'), 3);
    const ranking = leagueRanking(big);
    const top = big.season.divisions[0]?.crewIds ?? [];
    expect(new Set(ranking.slice(0, 6))).toEqual(new Set(top));
    expect(ranking.slice(0, 6)).toEqual(divisionStandings(big, 0).map((row) => row.crewId));
  });

  it('knows when the season is complete', () => {
    expect(seasonComplete(subject.season)).toBe(false);
    expect(seasonComplete(playSeason(subject, () => 'a', 5).season)).toBe(false);
    expect(seasonComplete(playSeason(subject).season)).toBe(true);
  });
});

describe('joining and leaving', () => {
  it('lets a newcomer take over the lowest bot slot at once, keeping its points', () => {
    const start = league(3, 1);
    const played = playSeason(start, () => 'a', 2);
    const bot = played.members.find((member) => member.kind === 'bot')?.crewId ?? '';
    const slot = played.season.divisions[0]?.crewIds.indexOf(bot) ?? -1;
    const botPoints = divisionStandings(played, 0).find((row) => row.crewId === bot)?.points;
    const withUnits = {
      ...played,
      crews: played.crews.map((crew) =>
        crew.id === bot ? { ...crew, bench: [mc({ id: 'botUnit' })] } : crew,
      ),
    };
    const joined = joinLeague(withUnits, { playerName: 'New', identity: identity('Newbies') });
    if (!joined.ok) throw new Error(joined.error);
    const { league: after, crewId: newcomer, starts } = joined.value;
    expect(starts).toBe('now');
    expect(after.season.divisions[0]?.crewIds[slot]).toBe(newcomer);
    expect(divisionStandings(after, 0).find((row) => row.crewId === newcomer)?.points).toBe(
      botPoints,
    );
    expect(after.crews.some((crew) => crew.id === bot)).toBe(false);
    expect(after.members.some((member) => member.crewId === bot)).toBe(false);
    expect(after.market.publicList.at(-1)?.id).toBe('botUnit');
    expect(after.freshCrews).toContain(newcomer);
  });

  it('makes a newcomer wait for the next season when there is no bot', () => {
    const start = league(4);
    const joined = joinLeague(start, { playerName: 'New', identity: identity('Newbies') });
    if (!joined.ok) throw new Error(joined.error);
    expect(joined.value.starts).toBe('nextSeason');
    expect(joined.value.league.waiting).toEqual([joined.value.crewId]);
    expect(joinLeague(start, { playerName: 'X', identity: identity('crew 1') })).toEqual({
      ok: false,
      error: 'taken',
    });
  });

  it('turns a leaving player’s crew into a bot, and removes a waiting one', () => {
    const start = league(4);
    const left = leaveLeague(start, 'c2');
    expect(left.members.find((member) => member.crewId === 'c2')).toEqual({
      kind: 'bot',
      crewId: 'c2',
    });
    expect(left.crews).toEqual(start.crews);
    const joined = joinLeague(start, { playerName: 'New', identity: identity('Newbies') });
    if (!joined.ok) throw new Error(joined.error);
    const gone = leaveLeague(joined.value.league, joined.value.crewId);
    expect(gone.waiting).toEqual([]);
    expect(gone.crews).toHaveLength(4);
  });
});

describe('endSeason', () => {
  /** Lower crew numbers always win, so the table order is known. */
  const byNumber = (a: string, b: string): Side =>
    Number(a.slice(1)) < Number(b.slice(1)) ? 'a' : 'b';

  it('records titles and results, and swaps the top and bottom of neighbouring divisions', () => {
    const played = playSeason(league(12), byNumber);
    const top = divisionStandings(played, 0).map((row) => row.crewId);
    const bottom = divisionStandings(played, 1).map((row) => row.crewId);
    const { league: next, report } = endSeason(played);
    expect(report.titles).toEqual([
      { crewId: top[0], title: { kind: 'champion', season: 1, division: 0 } },
      { crewId: top[0], title: { kind: 'division', season: 1, division: 0 } },
      { crewId: bottom[0], title: { kind: 'division', season: 1, division: 1 } },
    ]);
    const champion = next.crews.find((crew) => crew.id === top[0]);
    expect(champion?.record.titles).toHaveLength(2);
    expect(champion?.record.seasons).toEqual([
      { season: 1, division: 0, position: 1, wins: 10, losses: 0, points: 30 },
    ]);
    expect(report.promoted).toEqual([bottom[0]]);
    expect(report.relegated).toEqual([top[5]]);
    expect(next.season.divisions[0]?.crewIds).toEqual([...top.slice(0, 5), bottom[0]]);
    expect(next.season.divisions[1]?.crewIds).toEqual([top[5], ...bottom.slice(1)]);
    expect(next.season.number).toBe(2);
    expect(next.season.results).toEqual([]);
    expect(next.season.schedule).not.toEqual(played.season.schedule);
  });

  it('retires, ages and renegotiates units in crews and on the list', () => {
    const played = playSeason(league(2));
    const veteran = {
      ...mc({ id: 'vet', age: 22 }),
      record: {
        battles: 3,
        barsLanded: 0,
        chokes: 0,
        wins: 0,
        crews: [{ crewId: 'c1', battles: 3, seasons: 0 }],
      },
    };
    const youngster = mc({ id: 'kid', age: 19 });
    const withUnits: League = {
      ...played,
      crews: played.crews.map((crew) =>
        crew.id === 'c1' ? { ...crew, mcSlots: [veteran, youngster, null] } : crew,
      ),
    };
    const { league: next, report } = endSeason(withUnits);
    const c1 = next.crews.find((crew) => crew.id === 'c1');
    expect(c1?.hallOfFame.map((entry) => entry.unit.id)).toEqual(['vet']);
    expect(c1?.mcSlots[1]?.age).toBe(20);
    expect(report.retired.map((retirement) => retirement.unit.id)).toContain('vet');
    const oldOnList = played.market.publicList.filter(
      (unit) => unit.age === (unit.role === 'mc' ? 22 : 24),
    );
    for (const unit of oldOnList) {
      expect(next.market.publicList.some((listed) => listed.id === unit.id)).toBe(false);
    }
  });

  it('lets waiting newcomers join the bottom division, padded with bots', () => {
    const start = league(6);
    const joined = joinLeague(start, { playerName: 'New', identity: identity('Newbies') });
    if (!joined.ok) throw new Error(joined.error);
    const { league: next } = endSeason(playSeason(joined.value.league, byNumber));
    // 7 members split 4 + 3 and play as 4 + 4 with one bot.
    expect(next.season.divisions.map((division) => division.crewIds.length)).toEqual([4, 4]);
    expect(next.season.divisions[1]?.crewIds).toContain(joined.value.crewId);
    expect(next.waiting).toEqual([]);
    expect(next.members.filter((member) => member.kind === 'bot')).toHaveLength(1);
  });
});
