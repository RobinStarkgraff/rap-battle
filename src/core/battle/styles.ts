import { CROWD_VOTE } from './crowdVote';
import { FRONT_MCS_CLASH } from './frontMcsClash';
import type { BattleStyle, BattleStyleId } from './style';

/** Every battle style by its id (§5, §5.2). */
export const BATTLE_STYLES: Readonly<Record<BattleStyleId, BattleStyle>> = {
  frontMcsClash: FRONT_MCS_CLASH,
  crowdVote: CROWD_VOTE,
};
