import Phaser from 'phaser';
import { GAME_TITLE } from '../core';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';

/** Placeholder scene: proves Phaser renders procedural shapes. Replaced in M4. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'boot';

  constructor() {
    super(BootScene.KEY);
  }

  create(): void {
    this.drawStage();
    this.drawMic(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
    this.add
      .text(GAME_WIDTH / 2, 120, GAME_TITLE, {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
  }

  private drawStage(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.stage, 1);
    g.fillRect(0, GAME_HEIGHT - 200, GAME_WIDTH, 200);
    g.fillStyle(COLORS.spotlight, 0.15);
    g.fillTriangle(GAME_WIDTH / 2, 0, GAME_WIDTH / 2 - 260, GAME_HEIGHT - 120, GAME_WIDTH / 2 + 260, GAME_HEIGHT - 120);
  }

  private drawMic(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.mic, 1);
    g.fillCircle(x, y - 60, 28);
    g.fillRect(x - 6, y - 32, 12, 110);
    g.fillRect(x - 50, y + 78, 100, 10);
  }
}
