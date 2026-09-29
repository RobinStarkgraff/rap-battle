/** The shop's sounds (§11 Sound): each hub action that goes through plays its cue. */

import type { SoundCue, SoundEngine } from '../audio';
import type { HubController } from './types';

/** The controller with a sound for every action that isn't refused. */
export function withShopSounds(controller: HubController, audio: SoundEngine): HubController {
  const sounding =
    <A extends unknown[]>(
      action: (...args: A) => string | null,
      cue: SoundCue | ((...args: A) => SoundCue),
    ) =>
    (...args: A): string | null => {
      const refusal = action(...args);
      if (refusal === null) audio.play(typeof cue === 'string' ? cue : cue(...args));
      return refusal;
    };
  return {
    ...controller,
    bid: sounding(controller.bid.bind(controller), (bids) => (bids.length === 0 ? 'pass' : 'bid')),
    scout: sounding(controller.scout.bind(controller), 'scout'),
    signScouted: sounding(controller.signScouted.bind(controller), 'sign'),
    release: sounding(controller.release.bind(controller), 'release'),
    move: sounding(controller.move.bind(controller), 'click'),
    lockIn: sounding(controller.lockIn.bind(controller), 'lockIn'),
    nudge: (crewId) => {
      controller.nudge(crewId);
      audio.play('nudge');
    },
  };
}
