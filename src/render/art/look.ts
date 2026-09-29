/**
 * A unit's appearance, rolled from its `look` seed (`docs/game-design.md` §11, D-049). It has
 * no link to the archetype and no effect on the rules; the same seed gives the same figure on
 * every peer and for the unit's whole career.
 */

import { createRng } from '../../core';
import { HAIR_COLOURS, SKIN_TONES } from '../palette';

export const BODY_SHAPES = ['tall', 'round', 'square'] as const;
export type BodyShape = (typeof BODY_SHAPES)[number];

/** Hair styles and hats; a hat hides most of the hair. */
export const HAIR_STYLES = [
  'bald',
  'buzz',
  'afro',
  'flat-top',
  'braids',
  'bun',
  'mohawk',
  'cap',
  'beanie',
  'bucket-hat',
] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HATS: readonly HairStyle[] = ['cap', 'beanie', 'bucket-hat'];

export const EYES = ['dot', 'wide', 'sleepy', 'wink'] as const;
export type Eyes = (typeof EYES)[number];

export const BROWS = ['none', 'flat', 'angry', 'raised'] as const;
export type Brows = (typeof BROWS)[number];

export const MOUTHS = ['grin', 'smirk', 'open', 'flat'] as const;
export type Mouth = (typeof MOUTHS)[number];

export const ACCESSORIES = ['shades', 'bandana', 'headphones', 'earring', 'wristband'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const OUTFITS = ['tee', 'hoodie', 'jacket', 'tracksuit'] as const;
export type Outfit = (typeof OUTFITS)[number];

export interface Look {
  readonly body: BodyShape;
  readonly skin: number;
  readonly hair: HairStyle;
  readonly hairColour: number;
  readonly eyes: Eyes;
  readonly brows: Brows;
  readonly mouth: Mouth;
  readonly accessory: Accessory;
  readonly outfit: Outfit;
}

/**
 * The figure a `look` seed stands for. The rolls come in a fixed order (body, skin, hair,
 * hair colour, eyes, brows, mouth, accessory, outfit), so saved units keep their looks.
 */
export function rollLook(look: number): Look {
  const rng = createRng(look);
  return {
    body: rng.pick(BODY_SHAPES),
    skin: rng.pick(SKIN_TONES),
    hair: rng.pick(HAIR_STYLES),
    hairColour: rng.pick(HAIR_COLOURS),
    eyes: rng.pick(EYES),
    brows: rng.pick(BROWS),
    mouth: rng.pick(MOUTHS),
    accessory: rng.pick(ACCESSORIES),
    outfit: rng.pick(OUTFITS),
  };
}

export function wearsHat(look: Look): boolean {
  return HATS.includes(look.hair);
}
