/**
 * Hit and ability effects for the battle (M7 juice): sparks, rings, a flash and confetti,
 * drawn from shapes and gone after a moment. They only decorate; the beat they belong to
 * says what happened.
 */

import type Phaser from 'phaser';
import type { Rng } from '../../core';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';

/** Short lines flying out of a point, like a comic hit. */
export function sparks(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colour: number,
  size: number,
): void {
  const pen = scene.add.graphics().setDepth(540);
  pen.setPosition(x, y);
  const rays = 10;
  pen.lineStyle(4, colour, 1);
  for (let index = 0; index < rays; index++) {
    const angle = (index / rays) * Math.PI * 2;
    const inner = size * 0.35;
    pen.lineBetween(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      Math.cos(angle) * size,
      Math.sin(angle) * size,
    );
  }
  pen.setScale(0.4);
  scene.tweens.add({
    targets: pen,
    scale: 1.2,
    alpha: 0,
    angle: 20,
    duration: 320,
    ease: 'Quad.Out',
    onComplete: () => {
      pen.destroy();
    },
  });
}

/** A ring that grows around a unit when its ability goes off. */
export function ring(scene: Phaser.Scene, x: number, y: number, colour: number): void {
  const pen = scene.add.graphics().setDepth(530);
  pen.setPosition(x, y);
  pen.lineStyle(5, colour, 1);
  pen.strokeCircle(0, 0, 40);
  pen.setScale(0.5);
  scene.tweens.add({
    targets: pen,
    scale: 1.8,
    alpha: 0,
    duration: 450,
    ease: 'Quad.Out',
    onComplete: () => {
      pen.destroy();
    },
  });
}

/** The whole screen flashes, for a choke. */
export function flash(scene: Phaser.Scene, colour: number): void {
  const pen = scene.add.graphics().setDepth(650);
  pen.fillStyle(colour, 0.45);
  pen.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  scene.tweens.add({
    targets: pen,
    alpha: 0,
    duration: 260,
    onComplete: () => {
      pen.destroy();
    },
  });
}

/** Paper confetti shooting up from a point and falling, for a verdict or the win. */
export function confetti(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colours: readonly number[],
  rng: Rng,
  count = 28,
): void {
  for (let index = 0; index < count; index++) {
    const piece = scene.add.rectangle(x, y, 8, 12, rng.pick(colours)).setDepth(560);
    piece.setAngle(rng.int(0, 90));
    const dx = rng.int(-260, 260);
    const rise = rng.int(160, 340);
    scene.tweens.add({
      targets: piece,
      x: x + dx,
      y: y - rise,
      angle: piece.angle + rng.int(180, 540),
      duration: 600,
      ease: 'Quad.Out',
      onComplete: () => {
        scene.tweens.add({
          targets: piece,
          y: y - rise + rng.int(220, 380),
          alpha: 0,
          duration: 900,
          ease: 'Quad.In',
          onComplete: () => {
            piece.destroy();
          },
        });
      },
    });
  }
}
