/**
 * The 90s block party backdrop (§11 Look, D-049): blue sky, a brick wall with a painted mural,
 * the sidewalk and a boombox. Its decorations are rolled from a seed, so a screen always
 * looks the same.
 */

import { createRng, type Rng } from '../../core';
import { INK, MURAL_COLOURS, STREET } from '../palette';
import { circle, polygon, roundedRect, starPoints, type Pen } from './pen';

export interface BackdropOptions {
  readonly width: number;
  readonly height: number;
  /** Where the wall meets the sidewalk. */
  readonly groundY: number;
  /** Rolls the clouds and the mural. */
  readonly seed: number;
  /** Where the boombox stands on the sidewalk, or no boombox. */
  readonly boomboxX?: number;
}

const BRICK_WIDTH = 48;
const BRICK_HEIGHT = 22;
const MORTAR = 3;
const SKY_BANDS = 6;

export function drawBackdrop(pen: Pen, options: BackdropOptions): void {
  const rng = createRng(options.seed);
  const wallTop = Math.round(options.groundY * 0.3);
  drawSky(pen, options.width, wallTop, rng.fork('clouds'));
  drawWall(pen, options.width, wallTop, options.groundY);
  drawMural(pen, options.width, wallTop, options.groundY, rng.fork('mural'));
  drawSidewalk(pen, options.width, options.height, options.groundY);
  if (options.boomboxX !== undefined) {
    drawBoombox(pen, options.boomboxX, options.groundY + 18, 1);
  }
}

function drawSky(pen: Pen, width: number, bottom: number, rng: Rng): void {
  const bandHeight = Math.ceil(bottom / SKY_BANDS);
  for (let band = 0; band < SKY_BANDS; band++) {
    pen.fillStyle(mix(STREET.skyTop, STREET.skyBottom, band / (SKY_BANDS - 1)), 1);
    pen.fillRect(0, band * bandHeight, width, bandHeight + 1);
  }
  const clouds = 3 + rng.int(0, 2);
  for (let cloud = 0; cloud < clouds; cloud++) {
    const x = ((cloud + 0.5) / clouds) * width + rng.int(-60, 60);
    const y = rng.int(18, Math.max(20, bottom - 40));
    const size = rng.int(14, 22);
    pen.fillStyle(STREET.cloud, 0.9);
    pen.fillCircle(x, y, size);
    pen.fillCircle(x + size, y + 4, size * 0.8);
    pen.fillCircle(x - size, y + 5, size * 0.7);
    pen.fillRoundedRect(x - size * 1.6, y + 2, size * 3.4, size * 0.9, size * 0.45);
  }
}

function drawWall(pen: Pen, width: number, top: number, bottom: number): void {
  pen.fillStyle(STREET.mortar, 1);
  pen.fillRect(0, top, width, bottom - top);
  for (let row = 0; top + row * BRICK_HEIGHT < bottom; row++) {
    const y = top + row * BRICK_HEIGHT;
    const height = Math.min(BRICK_HEIGHT, bottom - y) - MORTAR;
    if (height <= 0) break;
    const offset = row % 2 === 0 ? 0 : -BRICK_WIDTH / 2;
    for (let x = offset; x < width; x += BRICK_WIDTH) {
      const left = Math.max(0, x);
      const right = Math.min(width, x + BRICK_WIDTH - MORTAR);
      pen.fillStyle((row * 7 + Math.round(x)) % 5 === 0 ? STREET.brickDark : STREET.brick, 1);
      pen.fillRect(left, y, right - left, height);
    }
  }
  // The wall's top edge.
  pen.fillStyle(STREET.brickDark, 1);
  pen.fillRect(0, top - 8, width, 10);
}

