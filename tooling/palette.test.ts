/**
 * Keeps the colour palette in one place (T-058, D-092): every colour of `render/` is a named
 * token in `src/render/palette.ts`, so a theme change is one edit and nothing drifts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAPER, UI } from '../src/render/palette';

const RENDER = new URL('../src/render/', import.meta.url).pathname;
/** A 24-bit colour as a hex number or a CSS string. */
const COLOUR = /0x[0-9a-f]{6}\b|['"`]#[0-9a-f]{6}['"`]/gi;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('the colour palette', () => {
  it('holds every colour literal of render/', () => {
    const strays = sources(RENDER)
      .filter((path) => !path.endsWith('/palette.ts'))
      .flatMap((path) =>
        (readFileSync(path, 'utf8').match(COLOUR) ?? []).map(
          (colour) => `${path.slice(RENDER.length)}: ${colour}`,
        ),
      );
    expect(strays).toEqual([]);
  });
});

/** WCAG relative luminance of a 24-bit colour. */
function luminance(colour: number): number {
  const channel = (shift: number): number => {
    const value = ((colour >> shift) & 0xff) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function contrast(text: string, background: number): number {
  const [light, dark] = [luminance(Number.parseInt(text.slice(1), 16)), luminance(background)].sort(
    (x, y) => y - x,
  );
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('the theme', () => {
  it('keeps text readable on the panels and buttons it is drawn on (WCAG AA, 4.5:1)', () => {
    const light = [UI.text, UI.textMuted, UI.textGold, UI.textBad, UI.textGood] as const;
    for (const background of [UI.panel, UI.panelLight]) {
      for (const text of light)
        expect(contrast(text, background), text).toBeGreaterThanOrEqual(4.5);
    }
    // Secondary buttons (BACK, tabs, PASS) are light text on the panel edge colour.
    expect(contrast(UI.text, UI.panelEdge)).toBeGreaterThanOrEqual(4.5);
    for (const background of [UI.button, UI.buttonHover, UI.newsprint, PAPER]) {
      expect(contrast(UI.textDark, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
