import Phaser from 'phaser';
import {
  COLOUR_NAMES,
  LOGO_IDS,
  LOGO_NAMES,
  MAIN_COLOUR_IDS,
  TRIM_ONLY_COLOUR_IDS,
  TUNABLES,
  type CrewIdentity,
  type LeagueBattleStyle,
  type LogoId,
  type MainColourId,
  type TrimColourId,
  type Unit,
} from '../../core';
import { addBackdrop } from '../art/bake';
import { letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { circle } from '../art/pen';
import { addUnitFigure } from '../art/unitFigure';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { crewOutfit, CREW_COLOUR_HEX, INK, UI } from '../palette';
import { LEAGUE_STYLE_TEXT, problemText } from '../text';
import { addButton } from '../ui/button';
import { addBody, addHeading, addPanel } from '../ui/panel';
import { registerTarget } from '../ui/targets';
import { addTextInput } from '../ui/textInput';

export interface FoundingSceneData {
  /** How many bots a new league can have; the first is the default. None when joining. */
  readonly botChoices: readonly number[];
  readonly defaultBots: number;
  /** The battle styles a new league can be founded with; the first is the default. None when joining. */
  readonly styleChoices: readonly LeagueBattleStyle[];
  /** Founds the crew; returns a reason code if the name is refused. */
  readonly onFound: (
    identity: CrewIdentity,
    bots: number,
    battleStyle: LeagueBattleStyle,
  ) => string | null;
  readonly onBack: () => void;
  /** Founding a crew to join a friend's league instead of starting one (D-080). */
  readonly joining: {
    /** The name of the league saved in this browser that joining replaces, if any. */
    readonly replaces: string | null;
  } | null;
  /** A reason code to show at once, e.g. why the host refused the last name. */
  readonly notice: string | null;
}

/** A preview model for the crew's colours: always the same two figures. */
const PREVIEW_UNITS: readonly Unit[] = [11, 42].map((look, index) => ({
  id: `preview${String(index)}`,
  role: 'mc',
  archetype: 'lyricist',
  flow: 3,
  confidence: 3,
  abilities: [{ id: 'clapback', power: 1 }],
  xp: index * 6,
  age: 19,
  salary: 2,
  look: 90210 + look,
  stageName: index === 0 ? 'Your MC' : 'Your other MC',
  record: { battles: 0, barsLanded: 0, chokes: 0, wins: 0, crews: [] },
}));

/**
 * Crew founding (§2 Crew identity, D-052): a name, two colours, a logo and the league size,
 * or, when joining a friend's league, no size.
 */
export class FoundingScene extends Phaser.Scene {
  static readonly KEY = 'founding';

  private identity: {
    name: string;
    mainColour: MainColourId;
    trimColour: TrimColourId;
    logo: LogoId;
  } = {
    name: '',
    mainColour: 'teal',
    trimColour: 'white',
    logo: 'star',
  };
  private bots = 5;
  private battleStyle: LeagueBattleStyle = 'mixed';
  private dynamic: Phaser.GameObjects.Container | null = null;
  private problem: Phaser.GameObjects.Text | null = null;
  private data_!: FoundingSceneData;

  constructor() {
    super(FoundingScene.KEY);
  }

  create(data: FoundingSceneData): void {
    this.data_ = data;
    this.identity = { name: '', mainColour: 'teal', trimColour: 'white', logo: 'star' };
    this.bots = data.defaultBots;
    this.battleStyle = data.styleChoices[0] ?? 'mixed';
    addBackdrop(this, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, groundY: 560, seed: 52 });
    addPanel(this, 40, 30, 800, 660);
    if (data.styleChoices.length > 0) addPanel(this, 855, 564, 400, 126);
    this.add.text(
      70,
      50,
      data.joining === null ? 'FOUND YOUR CREW' : 'JOIN THE LEAGUE',
      letteringStyle(40, { colour: UI.textGold, align: 'left' }),
    );
    addHeading(this, 70, 120, 'CREW NAME');
    addTextInput(
      this,
      70,
      152,
      520,
      TUNABLES.CREW_NAME_MAX,
      (value) => {
        this.identity.name = value;
        this.problem?.setText('');
        this.redraw();
      },
      'founding-name',
    );
    addBody(
      this,
      600,
      166,
      `up to ${String(TUNABLES.CREW_NAME_MAX)} letters — just type`,
      14,
      UI.textMuted,
    );
    addHeading(this, 70, 222, 'MAIN COLOUR');
    addHeading(this, 70, 312, 'TRIM');
    addHeading(this, 70, 402, 'LOGO');
    if (data.joining === null) {
      addHeading(this, 70, 492, 'LEAGUE SIZE');
    } else {
      const replaces =
        data.joining.replaces === null
          ? ''
          : ` It replaces your saved league with ${data.joining.replaces}.`;
      addBody(
        this,
        70,
        496,
        `Your crew joins the host's league, taking over a bot's place if there is one.${replaces}`,
        16,
        data.joining.replaces === null ? UI.text : UI.textGold,
        740,
      );
    }
    this.problem = addBody(this, 70, 600, '', 18, UI.textBad);
    if (data.notice !== null) this.problem.setText(problemText(data.notice));
    addButton(
      this,
      700,
      640,
      data.joining === null ? 'FOUND CREW' : 'JOIN',
      () => {
        this.found();
      },
      {
        width: 220,
        height: 60,
        target: 'founding-found',
      },
    );
    addButton(
      this,
      160,
      640,
      'BACK',
      () => {
        data.onBack();
      },
      {
        width: 140,
        height: 48,
        fill: UI.panelEdge,
        target: 'founding-back',
      },
    );
    this.redraw();
  }

  private found(): void {
    const problem = this.data_.onFound(this.identity, this.bots, this.battleStyle);
    if (problem !== null) this.problem?.setText(problemText(problem));
  }

  /** Redraws the pickers and the preview after every choice. */
  private redraw(): void {
    this.dynamic?.destroy();
    const layer = this.add.container(0, 0);
    this.dynamic = layer;
    MAIN_COLOUR_IDS.forEach((colour, index) => {
      layer.add(
        this.swatch(
          90 + index * 62,
          276,
          'main',
          colour,
          this.identity.mainColour === colour,
          () => {
            this.identity.mainColour = colour;
            if (this.identity.trimColour === colour)
              this.identity.trimColour = colour === 'yellow' ? 'black' : 'white';
          },
        ),
      );
    });
    const trims: TrimColourId[] = [...MAIN_COLOUR_IDS, ...TRIM_ONLY_COLOUR_IDS].filter(
      (colour) => colour !== this.identity.mainColour,
    );
    trims.forEach((colour, index) => {
      layer.add(
        this.swatch(
          90 + index * 62,
          366,
          'trim',
          colour,
          this.identity.trimColour === colour,
          () => {
            this.identity.trimColour = colour;
          },
        ),
      );
    });
    LOGO_IDS.forEach((logo, index) => {
      layer.add(this.logoChoice(100 + index * 78, 456, logo));
    });
    this.drawSizes(layer);
    this.drawStyles(layer);
    this.drawPreview(layer);
  }

  private drawSizes(layer: Phaser.GameObjects.Container): void {
    if (this.data_.joining !== null) return;
    [3, 5, 7, 11]
      .filter((bots) => this.data_.botChoices.includes(bots))
      .forEach((bots, index) => {
        const chosen = this.bots === bots;
        const button = addButton(
          this,
          140 + index * 170,
          546,
          `${String(bots + 1)} CREWS`,
          () => {
            this.bots = bots;
            this.redraw();
          },
          {
            width: 150,
            height: 42,
            fontSize: 18,
            fill: chosen ? UI.button : UI.panelEdge,
            target: `founding-size-${String(bots + 1)}`,
          },
        );
        layer.add(button.container);
      });
    layer.add(
      addBody(
        this,
        70,
        572,
        `You and ${String(this.bots)} bot crews. Bigger leagues play in divisions.`,
        14,
        UI.textMuted,
      ),
    );
  }

  /** The league's battle style (D-088), on the right under the preview. */
  private drawStyles(layer: Phaser.GameObjects.Container): void {
    if (this.data_.styleChoices.length === 0) return;
    const left = 870;
    layer.add(addHeading(this, left, 574, 'BATTLE STYLE'));
    this.data_.styleChoices.forEach((style, index) => {
      const button = addButton(
        this,
        left + 58 + index * 128,
        622,
        LEAGUE_STYLE_TEXT[style].name,
        () => {
          this.battleStyle = style;
          this.redraw();
        },
        {
          width: 120,
          height: 40,
          fontSize: 15,
          fill: this.battleStyle === style ? UI.button : UI.panelEdge,
          target: `founding-style-${style}`,
        },
      );
      layer.add(button.container);
    });
    layer.add(
      addBody(this, left, 648, LEAGUE_STYLE_TEXT[this.battleStyle].blurb, 13, UI.text, 380),
    );
  }

  private swatch(
    x: number,
    y: number,
    kind: 'main' | 'trim',
    colour: TrimColourId,
    chosen: boolean,
    pick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const pen = this.add.graphics();
    circle(pen, 0, 0, chosen ? 24 : 20, CREW_COLOUR_HEX[colour], INK);
    if (chosen) {
      pen.lineStyle(4, UI.white, 1);
      pen.strokeCircle(0, 0, 29);
    }
    container.add(pen);
    container.setSize(56, 56).setInteractive({ useHandCursor: true });
    container.on(Phaser.Input.Events.POINTER_UP, () => {
      pick();
      this.redraw();
    });
    registerTarget(`colour-${kind}-${colour}`, container);
    container.setData('label', COLOUR_NAMES[colour]);
    return container;
  }

  private logoChoice(x: number, y: number, logo: LogoId): Phaser.GameObjects.Container {
    const chosen = this.identity.logo === logo;
    const container = this.add.container(x, y);
    const pen = this.add.graphics();
    circle(pen, 0, 0, 30, chosen ? UI.panelEdge : UI.panelLight, chosen ? UI.white : INK);
    drawLogo(
      pen,
      logo,
      0,
      0,
      22,
      CREW_COLOUR_HEX[this.identity.mainColour],
      CREW_COLOUR_HEX[this.identity.trimColour],
    );
    container.add(pen);
    container.setSize(64, 64).setInteractive({ useHandCursor: true });
    container.on(Phaser.Input.Events.POINTER_UP, () => {
      this.identity.logo = logo;
      this.redraw();
    });
    registerTarget(`logo-${logo}`, container);
    container.setData('label', LOGO_NAMES[logo]);
    return container;
  }

  private drawPreview(layer: Phaser.GameObjects.Container): void {
    const x = 1060;
    const main = CREW_COLOUR_HEX[this.identity.mainColour];
    const trim = CREW_COLOUR_HEX[this.identity.trimColour];
    const banner = this.add.graphics();
    banner.fillStyle(main, 1);
    banner.fillRoundedRect(x - 190, 60, 380, 90, 14);
    banner.lineStyle(3, INK, 1);
    banner.strokeRoundedRect(x - 190, 60, 380, 90, 14);
    circle(banner, x - 140, 105, 34, INK);
    drawLogo(banner, this.identity.logo, x - 140, 105, 28, main, trim);
    layer.add(banner);
    const name = this.identity.name.trim() === '' ? 'YOUR CREW' : this.identity.name.toUpperCase();
    const title = this.add
      .text(x - 96, 105, name, letteringStyle(26, { align: 'left' }))
      .setOrigin(0, 0.5);
    if (title.width > 270) title.setScale(270 / title.width);
    layer.add(title);
    const outfit = crewOutfit(this.identity);
    PREVIEW_UNITS.forEach((unit, index) => {
      layer.add(
        addUnitFigure(this, x - 70 + index * 140, 520, unit, outfit, { scale: 1.5 }).container,
      );
    });
  }
}
