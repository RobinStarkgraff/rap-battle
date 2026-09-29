/** Joining a sitting (§11 Screens): type the host's room code. */

import Phaser from 'phaser';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { UI } from '../palette';
import { problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel } from '../ui/panel';
import { addTextInput } from '../ui/textInput';

export interface JoinSceneData {
  readonly codeLength: number;
  /** Joins the room; returns a reason code if the code is refused. */
  readonly onJoin: (code: string) => string | null;
  readonly onBack: () => void;
}

export class JoinScene extends Phaser.Scene {
  static readonly KEY = 'join';

  private code = '';
  private problem: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(JoinScene.KEY);
  }

  create(data: JoinSceneData): void {
    this.code = '';
    addBackdrop(this, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, groundY: 560, seed: 57 });
    const left = DESIGN_WIDTH / 2 - 320;
    addPanel(this, left, 120, 640, 420);
    this.add.text(
      left + 30,
      140,
      'JOIN A SITTING',
      letteringStyle(40, { colour: UI.textGold, align: 'left' }),
    );
    addHeading(this, left + 30, 220, 'ROOM CODE');
    addTextInput(
      this,
      left + 30,
      256,
      240,
      data.codeLength,
      (value) => {
        this.code = value;
        this.problem?.setText('');
      },
      'join-code',
    );
    addBody(
      this,
      left + 290,
      262,
      'The host sees it in their lobby. Just type it.',
      15,
      UI.textMuted,
      320,
    );
    this.problem = addBody(this, left + 30, 330, '', 18, UI.textBad, 580);
    addButton(
      this,
      left + 480,
      470,
      'JOIN',
      () => {
        const problem = data.onJoin(this.code);
        if (problem !== null) this.problem?.setText(problemText(problem));
      },
      { width: 220, height: 60, target: 'join-go' },
    );
    addButton(this, left + 110, 470, 'BACK', data.onBack, {
      width: 140,
      height: 48,
      fill: UI.panelEdge,
      target: 'join-back',
    });
  }
}
