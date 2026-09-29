import Phaser from 'phaser';
import { createRng, GAME_TITLE, generateUnit, nameSet } from '../../core';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { addUnitFigure } from '../art/unitFigure';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { CREW_COLOUR_HEX, UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody } from '../ui/panel';

export interface TitleSceneData {
  readonly canContinue: boolean;
  /** A reason code to explain, e.g. a damaged save. */
  readonly notice: string | null;
  readonly onNewLeague: () => void;
  readonly onContinue: () => void;
}

/** The title screen (§11 Screens): the game's name, a new league or the saved one. */
export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'title';

  constructor() {
    super(TitleScene.KEY);
  }

  create(data: TitleSceneData): void {
    addBackdrop(this, {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      groundY: 520,
      seed: 48,
      boomboxX: 1100,
    });
    this.addCrowd();
    const title = this.add.text(
      DESIGN_WIDTH / 2,
      150,
      GAME_TITLE.toUpperCase(),
      letteringStyle(96, { colour: UI.textGold }),
    );
    title.setOrigin(0.5).setAngle(-3);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.add
      .text(
        DESIGN_WIDTH / 2,
        240,
        'Sign the talent. Set the lineup. Drop the mic.',
        letteringStyle(26),
      )
      .setOrigin(0.5);
    let y = 330;
    if (data.canContinue) {
      addButton(this, DESIGN_WIDTH / 2, y, 'CONTINUE', data.onContinue, {
        width: 340,
        height: 64,
        target: 'title-continue',
      });
      y += 84;
    }
    addButton(
      this,
      DESIGN_WIDTH / 2,
      y,
      data.canContinue ? 'NEW LEAGUE' : 'START A LEAGUE',
      data.onNewLeague,
      {
        width: 340,
        height: 64,
        fill: data.canContinue ? 0xf4892b : UI.button,
        target: 'title-new',
      },
    );
    if (data.canContinue) {
      addBody(
        this,
        DESIGN_WIDTH / 2,
        y + 44,
        'A new league replaces your saved one.',
        15,
        UI.text,
      ).setOrigin(0.5, 0);
    }
    if (data.notice !== null) {
      addBody(this, DESIGN_WIDTH / 2, y + 72, problemText(data.notice), 18, UI.textBad)
        .setOrigin(0.5, 0)
        .setBackgroundColor('#1b1b2f')
        .setPadding(10, 6, 10, 6);
    }
  }

  /** A few generated MCs hanging out on the sidewalk. */
  private addCrowd(): void {
    const rng = createRng(2026);
    const names = nameSet([]);
    const colours = Object.values(CREW_COLOUR_HEX);
    for (let index = 0; index < 8; index++) {
      const unit = generateUnit(`title${String(index)}`, rng, names);
      names.add(unit.stageName);
      const x = index < 4 ? 90 + index * 95 : DESIGN_WIDTH - 90 - (index - 4) * 95;
      const outfit = { main: rng.pick(colours), trim: rng.pick(colours) };
      addUnitFigure(this, x, 650, { ...unit, xp: rng.int(0, 12) }, outfit, {
        nameplate: false,
        facing: index < 4 ? 'right' : 'left',
        scale: 1.1,
      });
    }
  }
}
