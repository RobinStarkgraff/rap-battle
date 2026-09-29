/**
 * Shared name lists (§2 Crew identity, §8 Stage names). The per-archetype prefixes and words
 * are in `archetypes.ts`. Every name is invented, never a real artist's (Non-goals).
 */

import type { LogoId, MainColourId, TrimColourId } from '../model';

export const SHARED_NAME_PREFIXES: readonly string[] = [
  'Lil',
  'Big',
  'Young',
  'King',
  'Queen',
  'Lady',
  'Kid',
  'Doctor',
  'Professor',
  'Captain',
  'Sir',
  'Baby',
  'Grand',
  'Mister',
  'Miss',
  'Uncle',
  'Auntie',
];

export const SHARED_NAME_WORDS: readonly string[] = [
  'Biscuit',
  'Static',
  'Thunderclap',
  'Mood',
  'Waffle',
  'Echo',
  'Velvet',
  'Pixel',
  'Comet',
  'Pretzel',
  'Glitter',
  'Tornado',
  'Noodle',
  'Jackpot',
  'Avalanche',
  'Cactus',
  'Meteor',
  'Sprinkles',
  'Voltage',
  'Marmalade',
];

/** Bot crews are named *The ⟨adjective⟩ ⟨noun⟩* (D-052). */
export const BOT_CREW_ADJECTIVES: readonly string[] = [
  'Midnight',
  'Golden',
  'Crunchy',
  'Rowdy',
  'Tiny',
  'Electric',
  'Sleepy',
  'Cosmic',
  'Soggy',
  'Funky',
  'Unstoppable',
  'Suspicious',
];

export const BOT_CREW_NOUNS: readonly string[] = [
  'Biscuits',
  'Pigeons',
  'Bandits',
  'Goblins',
  'Crumbs',
  'Raccoons',
  'Snacks',
  'Wizards',
  'Pretzels',
  'Llamas',
  'Mixtapes',
  'Waffles',
];

/** Display names of the crew colours (§11). Their hex values belong to `render/`. */
export const COLOUR_NAMES: Readonly<Record<MainColourId | TrimColourId, string>> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  lime: 'Lime',
  green: 'Green',
  teal: 'Teal',
  'sky-blue': 'Sky blue',
  'royal-blue': 'Royal blue',
  purple: 'Purple',
  pink: 'Pink',
  black: 'Black',
  white: 'White',
};

/** Display names of the crew logos (§11). */
export const LOGO_NAMES: Readonly<Record<LogoId, string>> = {
  star: 'Star',
  crown: 'Crown',
  'lightning-bolt': 'Lightning bolt',
  flame: 'Flame',
  diamond: 'Diamond',
  heart: 'Heart',
  vinyl: 'Vinyl',
  'spray-can': 'Spray can',
};
