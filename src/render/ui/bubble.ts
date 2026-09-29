/** Speech bubbles and pop-up words for the battle text (§11 Battle text). */

import Phaser from 'phaser';
import { bodyStyle, letteringStyle } from '../art/lettering';
import { INK, PAPER, UI } from '../palette';

/**
 * A speech bubble whose tail points at (x, y), shown above it. It stays inside the screen
 * horizontally and removes itself after `lifetime` ms.
 */
export function addSpeechBubble(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  lifetime: number,
  screenWidth: number,
): Phaser.GameObjects.Container {
  const label = scene.add
    .text(0, 0, text, bodyStyle(17, { colour: UI.textDark, wrapWidth: 260, align: 'center' }))
    .setFontStyle('bold')
    .setOrigin(0.5, 1);
  const width = label.width + 28;
  const height = label.height + 18;
  const left = Phaser.Math.Clamp(x - width / 2, 8, screenWidth - width - 8);
  const container = scene.add.container(left + width / 2, y - 16);
  const shape = scene.add.graphics();
  const tailX = Phaser.Math.Clamp(x - (left + width / 2), -width / 2 + 16, width / 2 - 16);
  shape.fillStyle(PAPER, 1);
  shape.lineStyle(3, INK, 1);
  shape.fillRoundedRect(-width / 2, -height, width, height, 14);
  shape.strokeRoundedRect(-width / 2, -height, width, height, 14);
  shape.fillTriangle(tailX - 9, -2, tailX + 9, -2, tailX, 14);
  shape.lineBetween(tailX - 9, 0, tailX, 14);
  shape.lineBetween(tailX + 9, 0, tailX, 14);
  label.setPosition(0, -9);
  container.add([shape, label]);
  container.setScale(0.2).setDepth(500);
  scene.tweens.add({ targets: container, scale: 1, duration: 160, ease: 'Back.Out' });
  scene.time.delayedCall(lifetime, () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        container.destroy();
      },
    });
  });
  return container;
}

/** A comic word that pops up at (x, y), grows, rises and fades. */
export function popWord(
  scene: Phaser.Scene,
  x: number,
  y: number,
  word: string,
  size: number,
  colour: string,
  lifetime: number,
): void {
  const text = scene.add
    .text(x, y, word, letteringStyle(size, { colour }))
    .setOrigin(0.5)
    .setAngle(Phaser.Math.Between(-12, 12))
    .setScale(0.2)
    .setDepth(600);
  scene.tweens.add({ targets: text, scale: 1, duration: 140, ease: 'Back.Out' });
  scene.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    delay: Math.max(0, lifetime - 250),
    duration: 250,
    onComplete: () => {
      text.destroy();
    },
  });
}
