/**
 * A unit as it shows on screen (§11): its paper-cut figure, the archetype badge at its feet,
 * a name plate with its stage name and, on the farewell tour, a ribbon. Hovering the badge
 * shows the archetype's name and personality.
 */

import Phaser from 'phaser';
import { ARCHETYPES, type Unit } from '../../core';
import { INK, PAPER, SASH_TRIM, UI, type OutfitColours } from '../palette';
import { addBaked, bakeTexture, type BakeBox } from './bake';
import { careerLook } from './career';
import { drawFigure, FIGURE_HALF_WIDTH, FIGURE_HEIGHT } from './figure';
import { drawArchetypeBadge } from './icons';
import { bodyStyle, letteringStyle } from './lettering';
import { rollLook } from './look';

export interface UnitFigureOptions {
  readonly scale?: number;
  /** Figures face right; crew B's face left in battle. */
  readonly facing?: 'left' | 'right';
  /** Show the name plate and badge under the figure. */
  readonly nameplate?: boolean;
}

export interface UnitFigure {
  readonly container: Phaser.GameObjects.Container;
  /** The figure alone, for animations that shouldn't move the name plate. */
  readonly body: Phaser.GameObjects.Image;
}

/** The box a figure is baked in: its feet at (0, 0), with room for the outline. */
export const FIGURE_BOX: BakeBox = {
  width: FIGURE_HALF_WIDTH * 2 + 6,
  height: FIGURE_HEIGHT + 8,
  originX: FIGURE_HALF_WIDTH + 3,
  originY: FIGURE_HEIGHT + 4,
};

/** Bakes a unit's figure (once per look, outfit and career step) and returns its texture key. */
export function figureTexture(scene: Phaser.Scene, unit: Unit, outfit: OutfitColours): string {
  const career = careerLook(unit);
  const key = [
    'figure',
    unit.look,
    outfit.main,
    outfit.trim,
    career.bling.length,
    career.chainWeight,
    career.farewell,
  ].join(':');
  return bakeTexture(scene, key, FIGURE_BOX, (pen) => {
    drawFigure(pen, rollLook(unit.look), outfit, career);
  });
}

/** Adds a unit's figure with its feet on (x, y). */
export function addUnitFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  unit: Unit,
  outfit: OutfitColours,
  options: UnitFigureOptions = {},
): UnitFigure {
  const scale = options.scale ?? 1;
  const container = scene.add.container(x, y);
  const body = addBaked(
    scene,
    0,
    0,
    figureTexture(scene, unit, outfit),
    FIGURE_BOX,
    scale,
  ).setFlipX(options.facing === 'left');
  container.add(body);
  if (options.nameplate ?? true) {
    addNameplate(scene, container, unit, outfit, scale);
  }
  return { container, body };
}

function addNameplate(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  unit: Unit,
  outfit: OutfitColours,
  scale: number,
): void {
  const plateScale = Math.max(0.7, scale);
  const name = scene.add
    .text(
      8 * plateScale,
      14 * plateScale,
      unit.stageName,
      bodyStyle(Math.round(13 * plateScale), { colour: UI.textDark }),
    )
    .setOrigin(0.5, 0.5)
    .setFontStyle('bold');
  const width = name.width + 34 * plateScale;
  const height = 22 * plateScale;
  const plate = scene.add.graphics();
  plate.fillStyle(PAPER, 1);
  plate.fillRoundedRect(
    -width / 2 + 8 * plateScale,
    3 * plateScale,
    width - 8 * plateScale,
    height,
    6 * plateScale,
  );
  plate.lineStyle(2, INK, 1);
  plate.strokeRoundedRect(
    -width / 2 + 8 * plateScale,
    3 * plateScale,
    width - 8 * plateScale,
    height,
    6 * plateScale,
  );
  const badgeX = -width / 2 + 8 * plateScale;
  const badgeY = 14 * plateScale;
  const badgeRadius = 12 * plateScale;
  drawArchetypeBadge(plate, unit.archetype, badgeX, badgeY, badgeRadius, outfit.trim);
  container.add([plate, name]);
  if (careerLook(unit).farewell) {
    const ribbon = scene.add
      .text(
        0,
        30 * plateScale,
        'FAREWELL TOUR',
        letteringStyle(Math.round(10 * plateScale), { colour: '#ffffff' }),
      )
      .setOrigin(0.5, 0)
      .setBackgroundColor(`#${SASH_TRIM.toString(16).padStart(6, '0')}`)
      .setPadding(4, 1, 4, 1);
    container.add(ribbon);
  }
  addArchetypeTooltip(scene, container, unit, badgeX, badgeY, badgeRadius);
}

function addArchetypeTooltip(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  unit: Unit,
  x: number,
  y: number,
  radius: number,
): void {
  const archetype = ARCHETYPES[unit.archetype];
  const hit = scene.add.zone(x, y, radius * 2, radius * 2).setInteractive();
  container.add(hit);
  // The tip lives outside the container, so it draws over every other figure.
  const tip = scene.add
    .text(
      0,
      0,
      `${archetype.name}\n${archetype.personality}`,
      bodyStyle(12, { wrapWidth: 200, align: 'center' }),
    )
    .setOrigin(0.5, 1)
    .setBackgroundColor('#1b1b2f')
    .setPadding(6, 4, 6, 4)
    .setDepth(TOOLTIP_DEPTH)
    .setVisible(false);
  hit.on(Phaser.Input.Events.POINTER_OVER, () => {
    const bounds = hit.getBounds();
    tip.setPosition(bounds.centerX, bounds.top - 6).setVisible(true);
  });
  hit.on(Phaser.Input.Events.POINTER_OUT, () => tip.setVisible(false));
  container.once(Phaser.GameObjects.Events.DESTROY, () => {
    tip.destroy();
  });
}

/** Tooltips draw over everything else in a scene. */
export const TOOLTIP_DEPTH = 10_000;

/** An archetype badge on its own, baked once per archetype, fill and size. */
export function addBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  archetype: Unit['archetype'],
  fill: number,
  radius: number,
): Phaser.GameObjects.Image {
  const size = radius * 2 + 6;
  const box: BakeBox = { width: size, height: size, originX: size / 2, originY: size / 2 };
  const key = bakeTexture(
    scene,
    `badge:${archetype}:${String(fill)}:${String(radius)}`,
    box,
    (pen) => {
      drawArchetypeBadge(pen, archetype, 0, 0, radius, fill);
    },
  );
  return addBaked(scene, x, y, key, box);
}
