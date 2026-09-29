/** The named target functions of §9: who an effect hits, picked when the ability resolves. */

import type { EnemyTarget, FriendTarget, UnitId } from '../model';
import type { Rng } from '../rng';

/** What a target function can see from where the ability's unit stands. */
export interface TargetView {
  readonly selfId: UnitId;
  /**
   * The unit's place on its crew's stage (0 is the front). For an MC that has choked it is
   * the place it held when it choked (D-055). `null` for support units.
   */
  readonly place: { readonly index: number; readonly onStage: boolean } | null;
  /** The crew's MCs on stage, front first. Outside a battle: its MCs in active slots. */
  readonly ownStage: readonly UnitId[];
  /** The enemy MCs on stage, front first. Empty outside a battle. */
  readonly enemyStage: readonly UnitId[];
  /** The MC whose event triggered the ability, if any. */
  readonly triggeringId: UnitId | null;
  /** Every MC of the crew, on stage or on the bench. In battle: its MCs on stage. */
  readonly crewMcs: readonly UnitId[];
  readonly rng: Rng;
}

type TargetFn = (view: TargetView) => UnitId[];

function first(ids: readonly UnitId[]): UnitId[] {
  return ids.slice(0, 1);
}

function randomOne(ids: readonly UnitId[], rng: Rng): UnitId[] {
  return ids.length === 0 ? [] : [rng.pick(ids)];
}

/** The index on the stage right behind the unit: its own place again once it has choked. */
function behindIndex(view: TargetView): number | null {
  if (view.place === null) {
    return null;
  }
  return view.place.onStage ? view.place.index + 1 : view.place.index;
}

export const FRIEND_TARGET_FNS: Readonly<Record<FriendTarget, TargetFn>> = {
  self: (view) => (view.ownStage.includes(view.selfId) ? [view.selfId] : []),
  frontFriend: (view) => first(view.ownStage),
  friendBehind: (view) => {
    const index = behindIndex(view);
    return index === null ? [] : view.ownStage.slice(index, index + 1);
  },
  allFriendsBehind: (view) => {
    const index = behindIndex(view);
    return index === null ? [] : view.ownStage.slice(index);
  },
  triggeringFriend: (view) =>
    view.triggeringId !== null && view.ownStage.includes(view.triggeringId)
      ? [view.triggeringId]
      : [],
  randomFriendOnStage: (view) => randomOne(view.ownStage, view.rng),
  randomOtherCrewMC: (view) =>
    randomOne(
      view.crewMcs.filter((id) => id !== view.selfId),
      view.rng,
    ),
  randomCrewMC: (view) => randomOne(view.crewMcs, view.rng),
};

export const ENEMY_TARGET_FNS: Readonly<Record<EnemyTarget, TargetFn>> = {
  enemyFront: (view) => first(view.enemyStage),
  enemyBehindFront: (view) => view.enemyStage.slice(1, 2),
  randomEnemy: (view) => randomOne(view.enemyStage, view.rng),
  allEnemies: (view) => [...view.enemyStage],
};
