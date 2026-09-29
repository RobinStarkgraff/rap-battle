/**
 * Which sound and how much screen shake each battle beat gets (§11 Sound, M7 juice). Pure,
 * so every beat kind is covered by a test.
 */

import { HUGE_HIT } from '../text';
import type { BeatAction } from '../battle/playback';

export const SOUND_CUES = [
  // Battle
  'intro',
  'bar',
  'bigBar',
  'diss',
  'buff',
  'ability',
  'choke',
  'cheer',
  'boo',
  'verse',
  'verdict',
  'win',
  // Shop and screens
  'click',
  'bid',
  'pass',
  'scout',
  'sign',
  'release',
  'lockIn',
  'nudge',
] as const;
export type SoundCue = (typeof SOUND_CUES)[number];

/** The sound of a battle beat, if it has one. */
export function battleCue(action: BeatAction): SoundCue | null {
  switch (action.kind) {
    case 'intro':
      return 'intro';
    case 'bar':
      return action.damage >= HUGE_HIT ? 'bigBar' : 'bar';
    case 'diss':
      return 'diss';
    case 'buff':
      return 'buff';
    case 'ability':
      return 'ability';
    case 'choke':
      return 'choke';
    case 'swing':
      return action.rising ? 'cheer' : 'boo';
    case 'verse':
      return 'verse';
    case 'verdict':
      return 'verdict';
    case 'end':
      return 'win';
    case 'turn':
    case 'hype':
    case 'front':
      return null;
  }
}

/** Camera shake of a beat: how strong (a fraction of the screen) and how long, or `null`. */
export interface Shake {
  readonly intensity: number;
  readonly ms: number;
}

export function battleShake(action: BeatAction): Shake | null {
  switch (action.kind) {
    case 'bar':
    case 'diss':
      if (action.damage >= HUGE_HIT) return { intensity: 0.008, ms: 260 };
      return action.damage > 0 ? { intensity: 0.003, ms: 120 } : null;
    case 'choke':
      return { intensity: 0.012, ms: 380 };
    case 'verdict':
      return { intensity: 0.004, ms: 200 };
    case 'end':
      return { intensity: 0.006, ms: 300 };
    case 'intro':
    case 'turn':
    case 'ability':
    case 'buff':
    case 'hype':
    case 'front':
    case 'swing':
    case 'verse':
      return null;
  }
}
