import type { BattleStyleId } from '../battle';
import { TUNABLES } from '../tunables';
import type { League, LeagueBattleStyle } from './types';

/** Every setting a league can be founded with, in the order the founding screen offers them. */
export const LEAGUE_BATTLE_STYLES: readonly LeagueBattleStyle[] = [
  'mixed',
  'frontMcsClash',
  'crowdVote',
];

/**
 * The battle style of a round of the season (from 1), from the league's setting (D-088). Every
 * peer and the hub work it out from the league alone, so it is known before the shop phase.
 */
export function roundBattleStyle(league: League, seasonRound: number): BattleStyleId {
  if (league.battleStyle !== 'mixed') return league.battleStyle;
  return seasonRound % TUNABLES.CROWD_VOTE_EVERY === 0 ? 'crowdVote' : 'frontMcsClash';
}
