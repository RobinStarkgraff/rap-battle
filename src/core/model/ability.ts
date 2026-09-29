/**
 * The ability model (`docs/game-design.md` §9). An ability is data: a trigger, optional
 * conditions and one effect with its target and amount. The named effect and target
 * functions that act on this data live in `core/abilities/`.
 */

/** Every ability id; the ability table in `core/data/abilities.ts` has one entry per id. */
export const ABILITY_IDS = [
  // MC abilities (§8)
  'punchliner',
  'wordplay',
  'multisyllabic',
  'battle-kid',
  'headliner',
  'comeback-line',
  'street-poet',
  'the-og',
  'long-verse',
  'off-the-top',
  'crowd-surfer',
  'wildcard',
  'chart-topper',
  'feature-verse',
  'encore',
  'clapback',
  // Support abilities (§8)
  'drop-the-beat',
  'scratch',
  'crowd-mix',
  'get-up',
  'make-some-noise',
  'hype-wave',
  'beatmaker',
  'studio-session',
  'remix',
  'warm-up',
  'breathe',
  'voice-lessons',
  'hometown-crowd',
  'paid-hecklers',
  'negotiator',
  'shout-out',
] as const;
export type AbilityId = (typeof ABILITY_IDS)[number];

/** A unit's role: MCs battle on stage, support units trigger abilities from the stoop. */
export const ROLES = ['mc', 'support'] as const;
export type Role = (typeof ROLES)[number];

/** An ability's power, 1 to `MAX_POWER` (§8). Every ability table has one value per power. */
export type Power = 1 | 2 | 3;

/** One value per power: `[power 1, power 2, power 3]`. MC abilities repeat one value. */
export type PowerValues = readonly [number, number, number];

/** The 8 triggers (§9). */
export const TRIGGER_KINDS = [
  'beforeBattle',
  'battleStart',
  'takeFront',
  'barLanded',
  'hurt',
  'choke',
  'sign',
  'upkeep',
] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

/** Triggers that are about one MC, so an ability names whose event it listens to. */
export const MC_TRIGGER_KINDS = ['takeFront', 'barLanded', 'hurt', 'choke'] as const;
export type McTriggerKind = (typeof MC_TRIGGER_KINDS)[number];

/** `self`: the unit's own event. `friend`: the event of any other MC of its crew. */
export const SUBJECTS = ['self', 'friend'] as const;
export type Subject = (typeof SUBJECTS)[number];

export type Trigger =
  | { readonly kind: Exclude<TriggerKind, McTriggerKind> }
  | { readonly kind: McTriggerKind; readonly subject: Subject };

/** The three MC slots, front first (§2). */
export const MC_SLOTS = ['opener', 'middle', 'closer'] as const;
export type McSlot = (typeof MC_SLOTS)[number];

export interface Conditions {
  /** The MC's starting slot in the locked-in lineup. */
  readonly inSlot?: McSlot;
  /** The ability resolves at most once per battle for this unit. */
  readonly oncePerBattle?: true;
}

/** Friendly MC targets (§9). */
export const FRIEND_TARGETS = [
  'self',
  'frontFriend',
  'friendBehind',
  'allFriendsBehind',
  'triggeringFriend',
  'randomFriendOnStage',
  'randomOtherCrewMC',
  'randomCrewMC',
] as const;
export type FriendTarget = (typeof FRIEND_TARGETS)[number];

/** Enemy MC targets (§9). */
export const ENEMY_TARGETS = [
  'enemyFront',
  'enemyBehindFront',
  'randomEnemy',
  'allEnemies',
] as const;
export type EnemyTarget = (typeof ENEMY_TARGETS)[number];

/** Crew targets, for `hype` (§9). `gold` always goes to the ability's own crew. */
export const CREW_TARGETS = ['ownCrew', 'enemyCrew'] as const;
export type CrewTarget = (typeof CREW_TARGETS)[number];

export type Target = FriendTarget | EnemyTarget | CrewTarget;

/**
 * A number an effect uses: a fixed value per power, plus `⌊H / hypeDivisor⌋` of the crew's
 * current hype for crowd abilities (§9 Values, D-044).
 */
export interface Amount {
  readonly byPower: PowerValues;
  readonly hypeDivisor?: number;
}

/** The 5 effects (§9), each with the targets it can take. */
export const EFFECT_KINDS = ['buff', 'diss', 'hype', 'gold', 'xp'] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export type Effect =
  | {
      readonly kind: 'buff';
      readonly target: FriendTarget;
      readonly flow?: Amount;
      readonly confidence?: Amount;
    }
  | { readonly kind: 'diss'; readonly target: EnemyTarget; readonly amount: Amount }
  | { readonly kind: 'hype'; readonly target: CrewTarget; readonly amount: Amount }
  | { readonly kind: 'gold'; readonly amount: Amount }
  | { readonly kind: 'xp'; readonly target: FriendTarget; readonly amount: Amount };

export interface AbilityDef {
  readonly id: AbilityId;
  readonly name: string;
  readonly role: Role;
  readonly trigger: Trigger;
  readonly conditions?: Conditions;
  readonly effect: Effect;
  /** One line for the UI, e.g. "Diss the enemy front MC". */
  readonly text: string;
}
