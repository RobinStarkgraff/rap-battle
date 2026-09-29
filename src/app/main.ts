import Phaser from 'phaser';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GAME_SCENES,
  PAGE_BACKGROUND,
  createSoundEngine,
  provideSound,
  SoundScene,
  visibleTargets,
} from '../render';
import { createPeerNetwork, peerServerFrom } from '../net';
import { devPage, startDevPage } from './dev';
import { startDirector } from './director';
import { createGameFlow } from './flow';
import { browserStore } from './leagueStorage';
import { seedSource } from './seed';

declare global {
  interface Window {
    /** For browser tests: the named buttons on screen and where they are (T-024). */
    micDropTargets?: typeof visibleTargets;
  }
}

/** Entry point: wires the layers together and starts Phaser. */
function startGame(parent: string): Phaser.Game {
  const page = devPage(window.location.search);
  window.micDropTargets = visibleTargets;
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: PAGE_BACKGROUND,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Scenes are started by the director (or a development page), not by the config.
    scene: [],
    callbacks: {
      postBoot: (game) => {
        if (page !== null) {
          startDevPage(game, page, window.location.search);
          startSound(game);
          return;
        }
        startSound(game);
        for (const scene of GAME_SCENES) game.scene.add(scene.KEY, scene, false);
        const flow = createGameFlow({
          store: browserStore(),
          newSeed: seedSource(window.location.search),
          network: createPeerNetwork(peerServerFrom(window.location.search)),
          random: Math.random,
        });
        startDirector(game, flow);
        // Closing or reloading the tab leaves the sitting, so the others know at once.
        window.addEventListener('pagehide', () => {
          flow.shutdown();
        });
      },
    },
  });
}

/**
 * Sound for every scene, with its controls on top (§11 Sound). Browsers only let audio start
 * after the player's first click or key press.
 */
function startSound(game: Phaser.Game): void {
  const sound = createSoundEngine(browserStore());
  provideSound(game, sound);
  game.scene.add(SoundScene.KEY, SoundScene, true);
  const unlock = (): void => {
    sound.unlock();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

startGame('game');
