import { describe, expect, it } from 'vitest';
import type { BeatAction } from '../battle/playback';
import { beatLayers, beatPattern, LAYER_HYPE, STEPS, stepHits, stepSeconds } from './beat';
import { createSoundEngine } from './engine';
import { CUE_RECIPES } from './recipes';
import { SOUND_CUES } from './cues';
import { battleCue, battleShake } from './cues';
import {
  DEFAULT_SOUND,
  loadSoundSettings,
  saveSoundSettings,
  SOUND_SETTINGS_KEY,
  VOLUME_STEPS,
  type SettingStore,
} from './settings';

function memoryStore(): SettingStore & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe('beatPattern', () => {
  it('is the same for the same battle seed and differs between seeds', () => {
    expect(beatPattern(7)).toEqual(beatPattern(7));
    const patterns = new Set(
      Array.from({ length: 20 }, (_, seed) => JSON.stringify(beatPattern(seed))),
    );
    expect(patterns.size).toBeGreaterThan(15);
  });

  it('keeps the backbeat: kicks on 1 and 3, snares on 2 and 4, a bass note on each kick', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pattern = beatPattern(seed);
      for (const steps of [pattern.kick, pattern.snare, pattern.hats, pattern.bass]) {
        expect(steps).toHaveLength(STEPS);
      }
      expect([pattern.kick[0], pattern.kick[8], pattern.snare[4], pattern.snare[12]]).toEqual([
        true,
        true,
        true,
        true,
      ]);
      pattern.kick.forEach((kick, step) => {
        if (kick) expect(pattern.bass[step]).not.toBeNull();
      });
      expect(pattern.bpm).toBeGreaterThanOrEqual(84);
      expect(pattern.bpm).toBeLessThanOrEqual(96);
      expect(stepSeconds(pattern)).toBeCloseTo(60 / pattern.bpm / 4);
    }
  });
});

describe('beatLayers', () => {
  it('brings in kick, snare, hi-hats and bass as the total hype rises', () => {
    expect(beatLayers(0)).toEqual(['kick']);
    expect(beatLayers(LAYER_HYPE.snare)).toEqual(['kick', 'snare']);
    expect(beatLayers(LAYER_HYPE.hats)).toEqual(['kick', 'snare', 'hats']);
    expect(beatLayers(20)).toEqual(['kick', 'snare', 'hats', 'bass']);
  });
});

describe('stepHits', () => {
  it('plays only the layers the hype has brought in', () => {
    const pattern = beatPattern(3);
    const kinds = (hype: number) =>
      new Set(
        Array.from({ length: STEPS }, (_, step) => stepHits(pattern, step, hype)).flatMap((hits) =>
          hits.map((hit) => hit.kind),
        ),
      );
    expect(kinds(0)).toEqual(new Set(['kick']));
    expect(kinds(LAYER_HYPE.hats)).toEqual(new Set(['kick', 'snare', 'hat']));
    expect(kinds(20)).toEqual(new Set(['kick', 'snare', 'hat', 'bass']));
    const [first] = stepHits(pattern, 0, 20).filter((hit) => hit.kind === 'bass');
    expect(first).toEqual({ kind: 'bass', midi: pattern.root + (pattern.bass[0] ?? NaN) });
  });
});

