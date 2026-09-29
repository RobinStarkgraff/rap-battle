/**
 * Every sound effect as data (§11 Sound: procedural, no audio files): a few short voices, each
 * a tone that slides between two pitches or a burst of filtered noise. `synth.ts` plays them.
 */

import type { SoundCue } from './cues';

export type Voice =
  | {
      readonly kind: 'tone';
      readonly wave: OscillatorType;
      /** Hz at the start and the end; the pitch slides exponentially between them. */
      readonly from: number;
      readonly to: number;
      /** Seconds after the cue starts. */
      readonly at: number;
      readonly dur: number;
      readonly gain: number;
    }
  | {
      readonly kind: 'noise';
      readonly filter: BiquadFilterType;
      readonly freq: number;
      readonly at: number;
      readonly dur: number;
      readonly gain: number;
      /** Fades in over the whole voice instead of starting loud, like a crowd swelling. */
      readonly swell?: boolean;
    };

function tone(
  wave: OscillatorType,
  from: number,
  to: number,
  at: number,
  dur: number,
  gain = 0.5,
): Voice {
  return { kind: 'tone', wave, from, to, at, dur, gain };
}

function noise(
  filter: BiquadFilterType,
  freq: number,
  at: number,
  dur: number,
  gain = 0.4,
  swell = false,
): Voice {
  return { kind: 'noise', filter, freq, at, dur, gain, swell };
}

/** An arpeggio of equal notes, one after the other. */
function arpeggio(
  wave: OscillatorType,
  notes: readonly number[],
  gap: number,
  dur: number,
  gain: number,
): Voice[] {
  return notes.map((note, index) => tone(wave, note, note, index * gap, dur, gain));
}

export const CUE_RECIPES: Readonly<Record<SoundCue, readonly Voice[]>> = {
  intro: [tone('sawtooth', 180, 900, 0, 0.45, 0.25), noise('highpass', 2000, 0.35, 0.3, 0.3)],
  bar: [tone('sine', 140, 55, 0, 0.12, 0.8), noise('highpass', 3000, 0, 0.05, 0.25)],
  bigBar: [
    tone('sine', 170, 40, 0, 0.3, 1),
    tone('square', 90, 60, 0, 0.18, 0.2),
    noise('lowpass', 1800, 0, 0.18, 0.5),
  ],
  diss: [tone('square', 900, 280, 0, 0.13, 0.25)],
  buff: [tone('sine', 500, 1000, 0, 0.14, 0.35), tone('sine', 750, 1500, 0.1, 0.16, 0.3)],
  ability: [
    tone('triangle', 1200, 1200, 0, 0.25, 0.35),
    tone('triangle', 1800, 1800, 0.07, 0.3, 0.25),
  ],
  choke: [tone('sawtooth', 420, 70, 0, 0.7, 0.3), noise('lowpass', 600, 0.1, 0.5, 0.2)],
  cheer: [noise('bandpass', 1400, 0, 0.9, 0.45, true), noise('bandpass', 2600, 0.2, 0.6, 0.2)],
  boo: [tone('sawtooth', 120, 95, 0, 0.7, 0.2), noise('lowpass', 450, 0, 0.7, 0.35, true)],
  verse: arpeggio('square', [660, 880], 0.09, 0.08, 0.2),
  verdict: [0, 0.22, 0.44].flatMap((at) => [
    tone('sawtooth', 440, 430, at, 0.18, 0.22),
    tone('sawtooth', 554, 545, at, 0.18, 0.18),
  ]),
  win: arpeggio('triangle', [523, 659, 784, 1047], 0.11, 0.3, 0.35),
  click: [tone('sine', 900, 900, 0, 0.03, 0.25)],
  bid: arpeggio('square', [988, 1319], 0.07, 0.09, 0.18),
  pass: [tone('sine', 420, 300, 0, 0.12, 0.3)],
  scout: [tone('sine', 600, 900, 0, 0.08, 0.25), tone('sine', 700, 1050, 0.1, 0.08, 0.25)],
  sign: [
    tone('square', 1568, 1568, 0, 0.05, 0.15),
    tone('triangle', 2093, 2093, 0.05, 0.3, 0.3),
    noise('highpass', 5000, 0, 0.08, 0.2),
  ],
  release: [tone('sine', 620, 200, 0, 0.22, 0.3)],
  lockIn: [262, 330, 392, 523].map((note) => tone('triangle', note, note, 0, 0.55, 0.22)),
  nudge: [tone('sine', 250, 700, 0, 0.12, 0.4), tone('sine', 700, 250, 0.12, 0.2, 0.4)],
};
