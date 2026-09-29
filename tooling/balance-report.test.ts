/**
 * The balance report (T-031): AI managers play whole leagues in each battle style and the
 * statistics are printed. It only runs on request (`make balance`), so `make check` stays fast;
 * the headless tests in `src/core/ai/` hold the numbers that matter to their targets.
 */
import { describe, it } from 'vitest';
import { AI_MANAGER } from '../src/core/ai/manager';
import { balanceStats, type BalanceStats } from '../src/core/ai/balance';
import { createLeague, type LeagueBattleStyle } from '../src/core/league';
import { playRound, type RoundPlayed } from '../src/core/round';

function play(
  crews: number,
  battleStyle: LeagueBattleStyle,
  seasons: number,
  seed: number,
): RoundPlayed[] {
  const created = createLeague(
    seed,
    [
      {
        playerName: 'P',
        identity: { name: 'Probe', mainColour: 'red', trimColour: 'white', logo: 'star' },
      },
    ],
    crews - 1,
    { battleStyle },
  );
  if (!created.ok) throw new Error(created.error);
  let league = created.value;
  const rounds: RoundPlayed[] = [];
  while (league.season.number <= seasons) {
    const played = playRound(league, () => AI_MANAGER);
    rounds.push(played);
    league = played.league;
  }
  return rounds;
}

const fixed = (value: number, digits = 2): string => value.toFixed(digits);

function format(stats: BalanceStats): string {
  const lines: string[] = [];
  for (const [style, each] of Object.entries(stats.styles)) {
    const { turns } = each;
    const reasons = Object.entries(each.endReasons)
      .map(([reason, part]) => `${reason} ${fixed(part)}`)
      .join(', ');
    lines.push(
      `${style}: ${String(each.battles)} battles, turns mean ${fixed(turns.mean, 1)} (p10 ${String(turns.p10)}, median ${String(turns.median)}, p90 ${String(turns.p90)}), setup KOs ${fixed(each.setupKnockouts)}, stronger wins ${fixed(each.strongerWins)}; ${reasons}`,
    );
  }
  for (const season of stats.seasons) {
    lines.push(
      `season ${String(season.season)}: slots ${fixed(season.filledSlots)}, wallet ${fixed(season.wallet, 1)}, payroll ${fixed(season.payroll, 1)}, salary ${fixed(season.salary)}, lost to cap ${fixed(season.lostToCap)}, retired ${String(season.retired)}`,
    );
  }
  const drop = stats.dropTheBeatFlow;
  if (drop !== null)
    lines.push(`drop the beat: mean ${fixed(drop.mean, 1)}, p90 ${String(drop.p90)}`);
  const { upkeep } = stats;
  lines.push(
    `upkeep per crew and round: xp ${fixed(upkeep.xp)}, confidence ${fixed(upkeep.confidence)}, gold ${fixed(upkeep.gold)}`,
  );
  const abilities = Object.entries(stats.abilityWins).sort(([, x], [, y]) => y.winRate - x.winRate);
  lines.push(
    `ability win rates: ${abilities.map(([id, each]) => `${id} ${fixed(each.winRate)} (${String(each.battles)})`).join(', ')}`,
  );
  return lines.join('\n');
}

describe.runIf(process.env['BALANCE_REPORT'] === '1')('balance report', () => {
  it.each([
    [12, 'frontMcsClash'],
    [12, 'crowdVote'],
    [4, 'mixed'],
  ] as const)(
    '%i crews, %s',
    (crews, style) => {
      const rounds = [1, 2, 3].flatMap((seed) => play(crews, style, 5, seed));
      process.stdout.write(
        `\n=== ${String(crews)} crews, ${style} ===\n${format(balanceStats(rounds))}\n`,
      );
    },
    120_000,
  );
});
