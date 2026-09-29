/**
 * The result screen (§11 Result screen, D-050): a tabloid headline, the MVP, what the round
 * did for the player's crew, the other battles and the standings, then on to the next round.
 */

import Phaser from 'phaser';
import { crewOutfit, CREW_COLOUR_HEX, INK, UI } from '../palette';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle } from '../art/pen';
import { addUnitFigure } from '../art/unitFigure';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel, fitWidth } from '../ui/panel';
import { resultView, type ResultInput } from './view';

export interface ResultSceneData extends ResultInput {
  /** Whether the completed round was saved in the browser. */
  readonly saved: boolean;
  readonly onContinue: () => void;
}

export class ResultScene extends Phaser.Scene {
  static readonly KEY = 'result';

  constructor() {
    super(ResultScene.KEY);
  }

  create(data: ResultSceneData): void {
    const view = resultView(data);
    addBackdrop(this, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, groundY: 470, seed: 77 });
    const shade = this.add.graphics();
    shade.fillStyle(0x000000, 0.3);
    shade.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    // The tabloid front page.
    const paper = this.add.graphics();
    paper.fillStyle(0xfdf6e3, 1);
    paper.fillRect(40, 20, DESIGN_WIDTH - 80, 130);
    paper.lineStyle(4, INK, 1);
    paper.strokeRect(40, 20, DESIGN_WIDTH - 80, 130);
    paper.fillStyle(UI.accent, 1);
    paper.fillRect(40, 20, DESIGN_WIDTH - 80, 26);
    this.add.text(
      60,
      24,
      'THE BLOCK PARTY BUGLE · LATE EDITION',
      letteringStyle(14, { align: 'left' }),
    );
    const verdict = view.won === null ? '' : view.won ? 'YOU WIN!' : 'YOU LOSE';
    this.add
      .text(
        DESIGN_WIDTH - 60,
        24,
        verdict,
        letteringStyle(14, { colour: view.won === true ? UI.textGold : UI.text }),
      )
      .setOrigin(1, 0);
    const title = this.add
      .text(
        DESIGN_WIDTH / 2,
        98,
        view.headline,
        letteringStyle(38, { colour: UI.textDark, wrapWidth: DESIGN_WIDTH - 140 }),
      )
      .setOrigin(0.5)
      .setStroke('#fdf6e3', 0)
      .setShadow(0, 0, '#000000', 0, false, false);
    fitWidth(title, DESIGN_WIDTH - 140);
    if (title.height * title.scaleY > 100) title.setScale((100 / title.height) * 1);
    this.drawMvp(data, view.mvp);
    this.drawCrewLines(view.crewLines, view.seasonLines, view.otherBattles);
    this.drawStandings(view.standings);
    addBody(
      this,
      60,
      680,
      data.saved
        ? 'Round saved. You can stop here and come back later.'
        : 'This browser couldn’t save the round.',
      15,
      data.saved ? UI.textGood : UI.textBad,
    );
    addButton(this, DESIGN_WIDTH - 170, 670, 'NEXT ROUND', data.onContinue, {
      width: 260,
      height: 60,
      target: 'result-continue',
    });
  }

  private drawMvp(data: ResultSceneData, mvp: ReturnType<typeof resultView>['mvp']): void {
    addPanel(this, 40, 170, 300, 470);
    addHeading(this, 60, 184, 'MVP', 30, UI.textGold);
    if (mvp === null) {
      addBody(this, 60, 240, 'Nobody landed a single bar.', 16, UI.text, 260);
      return;
    }
    const main = CREW_COLOUR_HEX[mvp.crew.identity.mainColour];
    const pen = this.add.graphics();
    circle(pen, 190, 380, 110, main, INK);
    addUnitFigure(this, 190, 470, mvp.unit, crewOutfit(mvp.crew.identity), {
      scale: 1.6,
      nameplate: false,
    });
    circle(pen, 300, 200, 22, INK);
    drawLogo(
      pen,
      mvp.crew.identity.logo,
      300,
      200,
      17,
      main,
      CREW_COLOUR_HEX[mvp.crew.identity.trimColour],
    );
    fitWidth(addHeading(this, 60, 530, mvp.unit.stageName.toUpperCase(), 24), 260);
    addBody(
      this,
      60,
      566,
      `${mvp.crew.identity.name}${mvp.crew.id === data.crewId ? ' (yours!)' : ''}`,
      15,
    );
    addBody(this, 60, 592, `${String(mvp.damage)} confidence knocked off`, 15, UI.textGold);
  }

  private drawCrewLines(
    crewLines: readonly string[],
    seasonLines: readonly string[],
    others: readonly string[],
  ): void {
    addPanel(this, 360, 170, 460, 470);
    let y = 184;
    const block = (heading: string, lines: readonly string[], colour: string = UI.text): void => {
      if (lines.length === 0) return;
      addHeading(this, 380, y, heading, 20, UI.textGold);
      y += 30;
      for (const line of lines) {
        if (y > 610) return;
        const text = addBody(this, 380, y, line, 15, colour, 420);
        y += text.height + 4;
      }
      y += 10;
    };
    block('THE SEASON', seasonLines, UI.textGold);
    block('YOUR CREW', crewLines.length === 0 ? ['Nothing changed.'] : crewLines);
    block('AROUND THE LEAGUE', others);
  }

  private drawStandings(rows: ReturnType<typeof resultView>['standings']): void {
    addPanel(this, 840, 170, 400, 470);
    addHeading(this, 860, 184, 'STANDINGS', 20, UI.textGold);
    const columns = [0, 34, 270, 310, 350];
    ['#', 'CREW', 'W', 'L', 'PTS'].forEach((label, index) => {
      addBody(this, 860 + (columns[index] ?? 0), 220, label, 12, UI.textMuted).setFontStyle('bold');
    });
    rows.forEach((row, index) => {
      const y = 244 + index * 30;
      if (y > 620) return;
      const colour = row.mine ? UI.textGold : UI.text;
      const cells = [
        String(index + 1),
        row.name,
        String(row.wins),
        String(row.losses),
        String(row.points),
      ];
      cells.forEach((cell, column) => {
        const text = addBody(this, 860 + (columns[column] ?? 0), y, cell, 15, colour);
        if (column === 1) fitWidth(text.setFontStyle('bold'), 230);
      });
    });
  }
}
