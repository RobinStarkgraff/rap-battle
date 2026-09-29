/**
 * What every battle style shares (§5): the coin flip, the setup steps and a single turn.
 * A style decides how many turns there are and who wins when nobody is wiped out.
 */

import type { BattleLineup, Side } from '../model';
import type { Rng } from '../rng';
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

/** The coin flip and §5 Setup. The battle may already be over afterwards. */
export function openBattle(crewA: BattleLineup, crewB: BattleLineup, rng: Rng): BattleState {
  const opener: Side = rng.chance(0.5) ? 'a' : 'b';
  const state = createBattleState({ a: crewA, b: crewB }, opener, rng);
  emit(state, { kind: 'start', opener });
  setup(state);
  return state;
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

/**
 * Turn `turn` (from 1) of §5 Turns: the crews strictly alternate, the opening crew first, so
 * odd turns are the opener's. Its front MC drops a bar and the queue runs empty.
 */
export function playTurn(state: BattleState, turn: number): void {
  const [first, second] = sidesInOrder(state);
  const side = turn % 2 === 1 ? first : second;
  emit(state, { kind: 'turn', turn, side });
  dropBar(state, side);
  runQueue(state);
}
