/** Puts the abilities that a moment triggers on the queue (§9 Trigger types). */

import { slotConditionMet, triggersOn, type TriggerMoment } from '../abilities';
import { ABILITIES } from '../data';
import type { Side } from '../model';
import { sidesInOrder, type BattleState, type BattleUnit } from './state';

/**
 * Queues every ability of `side`'s units that triggers on `moment`, in resolution order
 * (MC slots 1–3, then support slots 1–2, each unit's abilities in learned order). An MC
 * that has choked only still hears its own `choke`. A `oncePerBattle` ability is used up
 * when it triggers, so later triggers are ignored.
 */
export function fire(state: BattleState, side: Side, moment: TriggerMoment): void {
  const triggeringId = 'mcId' in moment ? moment.mcId : null;
  for (const unit of state.crews[side].units) {
    if (!canHear(unit, moment)) {
      continue;
    }
    for (const ability of unit.abilities) {
      const def = ABILITIES[ability.id];
      if (!triggersOn(def, moment, unit.id)) continue;
      if (!slotConditionMet(def, unit.role === 'mc' ? unit.slot : null)) continue;
      if (def.conditions?.oncePerBattle === true && !useOnce(state, unit, ability.id)) continue;
      state.queue.push({ unit, ability, triggeringId });
    }
  }
}

/** Queues `moment` for both crews, the opening crew first. */
export function fireBoth(state: BattleState, moment: TriggerMoment): void {
  for (const side of sidesInOrder(state)) {
    fire(state, side, moment);
  }
}

function canHear(unit: BattleUnit, moment: TriggerMoment): boolean {
  if (unit.role === 'support' || unit.chokedAt === null) {
    return true;
  }
  return moment.kind === 'choke' && moment.mcId === unit.id;
}

/** Marks a once-per-battle ability as used; false if it already was. */
function useOnce(state: BattleState, unit: BattleUnit, abilityId: string): boolean {
  const key = `${unit.id}:${abilityId}`;
  if (state.usedOnce.has(key)) {
    return false;
  }
  state.usedOnce.add(key);
  return true;
}
