/** How the screens name and explain the battle styles (§5, §5.2, D-088). */

import { TUNABLES, type BattleStyleId, type LeagueBattleStyle } from '../../core';

export interface StyleText {
  readonly name: string;
  readonly blurb: string;
}

const MAJORITY = Math.floor(TUNABLES.VERSES / 2) + 1;

export const BATTLE_STYLE_TEXT: Readonly<Record<BattleStyleId, StyleText>> = {
  frontMcsClash: {
    name: 'CLASH',
    blurb: 'The front MCs trade bars until one crew has nobody left on stage.',
  },
  crowdVote: {
    name: 'CROWD VOTE',
    blurb: `${String(TUNABLES.VERSES)} verses: the crew that gets the crowd louder wins a verse, and ${String(MAJORITY)} verses win. A wipeout still wins at once.`,
  },
};

export const LEAGUE_STYLE_TEXT: Readonly<Record<LeagueBattleStyle, StyleText>> = {
  ...BATTLE_STYLE_TEXT,
  mixed: {
    name: 'MIXED',
    blurb: `Every ${String(TUNABLES.CROWD_VOTE_EVERY)}rd round of a season is a crowd vote, the others are clashes.`,
  },
};
