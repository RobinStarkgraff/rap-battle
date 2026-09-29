/** A chunky block party button: outlined, with a drop shadow and a hover colour. */

import Phaser from 'phaser';
import { bodyStyle, letteringStyle } from '../art/lettering';
import { INK, UI } from '../palette';
import { registerTarget } from './targets';

export interface ButtonOptions {
  readonly width?: number;
  readonly height?: number;
  readonly fontSize?: number;
  readonly fill?: number;
  readonly hoverFill?: number;
  readonly textColour?: string;
  /** Plain text instead of lettering, for small table buttons. */
  readonly plain?: boolean;
  /** A name for browser tests (see `targets.ts`). */
  readonly target?: string;
}

export interface Button {
  readonly container: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): Button;
  setLabel(label: string): Button;
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Button {
  const width = options.width ?? 180;
  const height = options.height ?? 52;
  const fill = options.fill ?? UI.button;
  const hoverFill = options.hoverFill ?? UI.buttonHover;
  const fontSize = options.fontSize ?? Math.round(height * 0.42);
  const container = scene.add.container(x, y);
  const shape = scene.add.graphics();
  const style =
    options.plain === true
      ? bodyStyle(fontSize, { colour: options.textColour ?? UI.textDark, align: 'center' })
      : letteringStyle(fontSize, { colour: options.textColour ?? UI.text });
  const text = scene.add.text(0, 0, label, style).setOrigin(0.5);
  if (options.plain === true) text.setFontStyle('bold');
  container.add([shape, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  let enabled = true;
  let hovered = false;
  const draw = (): void => {
    const colour = !enabled ? UI.buttonDisabled : hovered ? hoverFill : fill;
    const radius = Math.min(12, height / 3);
    shape.clear();
    shape.fillStyle(0x000000, 0.35);
    shape.fillRoundedRect(-width / 2 + 3, -height / 2 + 4, width, height, radius);
    shape.fillStyle(colour, 1);
    shape.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    shape.lineStyle(3, INK, 1);
    shape.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    text.setAlpha(enabled ? 1 : 0.6);
  };
  draw();
  container.on(Phaser.Input.Events.POINTER_OVER, () => {
    hovered = true;
    draw();
  });
  container.on(Phaser.Input.Events.POINTER_OUT, () => {
    hovered = false;
    draw();
  });
  container.on(Phaser.Input.Events.POINTER_UP, () => {
    if (enabled) onClick();
  });
  if (options.target !== undefined) registerTarget(options.target, container);
  const button: Button = {
    container,
    setEnabled(next) {
      enabled = next;
      hovered = hovered && next;
      // A disabled button takes no input, so it shows no hand cursor and tests see it as disabled.
      if (container.input !== null) container.input.enabled = next;
      draw();
      return button;
    },
    setLabel(next) {
      text.setText(next);
      return button;
    },
  };
  return button;
}
