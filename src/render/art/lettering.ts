/**
 * Blocky lettering (§11 Look): bold sans-serif text with a thick outline and a drop shadow.
 * No font files; the browser's bold system fonts are enough.
 */

import type Phaser from 'phaser';
import { UI } from '../palette';

const FONT_FAMILY = '"Arial Black", "Arial Bold", Impact, "Helvetica Neue", sans-serif';
const BODY_FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

export interface LetteringOptions {
  readonly colour?: string;
  readonly align?: 'left' | 'center' | 'right';
  readonly wrapWidth?: number;
}

/** Big outlined lettering for titles, banners and battle words. */
export function letteringStyle(
  size: number,
  options: LetteringOptions = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  const shadow = Math.max(2, Math.round(size / 12));
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${String(size)}px`,
    color: options.colour ?? UI.text,
    stroke: UI.textDark,
    strokeThickness: Math.max(3, Math.round(size / 6)),
    align: options.align ?? 'center',
    shadow: {
      offsetX: shadow,
      offsetY: shadow,
      color: UI.shadowCss,
      blur: 0,
      fill: true,
      stroke: true,
    },
    ...(options.wrapWidth === undefined ? {} : { wordWrap: { width: options.wrapWidth } }),
  };
}

/** Plain readable text for tables, panels and ability descriptions. */
export function bodyStyle(
  size: number,
  options: LetteringOptions = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: `${String(size)}px`,
    color: options.colour ?? UI.text,
    align: options.align ?? 'left',
    ...(options.wrapWidth === undefined ? {} : { wordWrap: { width: options.wrapWidth } }),
  };
}
