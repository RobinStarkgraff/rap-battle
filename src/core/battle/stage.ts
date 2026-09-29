/** What happens on stage: bars, damage, chokes, moving up and the hype meter (§5). */

import type { AbilityId, HypeCause, Side, UnitId } from '../model';
import { clamp } from '../math';
import { TUNABLES } from '../tunables';
import { fire } from './fire';
import { emit, endBattle, otherSide, type BattleMc, type BattleState } from './state';

/** Moves a crew's hype meter within 0 to `HYPE_MAX` and reports the change, if any. */
export function changeHype(state: BattleState, side: Side, change: number, cause: HypeCause): void {
  const crew = state.crews[side];
  const hype = clamp(crew.hype + change, 0, TUNABLES.HYPE_MAX);
  if (hype !== crew.hype) {
    emit(state, { kind: 'hype', side, change: hype - crew.hype, hype, cause });
    crew.hype = hype;
  }
}

/** The side's front MC drops a bar on the enemy front MC (§5 Turns). */
export function dropBar(state: BattleState, side: Side): void {
  const attacker = state.crews[side].stage[0];
  const target = state.crews[otherSide(side)].stage[0];
  if (attacker === undefined || target === undefined) {
    return;
  }
  const damage = takeConfidence(state, target, attacker.flow);
  emit(state, { kind: 'bar', side, unitId: attacker.id, targetId: target.id, damage });
  changeHype(state, side, TUNABLES.HYPE_PER_BAR, 'bar');
  fire(state, side, { kind: 'barLanded', mcId: attacker.id });
  afterDamage(state, target, damage);
}

export interface DissSource {
  readonly side: Side;
  readonly unitId: UnitId;
  readonly abilityId: AbilityId;
}

/** Ability damage to an enemy MC on stage. A diss of 0 triggers nothing (§9 Values). */
export function diss(
  state: BattleState,
  source: DissSource,
  target: BattleMc,
  amount: number,
): void {
  const damage = takeConfidence(state, target, amount);
  emit(state, { kind: 'diss', ...source, targetId: target.id, damage });
  afterDamage(state, target, damage);
}

/** Lowers confidence (never below 0) and returns what was actually lost. */
function takeConfidence(state: BattleState, target: BattleMc, amount: number): number {
  const lost = Math.min(Math.max(amount, 0), target.confidence);
  if (lost > 0) {
    target.confidence -= lost;
    state.crews[target.side].confidenceLost += lost;
    state.firstToLose ??= target.side;
  }
  return lost;
}

/** Chokes are checked after every single effect (§5). */
function afterDamage(state: BattleState, target: BattleMc, damage: number): void {
  if (target.confidence === 0) {
    choke(state, target);
  } else if (damage > 0) {
    fire(state, target.side, { kind: 'hurt', mcId: target.id });
  }
}

/**
 * An MC at 0 confidence chokes and leaves the stage (§5 Turns, §9). The hype changes at
 * once, the MCs behind it close up, and if it was the front MC the next one moves up
 * before the `choke` abilities resolve; its `takeFront` is queued after them.
 */
function choke(state: BattleState, mc: BattleMc): void {
  const crew = state.crews[mc.side];
  const place = crew.stage.indexOf(mc);
  emit(state, { kind: 'choke', side: mc.side, unitId: mc.id });
  crew.stage.splice(place, 1);
  mc.chokedAt = place;
  changeHype(state, mc.side, -TUNABLES.HYPE_LOSS_ON_CHOKE, 'ownChoke');
  changeHype(state, otherSide(mc.side), TUNABLES.HYPE_PER_CHOKE, 'enemyChoke');
  const newFront = crew.stage[0];
  if (newFront === undefined) {
    endBattle(state, otherSide(mc.side), 'wipeout');
    return;
  }
  fire(state, mc.side, { kind: 'choke', mcId: mc.id });
  if (place === 0) {
    takeFront(state, newFront);
  }
}

/** An MC becomes its crew's front MC and triggers `takeFront`. */
export function takeFront(state: BattleState, mc: BattleMc): void {
  state.crews[mc.side].hasTakenFront = true;
  emit(state, { kind: 'front', side: mc.side, unitId: mc.id });
  fire(state, mc.side, { kind: 'takeFront', mcId: mc.id });
}
