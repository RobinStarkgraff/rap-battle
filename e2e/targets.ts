/**
 * Finds and clicks the game's named buttons (`window.micDropTargets()`, src/render/ui/targets.ts).
 * The game is drawn on a canvas, so tests address buttons by name, not by DOM selectors.
 */

import { expect, type Page } from '@playwright/test';

export interface Target {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly enabled: boolean;
}

const DESIGN_WIDTH = 1280;

export async function targets(page: Page): Promise<Target[]> {
  return page.evaluate(() => window.micDropTargets?.() ?? []);
}

function matches(target: Target, name: string | RegExp): boolean {
  return typeof name === 'string' ? target.name === name : name.test(target.name);
}

/** Waits until an enabled target with the name is on screen, and returns it. */
export async function waitForTarget(
  page: Page,
  name: string | RegExp,
  timeout = 20_000,
): Promise<Target> {
  let found: Target | undefined;
  await expect
    .poll(
      async () => {
        found = (await targets(page)).find((target) => target.enabled && matches(target, name));
        return found !== undefined;
      },
      { timeout, message: `waiting for target ${String(name)}` },
    )
    .toBe(true);
  if (found === undefined) throw new Error(`no target ${String(name)}`);
  return found;
}

/** Clicks a target at its centre, scaled from design coordinates to the canvas on the page. */
export async function clickTarget(
  page: Page,
  name: string | RegExp,
  timeout?: number,
): Promise<void> {
  const target = await waitForTarget(page, name, timeout);
  const box = await page.locator('#game canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const scale = box.width / DESIGN_WIDTH;
  await page.mouse.click(box.x + target.x * scale, box.y + target.y * scale);
}

export async function hasTarget(page: Page, name: string | RegExp): Promise<boolean> {
  return (await targets(page)).some((target) => target.enabled && matches(target, name));
}

/** Waits until a target with the name is on screen, enabled or not (text has no input). */
export async function waitForShown(
  page: Page,
  name: string | RegExp,
  timeout = 20_000,
): Promise<Target> {
  let found: Target | undefined;
  await expect
    .poll(
      async () => {
        found = (await targets(page)).find((target) => matches(target, name));
        return found !== undefined;
      },
      { timeout, message: `waiting for target ${String(name)} to show` },
    )
    .toBe(true);
  if (found === undefined) throw new Error(`no target ${String(name)}`);
  return found;
}
