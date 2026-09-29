import Phaser from 'phaser';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GAME_SCENES,
  PAGE_BACKGROUND,
  visibleTargets,
} from '../render';
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
          return;
        }
        for (const scene of GAME_SCENES) game.scene.add(scene.KEY, scene, false);
        const flow = createGameFlow({
          store: browserStore(),
          newSeed: seedSource(window.location.search),
        });
        startDirector(game, flow);
      },
    },
  });
}

startGame('game');
