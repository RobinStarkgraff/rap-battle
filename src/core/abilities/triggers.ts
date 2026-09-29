import type { AbilityDef, McSlot, McTriggerKind, TriggerKind, UnitId } from '../model';

/**
 * Something that happened that abilities can react to. MC moments name the MC whose
 * event it is; they are only offered to the units of that MC's crew.
 */
export type TriggerMoment =
  | { readonly kind: Exclude<TriggerKind, McTriggerKind> }
  | { readonly kind: McTriggerKind; readonly mcId: UnitId };

/**
 * Whether `ability`, held by the unit `listenerId`, triggers on `moment`. `self` listens to
 * the unit's own MC events, `friend` to those of every other MC of its crew (§9).
 */
export function triggersOn(
  ability: AbilityDef,
  moment: TriggerMoment,
  listenerId: UnitId,
): boolean {
  const { trigger } = ability;
  if (trigger.kind !== moment.kind) {
    return false;
  }
  if (!('subject' in trigger) || !('mcId' in moment)) {
    return true;
  }
  const own = moment.mcId === listenerId;
  return trigger.subject === 'self' ? own : !own;
}

/**
 * Whether the `inSlot` condition holds for a unit that started the battle in `slot`
 * (`null` for support units). `oncePerBattle` is battle state, so the battle checks it.
 */
export function slotConditionMet(ability: AbilityDef, slot: McSlot | null): boolean {
  const required = ability.conditions?.inSlot;
  return required === undefined || required === slot;
}
