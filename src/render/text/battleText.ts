/**
 * The comedy text of a battle (§11 Battle text, pillar 3): a comic word on every hit, and
 * one-liners on chokes, abilities and big hype swings. Every line is invented, in the
 * affectionate pun style of the stage names, and never quotes real lyrics (Non-goals).
 */

import { createRng, deriveSeed, type EffectKind, type Rng } from '../../core';

/** A comic word for a bar or a diss, by the damage it dealt. */
export const HIT_WORDS: Readonly<Record<'none' | 'light' | 'solid' | 'huge', readonly string[]>> = {
  none: ['WHIFF', 'MEH', 'SHRUG', 'CRICKETS'],
  light: ['OOF', 'SNAP!', 'BOP!', 'ZING!', 'OUCH'],
  solid: ['BARS!', 'BOOM!', 'WHAM!', 'SPICY!', 'CRACK!'],
  huge: ['KA-POW!', 'SAVAGE!', 'DEVASTATING!', 'BIG BARS!', 'OBLITERATED!'],
};

/** The damage from which a hit counts as solid or huge. */
export const SOLID_HIT = 2;
export const HUGE_HIT = 4;

export function hitWordsFor(damage: number): readonly string[] {
  if (damage <= 0) return HIT_WORDS.none;
  if (damage >= HUGE_HIT) return HIT_WORDS.huge;
  return damage >= SOLID_HIT ? HIT_WORDS.solid : HIT_WORDS.light;
}

export const CHOKE_WORDS: readonly string[] = [
  'CHOKED!',
  'MIC DROPPED!',
  'SPEECHLESS!',
  'FROZE UP!',
];

export const BUFF_WORDS: readonly string[] = ['PUMPED!', 'FIRED UP!', 'GLOWING!', 'LEVELLED!'];

/**
 * Said by the rival front MC when an MC chokes. `{speaker}` taunts, `{target}` choked,
 * `{crew}` is the speaker's crew.
 */
export const CHOKE_LINES: readonly string[] = [
  '{target}, your flow is stale!',
  'Somebody get {target} a lozenge!',
  '{target} forgot the words to their own name!',
  'Was that a verse, {target}, or a sneeze?',
  'Sit down, {target}. The bench misses you.',
  '{target} brought a spoon to a mic fight!',
  'Warm-up over, {crew} style!',
  '{target}, even your echo left early!',
  'Rhymes so weak, {target} needs a nap!',
  'Bye bye, {target}! Mind the step!',
];

/** Said by an MC whose crew has no one left to taunt the choker: its own last words. */
export const SELF_CHOKE_LINES: readonly string[] = [
  'I had a whole second verse...',
  'My notes! Where are my notes?',
  'The mic was slippery, okay?',
  'I was just getting warmed up!',
];

/**
 * Said by the unit whose ability resolves, by its effect. `{ability}` is the ability's name,
 * `{crew}` its crew and `{enemyCrew}` the other one.
 */
export const ABILITY_LINES: Readonly<Record<EffectKind, readonly string[]>> = {
  diss: [
    'Here comes the {ability}!',
    'Hold this, {enemyCrew}!',
    'Special delivery for {enemyCrew}!',
    'I saved this one just for you!',
    'Take notes, {enemyCrew}!',
  ],
  buff: [
    '{ability}! Feel that?',
    'You got this! {ability}!',
    'A little {ability} for the road!',
    'Stretch those vocal cords!',
    '{crew}, level up!',
  ],
  hype: [
    'Make some noise for {crew}!',
    'I cannot hear you, block party!',
    'Hands up if you love {crew}!',
    'Quiet down, {enemyCrew} fans!',
    'Everybody say {ability}!',
  ],
  gold: ['Pay day for {crew}!', 'Read the fine print!'],
  xp: ['Back to the studio!', 'Practice makes platinum!'],
};

/** Shouted from the crowd after a big hype swing, for the crew the crowd now backs. */
export const HYPE_SWING_LINES: readonly string[] = [
  'The block is going WILD for {crew}!',
  '{crew}! {crew}! {crew}!',
  'Fire brigade, please! {crew} just set the block on fire!',
  'The whole street is on {crew}’s side now!',
  'Grandma just stood up for {crew}!',
  'Even the pigeons are dancing for {crew}!',
];

/** The crowd losing interest after a big drop in a crew's hype. */
export const HYPE_DROP_LINES: readonly string[] = [
  'Boooo! Come on, {crew}!',
  'The crowd is checking their phones, {crew}...',
  'Tough crowd for {crew} tonight.',
  'Someone start the boombox again for {crew}!',
];

/**
 * The stream battle one-liners are picked from: forked from the battle seed, so both peers
 * see the same lines (§11). The playback picks from it in event order.
 */
export function battleTextRng(battleSeed: number): Rng {
  return createRng(deriveSeed(battleSeed, 'battle-text'));
}
