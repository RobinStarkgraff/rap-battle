/**
 * `sign` and `upkeep` abilities, which resolve outside a battle. Their buffs are permanent,
 * they never see hype, and they can gain gold and xp (§9 Effects).
 */

import { ABILITIES } from '../data';
import { gainXp, type GrowthEvent } from '../growth';
import {
  activeUnits,
  allMcs,
  findUnit,
  replaceUnit,
  type AbilityId,
  type Crew,
  type LearnedAbility,
  type Unit,
  type UnitId,
} from '../model';
import type { Rng } from '../rng';
import { effectOps, type EffectOp } from './effects';
import type { TargetView } from './targets';
import { triggersOn, type TriggerMoment } from './triggers';

/** What happened to a crew outside a battle, for the shop and upkeep screens. */
export type CrewEvent =
  | { readonly kind: 'ability'; readonly unitId: UnitId; readonly abilityId: AbilityId }
  | {
      readonly kind: 'buff';
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly targetId: UnitId;
      readonly flow: number;
      readonly confidence: number;
    }
  | {
      readonly kind: 'gold';
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly amount: number;
    }
  | {
      readonly kind: 'xp';
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly targetId: UnitId;
      readonly amount: number;
    }
  | GrowthEvent;

export interface CrewOutcome {
  readonly crew: Crew;
  readonly events: readonly CrewEvent[];
}

/**
 * Resolves the `upkeep` abilities of the crew's active units, in slot order (§3 step 1.2).
 * Gold is added without the wallet cap, which upkeep applies afterwards.
 */
export function applyUpkeepAbilities(crew: Crew, rng: Rng): CrewOutcome {
  return activeUnits(crew).reduce<CrewOutcome>(
    (outcome, unit) => resolveUnitAbilities(outcome, unit.id, { kind: 'upkeep' }, rng),
    { crew, events: [] },
  );
}

/**
 * Resolves the `sign` abilities of a unit that just joined the crew. The unit must already
 * be in its place; a unit signed onto the bench triggers them too (§9).
 */
export function applySignAbilities(crew: Crew, unitId: UnitId, rng: Rng): CrewOutcome {
  if (findUnit(crew, unitId) === undefined) {
    throw new RangeError(`applySignAbilities: crew ${crew.id} has no unit ${unitId}`);
  }
  return resolveUnitAbilities({ crew, events: [] }, unitId, { kind: 'sign' }, rng);
}

/** Resolves each of the unit's abilities that triggers on `moment`, in learned order. */
function resolveUnitAbilities(
  outcome: CrewOutcome,
  unitId: UnitId,
  moment: TriggerMoment,
  rng: Rng,
): CrewOutcome {
  let result = outcome;
  const unit = findUnit(outcome.crew, unitId);
  for (const learned of unit?.abilities ?? []) {
    if (triggersOn(ABILITIES[learned.id], moment, unitId)) {
      result = resolveAbility(result, unitId, learned, rng);
    }
  }
  return result;
}

function resolveAbility(
  outcome: CrewOutcome,
  unitId: UnitId,
  learned: LearnedAbility,
  rng: Rng,
): CrewOutcome {
  const view = crewView(outcome.crew, unitId, rng);
  const ops = effectOps(ABILITIES[learned.id].effect, { power: learned.power, hype: 0, view });
  let crew = outcome.crew;
  const events: CrewEvent[] = [
    ...outcome.events,
    { kind: 'ability', unitId, abilityId: learned.id },
  ];
  for (const op of ops) {
    crew = applyOp(crew, op, { unitId, abilityId: learned.id }, rng, events);
  }
  return { crew, events };
}

/** The crew as a target function sees it outside a battle: no enemy, no hype. */
function crewView(crew: Crew, selfId: UnitId, rng: Rng): TargetView {
  const ownStage = crew.mcSlots.filter((unit) => unit !== null).map((unit) => unit.id);
  const index = ownStage.indexOf(selfId);
  return {
    selfId,
    place: index < 0 ? null : { index, onStage: true },
    ownStage,
    enemyStage: [],
    triggeringId: null,
    crewMcs: allMcs(crew).map((unit) => unit.id),
    rng,
  };
}

interface Source {
  readonly unitId: UnitId;
  readonly abilityId: AbilityId;
}

/** Applies one operation for good. Damage and hype only exist in a battle, so they do nothing. */
function applyOp(crew: Crew, op: EffectOp, source: Source, rng: Rng, events: CrewEvent[]): Crew {
  switch (op.op) {
    case 'buff':
      return updateUnit(crew, op.targetId, (target) => {
        if (target.role !== 'mc') return target;
        const { targetId, flow, confidence } = op;
        events.push({ kind: 'buff', ...source, targetId, flow, confidence });
        return {
          ...target,
          flow: target.flow + op.flow,
          confidence: target.confidence + op.confidence,
        };
      });
    case 'gold':
      events.push({ kind: 'gold', ...source, amount: op.amount });
      return { ...crew, wallet: crew.wallet + op.amount };
    case 'xp':
      return updateUnit(crew, op.targetId, (target) => {
        events.push({ kind: 'xp', ...source, targetId: op.targetId, amount: op.amount });
        const grown = gainXp(target, op.amount, rng);
        events.push(...grown.events);
        return grown.unit;
      });
    case 'damage':
    case 'hype':
      return crew;
  }
}

function updateUnit(crew: Crew, unitId: UnitId, update: (unit: Unit) => Unit): Crew {
  const unit = findUnit(crew, unitId);
  return unit === undefined ? crew : replaceUnit(crew, update(unit));
}
