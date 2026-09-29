import Phaser from 'phaser';
import {
  createRng,
  LOGO_IDS,
  MAIN_COLOUR_IDS,
  MC_ARCHETYPE_IDS,
  SUPPORT_ARCHETYPE_IDS,
  TRIM_ONLY_COLOUR_IDS,
  type Unit,
} from '../../core';
import { addBackdrop } from '../art/bake';
import { drawArchetypeBadge } from '../art/icons';
import { bodyStyle, letteringStyle } from '../art/lettering';
import { drawLogo } from '../art/logos';
import { addUnitFigure } from '../art/unitFigure';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config';
import { CREW_COLOUR_HEX, FREE_AGENT_OUTFIT, INK } from '../palette';

/**
 * A development page that shows the art side by side: figures with rolled looks, bling and
 * farewell tours, the archetype badges and the crew logos. Opened with `?gallery` in dev.
 */
export class GalleryScene extends Phaser.Scene {
  static readonly KEY = 'gallery';

  constructor() {
    super(GalleryScene.KEY);
  }

  create(): void {
    addBackdrop(this, {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      groundY: 470,
      seed: 7,
      boomboxX: 1180,
    });
    this.add.text(DESIGN_WIDTH / 2, 36, 'ART GALLERY', letteringStyle(40)).setOrigin(0.5);
    this.drawFigures();
    this.drawBadgesAndLogos();
  }

  private drawFigures(): void {
    const rng = createRng(2024);
    const colours = [...MAIN_COLOUR_IDS, ...TRIM_ONLY_COLOUR_IDS];
    for (let index = 0; index < 20; index++) {
      const row = Math.floor(index / 10);
      const x = 70 + (index % 10) * 118;
      const y = 250 + row * 210;
      const unit = galleryUnit(index, rng.nextUint32());
      const outfit =
        index === 0
          ? FREE_AGENT_OUTFIT
          : {
              main: CREW_COLOUR_HEX[rng.pick(MAIN_COLOUR_IDS)],
              trim: CREW_COLOUR_HEX[rng.pick(colours)],
            };
      addUnitFigure(this, x, y, unit, outfit, { facing: index % 3 === 0 ? 'left' : 'right' });
    }
  }

  private drawBadgesAndLogos(): void {
    const pen = this.add.graphics();
    [...MC_ARCHETYPE_IDS, ...SUPPORT_ARCHETYPE_IDS].forEach((archetype, index) => {
      drawArchetypeBadge(pen, archetype, 60 + index * 60, 640, 22, 0xfff4d6);
    });
    LOGO_IDS.forEach((logo, index) => {
      const x = 700 + index * 70;
      pen.fillStyle(INK, 1);
      pen.fillCircle(x, 640, 28);
      drawLogo(pen, logo, x, 640, 22, CREW_COLOUR_HEX[MAIN_COLOUR_IDS[index] ?? 'red'], 0xf8f8f2);
    });
    this.add.text(20, 690, 'Badges: the 10 archetypes. Logos: the 8 crew logos.', bodyStyle(14));
  }
}

/** A unit for the gallery: MCs and supports in turn; xp and age cover bling and farewells. */
function galleryUnit(index: number, look: number): Unit {
  const farewell = index % 5 === 4;
  const base = {
    id: `g${String(index)}`,
    xp: (index % 8) * 3,
    salary: 2,
    look,
    stageName: `Gallery ${String(index)}`,
    record: { battles: 0, barsLanded: 0, chokes: 0, wins: 0, crews: [] },
  };
  const pick = Math.floor(index / 2);
  if (index % 2 === 0) {
    return {
      ...base,
      role: 'mc',
      archetype: MC_ARCHETYPE_IDS[pick % MC_ARCHETYPE_IDS.length] ?? 'lyricist',
      abilities: [{ id: 'clapback', power: 1 }],
      age: farewell ? 22 : 19,
      flow: 3,
      confidence: 3,
    };
  }
  return {
    ...base,
    role: 'support',
    archetype: SUPPORT_ARCHETYPE_IDS[pick % SUPPORT_ARCHETYPE_IDS.length] ?? 'dj',
    abilities: [{ id: 'shout-out', power: 1 }],
    age: farewell ? 24 : 19,
  };
}
