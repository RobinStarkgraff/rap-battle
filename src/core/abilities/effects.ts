/**
 * The named effect functions of §9. An effect doesn't change any state itself: it returns
 * the operations it wants, and the battle (or the crew, outside a battle) applies them one
 * at a time, so chokes can be checked after every single one.
 */

import type { Amount, Effect, EffectKind, Power, UnitId } from '../model';
import { TUNABLES } from '../tunables';
import { evaluateAmount } from './amount';
import { ENEMY_TARGET_FNS, FRIEND_TARGET_FNS, type TargetView } from './targets';

export type EffectOp =
  | {
      readonly op: 'buff';
      readonly targetId: UnitId;
      readonly flow: number;
      readonly confidence: number;
    }
  | { readonly op: 'damage'; readonly targetId: UnitId; readonly amount: number }
  /** `crew` is relative to the ability's unit; a drain is a negative change. */
  | {
      readonly op: 'hype';
      readonly crew: 'own' | 'enemy';
      readonly change: number;
      readonly cause: 'diss' | 'ability';
    }
  | { readonly op: 'gold'; readonly amount: number }
  | { readonly op: 'xp'; readonly targetId: UnitId; readonly amount: number };

/** Where an effect resolves: the ability's power, its crew's hype (0 outside a battle) and a view. */
export interface EffectContext {
  readonly power: Power;
  readonly hype: number;
  readonly view: TargetView;
}

type EffectFn<K extends EffectKind> = (
  effect: Extract<Effect, { kind: K }>,
  context: EffectContext,
) => EffectOp[];

function value(amount: Amount | undefined, context: EffectContext): number {
  return amount === undefined ? 0 : evaluateAmount(amount, context.power, context.hype);
}

const EFFECT_FNS: { readonly [K in EffectKind]: EffectFn<K> } = {
  buff: (effect, context) => {
    const flow = value(effect.flow, context);
    const confidence = value(effect.confidence, context);
    return FRIEND_TARGET_FNS[effect.target](context.view).map((targetId) => ({
      op: 'buff',
      targetId,
      flow,
      confidence,
    }));
  },
  diss: (effect, context) => {
    const amount = value(effect.amount, context);
    const targets = ENEMY_TARGET_FNS[effect.target](context.view);
    const hits: EffectOp[] = targets.map((targetId) => ({ op: 'damage', targetId, amount }));
    // The crowd cheers once per diss, however many MCs it hits, and not for a diss of 0.
    const cheer: EffectOp[] =
      amount > 0 && targets.length > 0
        ? [{ op: 'hype', crew: 'own', change: TUNABLES.HYPE_PER_DISS, cause: 'diss' }]
        : [];
    return [...hits, ...cheer];
  },
  hype: (effect, context) => {
    const amount = value(effect.amount, context);
    return effect.target === 'ownCrew'
      ? [{ op: 'hype', crew: 'own', change: amount, cause: 'ability' }]
      : [{ op: 'hype', crew: 'enemy', change: -amount, cause: 'ability' }];
  },
  gold: (effect, context) => [{ op: 'gold', amount: value(effect.amount, context) }],
  xp: (effect, context) => {
    const amount = value(effect.amount, context);
    return FRIEND_TARGET_FNS[effect.target](context.view).map((targetId) => ({
      op: 'xp',
      targetId,
      amount,
    }));
  },
};

/** The operations an ability's effect wants, with its targets picked now. */
export function effectOps(effect: Effect, context: EffectContext): EffectOp[] {
  // One case per kind, so each call narrows `effect` for its named function.
  switch (effect.kind) {
    case 'buff':
      return EFFECT_FNS.buff(effect, context);
    case 'diss':
      return EFFECT_FNS.diss(effect, context);
    case 'hype':
      return EFFECT_FNS.hype(effect, context);
    case 'gold':
      return EFFECT_FNS.gold(effect, context);
    case 'xp':
      return EFFECT_FNS.xp(effect, context);
  }
}
