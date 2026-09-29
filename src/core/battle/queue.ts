/** The FIFO ability queue (§5 Turns): resolves triggered abilities until it is empty. */

import { effectOps, type EffectOp, type TargetView } from '../abilities';
import { ABILITIES } from '../data';
import type { Side, UnitId } from '../model';
import { changeHype, diss } from './stage';
import {
  emit,
  isOver,
  otherSide,
  type BattleMc,
  type BattleState,
  type QueuedAbility,
} from './state';

/**
 * A safety net, not a rule: the ability rules (§9) bound every chain, so reaching this
 * means the ability data breaks them.
 */
const MAX_QUEUE_STEPS = 10_000;

/** Resolves queued abilities in order, including the ones they trigger, until none are left. */
export function runQueue(state: BattleState): void {
  let steps = 0;
  for (let next = state.queue.shift(); next !== undefined; next = state.queue.shift()) {
    if (isOver(state)) {
      state.queue.length = 0;
      return;
    }
    if (++steps > MAX_QUEUE_STEPS) {
      throw new Error('simulateBattle: the ability queue never ran empty');
    }
    resolve(state, next);
  }
}

/**
 * Resolves one ability: its targets are picked now, and its operations apply one at a
 * time, so a choke in between is handled before the next one (§5).
 */
function resolve(state: BattleState, entry: QueuedAbility): void {
  const { unit, ability } = entry;
  const crew = state.crews[unit.side];
  emit(state, { kind: 'ability', side: unit.side, unitId: unit.id, abilityId: ability.id });
  const ops = effectOps(ABILITIES[ability.id].effect, {
    power: ability.power,
    hype: crew.hype,
    view: battleView(state, entry),
  });
  for (const op of ops) {
    if (isOver(state)) {
      return;
    }
    applyOp(state, entry, op);
  }
}

function battleView(state: BattleState, { unit, triggeringId }: QueuedAbility): TargetView {
  const ownStage = ids(state.crews[unit.side].stage);
  return {
    selfId: unit.id,
    place: unit.role === 'mc' ? placeOf(state, unit) : null,
    ownStage,
    enemyStage: ids(state.crews[otherSide(unit.side)].stage),
    triggeringId,
    crewMcs: ownStage,
    rng: state.rng,
  };
}

function placeOf(state: BattleState, mc: BattleMc): TargetView['place'] {
  if (mc.chokedAt !== null) {
    return { index: mc.chokedAt, onStage: false };
  }
  return { index: state.crews[mc.side].stage.indexOf(mc), onStage: true };
}

function ids(stage: readonly BattleMc[]): UnitId[] {
  return stage.map((mc) => mc.id);
}

/** Applies one operation. Targets that have left the stage since are skipped. */
function applyOp(state: BattleState, { unit, ability }: QueuedAbility, op: EffectOp): void {
  const ownSide = unit.side;
  const enemySide = otherSide(ownSide);
  switch (op.op) {
    case 'buff': {
      const target = onStage(state, ownSide, op.targetId);
      if (target === undefined) return;
      target.flow += op.flow;
      target.confidence += op.confidence;
      const { targetId, flow, confidence } = op;
      emit(state, {
        kind: 'buff',
        side: ownSide,
        unitId: unit.id,
        abilityId: ability.id,
        targetId,
        flow,
        confidence,
      });
      return;
    }
    case 'damage': {
      const target = onStage(state, enemySide, op.targetId);
      if (target === undefined) return;
      diss(state, { side: ownSide, unitId: unit.id, abilityId: ability.id }, target, op.amount);
      return;
    }
    case 'hype':
      changeHype(state, op.crew === 'own' ? ownSide : enemySide, op.change, op.cause);
      return;
    case 'gold':
    case 'xp':
      // Only outside a battle (§9 Effects).
      return;
  }
}

function onStage(state: BattleState, side: Side, id: UnitId): BattleMc | undefined {
  return state.crews[side].stage.find((mc) => mc.id === id);
}