describe('every sound cue', () => {
  it('has a recipe of short, quiet enough voices', () => {
    for (const cue of SOUND_CUES) {
      const voices = CUE_RECIPES[cue];
      expect(voices.length, cue).toBeGreaterThan(0);
      for (const voice of voices) {
        expect(voice.at + voice.dur, cue).toBeLessThanOrEqual(1.2);
        expect(voice.gain, cue).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('the sound engine without WebAudio', () => {
  it('keeps and saves the setting, tells listeners, and plays nothing before the first click', () => {
    const store = memoryStore();
    const engine = createSoundEngine(store);
    let changes = 0;
    const stop = engine.subscribe(() => (changes += 1));
    expect(engine.settings()).toEqual(DEFAULT_SOUND);
    engine.setMuted(true);
    engine.setVolume(1.5);
    expect(engine.settings()).toEqual({ volume: 1, muted: false });
    expect(loadSoundSettings(store)).toEqual({ volume: 1, muted: false });
    expect(changes).toBe(2);
    stop();
    engine.setMuted(true);
    expect(changes).toBe(2);
    expect(() => {
      engine.play('bar');
      engine.startBeat(beatPattern(1));
      engine.setHype(5);
      engine.dropBar();
      engine.unlock();
      engine.stopBeat();
    }).not.toThrow();
  });
});

describe('battle cues and shake', () => {
  const speech = { speaker: null, side: 'a', text: '' } as const;
  const actions: readonly [BeatAction, string | null, boolean][] = [
    [{ kind: 'intro', opener: 'a' }, 'intro', false],
    [{ kind: 'turn', side: 'a', turn: 1 }, null, false],
    [{ kind: 'bar', side: 'a', unitId: 'x', targetId: 'y', damage: 1, word: '' }, 'bar', true],
    [{ kind: 'bar', side: 'a', unitId: 'x', targetId: 'y', damage: 5, word: '' }, 'bigBar', true],
    [{ kind: 'bar', side: 'a', unitId: 'x', targetId: 'y', damage: 0, word: '' }, 'bar', false],
    [{ kind: 'diss', side: 'a', unitId: 'x', targetId: 'y', damage: 2, word: '' }, 'diss', true],
    [{ kind: 'ability', side: 'a', unitId: 'x', name: 'Scratch', speech: null }, 'ability', false],
    [{ kind: 'buff', side: 'a', targetId: 'x', flow: 1, confidence: 0, word: '' }, 'buff', false],
    [{ kind: 'hype', side: 'a', change: 1 }, null, false],
    [{ kind: 'choke', side: 'a', unitId: 'x', word: '', speech }, 'choke', true],
    [{ kind: 'front', side: 'a', unitId: 'x' }, null, false],
    [{ kind: 'swing', side: 'a', rising: true, speech }, 'cheer', false],
    [{ kind: 'swing', side: 'a', rising: false, speech }, 'boo', false],
    [{ kind: 'verse', verse: 2 }, 'verse', false],
    [{ kind: 'verdict', verse: 1, winner: 'a', gain: { a: 3, b: 1 }, speech }, 'verdict', true],
    [{ kind: 'end', winner: 'a', reason: 'wipeout', margin: 1 }, 'win', true],
  ];

  it.each(actions)('%o sounds %s', (action, cue, shakes) => {
    expect(battleCue(action)).toBe(cue);
    expect(battleShake(action) !== null).toBe(shakes);
  });

  it('shakes harder for a huge hit than a small one, and hardest for a choke', () => {
    const hit = (damage: number) =>
      battleShake({ kind: 'bar', side: 'a', unitId: 'x', targetId: 'y', damage, word: '' })
        ?.intensity ?? 0;
    const choke = battleShake({ kind: 'choke', side: 'a', unitId: 'x', word: '', speech });
    expect(hit(5)).toBeGreaterThan(hit(1));
    expect(choke?.intensity ?? 0).toBeGreaterThan(hit(5));
  });
});

describe('sound settings', () => {
  it('starts on at the default volume, one of the volume steps', () => {
    expect(loadSoundSettings(null)).toEqual(DEFAULT_SOUND);
    expect(loadSoundSettings(memoryStore())).toEqual({ volume: 0.4, muted: false });
    expect(VOLUME_STEPS).toContain(DEFAULT_SOUND.volume);
  });

  it('saves and loads the volume and mute', () => {
    const store = memoryStore();
    saveSoundSettings(store, { volume: 0.8, muted: true });
    expect(loadSoundSettings(store)).toEqual({ volume: 0.8, muted: true });
  });

  it('falls back to the default for broken or blocked storage', () => {
    const store = memoryStore();
    store.items.set(SOUND_SETTINGS_KEY, 'not json');
    expect(loadSoundSettings(store)).toEqual(DEFAULT_SOUND);
    store.items.set(SOUND_SETTINGS_KEY, JSON.stringify({ volume: 7, muted: 'yes' }));
    expect(loadSoundSettings(store)).toEqual(DEFAULT_SOUND);
    const blocked: SettingStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSoundSettings(blocked)).toEqual(DEFAULT_SOUND);
    expect(() => {
      saveSoundSettings(blocked, DEFAULT_SOUND);
    }).not.toThrow();
  });
});
