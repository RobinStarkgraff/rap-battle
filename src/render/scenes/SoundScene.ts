/**
 * The sound controls (§11 Sound): a mute button and a volume bar in the bottom-left corner,
 * always visible, in a scene that runs on top of every screen.
 */

import Phaser from 'phaser';
import { SILENT_SOUND, soundOf, VOLUME_STEPS, type SoundEngine } from '../audio';
import { roundedRect } from '../art/pen';
import { INK, UI } from '../palette';
import { registerTarget } from '../ui/targets';

const LEFT = 6;
const TOP = 692;
const HEIGHT = 24;
const BAR_WIDTH = 14;

export class SoundScene extends Phaser.Scene {
  static readonly KEY = 'sound';

  private engine: SoundEngine = SILENT_SOUND;
  private layer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SoundScene.KEY);
  }

  create(): void {
    this.engine = soundOf(this);
    const unsubscribe = this.engine.subscribe(() => {
      this.redraw();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.redraw();
  }

  private redraw(): void {
    this.layer?.destroy();
    const layer = this.add.container(0, 0);
    this.layer = layer;
    const { volume, muted } = this.engine.settings();
    const width = 38 + VOLUME_STEPS.length * (BAR_WIDTH + 4) + 6;
    const panel = this.add.graphics();
    roundedRect(panel, LEFT, TOP, width, HEIGHT, 8, UI.panel, INK);
    layer.add(panel);
    const mute = this.add.container(LEFT + 18, TOP + HEIGHT / 2, [speaker(this, muted)]);
    mute.setSize(30, HEIGHT).setInteractive({ useHandCursor: true });
    mute.on(Phaser.Input.Events.POINTER_UP, () => {
      this.engine.setMuted(!muted);
    });
    registerTarget(muted ? 'sound-unmute' : 'sound-mute', mute);
    layer.add(mute);
    VOLUME_STEPS.forEach((step, index) => {
      const x = LEFT + 38 + index * (BAR_WIDTH + 4);
      const barHeight = 6 + index * 3;
      const lit = !muted && volume >= step - 0.001;
      const bar = this.add.graphics();
      bar.fillStyle(lit ? UI.button : UI.panelLight, 1);
      bar.fillRoundedRect(x, TOP + HEIGHT - 4 - barHeight, BAR_WIDTH, barHeight, 2);
      layer.add(bar);
      const hit = this.add
        .zone(x + BAR_WIDTH / 2, TOP + HEIGHT / 2, BAR_WIDTH + 4, HEIGHT)
        .setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.POINTER_UP, () => {
        this.engine.setVolume(step);
        this.engine.play('click');
      });
      registerTarget(`sound-volume-${String(index + 1)}`, hit);
      layer.add(hit);
    });
  }
}

/** A speaker drawn from shapes, with sound waves, or a cross when muted. */
function speaker(scene: Phaser.Scene, muted: boolean): Phaser.GameObjects.Graphics {
  const pen = scene.add.graphics();
  pen.fillStyle(UI.white, 1);
  pen.fillRect(-9, -3, 4, 6);
  pen.fillTriangle(-6, 0, 0, -7, 0, 7);
  pen.lineStyle(2, muted ? UI.accentHover : UI.white, 1);
  if (muted) {
    pen.lineBetween(3, -4, 9, 4);
    pen.lineBetween(9, -4, 3, 4);
  } else {
    pen.beginPath();
    pen.arc(1, 0, 5, -0.8, 0.8);
    pen.strokePath();
    pen.beginPath();
    pen.arc(1, 0, 9, -0.8, 0.8);
    pen.strokePath();
  }
  return pen;
}
