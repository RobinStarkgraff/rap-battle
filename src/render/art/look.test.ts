import { describe, expect, it } from 'vitest';
import { createRng } from '../../core';
import { HAIR_COLOURS, SKIN_TONES } from '../palette';
import {
  ACCESSORIES,
  BODY_SHAPES,
  BROWS,
  EYES,
  HAIR_STYLES,
  MOUTHS,
  OUTFITS,
  rollLook,
  wearsHat,
  type Look,
} from './look';

function manyLooks(count: number): Look[] {
  const rng = createRng(99);
  return Array.from({ length: count }, () => rollLook(rng.nextUint32()));
}

describe('rollLook', () => {
  it('gives the same look for the same seed', () => {
    expect(rollLook(123456)).toEqual(rollLook(123456));
  });

  it('is pinned, because saved units must keep their looks', () => {
    expect(rollLook(1)).toMatchInlineSnapshot(`
      {
        "accessory": "earring",
        "body": "round",
        "brows": "flat",
        "eyes": "wink",
        "hair": "bun",
        "hairColour": 16740277,
        "mouth": "open",
        "outfit": "hoodie",
        "skin": 16767916,
      }
    `);
  });

  it('uses every option of every part', () => {
    const looks = manyLooks(600);
    const seen = <T>(part: (look: Look) => T): Set<T> => new Set(looks.map(part));
    expect(seen((look) => look.body)).toEqual(new Set(BODY_SHAPES));
    expect(seen((look) => look.skin)).toEqual(new Set(SKIN_TONES));
    expect(seen((look) => look.hair)).toEqual(new Set(HAIR_STYLES));
    expect(seen((look) => look.hairColour)).toEqual(new Set(HAIR_COLOURS));
    expect(seen((look) => look.eyes)).toEqual(new Set(EYES));
    expect(seen((look) => look.brows)).toEqual(new Set(BROWS));
    expect(seen((look) => look.mouth)).toEqual(new Set(MOUTHS));
    expect(seen((look) => look.accessory)).toEqual(new Set(ACCESSORIES));
    expect(seen((look) => look.outfit)).toEqual(new Set(OUTFITS));
  });

  it('rarely gives two units the same look', () => {
    const looks = manyLooks(200).map((look) => JSON.stringify(look));
    expect(new Set(looks).size).toBeGreaterThan(195);
  });

  it('knows which hair styles are hats', () => {
    const look = rollLook(1);
    expect(wearsHat({ ...look, hair: 'cap' })).toBe(true);
    expect(wearsHat({ ...look, hair: 'afro' })).toBe(false);
  });
});
