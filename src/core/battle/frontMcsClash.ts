/**
 * The "front MCs clash" battle style (§5, D-010): the front MCs take turns dropping bars
 * (D-033), a hype meter per crew (D-034), and every battle has one winner (D-035).
 */

import type { BattleEvent, BattleLineup, Side } from '../model';
import type { Rng } from '../rng';
import { TUNABLES } from '../tunables';
import { fireBoth } from './fire';
import { runQueue } from './queue';
import { dropBar, takeFront } from './stage';
import {
  createBattleState,
  emit,
  endBattle,
  isOver,
  otherSide,
  sidesInOrder,
  type BattleState,
} from './state';
import type { BattleStyle } from './style';

export const FRONT_MCS_CLASH: BattleStyle = {
  id: 'frontMcsClash',
  name: 'Front MCs clash',
  simulate: simulateFrontMcsClash,
};

function simulateFrontMcsClash(crewA: BattleLineup, crewB: BattleLineup, rng: Rng): BattleEvent[] {
  const opener: Side = rng.chance(0.5) ? 'a' : 'b';
  const state = createBattleState({ a: crewA, b: crewB }, opener, rng);
  emit(state, { kind: 'start', opener });
  setup(state);
  playTurns(state);
  if (!isOver(state)) {
    endBattle(state, turnLimitWinner(state), 'turnLimit');
  }
  return state.events;
}

/** §5 Setup, steps 3 and 4. Each step runs the queue empty before the next. */
function setup(state: BattleState): void {
  const empty = sidesInOrder(state).filter((side) => state.crews[side].stage.length === 0);
  const [firstEmpty] = empty;
  if (firstEmpty !== undefined) {
    // With both crews empty, the coin flip's loser (the other crew) loses.
    const loser = empty.length === 2 ? otherSide(state.opener) : firstEmpty;
    endBattle(state, otherSide(loser), 'noMcs');
    return;
  }
  const steps: readonly (() => void)[] = [
    () => {
      fireBoth(state, { kind: 'beforeBattle' });
    },
    () => {
      fireBoth(state, { kind: 'battleStart' });
    },
    () => {
      firstTakeFront(state);
    },
  ];
  for (const step of steps) {
    if (isOver(state)) return;
    step();
    runQueue(state);
  }
}

/** The front MC of each crew triggers `takeFront`, unless one already moved up in setup. */
function firstTakeFront(state: BattleState): void {
  for (const side of sidesInOrder(state)) {
    const crew = state.crews[side];
    const front = crew.stage[0];
    if (!crew.hasTakenFront && front !== undefined) {
      takeFront(state, front);
    }
  }
}

/** §5 Turns: the crews strictly alternate, the opening crew first, until one is out. */
function playTurns(state: BattleState): void {
  const [first, second] = sidesInOrder(state);
  for (let turn = 1; turn <= TUNABLES.MAX_TURNS && !isOver(state); turn++) {
    const side = turn % 2 === 1 ? first : second;
    emit(state, { kind: 'turn', turn, side });
    dropBar(state, side);
    runQueue(state);
  }
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
