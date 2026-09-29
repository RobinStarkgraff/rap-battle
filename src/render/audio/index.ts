/** The game's procedural sound (§11 Sound, D-051). */

import type Phaser from 'phaser';
import { SILENT_SOUND, type SoundEngine } from './engine';

export { beatPattern } from './beat';
export type { BeatPattern } from './beat';
export { battleCue, battleShake } from './cues';
export type { SoundCue } from './cues';
export { createSoundEngine, SILENT_SOUND } from './engine';
export type { SoundEngine } from './engine';
export { DEFAULT_VOLUME, VOLUME_STEPS } from './settings';
export type { SettingStore, SoundSettings } from './settings';

const REGISTRY_KEY = 'sound';

/** Hands the engine to every scene of the game (through Phaser's game registry). */
export function provideSound(game: Phaser.Game, engine: SoundEngine): void {
  game.registry.set(REGISTRY_KEY, engine);
}

/** The game's engine, or a silent one where none was provided (development pages). */
export function soundOf(scene: Phaser.Scene): SoundEngine {
  const engine: unknown = scene.registry.get(REGISTRY_KEY);
  return isEngine(engine) ? engine : SILENT_SOUND;
}

function isEngine(value: unknown): value is SoundEngine {
  return typeof value === 'object' && value !== null && 'play' in value && 'startBeat' in value;
}
