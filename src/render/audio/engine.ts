/**
 * The game's sound (§11 Sound, D-051): SFX cues, the battle beat that builds with hype and
 * drops out for a bar on a choke, and the player's volume and mute. WebAudio starts on the
 * first click, as browsers require; before that, and where WebAudio is missing, it is silent.
 */

import { STEPS, stepHits, stepSeconds, type BeatPattern } from './beat';
import type { SoundCue } from './cues';
import { CUE_RECIPES } from './recipes';
import {
  loadSoundSettings,
  saveSoundSettings,
  type SettingStore,
  type SoundSettings,
} from './settings';
import { createSynth, type Synth } from './synth';

export interface SoundEngine {
  settings(): SoundSettings;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  /** Calls `listener` whenever the setting changes; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Starts WebAudio; call it from a click or key press. */
  unlock(): void;
  play(cue: SoundCue): void;
  startBeat(pattern: BeatPattern): void;
  /** The two crews' total hype, which decides the beat's layers. */
  setHype(totalHype: number): void;
  /** The beat drops out for one bar (a choke). */
  dropBar(): void;
  stopBeat(): void;
}

/** Schedules beat steps this far ahead of the audio clock, from a timer this often. */
const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;
/** The beat is quieter than the effects, so every bar and choke still reads. */
const BEAT_LEVEL = 0.55;

interface Beat {
  readonly pattern: BeatPattern;
  step: number;
  nextTime: number;
  hype: number;
  /** Steps left in the current drop. */
  silent: number;
  timer: ReturnType<typeof setInterval> | null;
}

interface Audio {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  /** Effects play straight into the master gain, the beat through a quieter bus. */
  readonly sfx: Synth;
  readonly drums: Synth;
}

export function createSoundEngine(store: SettingStore | null): SoundEngine {
  let settings = loadSoundSettings(store);
  const listeners = new Set<() => void>();
  let audio: Audio | null = null;
  let beat: Beat | null = null;

  const level = (): number => (settings.muted ? 0 : settings.volume);
  const change = (next: SoundSettings): void => {
    settings = next;
    saveSoundSettings(store, settings);
    if (audio !== null) audio.master.gain.setTargetAtTime(level(), audio.ctx.currentTime, 0.02);
    for (const listener of listeners) listener();
  };

  const scheduleBeat = (): void => {
    if (audio === null || beat === null) return;
    const { ctx, drums } = audio;
    const step = stepSeconds(beat.pattern);
    if (beat.nextTime < ctx.currentTime) beat.nextTime = ctx.currentTime + 0.02;
    while (beat.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      playStep(drums, beat, beat.nextTime, step);
      beat.step = (beat.step + 1) % STEPS;
      beat.nextTime += step;
    }
  };
  const runBeat = (): void => {
    if (audio === null || beat?.timer !== null) return;
    beat.nextTime = audio.ctx.currentTime + 0.05;
    beat.timer = setInterval(scheduleBeat, SCHEDULER_MS);
  };

  return {
    settings: () => settings,
    setVolume: (volume) => {
      change({ ...settings, volume: Math.min(1, Math.max(0, volume)), muted: false });
    },
    setMuted: (muted) => {
      change({ ...settings, muted });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    unlock: () => {
      audio ??= openAudio(level());
      if (audio?.ctx.state === 'suspended') void audio.ctx.resume();
      runBeat();
    },
    play: (cue) => {
      if (audio === null || level() === 0) return;
      const start = audio.ctx.currentTime + 0.01;
      for (const voice of CUE_RECIPES[cue]) audio.sfx.voice(voice, start);
    },
    startBeat: (pattern) => {
      stopTimer(beat);
      beat = { pattern, step: 0, nextTime: 0, hype: 0, silent: 0, timer: null };
      runBeat();
    },
    setHype: (totalHype) => {
      if (beat !== null) beat.hype = totalHype;
    },
    dropBar: () => {
      // The drop starts on the next step and lasts a whole bar.
      if (beat !== null) beat.silent = STEPS;
    },
    stopBeat: () => {
      stopTimer(beat);
      beat = null;
    },
  };
}

function openAudio(volume: number): Audio | null {
  const Context = globalThis.AudioContext as typeof AudioContext | undefined;
  if (Context === undefined) return null;
  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const beatBus = ctx.createGain();
  beatBus.gain.value = BEAT_LEVEL;
  beatBus.connect(master);
  return { ctx, master, sfx: createSynth(ctx, master), drums: createSynth(ctx, beatBus) };
}

function playStep(synth: Synth, beat: Beat, time: number, step: number): void {
  if (beat.silent > 0) {
    beat.silent -= 1;
    return;
  }
  for (const hit of stepHits(beat.pattern, beat.step, beat.hype)) {
    if (hit.kind === 'kick') synth.kick(time);
    else if (hit.kind === 'snare') synth.snare(time);
    else if (hit.kind === 'hat') synth.hat(time, hit.velocity);
    else synth.bass(time, hit.midi, step * 1.8);
  }
}

function stopTimer(beat: Beat | null): void {
  if (beat?.timer !== null && beat?.timer !== undefined) clearInterval(beat.timer);
}

/** An engine that plays nothing, for development pages and tests. */
export const SILENT_SOUND: SoundEngine = {
  settings: () => ({ volume: 0, muted: true }),
  setVolume: () => undefined,
  setMuted: () => undefined,
  subscribe: () => () => undefined,
  unlock: () => undefined,
  play: () => undefined,
  startBeat: () => undefined,
  setHype: () => undefined,
  dropBar: () => undefined,
  stopBeat: () => undefined,
};
