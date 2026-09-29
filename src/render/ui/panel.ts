/** Panels and small text helpers shared by the hub, founding and result screens. */

import type Phaser from 'phaser';
import { bodyStyle, letteringStyle } from '../art/lettering';
import { roundedRect, type Pen } from '../art/pen';
import { INK, UI } from '../palette';

/** A dark rounded panel with an outline. */
export function drawPanel(
  pen: Pen,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = UI.panel,
): void {
  roundedRect(pen, x, y, width, height, 14, fill, INK);
}

/** Adds a panel as its own graphics object, so it can live in a container. */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = UI.panel,
): Phaser.GameObjects.Graphics {
  const pen = scene.add.graphics();
  drawPanel(pen, x, y, width, height, fill);
  return pen;
}

export function addHeading(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 22,
  colour: string = UI.text,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, letteringStyle(size, { colour, align: 'left' }));
}

export function addBody(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 16,
  colour: string = UI.text,
  wrapWidth?: number,
): Phaser.GameObjects.Text {
  return scene.add.text(
    x,
    y,
    text,
    bodyStyle(size, wrapWidth === undefined ? { colour } : { colour, wrapWidth }),
  );
}

/** Shrinks a text to `maxWidth` if it is wider. */
export function fitWidth(text: Phaser.GameObjects.Text, maxWidth: number): Phaser.GameObjects.Text {
  if (text.width > maxWidth) text.setScale(maxWidth / text.width);
  return text;
}

/** `#rrggbb` for a colour number, for text colours and backgrounds. */
export function cssColour(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
