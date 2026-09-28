/** Small numeric helpers shared by the game rules. */

/** Limits `value` to the range `[min, max]`. Throws if the range is empty. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`clamp: min (${String(min)}) is greater than max (${String(max)})`);
  }
  return Math.min(max, Math.max(min, value));
}
