/**
 * The colours of the 90s block party look (`docs/game-design.md` §11, D-049). Crew colour ids
 * live in `core/` (D-062); their hex values live here, because only `render/` draws them.
 */

import type { TrimColourId } from '../core';

/** Hex values of `CREW_COLOURS`: the 10 main colours plus black and white (trim only). */
export const CREW_COLOUR_HEX: Readonly<Record<TrimColourId, number>> = {
  red: 0xe63946,
  orange: 0xf4892b,
  yellow: 0xffd23f,
  lime: 0xa3e635,
  green: 0x2a9d4b,
  teal: 0x14b8a6,
  'sky-blue': 0x5bc0eb,
  'royal-blue': 0x2f4fd8,
  purple: 0x8e44ad,
  pink: 0xff6fb5,
  black: 0x24242c,
  white: 0xf8f8f2,
};

/** The outfit colours of a figure: a crew's main and trim colour, or the free agent grey. */
export interface OutfitColours {
  readonly main: number;
  readonly trim: number;
}

/** Free agents in the market wear neutral grey (§11). */
export const FREE_AGENT_OUTFIT: OutfitColours = { main: 0x9a9aa6, trim: 0x5c5c68 };

export function crewOutfit(identity: {
  readonly mainColour: TrimColourId;
  readonly trimColour: TrimColourId;
}): OutfitColours {
  return { main: CREW_COLOUR_HEX[identity.mainColour], trim: CREW_COLOUR_HEX[identity.trimColour] };
}

/** Skin tones a figure's `look` picks from. */
export const SKIN_TONES: readonly number[] = [
  0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x6b3e1f, 0xffc9a0, 0xa86b3c,
];

/** Hair colours a figure's `look` picks from. Farewell tours turn it grey. */
export const HAIR_COLOURS: readonly number[] = [
  0x1c1c1c, 0x3b2314, 0x6a4020, 0xb5651d, 0xe8c26b, 0xd6452f, 0x3b5bdb, 0xff6fb5,
];

export const GREY_HAIR = 0xd0d0d4;

/** Fixed colours of the look: outlines, bling, paper and the street. */
export const INK = 0x1b1b2f;
export const GOLD = 0xffc93c;
export const GOLD_DARK = 0xc8901a;
export const PAPER = 0xfff4d6;
export const SASH = 0xfff1b8;
export const SASH_TRIM = 0xe63946;

export const STREET = {
  skyTop: 0x5bc0eb,
  skyBottom: 0xa9e4ff,
  cloud: 0xffffff,
  brick: 0xc0503a,
  brickDark: 0x9c3b2b,
  mortar: 0xe7c8a8,
  sidewalk: 0xbdb6a8,
  sidewalkDark: 0x9a9384,
  kerb: 0x7d776c,
  boombox: 0x33333d,
  boomboxTrim: 0xc9c9d1,
  speaker: 0x16161c,
} as const;

/** Mural colours painted on the wall: bright primaries. */
export const MURAL_COLOURS: readonly number[] = [
  0xffd23f, 0xe63946, 0x2f4fd8, 0x14b8a6, 0xff6fb5, 0xa3e635, 0xf4892b,
];

/** Colours of text and UI panels. */
export const UI = {
  text: '#fff4d6',
  textDark: '#1b1b2f',
  textMuted: '#b8b0a0',
  textGold: '#ffc93c',
  textBad: '#ff6b6b',
  textGood: '#7ee081',
  panel: 0x1b1b2f,
  panelLight: 0x2c2c48,
  panelEdge: 0x4a4a6e,
  button: 0xffd23f,
  buttonHover: 0xffe27a,
  buttonDisabled: 0x6c6c7c,
  accent: 0xe63946,
  highlight: 0x5bc0eb,
} as const;
