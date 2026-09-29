/**
 * The drawing calls the art needs: a small part of Phaser's `Graphics`. Art functions draw
 * into a `Pen`, so tests can run them with a recording pen, without Phaser or a canvas.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Structurally a subset of `Phaser.GameObjects.Graphics`, so a `Graphics` is a `Pen`. */
export interface Pen {
  fillStyle(color: number, alpha?: number): unknown;
  lineStyle(width: number, color: number, alpha?: number): unknown;
  fillCircle(x: number, y: number, radius: number): unknown;
  strokeCircle(x: number, y: number, radius: number): unknown;
  fillRect(x: number, y: number, width: number, height: number): unknown;
  strokeRect(x: number, y: number, width: number, height: number): unknown;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): unknown;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): unknown;
  fillEllipse(x: number, y: number, width: number, height: number): unknown;
  strokeEllipse(x: number, y: number, width: number, height: number): unknown;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): unknown;
  strokeTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): unknown;
  fillPoints(points: Point[], closeShape?: boolean): unknown;
  strokePoints(points: Point[], closeShape?: boolean): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  beginPath(): unknown;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
  ): unknown;
  strokePath(): unknown;
}

/** Outline width of the paper-cut look at scale 1. */
export const OUTLINE = 3;

/** A rounded rect whose radius never exceeds half its size (Phaser draws it wrongly then). */
export function roundedRect(
  pen: Pen,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: number,
  outline?: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  pen.fillStyle(fill, 1);
  pen.fillRoundedRect(x, y, width, height, r);
  if (outline !== undefined) {
    pen.lineStyle(OUTLINE, outline, 1);
    pen.strokeRoundedRect(x, y, width, height, r);
  }
}

export function circle(
  pen: Pen,
  x: number,
  y: number,
  radius: number,
  fill: number,
  outline?: number,
): void {
  pen.fillStyle(fill, 1);
  pen.fillCircle(x, y, radius);
  if (outline !== undefined) {
    pen.lineStyle(OUTLINE, outline, 1);
    pen.strokeCircle(x, y, radius);
  }
}

export function polygon(pen: Pen, points: Point[], fill: number, outline?: number): void {
  pen.fillStyle(fill, 1);
  pen.fillPoints(points, true);
  if (outline !== undefined) {
    pen.lineStyle(OUTLINE, outline, 1);
    pen.strokePoints(points, true);
  }
}

/** Points of a regular star centred on (x, y). */
export function starPoints(
  x: number,
  y: number,
  outer: number,
  inner: number,
  spikes = 5,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / spikes;
    points.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
  }
  return points;
}
