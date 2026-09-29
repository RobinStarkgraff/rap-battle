/**
 * A one-line text field that takes the keyboard while it is shown (for the crew name). Phaser
 * has no text input, and a DOM field would sit outside the scaled canvas, so it reads keys.
 */

import Phaser from 'phaser';
import { bodyStyle } from '../art/lettering';
import { INK, PAPER, UI } from '../palette';
import { registerTarget } from './targets';

const HEIGHT = 48;

export interface TextInput {
  readonly container: Phaser.GameObjects.Container;
  value(): string;
}

/** A text field whose top left corner is (x, y). */
export function addTextInput(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  maxLength: number,
  onChange: (value: string) => void,
  target?: string,
): TextInput {
  let value = '';
  // The container sits at the field's centre, like every other clickable container.
  const container = scene.add.container(x + width / 2, y + HEIGHT / 2);
  const left = -width / 2;
  const box = scene.add.graphics();
  box.fillStyle(PAPER, 1);
  box.fillRoundedRect(left, -HEIGHT / 2, width, HEIGHT, 10);
  box.lineStyle(3, INK, 1);
  box.strokeRoundedRect(left, -HEIGHT / 2, width, HEIGHT, 10);
  const text = scene.add
    .text(left + 14, 0, '', bodyStyle(24, { colour: UI.textDark }))
    .setOrigin(0, 0.5)
    .setFontStyle('bold');
  const caret = scene.add.rectangle(left + 16, 0, 3, 28, INK).setOrigin(0, 0.5);
  container.add([box, text, caret]);
  container.setSize(width, HEIGHT).setInteractive();
  if (target !== undefined) registerTarget(target, container);
  scene.tweens.add({ targets: caret, alpha: 0, duration: 450, yoyo: true, repeat: -1 });

  const render = (): void => {
    text.setText(value);
    caret.x = left + 16 + text.width;
    onChange(value);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Backspace') {
      value = value.slice(0, -1);
    } else if (event.key.length === 1 && value.length < maxLength) {
      value += event.key;
    } else {
      return;
    }
    render();
  };
  scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
  container.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
  });
  return { container, value: () => value };
}
