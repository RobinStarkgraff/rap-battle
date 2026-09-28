import Phaser from 'phaser';
import { BootScene, COLORS, GAME_HEIGHT, GAME_WIDTH } from '../render';

/** Entry point: wires the layers together and starts Phaser. */
function startGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene],
  });
}

startGame('game');
