/**
 * Bakes art into textures. Phaser redraws a `Graphics` object's shapes on every frame, which
 * is slow for the hundreds of shapes of a backdrop or a crowd of figures, so static art is drawn
 * once into a texture and shown as an image.
 */

import type Phaser from 'phaser';
import { drawBackdrop, type BackdropOptions } from './backdrop';
import type { Pen } from './pen';

/** Textures are baked at twice the design size, so they stay sharp when scaled up. */
export const BAKE_RESOLUTION = 2;

export interface BakeBox {
  readonly width: number;
  readonly height: number;
  /** Where the art's (0, 0) lies inside the box. */
  readonly originX: number;
  readonly originY: number;
  /** Pixels per design unit; `BAKE_RESOLUTION` unless the art is never scaled up. */
  readonly resolution?: number;
}

/**
 * Draws `draw` into a texture called `key` once and returns the key; later calls reuse it.
 * Show it with `scene.add.image(x, y, key)`, `setOrigin(originX / width, originY / height)`
 * and a scale of `1 / resolution`, which `addBaked` does.
 */
export function bakeTexture(
  scene: Phaser.Scene,
  key: string,
  box: BakeBox,
  draw: (pen: Pen) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const resolution = box.resolution ?? BAKE_RESOLUTION;
  const graphics = scene.make.graphics({}, false);
  graphics.scaleCanvas(resolution, resolution);
  graphics.translateCanvas(box.originX, box.originY);
  draw(graphics);
  graphics.generateTexture(key, box.width * resolution, box.height * resolution);
  graphics.destroy();
  return key;
}

/** Adds a baked texture as an image whose (0, 0) is at (x, y). */
export function addBaked(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  box: BakeBox,
  scale = 1,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, key)
    .setOrigin(box.originX / box.width, box.originY / box.height)
    .setScale(scale / (box.resolution ?? BAKE_RESOLUTION));
}

/** Adds the block party backdrop, baked once per seed and size. */
export function addBackdrop(
  scene: Phaser.Scene,
  options: BackdropOptions,
): Phaser.GameObjects.Image {
  const box: BakeBox = {
    width: options.width,
    height: options.height,
    originX: 0,
    originY: 0,
    resolution: 1,
  };
  const key = `backdrop:${JSON.stringify(options)}`;
  bakeTexture(scene, key, box, (pen) => {
    drawBackdrop(pen, options);
  });
  return addBaked(scene, 0, 0, key, box);
}
