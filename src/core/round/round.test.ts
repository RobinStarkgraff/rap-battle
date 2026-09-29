import { describe, expect, it } from 'vitest';
import { createLeague, joinLeague, type League } from '../league';
import { askPrice } from '../market';
import { allUnits, type CrewId, type CrewIdentity } from '../model';
import { bidsProblem, payroll, type Bid } from '../shop';
import { TUNABLES } from '../tunables';
import {
  forceLockInCrew,
  lockInCrew,
  resolveBids,
  roundBid,
  roundMove,
  roundRelease,
  roundScout,
  roundSignScouted,
  shopOf,
  stillBidding,
  stillShopping,
} from './actions';
import { finishRound, roundBattles } from './finish';
import { IDLE_MANAGER, playRound, type CrewManager } from './play';
import { startRound, takenNames } from './start';

function identity(name: string): CrewIdentity {
  return { name, mainColour: 'teal', trimColour: 'black', logo: 'crown' };
}

function newLeague(players: number, bots = 0, seed = 3): League {
  const created = createLeague(
    seed,
    Array.from({ length: players }, (_, index) => ({
      playerName: `P${String(index)}`,
      identity: identity(`Crew ${String(index)}`),
    })),
    bots,
  );
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** Bids the ask on every unit it can add, cheapest first, while the bids stay valid. */
const GREEDY: CrewManager = {
  bid: (state, crewId) => {
    const shop = unwrap(shopOf(state, crewId));
    const bids: Bid[] = [];
    const byAsk = [...state.market.publicList].sort((x, y) => askPrice(x) - askPrice(y));
    for (const unit of byAsk) {
      const next = [...bids, { unitId: unit.id, amount: askPrice(unit) }];
      if (bidsProblem(shop.crew, next, state.market) === null) bids.splice(0, bids.length, ...next);
    }
    return unwrap(roundBid(state, crewId, bids));
  },
  lineup: (state) => state,
};

function crewOf(league: League, id: CrewId) {
  const crew = league.crews.find((candidate) => candidate.id === id);
  if (crew === undefined) throw new Error(`no crew ${id}`);
  return crew;
}

describe('startRound', () => {
  it('skips upkeep and rookies in the league’s first round', () => {
    const league = newLeague(4);
    const { state, report } = startRound(league);
    expect(report).toEqual({ round: 1, seasonRound: 1, upkeep: [], rookies: [], leftGame: [] });
    expect(state.market).toEqual(league.market);
    expect(state.shops.map((shop) => shop.crew.wallet)).toEqual([40, 40, 40, 40]);
    expect(state.bidding).toEqual({ round: 1, ended: false });
  });

  it('pays upkeep with the win bonus and adds rookies after the first round', () => {
    const played = playRound(newLeague(4), () => GREEDY);
    const { report } = startRound(played.league);
    expect(report.round).toBe(2);
    expect(report.seasonRound).toBe(2);
    expect(report.rookies).toHaveLength(TUNABLES.ROOKIES_PER_ROUND);
    for (const upkeep of report.upkeep) {
      const won = played.league.lastRoundWinners.includes(upkeep.crewId);
      expect(upkeep.income).toBe(TUNABLES.BASE_INCOME + (won ? TUNABLES.WIN_BONUS : 0));
    }
    expect(report.upkeep).toHaveLength(4);
  });

  it('skips the first upkeep of a crew that took over a bot mid-season', () => {
    const played = playRound(newLeague(3, 1), () => GREEDY);
    const joined = unwrap(
      joinLeague(played.league, { playerName: 'N', identity: identity('Newbies') }),
    );
    const { report, state } = startRound(joined.league);
    expect(report.upkeep.map((upkeep) => upkeep.crewId)).not.toContain(joined.crewId);
    expect(state.shops.some((shop) => shop.crew.id === joined.crewId)).toBe(true);
  });

  it('leaves waiting newcomers out of the round', () => {
    const joined = unwrap(
      joinLeague(newLeague(4), { playerName: 'N', identity: identity('Newbies') }),
    );
    expect(joined.starts).toBe('nextSeason');
    const { state } = startRound(joined.league);
    expect(state.shops.map((shop) => shop.crew.id)).not.toContain(joined.crewId);
  });
});

describe('shop actions', () => {
  const league = newLeague(2);
  const start = startRound(league).state;
  const [first, second] = start.shops.map((shop) => shop.crew.id);
  const a = first ?? '';
  const b = second ?? '';

  it('tracks who is still bidding and who is still shopping', () => {
    expect(stillBidding(start)).toEqual([a, b]);
    const bid = unwrap(roundBid(start, a, []));
    expect(stillBidding(bid)).toEqual([b]);
    expect(stillShopping(bid)).toEqual([a, b]);
  });

  it('resolves bids, clears them and ends the bidding after a round without bids', () => {
    const unit = start.market.publicList[0];
    if (unit === undefined) throw new Error('empty market');
    const bid = unwrap(roundBid(start, a, [{ unitId: unit.id, amount: askPrice(unit) }]));
    const revealed = unwrap(resolveBids(bid));
    expect(revealed.awards.map((award) => [award.unitId, award.crewId])).toEqual([[unit.id, a]]);
    expect(revealed.state.bidding).toEqual({ round: 2, ended: false });
    expect(revealed.state.shops.every((shop) => shop.bids === null)).toBe(true);
    expect(revealed.state.market.publicList).toHaveLength(start.market.publicList.length - 1);
    const quiet = unwrap(resolveBids(revealed.state));
    expect(quiet.state.bidding.ended).toBe(true);
    expect(roundBid(quiet.state, a, [])).toEqual({ ok: false, error: 'biddingEnded' });
    expect(resolveBids(quiet.state)).toEqual({ ok: false, error: 'biddingEnded' });
  });

  it('allows lock-in only after the bidding, and no actions after it', () => {
    expect(lockInCrew(start, a)).toEqual({ ok: false, error: 'biddingOpen' });
    const ended = unwrap(resolveBids(start)).state;
    const locked = unwrap(lockInCrew(ended, a));
    expect(locked.lockedIn).toEqual([a]);
    expect(roundScout(locked, a)).toEqual({ ok: false, error: 'lockedIn' });
    expect(roundScout(locked, 'nobody')).toEqual({ ok: false, error: 'unknownCrew' });
    expect(finishRound(locked)).toEqual({ ok: false, error: 'notAllLockedIn' });
  });

  it('scouts and signs a scouted unit without renaming it', () => {
    const scouted = unwrap(roundScout(start, a));
    const unit = unwrap(shopOf(scouted, a)).scouting.units[0];
    if (unit === undefined) throw new Error('no scouted unit');
    expect(takenNames(scouted).has(unit.stageName)).toBe(true);
    const signed = unwrap(roundSignScouted(scouted, a, unit.id));
    const crew = unwrap(shopOf(signed.state, a)).crew;
    expect(allUnits(crew).map((member) => member.stageName)).toEqual([unit.stageName]);
  });

  it('releases units to the public list and moves them', () => {
    const unit = start.market.publicList[0];
    if (unit === undefined) throw new Error('empty market');
    const won = unwrap(
      resolveBids(unwrap(roundBid(start, a, [{ unitId: unit.id, amount: askPrice(unit) }]))),
    ).state;
    const moved = unwrap(roundMove(won, a, unit.id, { area: 'bench', index: 0 }));
    expect(unwrap(shopOf(moved, a)).crew.bench.map((member) => member.id)).toEqual([unit.id]);
    const released = unwrap(roundRelease(moved, a, unit.id));
    expect(released.market.publicList.at(-1)?.id).toBe(unit.id);
    expect(allUnits(unwrap(shopOf(released, a)).crew)).toEqual([]);
  });

  it('forces a lock-in, and the crew passes in later bidding rounds', () => {
    const forced = unwrap(forceLockInCrew(start, b));
    expect(forced.state.lockedIn).toEqual([b]);
    expect(stillBidding(forced.state)).toEqual([a]);
    expect(roundBid(forced.state, b, [])).toEqual({ ok: false, error: 'lockedIn' });
  });
});

describe('playRound', () => {
  it('plays every battle of the round and records the results', () => {
    const league = newLeague(6);
    const played = playRound(league, () => GREEDY);
    expect(played.battles).toHaveLength(3);
    expect(played.league.completedRounds).toBe(1);
    expect(played.league.season.results).toHaveLength(3);
    expect(played.league.lastRoundWinners).toHaveLength(3);
    expect(played.league.freshCrews).toEqual([]);
    // Every greedy crew bids on the same cheap units, so the top-ranked crews may lose every tie.
    expect(played.bidRounds.flat().length).toBeGreaterThan(10);
    for (const crew of played.league.crews) {
      const active = [...crew.mcSlots, ...crew.supportSlots].filter((unit) => unit !== null);
      for (const unit of active) expect(unit.xp).toBe(1);
      expect(crew.wallet).toBeGreaterThanOrEqual(0);
    }
    for (const battle of played.battles) {
      expect([battle.crewA, battle.crewB]).toContain(battle.winner);
      expect(battle.events.at(-1)?.kind).toBe('end');
    }
  });

  it('pays the payroll at lock-in', () => {
    const league = newLeague(2);
    const played = playRound(league, () => GREEDY);
    for (const shop of startRound(league).state.shops) {
      const after = crewOf(played.league, shop.crew.id);
      const spent = played.bidRounds
        .flat()
        .filter((award) => award.crewId === shop.crew.id)
        .reduce((sum, award) => sum + award.price, 0);
      expect(allUnits(after).length).toBeGreaterThan(0);
      // Salaries don't change after the battle, so the payroll paid at lock-in is still this.
      expect(after.wallet).toBe(TUNABLES.STARTING_GOLD - spent - payroll(after));
    }
  });

  it('is deterministic', () => {
    const league = newLeague(4);
    expect(playRound(league, () => GREEDY)).toEqual(playRound(league, () => GREEDY));
  });

  it('uses the given battle seeds', () => {
    const league = newLeague(2);
    const seeds: number[] = [];
    const played = playRound(
      league,
      () => GREEDY,
      (battle) => {
        seeds.push(battle.division);
        return 42;
      },
    );
    expect(seeds).toEqual([0]);
    expect(played.battles[0]?.seed).toBe(42);
  });

  it('runs the season end after the season’s last round', () => {
    let league = newLeague(2);
    const seasonRounds = league.season.schedule[0]?.length ?? 0;
    expect(seasonRounds).toBe(3);
    for (let round = 1; round < seasonRounds; round++) {
      const played = playRound(league, () => GREEDY);
      expect(played.seasonEnd).toBeNull();
      league = played.league;
    }
    const last = playRound(league, () => GREEDY);
    expect(last.seasonEnd?.season).toBe(1);
    expect(last.league.season.number).toBe(2);
    expect(last.league.season.results).toEqual([]);
    expect(last.league.crews.flatMap((crew) => crew.record.titles).length).toBe(2);
    const next = startRound(last.league);
    expect(next.report.seasonRound).toBe(1);
    expect(roundBattles(next.state)).toHaveLength(1);
  });

  it('lets idle crews pass and still battle', () => {
    const played = playRound(newLeague(2), () => IDLE_MANAGER);
    expect(played.bidRounds).toEqual([[]]);
    expect(played.battles[0]?.events.at(-1)).toMatchObject({ kind: 'end', reason: 'noMcs' });
  });
});
