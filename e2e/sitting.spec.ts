import { expect, test, type Browser, type Page } from '@playwright/test';
import { clickTarget, hasTarget, targets, waitForShown, waitForTarget } from './targets';

/** The local PeerJS server that `playwright.config.ts` starts (D-078). */
const PEER = 'localhost:9000';
const SAVE_KEY = 'mic-drop-league/league';

interface SavedLeague {
  readonly completedRounds: number;
  readonly members: readonly { readonly kind: string; readonly crewId: string }[];
}

async function savedLeague(page: Page): Promise<SavedLeague | null> {
  return page.evaluate((key) => {
    const text = window.localStorage.getItem(key);
    return text === null ? null : (JSON.parse(text) as { league: SavedLeague }).league;
  }, SAVE_KEY);
}

/** A player in their own browser context, so each has their own saved league. */
async function player(browser: Browser, errors: string[], name: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(`/?seed=2029&peer=${PEER}`);
  await waitForTarget(page, 'title-join');
  return page;
}

async function joinAndFound(page: Page, code: string, crew: string): Promise<void> {
  await clickTarget(page, 'title-join');
  await waitForTarget(page, 'join-go');
  await page.keyboard.type(code);
  await clickTarget(page, 'join-go');
  // No saved league: the newcomer founds a crew that takes over a bot's place.
  await waitForTarget(page, 'founding-found');
  await page.keyboard.type(crew);
  await clickTarget(page, 'founding-found');
  await waitForTarget(page, 'lobby-leave');
}

/** Bids two over the ask on the three cheapest units, then submits. */
async function bidOnCheapUnits(page: Page): Promise<void> {
  await clickTarget(page, 'tab-market');
  await clickTarget(page, 'market-sort-ask');
  for (let index = 0; index < 3; index++) {
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

/**
 * Every player passes each bidding round they still have to bid in, until the bidding is over
 * for everyone. A player whose bids are in has no submit button until the reveal.
 */
async function finishBidding(pages: readonly Page[]): Promise<void> {
  for (const page of pages) await clickTarget(page, 'tab-market');
  await expect
    .poll(
      async () => {
        let done = true;
        for (const page of pages) {
          if (await hasTarget(page, 'hub-lock-in')) continue;
          done = false;
          if (await hasTarget(page, 'market-submit')) await clickTarget(page, 'market-submit');
        }
        return done;
      },
      { timeout: 90_000, intervals: [500], message: 'waiting for the bidding to end' },
    )
    .toBe(true);
}

test('three friends play a league round together in a sitting', async ({ browser }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  const host = await player(browser, errors, 'host');
  const guests = [
    await player(browser, errors, 'guest 1'),
    await player(browser, errors, 'guest 2'),
  ];
  const everyone = [host, ...guests];

  // The host founds a local league of four crews, then hosts a sitting of it.
  await clickTarget(host, 'title-new');
  await waitForTarget(host, 'founding-found');
  await host.keyboard.type('Soggy Biscuits');
  await clickTarget(host, 'founding-size-4');
  await clickTarget(host, 'founding-found');
  await clickTarget(host, 'hub-quit');
  await clickTarget(host, 'title-host');
  const code = (await waitForShown(host, /^lobby-code-/)).name.slice('lobby-code-'.length);
  expect(code).toMatch(/^[A-Z]{4}$/);

  // Two friends join by the room code and found crews.
  await joinAndFound(guests[0] ?? host, code, 'Rowdy Llamas');
  await joinAndFound(guests[1] ?? host, code, 'Cosmic Crumbs');
  await waitForShown(host, 'lobby-seat-2');
  for (const page of everyone) await waitForShown(page, 'lobby-seat-2');

  // The host starts the round, and everyone lands in the hub.
  await clickTarget(host, 'lobby-start');
  for (const page of everyone) await waitForTarget(page, 'tab-market');

  // The host bids, the guests pass, and the bidding rounds go on until everyone is done.
  await bidOnCheapUnits(host);
  await finishBidding(everyone);

  // Everyone locks in; the battles play once the last one has.
  for (const page of everyone) await clickTarget(page, 'hub-lock-in');
  for (const page of everyone) await clickTarget(page, 'battle-speed', 60_000);
  for (const page of everyone) await waitForTarget(page, 'result-continue', 180_000);

  // Every browser saved the same completed round, with all three players in the league.
  const leagues = await Promise.all(everyone.map(savedLeague));
  for (const league of leagues) {
    expect(league?.completedRounds).toBe(1);
    expect(league?.members.filter((member) => member.kind === 'player')).toHaveLength(3);
  }
  expect(leagues[1]).toEqual(leagues[0]);
  expect(leagues[2]).toEqual(leagues[0]);

  // After the result, everyone is back in the lobby, and the host can start the next round.
  for (const page of everyone) await clickTarget(page, 'result-continue');
  await waitForTarget(host, 'lobby-start');
  for (const page of guests) await waitForTarget(page, 'lobby-leave');
  expect(errors).toEqual([]);
});
