import { describe, expect, it } from 'vitest';
import { SILENT_SOUND, type SoundCue } from '../audio';
import { withShopSounds } from './sounds';
import type { HubController } from './types';

function fakeController(refusal: string | null): HubController {
  return {
    isOpen: () => true,
    state: () => {
      throw new Error('not needed');
    },
    subscribe: () => () => undefined,
    bid: () => refusal,
    scout: () => refusal,
    signScouted: () => refusal,
    release: () => refusal,
    move: () => refusal,
    lockIn: () => refusal,
    nudge: () => undefined,
    quitToTitle: () => undefined,
  };
}

function recorder(): { played: SoundCue[]; audio: typeof SILENT_SOUND } {
  const played: SoundCue[] = [];
  return { played, audio: { ...SILENT_SOUND, play: (cue) => played.push(cue) } };
}

describe('withShopSounds', () => {
  it('plays the cue of every action that goes through', () => {
    const { played, audio } = recorder();
    const hub = withShopSounds(fakeController(null), audio);
    hub.bid([{ unitId: 'u1', amount: 3 }]);
    hub.bid([]);
    hub.scout();
    hub.signScouted('u2');
    hub.release('u3');
    hub.move('u4', { area: 'bench', index: 0 });
    hub.lockIn();
    hub.nudge('c2');
    expect(played).toEqual(['bid', 'pass', 'scout', 'sign', 'release', 'click', 'lockIn', 'nudge']);
  });

  it('stays quiet for a refused action and passes the refusal on', () => {
    const { played, audio } = recorder();
    const hub = withShopSounds(fakeController('notEnoughGold'), audio);
    expect(hub.scout()).toBe('notEnoughGold');
    expect(hub.lockIn()).toBe('notEnoughGold');
    expect(played).toEqual([]);
  });
});
