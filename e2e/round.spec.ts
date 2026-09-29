import { expect, test, type Page } from '@playwright/test';
import { clickTarget, hasTarget, targets, waitForTarget } from './targets';

const SAVE_KEY = 'mic-drop-league/league';

/** The saved league's number of completed rounds, or `null` without a save. */
async function savedRounds(page: Page): Promise<number | null> {
  return page.evaluate((key) => {
    const text = window.localStorage.getItem(key);
    if (text === null) return null;
    const save = JSON.parse(text) as { league: { completedRounds: number } };
    return save.league.completedRounds;
  }, SAVE_KEY);
}

/**
 * Bids two over the ask on the cheapest units (the bots bid the ask or one more), then
 * submits. Bids the draft can no longer afford are refused on screen and skipped.
 */
async function bidOnCheapUnits(page: Page): Promise<void> {
  await clickTarget(page, 'market-sort-ask');
  for (let index = 0; index < 6; index++) {
    const rows = (await targets(page)).filter((target) => target.name.startsWith('market-unit-'));
    const row = rows[index];
    if (row === undefined) break;
    await clickTarget(page, row.name);
    await clickTarget(page, 'market-bid-plus');
    await clickTarget(page, 'market-bid-plus');
    await clickTarget(page, 'market-add-bid');
  }
  await clickTarget(page, 'market-submit');
}

test('a player founds a crew and plays one full round against bots', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?seed=2026');
  await clickTarget(page, 'title-new');

  // Founding: a typed name, colours, a logo and the league size.
  await waitForTarget(page, 'founding-found');
  await page.keyboard.type('Soggy Biscuits');
  await clickTarget(page, 'colour-main-purple');
  await clickTarget(page, 'colour-trim-yellow');
  await clickTarget(page, 'logo-flame');
  await clickTarget(page, 'founding-size-4');
  await clickTarget(page, 'founding-found');

  // The hub opens on the first round, and the new league is saved.
  await waitForTarget(page, 'tab-market');
  await expect.poll(() => savedRounds(page)).toBe(0);
  for (const tab of ['tab-league', 'tab-hall', 'tab-home']) await clickTarget(page, tab);

  // The bidding: bid in the first round, pass in the rest, until Lock in is enabled.
  await clickTarget(page, 'tab-market');
  await bidOnCheapUnits(page);
  for (let round = 0; round < 3 && !(await hasTarget(page, 'hub-lock-in')); round++) {
    await clickTarget(page, 'market-submit');
  }

  // The won units stand in the lineup.
  await clickTarget(page, 'tab-lineup');
  await expect
    .poll(async () => (await targets(page)).filter((t) => t.name.startsWith('lineup-unit-')).length)
    .toBeGreaterThan(0);

  // Lock in, watch the battle at double speed, and read the result.
  await clickTarget(page, 'hub-lock-in');
  await clickTarget(page, 'battle-speed');
  await waitForTarget(page, 'result-continue', 180_000);
  expect(await savedRounds(page)).toBe(1);

  // On to round 2, and the saved league continues after a reload.
  await clickTarget(page, 'result-continue');
  await waitForTarget(page, 'tab-market');
  await page.reload();
  await clickTarget(page, 'title-continue');
  await waitForTarget(page, 'hub-quit');
  expect(errors).toEqual([]);
});
