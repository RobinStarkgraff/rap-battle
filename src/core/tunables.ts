/**
 * Every tunable number of `docs/game-design.md` §10, in one table, so the balance pass
 * (T-031) only edits data. Stat ranges and ability values are in `core/data/`.
 */

import type { Power } from './model';

export const TUNABLES = {
  // Crew (§2)
  BENCH_SIZE: 3,
  CREW_NAME_MAX: 20,
  // Round flow (§3)
  STARTING_GOLD: 40,
  BASE_INCOME: 18,
  WIN_BONUS: 2,
  WALLET_CAP: 25,
  // Market (§4)
  SCOUT_COST: 1,
  SCOUT_COUNT: 2,
  BID_ROUNDS: 3,
  SUPPORT_BASE_RATING: 4,
  ABILITY_RATING: 2,
  /** Rounded up. */
  ASK_PER_RATING: 0.5,
  /** Rounded down. */
  YOUTH_SEASONS_PER_RATING: 2,
  POOL_START_PER_MEMBER: 6,
  /** The fewest rookies per upkeep; a big league gets `ROOKIES_PER_MEMBER` per member. */
  ROOKIES_PER_ROUND: 3,
  /** Rounded up. */
  ROOKIES_PER_MEMBER: 0.5,
  /** The smallest cap of the public list; a big league keeps `POOL_MAX_PER_MEMBER` per member. */
  POOL_MAX: 16,
  POOL_MAX_PER_MEMBER: 2,
  MC_WEIGHT: 3,
  SUPPORT_WEIGHT: 2,
  // Unit state and growth (§2, §4)
  /** Every ability's value table has one entry per power, so this can't grow without them. */
  MAX_POWER: 3 satisfies Power,
  GROWTH_XP: 4,
  SECOND_ABILITY_XP: 12,
  // Battle (§5)
  /** A safety limit; D-054 aims for 6 to 12 turns. */
  MAX_TURNS: 40,
  HYPE_MAX: 10,
  HYPE_PER_BAR: 1,
  HYPE_PER_DISS: 1,
  HYPE_PER_CHOKE: 2,
  HYPE_LOSS_ON_CHOKE: 2,
  // Crowd vote (§5.2)
  VERSES: 3,
  TURNS_PER_VERSE: 4,
  /** Rounded down. */
  VERSE_HYPE_KEEP: 0.5,
  /** In a league with mixed styles, every this many rounds of a season is a crowd vote. */
  CROWD_VOTE_EVERY: 3,
  // Salary (§5.1)
  /** Rounded up. */
  SALARY_PER_RATING: 0.18,
  /** Rounded down. */
  BENCH_SALARY_FACTOR: 0.5,
  // Age and retirement (§6)
  SIGN_AGE_MIN: 18,
  MC_RETIRE_AGE: 23,
  SUPPORT_RETIRE_AGE: 25,
  // Stage names (§8)
  NAME_PREFIX_CHANCE: 0.6,
  NAME_REROLLS: 10,
  // League (§7)
  DIVISION_MAX: 6,
  MIN_SEASON_ROUNDS: 3,
  POINTS_WIN: 3,
  PROMOTE_COUNT: 1,
  /** Off by default; the host can turn it on for a sitting. */
  SHOP_TIMER_SECONDS: 120,
} as const;

export type TunableName = keyof typeof TUNABLES;
