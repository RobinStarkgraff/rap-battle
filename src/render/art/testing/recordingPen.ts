/** A `Pen` that records what is drawn, for tests of the art without Phaser. */

import type { Pen, Point } from '../pen';

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface RecordingPen extends Pen {
  /** Every call, as `name(args)`, in order: two drawings are equal when their calls are. */
  readonly calls: string[];
  /** How many filled shapes were drawn. */
  fills(): number;
  /** The box around everything drawn, or `null` if nothing was. */
  bounds(): Bounds | null;
  /** The fill colours used, in order of first use. */
  fillColours(): number[];
}

export function recordingPen(): RecordingPen {
  const calls: string[] = [];
  const colours: number[] = [];
  let fillCount = 0;
  let box: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  function record(name: string, args: readonly unknown[]): void {
    calls.push(`${name}(${args.map((arg) => JSON.stringify(arg)).join(',')})`);
  }
  function touch(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new RangeError(`bad point ${String(x)},${String(y)}`);
    box =
      box === null
        ? { minX: x, minY: y, maxX: x, maxY: y }
        : {
            minX: Math.min(box.minX, x),
            minY: Math.min(box.minY, y),
            maxX: Math.max(box.maxX, x),
            maxY: Math.max(box.maxY, y),
          };
  }
  function rect(x: number, y: number, width: number, height: number): void {
    touch(x, y);
    touch(x + width, y + height);
  }
  function points(list: readonly Point[]): void {
    for (const point of list) touch(point.x, point.y);
  }
  function filled(): void {
    fillCount++;
  }

  return {
    calls,
    fills: () => fillCount,
    bounds: () => box,
    fillColours: () => colours,
    fillStyle(color, alpha) {
      record('fillStyle', [color, alpha]);
      if (!colours.includes(color)) colours.push(color);
    },
    lineStyle(width, color, alpha) {
      record('lineStyle', [width, color, alpha]);
    },
    fillCircle(x, y, radius) {
      record('fillCircle', [x, y, radius]);
      rect(x - radius, y - radius, radius * 2, radius * 2);
      filled();
    },
    strokeCircle(x, y, radius) {
      record('strokeCircle', [x, y, radius]);
      rect(x - radius, y - radius, radius * 2, radius * 2);
    },
    fillRect(x, y, width, height) {
      record('fillRect', [x, y, width, height]);
      rect(x, y, width, height);
      filled();
    },
    strokeRect(x, y, width, height) {
      record('strokeRect', [x, y, width, height]);
      rect(x, y, width, height);
    },
    fillRoundedRect(x, y, width, height, radius) {
      record('fillRoundedRect', [x, y, width, height, radius]);
      rect(x, y, width, height);
      filled();
    },
    strokeRoundedRect(x, y, width, height, radius) {
      record('strokeRoundedRect', [x, y, width, height, radius]);
      rect(x, y, width, height);
    },
    fillEllipse(x, y, width, height) {
      record('fillEllipse', [x, y, width, height]);
      rect(x - width / 2, y - height / 2, width, height);
      filled();
    },
    strokeEllipse(x, y, width, height) {
      record('strokeEllipse', [x, y, width, height]);
      rect(x - width / 2, y - height / 2, width, height);
    },
    fillTriangle(x0, y0, x1, y1, x2, y2) {
      record('fillTriangle', [x0, y0, x1, y1, x2, y2]);
      points([
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ]);
      filled();
    },
    strokeTriangle(x0, y0, x1, y1, x2, y2) {
      record('strokeTriangle', [x0, y0, x1, y1, x2, y2]);
      points([
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ]);
    },
    fillPoints(list, closeShape) {
      record('fillPoints', [list, closeShape]);
      points(list);
      filled();
    },
    strokePoints(list, closeShape) {
      record('strokePoints', [list, closeShape]);
      points(list);
    },
    lineBetween(x1, y1, x2, y2) {
      record('lineBetween', [x1, y1, x2, y2]);
      touch(x1, y1);
      touch(x2, y2);
    },
    beginPath() {
      record('beginPath', []);
    },
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
      record('arc', [x, y, radius, startAngle, endAngle, anticlockwise]);
      touch(x + Math.cos(startAngle) * radius, y + Math.sin(startAngle) * radius);
      touch(x + Math.cos(endAngle) * radius, y + Math.sin(endAngle) * radius);
    },
    strokePath() {
      record('strokePath', []);
    },
  };
}
