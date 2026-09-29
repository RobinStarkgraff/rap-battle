/**
 * The "front MCs clash" battle style (§5, D-010): the front MCs take turns dropping bars
 * (D-033), a hype meter per crew (D-034), and every battle has one winner (D-035).
 */

import type { BattleEvent, BattleLineup, Side } from '../model';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { openBattle, playTurn } from './opening';
import { endBattle, isOver, otherSide, type BattleState } from './state';
import type { BattleStyle } from './style';

export const FRONT_MCS_CLASH: BattleStyle = {
  id: 'frontMcsClash',
  name: 'Front MCs clash',
  simulate: simulateFrontMcsClash,
};

function simulateFrontMcsClash(crewA: BattleLineup, crewB: BattleLineup, rng: Rng): BattleEvent[] {
  const state = openBattle(crewA, crewB, rng);
  for (let turn = 1; turn <= TUNABLES.MAX_TURNS && !isOver(state); turn++) {
    playTurn(state, turn);
  }
  if (!isOver(state)) {
    endBattle(state, turnLimitWinner(state), 'turnLimit');
  }
  return state.events;
}

/**
 * §5 End at `MAX_TURNS`: the crew that lost more confidence loses; if equal, the crew that
 * lost confidence first; if neither lost any, the coin flip's loser.
 */
function turnLimitWinner(state: BattleState): Side {
  const { a, b } = state.crews;
  if (a.confidenceLost !== b.confidenceLost) {
    return a.confidenceLost > b.confidenceLost ? 'b' : 'a';
  }
  return otherSide(state.firstToLose ?? otherSide(state.opener));
}
