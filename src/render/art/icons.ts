/**
 * The archetype icons for the badge at a unit's feet (§11): quill, boxing glove, open book,
 * die, star, vinyl record, megaphone, mixing knob, music note and briefcase. Each is drawn in
 * a circle of `radius` around (x, y).
 */

import type { ArchetypeId } from '../../core';
import { INK } from '../palette';
import { circle, OUTLINE, polygon, roundedRect, starPoints, type Pen } from './pen';

type IconDrawer = (pen: Pen, x: number, y: number, s: number) => void;

/** Icons are designed in a circle of radius 10; `s` scales them. */
const DESIGN_RADIUS = 10;

const ICONS: Readonly<Record<ArchetypeId, IconDrawer>> = {
  lyricist: (pen, x, y, s) => {
    // A quill: a feather leaning right with its nib at the bottom left.
    polygon(
      pen,
      [
        { x: x - 6 * s, y: y + 7 * s },
        { x: x + 1 * s, y: y - 2 * s },
        { x: x + 7 * s, y: y - 8 * s },
        { x: x + 4 * s, y: y + 1 * s },
      ],
      0xfff4d6,
      INK,
    );
    pen.lineStyle(1.5 * s, INK, 1);
    pen.lineBetween(x - 7 * s, y + 8 * s, x + 5 * s, y - 5 * s);
  },
  'battle-rapper': (pen, x, y, s) => {
    roundedRect(pen, x - 6 * s, y - 6 * s, 12 * s, 10 * s, 5 * s, 0xe63946, INK);
    roundedRect(pen, x - 8 * s, y - 3 * s, 5 * s, 6 * s, 2 * s, 0xe63946, INK);
    roundedRect(pen, x - 5 * s, y + 4 * s, 10 * s, 4 * s, 1 * s, 0xf8f8f2, INK);
  },
  storyteller: (pen, x, y, s) => {
    polygon(
      pen,
      [
        { x: x, y: y - 4 * s },
        { x: x - 8 * s, y: y - 7 * s },
        { x: x - 8 * s, y: y + 5 * s },
        { x: x, y: y + 8 * s },
      ],
      0xfff4d6,
      INK,
    );
    polygon(
      pen,
      [
        { x: x, y: y - 4 * s },
        { x: x + 8 * s, y: y - 7 * s },
        { x: x + 8 * s, y: y + 5 * s },
        { x: x, y: y + 8 * s },
      ],
      0xfff4d6,
      INK,
    );
  },
  freestyler: (pen, x, y, s) => {
    roundedRect(pen, x - 7 * s, y - 7 * s, 14 * s, 14 * s, 3 * s, 0xf8f8f2, INK);
    for (const [dx, dy] of [
      [-3.5, -3.5],
      [0, 0],
      [3.5, 3.5],
    ] as const) {
      circle(pen, x + dx * s, y + dy * s, 1.6 * s, INK);
    }
  },
  hitmaker: (pen, x, y, s) => {
    polygon(pen, starPoints(x, y, 9 * s, 4 * s), 0xffc93c, INK);
  },
  dj: (pen, x, y, s) => {
    circle(pen, x, y, 8.5 * s, INK);
    pen.lineStyle(1, 0x55556a, 1);
    pen.strokeCircle(x, y, 6 * s);
    circle(pen, x, y, 3 * s, 0xe63946);
  },
  'hype-man': (pen, x, y, s) => {
    polygon(
      pen,
      [
        { x: x - 6 * s, y: y - 3 * s },
        { x: x + 7 * s, y: y - 8 * s },
        { x: x + 7 * s, y: y + 8 * s },
        { x: x - 6 * s, y: y + 3 * s },
      ],
      0xf4892b,
      INK,
    );
    roundedRect(pen, x - 9 * s, y - 3 * s, 4 * s, 6 * s, 1 * s, 0xf8f8f2, INK);
  },
  producer: (pen, x, y, s) => {
    circle(pen, x, y, 8 * s, 0x9a9aa6, INK);
    pen.lineStyle(OUTLINE * 0.8 * s, INK, 1);
    pen.lineBetween(x, y, x + 4 * s, y - 6 * s);
    circle(pen, x, y, 2 * s, INK);
  },
  'vocal-coach': (pen, x, y, s) => {
    pen.fillStyle(INK, 1);
    pen.fillEllipse(x - 3 * s, y + 5 * s, 8 * s, 6 * s);
    pen.fillRect(x, y - 8 * s, 2 * s, 13 * s);
    polygon(
      pen,
      [
        { x: x + 2 * s, y: y - 8 * s },
        { x: x + 8 * s, y: y - 4 * s },
        { x: x + 2 * s, y: y - 3 * s },
      ],
      INK,
    );
  },
  manager: (pen, x, y, s) => {
    roundedRect(pen, x - 3 * s, y - 7 * s, 6 * s, 4 * s, 1 * s, 0x6b3e1f, INK);
    roundedRect(pen, x - 8 * s, y - 4 * s, 16 * s, 11 * s, 2 * s, 0x8d5524, INK);
    pen.fillStyle(0xffc93c, 1);
    pen.fillRect(x - 1.5 * s, y - 1 * s, 3 * s, 3 * s);
  },
};

export function drawArchetypeIcon(
  pen: Pen,
  archetype: ArchetypeId,
  x: number,
  y: number,
  radius: number,
): void {
  ICONS[archetype](pen, x, y, radius / DESIGN_RADIUS);
}

/** The round badge that holds the icon, in the crew's trim colour. */
export function drawArchetypeBadge(
  pen: Pen,
  archetype: ArchetypeId,
  x: number,
  y: number,
  radius: number,
  fill: number,
): void {
  circle(pen, x, y, radius, fill, INK);
  drawArchetypeIcon(pen, archetype, x, y, radius * 0.75);
}