/** A painted mural: big bright blobs, stars and zigzags, like a wall piece. */
function drawMural(pen: Pen, width: number, top: number, bottom: number, rng: Rng): void {
  const muralTop = top + 26;
  const muralBottom = bottom - 30;
  if (muralBottom - muralTop < 40) return;
  const pieces = 5 + rng.int(0, 3);
  for (let piece = 0; piece < pieces; piece++) {
    const x = ((piece + 0.5) / pieces) * width + rng.int(-40, 40);
    const y = rng.int(muralTop + 20, muralBottom - 20);
    const colour = rng.pick(MURAL_COLOURS);
    const size = rng.int(22, 46);
    switch (rng.int(0, 3)) {
      case 0:
        pen.fillStyle(colour, 0.85);
        pen.fillCircle(x, y, size);
        pen.fillStyle(rng.pick(MURAL_COLOURS), 0.85);
        pen.fillCircle(x + size * 0.3, y - size * 0.2, size * 0.45);
        break;
      case 1:
        polygon(pen, starPoints(x, y, size, size * 0.45, 5 + rng.int(0, 3)), colour, INK);
        break;
      case 2: {
        const points = [];
        for (let step = 0; step <= 6; step++) {
          points.push({
            x: x - size * 1.5 + step * size * 0.5,
            y: y + (step % 2 === 0 ? -1 : 1) * size * 0.35,
          });
        }
        pen.lineStyle(9, colour, 0.9);
        pen.strokePoints(points, false);
        break;
      }
      default:
        roundedRect(pen, x - size, y - size * 0.55, size * 2, size * 1.1, size * 0.5, colour);
        pen.fillStyle(rng.pick(MURAL_COLOURS), 0.9);
        pen.fillRoundedRect(x - size * 0.7, y - size * 0.2, size * 1.4, size * 0.4, size * 0.2);
        break;
    }
  }
}

function drawSidewalk(pen: Pen, width: number, height: number, top: number): void {
  pen.fillStyle(STREET.sidewalk, 1);
  pen.fillRect(0, top, width, height - top);
  pen.lineStyle(2, STREET.sidewalkDark, 1);
  pen.lineBetween(0, top, width, top);
  for (let x = 90; x < width; x += 180) {
    pen.lineBetween(x, top, x - 30, height);
  }
  pen.fillStyle(STREET.kerb, 1);
  pen.fillRect(0, height - 14, width, 14);
}

/** A boombox standing with its bottom on (x, y). */
export function drawBoombox(pen: Pen, x: number, y: number, scale: number): void {
  const w = 110 * scale;
  const h = 56 * scale;
  const left = x - w / 2;
  const top = y - h;
  pen.lineStyle(5 * scale, STREET.boomboxTrim, 1);
  pen.lineBetween(left + 18 * scale, top, left + 26 * scale, top - 16 * scale);
  pen.lineBetween(left + 26 * scale, top - 16 * scale, left + w - 26 * scale, top - 16 * scale);
  pen.lineBetween(left + w - 26 * scale, top - 16 * scale, left + w - 18 * scale, top);
  roundedRect(pen, left, top, w, h, 8 * scale, STREET.boombox, INK);
  for (const cx of [left + 24 * scale, left + w - 24 * scale]) {
    circle(pen, cx, top + h / 2 + 2 * scale, 18 * scale, STREET.boomboxTrim, INK);
    circle(pen, cx, top + h / 2 + 2 * scale, 12 * scale, STREET.speaker);
    circle(pen, cx, top + h / 2 + 2 * scale, 4 * scale, STREET.boomboxTrim);
  }
  roundedRect(
    pen,
    x - 14 * scale,
    top + 10 * scale,
    28 * scale,
    18 * scale,
    3 * scale,
    STREET.speaker,
    STREET.boomboxTrim,
  );
  pen.fillStyle(0xe63946, 1);
  pen.fillCircle(x - 8 * scale, top + h - 12 * scale, 3 * scale);
  pen.fillStyle(0xffd23f, 1);
  pen.fillCircle(x + 8 * scale, top + h - 12 * scale, 3 * scale);
}

/** Mixes two colours: `t = 0` is `from`, `t = 1` is `to`. */
export function mix(from: number, to: number, t: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
