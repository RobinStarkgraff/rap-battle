/**
 * The battle beat (§11 Sound, D-051): one loop of 16 steps per battle, rolled from a seed
 * derived from the battle seed so both peers hear the same one. Layers come in as the two
 * crews' total hype rises. Pure, so it is unit-tested; `engine.ts` plays it.
 */

import { createRng, deriveSeed } from '../../core';

export const STEPS = 16;

export const BEAT_LAYERS = ['kick', 'snare', 'hats', 'bass'] as const;
export type BeatLayer = (typeof BEAT_LAYERS)[number];

/** The total hype of both crews (0 to 20) from which each layer plays. */
export const LAYER_HYPE: Readonly<Record<BeatLayer, number>> = {
  kick: 0,
  snare: 3,
  hats: 7,
  bass: 12,
};

/** The minor pentatonic, in semitones above the root. */
const PENTATONIC = [0, 3, 5, 7, 10] as const;

export interface BeatPattern {
  readonly bpm: number;
  /** The bass root as a MIDI note number. */
  readonly root: number;
  readonly kick: readonly boolean[];
  readonly snare: readonly boolean[];
  /** Velocity 0 to 1 per step; 0 is silent. */
  readonly hats: readonly number[];
  /** Semitones above the root per step, or `null` for a rest. */
  readonly bass: readonly (number | null)[];
}

export function beatPattern(battleSeed: number): BeatPattern {
  const rng = createRng(deriveSeed(battleSeed, 'beat'));
  const steps = Array.from({ length: STEPS }, (_, step) => step);
  const kick = steps.map(
    (step) => step === 0 || step === 8 || ([3, 6, 10, 11, 14].includes(step) && rng.chance(0.3)),
  );
  const snare = steps.map(
    (step) => step === 4 || step === 12 || ((step === 7 || step === 15) && rng.chance(0.25)),
  );
  const sixteenths = rng.chance(0.5);
  const hats = steps.map((step) => {
    if (step % 2 === 0) return step % 4 === 0 ? 0.9 : 0.6;
    return sixteenths && rng.chance(0.6) ? 0.35 : 0;
  });
  const bass = steps.map((step) =>
    kick[step] === true ? rng.pick(PENTATONIC) : step % 4 === 2 && rng.chance(0.3) ? 7 : null,
  );
  return { bpm: rng.int(84, 96), root: rng.int(33, 40), kick, snare, hats, bass };
}

/** The layers that play at a total hype, in the order they came in. */
export function beatLayers(totalHype: number): BeatLayer[] {
  return BEAT_LAYERS.filter((layer) => totalHype >= LAYER_HYPE[layer]);
}

/** Seconds per step: a 16-step loop is one bar of four beats. */
export function stepSeconds(pattern: BeatPattern): number {
  return 60 / pattern.bpm / 4;
}

export type BeatHit =
  | { readonly kind: 'kick' }
  | { readonly kind: 'snare' }
  | { readonly kind: 'hat'; readonly velocity: number }
  | { readonly kind: 'bass'; readonly midi: number };

/** What plays on one step of the loop at a total hype. */
export function stepHits(pattern: BeatPattern, step: number, totalHype: number): BeatHit[] {
  const layers = new Set(beatLayers(totalHype));
  const hits: BeatHit[] = [];
  if (layers.has('kick') && pattern.kick[step] === true) hits.push({ kind: 'kick' });
  if (layers.has('snare') && pattern.snare[step] === true) hits.push({ kind: 'snare' });
  const velocity = pattern.hats[step] ?? 0;
  if (layers.has('hats') && velocity > 0) hits.push({ kind: 'hat', velocity });
  const note = pattern.bass[step] ?? null;
  if (layers.has('bass') && note !== null) hits.push({ kind: 'bass', midi: pattern.root + note });
  return hits;
}
