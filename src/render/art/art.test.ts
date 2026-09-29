import { describe, expect, it } from 'vitest';
import {
  createRng,
  LOGO_IDS,
  MC_ARCHETYPE_IDS,
  SUPPORT_ARCHETYPE_IDS,
  type ArchetypeId,
} from '../../core';
import { FREE_AGENT_OUTFIT, GOLD, GREY_HAIR, SASH } from '../palette';
import { drawBackdrop, mix } from './backdrop';
import { ROOKIE_CAREER, type CareerLook } from './career';
import { drawFigure, FIGURE_HALF_WIDTH, FIGURE_HEIGHT } from './figure';
import { drawArchetypeBadge, drawArchetypeIcon } from './icons';
import { drawLogo } from './logos';
import { rollLook } from './look';
import { recordingPen, type Bounds } from './testing/recordingPen';

const ARCHETYPES: readonly ArchetypeId[] = [...MC_ARCHETYPE_IDS, ...SUPPORT_ARCHETYPE_IDS];
const VETERAN: CareerLook = {
  bling: ['chain', 'rings', 'capBadge', 'goldTooth'],
  chainWeight: 4,
  farewell: true,
};

function within(bounds: Bounds | null, box: Bounds): void {
  expect(bounds).not.toBeNull();
  if (bounds === null) return;
  expect(bounds.minX).toBeGreaterThanOrEqual(box.minX);
  expect(bounds.minY).toBeGreaterThanOrEqual(box.minY);
  expect(bounds.maxX).toBeLessThanOrEqual(box.maxX);
  expect(bounds.maxY).toBeLessThanOrEqual(box.maxY);
}

function drawnFigure(look: number, career: CareerLook = ROOKIE_CAREER) {
  const pen = recordingPen();
  drawFigure(pen, rollLook(look), FREE_AGENT_OUTFIT, career);
  return pen;
}

describe('drawFigure', () => {
  const seeds = Array.from({ length: 300 }, (_, index) => createRng(5).fork(index).seed);

  it('stays inside the figure box, whatever the look and career', () => {
    const box = {
      minX: -FIGURE_HALF_WIDTH,
      minY: -FIGURE_HEIGHT,
      maxX: FIGURE_HALF_WIDTH,
      maxY: 1,
    };
    for (const seed of seeds) {
      within(drawnFigure(seed).bounds(), box);
      within(drawnFigure(seed, VETERAN).bounds(), box);
    }
  });

  it('draws the same figure for the same look and different ones for most looks', () => {
    expect(drawnFigure(42).calls).toEqual(drawnFigure(42).calls);
    const drawings = new Set(seeds.slice(0, 50).map((seed) => drawnFigure(seed).calls.join()));
    expect(drawings.size).toBeGreaterThan(45);
  });

  it('wears the outfit colours', () => {
    const colours = drawnFigure(42).fillColours();
    expect(colours).toContain(FREE_AGENT_OUTFIT.main);
  });

  it('shows bling and the farewell tour', () => {
    for (const seed of seeds.slice(0, 40)) {
      const rookie = drawnFigure(seed).fillColours();
      const veteran = drawnFigure(seed, VETERAN).fillColours();
      expect(rookie).not.toContain(SASH);
      expect(veteran).toContain(SASH);
      expect(veteran).toContain(GOLD);
      const look = rollLook(seed);
      if (look.hair !== 'bald') expect(veteran).toContain(GREY_HAIR);
    }
    expect(drawnFigure(7, VETERAN).fills()).toBeGreaterThan(drawnFigure(7).fills());
  });
});

describe('icons and logos', () => {
  const box = (radius: number) => ({ minX: -radius, minY: -radius, maxX: radius, maxY: radius });

  it('draws every archetype icon inside its circle', () => {
    for (const archetype of ARCHETYPES) {
      const pen = recordingPen();
      drawArchetypeIcon(pen, archetype, 0, 0, 20);
      expect(pen.fills()).toBeGreaterThan(0);
      within(pen.bounds(), box(20));
    }
  });

  it('draws the badge around the icon', () => {
    const pen = recordingPen();
    drawArchetypeBadge(pen, 'dj', 0, 0, 12, 0xffffff);
    within(pen.bounds(), box(14));
  });

  it('draws ten different icons and eight different logos', () => {
    const icons = ARCHETYPES.map((archetype) => {
      const pen = recordingPen();
      drawArchetypeIcon(pen, archetype, 0, 0, 20);
      return pen.calls.join();
    });
    expect(new Set(icons).size).toBe(ARCHETYPES.length);
    const logos = LOGO_IDS.map((logo) => {
      const pen = recordingPen();
      drawLogo(pen, logo, 0, 0, 30, 0xff0000, 0x00ff00);
      within(pen.bounds(), box(31));
      expect(pen.fillColours()).toContain(0xff0000);
      return pen.calls.join();
    });
    expect(new Set(logos).size).toBe(LOGO_IDS.length);
  });
});

describe('drawBackdrop', () => {
  const options = { width: 1280, height: 720, groundY: 520, seed: 3, boomboxX: 1100 };

  it('covers the screen and nothing outside it', () => {
    const pen = recordingPen();
    drawBackdrop(pen, options);
    const bounds = pen.bounds();
    within(bounds, { minX: 0, minY: 0, maxX: 1280, maxY: 720 });
    expect(bounds).toMatchObject({ minX: 0, minY: 0, maxX: 1280, maxY: 720 });
  });

  it('rolls its decorations from the seed', () => {
    const draw = (seed: number) => {
      const pen = recordingPen();
      drawBackdrop(pen, { ...options, seed });
      return pen.calls.join();
    };
    expect(draw(3)).toBe(draw(3));
    expect(draw(3)).not.toBe(draw(4));
  });

  it('mixes colours channel by channel', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mix(0x00ff00, 0xff0000, 0.5)).toBe(0x808000);
  });
});
