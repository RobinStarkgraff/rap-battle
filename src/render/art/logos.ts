/**
 * The crew logos (§11): star, crown, lightning bolt, flame, diamond, heart, vinyl and spray
 * can, each drawn in a circle of `radius` around (x, y) in the crew's two colours.
 */

import type { LogoId } from '../../core';
import { INK } from '../palette';
import { circle, polygon, roundedRect, starPoints, type Pen } from './pen';

type LogoDrawer = (pen: Pen, x: number, y: number, s: number, main: number, trim: number) => void;

/** Logos are designed in a circle of radius 10; `s` scales them. */
const DESIGN_RADIUS = 10;

const LOGOS: Readonly<Record<LogoId, LogoDrawer>> = {
  star: (pen, x, y, s, main) => {
    polygon(pen, starPoints(x, y, 10 * s, 4.2 * s), main, INK);
  },
  crown: (pen, x, y, s, main, trim) => {
    polygon(
      pen,
      [
        { x: x - 9 * s, y: y + 6 * s },
        { x: x - 9 * s, y: y - 6 * s },
        { x: x - 4.5 * s, y: y - 1 * s },
        { x: x, y: y - 8 * s },
        { x: x + 4.5 * s, y: y - 1 * s },
        { x: x + 9 * s, y: y - 6 * s },
        { x: x + 9 * s, y: y + 6 * s },
      ],
      main,
      INK,
    );
    circle(pen, x, y + 2.5 * s, 2 * s, trim, INK);
  },
  'lightning-bolt': (pen, x, y, s, main) => {
    polygon(
      pen,
      [
        { x: x + 2 * s, y: y - 10 * s },
        { x: x - 7 * s, y: y + 2 * s },
        { x: x - 1 * s, y: y + 2 * s },
        { x: x - 3 * s, y: y + 10 * s },
        { x: x + 7 * s, y: y - 3 * s },
        { x: x + 1 * s, y: y - 3 * s },
      ],
      main,
      INK,
    );
  },
  flame: (pen, x, y, s, main, trim) => {
    polygon(
      pen,
      [
        { x: x, y: y - 10 * s },
        { x: x + 5 * s, y: y - 3 * s },
        { x: x + 8 * s, y: y + 3 * s },
        { x: x + 5 * s, y: y + 9 * s },
        { x: x - 5 * s, y: y + 9 * s },
        { x: x - 8 * s, y: y + 3 * s },
        { x: x - 4 * s, y: y - 4 * s },
        { x: x - 2 * s, y: y + 1 * s },
      ],
      main,
      INK,
    );
    polygon(
      pen,
      [
        { x: x, y: y - 1 * s },
        { x: x + 3.5 * s, y: y + 4 * s },
        { x: x + 2 * s, y: y + 8 * s },
        { x: x - 2 * s, y: y + 8 * s },
        { x: x - 3.5 * s, y: y + 4 * s },
      ],
      trim,
    );
  },
  diamond: (pen, x, y, s, main, trim) => {
    polygon(
      pen,
      [
        { x: x - 9 * s, y: y - 3 * s },
        { x: x - 5 * s, y: y - 8 * s },
        { x: x + 5 * s, y: y - 8 * s },
        { x: x + 9 * s, y: y - 3 * s },
        { x: x, y: y + 9 * s },
      ],
      main,
      INK,
    );
    pen.lineStyle(1.5 * s, trim, 1);
    pen.lineBetween(x - 9 * s, y - 3 * s, x + 9 * s, y - 3 * s);
    pen.lineBetween(x - 3 * s, y - 3 * s, x, y + 9 * s);
    pen.lineBetween(x + 3 * s, y - 3 * s, x, y + 9 * s);
  },
  heart: (pen, x, y, s, main) => {
    circle(pen, x - 4.5 * s, y - 3 * s, 5 * s, main);
    circle(pen, x + 4.5 * s, y - 3 * s, 5 * s, main);
    polygon(
      pen,
      [
        { x: x - 9.3 * s, y: y - 1.5 * s },
        { x: x + 9.3 * s, y: y - 1.5 * s },
        { x: x, y: y + 9 * s },
      ],
      main,
    );
    pen.lineStyle(2, INK, 1);
    pen.beginPath();
    pen.arc(x - 4.5 * s, y - 3 * s, 5 * s, Math.PI * 0.8, Math.PI * 1.95);
    pen.strokePath();
    pen.beginPath();
    pen.arc(x + 4.5 * s, y - 3 * s, 5 * s, Math.PI * 1.05, Math.PI * 2.2);
    pen.strokePath();
    pen.lineBetween(x - 9.2 * s, y - 1 * s, x, y + 9 * s);
    pen.lineBetween(x + 9.2 * s, y - 1 * s, x, y + 9 * s);
  },
  vinyl: (pen, x, y, s, main, trim) => {
    circle(pen, x, y, 9.5 * s, INK);
    pen.lineStyle(1, 0x55556a, 1);
    pen.strokeCircle(x, y, 7 * s);
    circle(pen, x, y, 4 * s, main);
    circle(pen, x, y, 1.2 * s, trim);
  },
  'spray-can': (pen, x, y, s, main, trim) => {
    roundedRect(pen, x - 4.5 * s, y - 4 * s, 9 * s, 14 * s, 2 * s, main, INK);
    roundedRect(pen, x - 3 * s, y - 8 * s, 6 * s, 4 * s, 1 * s, trim, INK);
    circle(pen, x + 6 * s, y - 8 * s, 1.3 * s, trim);
    circle(pen, x + 8.5 * s, y - 6 * s, 1 * s, trim);
    circle(pen, x + 8.5 * s, y - 8.5 * s, 1 * s, trim);
  },
};

export function drawLogo(
  pen: Pen,
  logo: LogoId,
  x: number,
  y: number,
  radius: number,
  main: number,
  trim: number,
): void {
  LOGOS[logo](pen, x, y, radius / DESIGN_RADIUS, main, trim);
}
