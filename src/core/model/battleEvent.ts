/**
 * The battle event log (§5). `simulateBattle` returns it, `render/` plays it back, and the
 * league updates records and xp from it. Every number in an event is what actually
 * happened: damage counts only confidence actually lost, hype changes are after clamping.
 */

import type { AbilityId } from './ability';
import type { UnitId } from './unit';

/** Crew A (the first argument of `simulateBattle`) or crew B. */
export type Side = 'a' | 'b';

export type HypeCause = 'bar' | 'diss' | 'enemyChoke' | 'ownChoke' | 'ability';

/** Why a battle ended (§5 End). */
export type EndReason =
  /** A crew had no MC on stage at the start. */
  | 'noMcs'
  /** A crew's last MC choked. */
  | 'wipeout'
  /** `MAX_TURNS` ran out; the crew that lost more confidence lost. */
  | 'turnLimit';

export type BattleEvent =
  /** The seeded coin flip: the opening crew takes the first turn and resolves first. */
  | { readonly kind: 'start'; readonly opener: Side }
  /** A crew's turn begins. Turns count from 1. */
  | { readonly kind: 'turn'; readonly turn: number; readonly side: Side }
  /** An MC became its crew's front MC and triggers `takeFront`. */
  | { readonly kind: 'front'; readonly side: Side; readonly unitId: UnitId }
  /** The front MC dropped a bar on the enemy front MC. */
  | {
      readonly kind: 'bar';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly targetId: UnitId;
      readonly damage: number;
    }
  /** An ability resolves; its effect events follow. It may have no effect (no target, value 0). */
  | {
      readonly kind: 'ability';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
    }
  /** Ability damage to an enemy MC. */
  | {
      readonly kind: 'diss';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly targetId: UnitId;
      readonly damage: number;
    }
  /** A friendly MC gains flow and/or confidence until the battle ends. */
  | {
      readonly kind: 'buff';
      readonly side: Side;
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly targetId: UnitId;
      readonly flow: number;
      readonly confidence: number;
    }
  /** A crew's hype meter changed by `change` to `hype`. Only emitted when it moved. */
  | {
      readonly kind: 'hype';
      readonly side: Side;
      readonly change: number;
      readonly hype: number;
      readonly cause: HypeCause;
    }
  /** An MC reached 0 confidence and left the stage. */
  | { readonly kind: 'choke'; readonly side: Side; readonly unitId: UnitId }
  /** The last event. `margin` is the winner's MCs still on stage. */
  | {
      readonly kind: 'end';
      readonly winner: Side;
      readonly reason: EndReason;
      readonly margin: number;
    };

export type BattleEventKind = BattleEvent['kind'];
