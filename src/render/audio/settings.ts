/** The player's sound setting (§11 Sound): volume and mute, saved in the browser. */

/** The part of the Web Storage API the setting needs; `localStorage` has it. */
export interface SettingStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SoundSettings {
  /** 0 to 1. */
  readonly volume: number;
  readonly muted: boolean;
}

export const SOUND_SETTINGS_KEY = 'mic-drop-league/sound';
/** Sound starts on, quietly (D-051). */
export const DEFAULT_VOLUME = 0.4;
export const DEFAULT_SOUND: SoundSettings = { volume: DEFAULT_VOLUME, muted: false };
/** The volume control's steps; the default is one of them. */
export const VOLUME_STEPS = [0.2, 0.4, 0.6, 0.8, 1] as const;

/** The saved setting, or the default when there is none or it can't be read. */
export function loadSoundSettings(store: SettingStore | null): SoundSettings {
  try {
    const text = store?.getItem(SOUND_SETTINGS_KEY) ?? null;
    if (text === null) return DEFAULT_SOUND;
    const data: unknown = JSON.parse(text);
    if (typeof data !== 'object' || data === null) return DEFAULT_SOUND;
    const { volume, muted } = data as Record<string, unknown>;
    return {
      volume:
        typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : DEFAULT_SOUND.volume,
      muted: typeof muted === 'boolean' ? muted : DEFAULT_SOUND.muted,
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

/** Saves the setting; a blocked store just keeps it for this visit. */
export function saveSoundSettings(store: SettingStore | null, settings: SoundSettings): void {
  try {
    store?.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be full or blocked; the setting still applies until the page closes.
  }
}
