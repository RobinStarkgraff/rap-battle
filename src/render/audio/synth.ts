/** Plays voices and drum hits on a WebAudio graph (§11 Sound). Only `engine.ts` uses it. */

import type { Voice } from './recipes';

/** One second of white noise, shared by every noise voice. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Noise needs no seed: it is heard, never compared between peers.
  let state = 0x2545f491;
  for (let index = 0; index < data.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[index] = (state >>> 0) / 0xffffffff - 0.5;
  }
  return buffer;
}

export interface Synth {
  voice(voice: Voice, start: number): void;
  kick(start: number): void;
  snare(start: number): void;
  hat(start: number, velocity: number): void;
  bass(start: number, midi: number, dur: number): void;
}

export function createSynth(ctx: BaseAudioContext, out: AudioNode): Synth {
  const buffer = noiseBuffer(ctx);
  /** A gain that jumps to `peak` (or swells to it) and falls to silence by `end`. */
  const envelope = (start: number, dur: number, peak: number, swell = false): GainNode => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(swell ? 0.0001 : peak, start);
    if (swell) gain.gain.exponentialRampToValueAtTime(peak, start + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    gain.connect(out);
    return gain;
  };
  const tone = (
    wave: OscillatorType,
    from: number,
    to: number,
    start: number,
    dur: number,
    peak: number,
  ): void => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    osc.connect(envelope(start, dur, peak));
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };
  const noise = (
    filter: BiquadFilterType,
    freq: number,
    start: number,
    dur: number,
    peak: number,
    swell = false,
  ): void => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = freq;
    source.connect(biquad);
    biquad.connect(envelope(start, dur, peak, swell));
    source.start(start, Math.random() * 0.5);
    source.stop(start + dur + 0.02);
  };
  return {
    voice: (voice, start) => {
      const at = start + voice.at;
      if (voice.kind === 'tone') tone(voice.wave, voice.from, voice.to, at, voice.dur, voice.gain);
      else noise(voice.filter, voice.freq, at, voice.dur, voice.gain, voice.swell === true);
    },
    kick: (start) => {
      tone('sine', 150, 45, start, 0.16, 0.9);
    },
    snare: (start) => {
      noise('highpass', 1200, start, 0.16, 0.35);
      tone('triangle', 190, 150, start, 0.08, 0.25);
    },
    hat: (start, velocity) => {
      noise('highpass', 7500, start, 0.04, 0.18 * velocity);
    },
    bass: (start, midi, dur) => {
      const freq = 440 * 2 ** ((midi - 69) / 12);
      tone('sawtooth', freq, freq, start, dur, 0.18);
      tone('sine', freq, freq, start, dur, 0.3);
    },
  };
}
