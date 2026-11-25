import { expect, test, type Page } from '@playwright/test';

// The backend is mocked, so this test never calls the real game API.
const ADS_FIRST = [
  {
    adId: 'ad1',
    message: 'Help Bob find his lost cat',
    reward: 40,
    expiresIn: 5,
    probability: 'Sure thing',
    successRate: 1,
    expectedValue: 40,
    isTrap: false,
    reputationEffect: { people: 1, state: -2, underworld: 0 },
  },
  {
    adId: 'ad2',
    message: 'Steal super awesome diamond from Carl',
    reward: 200,
    expiresIn: 4,
    probability: 'Gamble',
    successRate: 0.54,
    expectedValue: 108,
    isTrap: true,
  },
];
const ADS_NEXT = [{ ...ADS_FIRST[0]!, adId: 'ad3', message: 'Escort a merchant' }];
// First the backend advises to solve ad1. After that, it advises to buy a potion. Then no advice.
const ADVICE_BY_CALL = [{ type: 'solve', adId: 'ad1' }, { type: 'buy', itemId: 'hpot' }, null];

async function mockBackend(page: Page): Promise<void> {
  let adsCalls = 0;
  const json = (data: unknown) => ({ status: 200, contentType: 'application/json', json: data });

  // Match the backend URL only. A pattern like '**/api/**' would also catch Vite's src/api files.
  await page.route('http://localhost:3100/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname.endsWith('/reputation')) {
      return route.fulfill(json({ people: 1, state: -2, underworld: 0 }));
    }
    if (method === 'POST' && pathname.endsWith('/games')) {
      return route.fulfill(
        json({ gameId: 'g1', lives: 3, gold: 0, level: 0, score: 0, highScore: 0, turn: 0 }),
      );
    }
    if (pathname.endsWith('/ads')) {
      adsCalls++;
      const advice = ADVICE_BY_CALL[Math.min(adsCalls, ADVICE_BY_CALL.length) - 1];
      return route.fulfill(json({ ads: adsCalls === 1 ? ADS_FIRST : ADS_NEXT, advice }));
    }
    if (pathname.endsWith('/shop')) {
      return route.fulfill(json([{ id: 'hpot', name: 'Healing potion', cost: 50 }]));
    }
    if (pathname.endsWith('/solve')) {
      return route.fulfill(
        json({
          success: true,
          lives: 3,
          gold: 90,
          score: 40,
          highScore: 40,
          turn: 1,
          message: 'ok',
        }),
      );
    }
    if (pathname.endsWith('/buy')) {
      return route.fulfill(json({ shoppingSuccess: true, gold: 40, lives: 4, level: 0, turn: 2 }));
    }
    return route.fulfill({
      status: 404,
      json: { statusCode: 404, error: 'NOT_FOUND', message: 'x' },
    });
  });
}

test('play a game with a mocked backend', async ({ page }, testInfo) => {
  await mockBackend(page);
  await page.goto('/');

  // Start a game and read the status.
  await page.getByRole('button', { name: 'Start game' }).click();
  const status = page.getByLabel('Player status');
  await expect(status).toContainText('Score0 / 1000 goal');
  await expect(status).toContainText('Gold0');
  await expect(status).toContainText('Lives3');

  // See the ads and solve the recommended one.
  await expect(page.getByText('Help Bob find his lost cat')).toBeVisible();
  const recommended = page.locator('li.ad.recommended');
  await expect(recommended).toContainText('Recommended');
  await expect(recommended.locator('.rep-chip')).toHaveText(['People +1', 'State -2']);
  await recommended.getByRole('button', { name: 'Solve' }).click();

  // The log and the score change.
  await expect(page.getByText('Solved: +90 gold, +40 points')).toBeVisible();
  await expect(status).toContainText('Score40 / 1000 goal');
  await expect(page.getByText('Escort a merchant')).toBeVisible();

  // On a phone, the shop is on its own tab.
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('tab', { name: 'Shop' }).click();
  }

  // The advice is now to buy a potion. The shop shows the reason and the mark.
  await expect(page.getByText('Low on lives: buy a potion.')).toBeVisible();
  await expect(page.locator('.shop .advice')).toContainText('Recommended');
  await expect(page.locator('li.item.highlight')).toContainText('recommended');

  // Buy a potion.
  // Buy from the box at the top of the shop.
  await page.getByRole('button', { name: 'Buy the recommended item, Healing potion' }).click();
  await expect(page.getByText('Bought Healing potion')).toBeVisible();
  await expect(status).toContainText('Lives4');
  await expect(page.locator('li.item.highlight')).toHaveCount(0);
  await expect(page.locator('.advice')).toHaveCount(0);

  // The reputation box shows the expected change of the solved ad. A check shows the real values.
  const reputation = page.locator('section.reputation');
  await expect(reputation).toContainText('Expected from 1 solved quest');
  await reputation.getByRole('button', { name: 'Investigate (costs 1 turn)' }).click();
  await expect(reputation.locator('.value')).toHaveText(['+1', '-2', '0']);
  await expect(reputation.locator('.expected')).toHaveCount(0);

  // On a phone, the page must not scroll sideways.
  if (testInfo.project.name === 'mobile') {
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noOverflow).toBe(true);
  }
});

test('auto-play follows the advice and stops on Stop', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByText('Help Bob find his lost cat')).toBeVisible();

  // Slow speed: 1.5 s for each step, so there is time to see the move and to press Stop.
  await page.getByLabel('Speed').selectOption('slow');
  await page.getByRole('button', { name: 'Start auto-play' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Following the advice.' })).toBeVisible();

  // First the advised card glows, then auto-play solves it like a click.
  await expect(page.locator('li.ad.auto-move')).toContainText('Help Bob find his lost cat');
  const solved = page.locator('.chronicle li', { hasText: 'Solved: +90 gold, +40 points' });
  await expect(solved).toBeVisible();
  await expect(solved.locator('.auto-tag')).toHaveText('Auto');
  await expect(page.getByLabel('Player status')).toContainText('Score40 / 1000 goal');

  // Stop before the next move (buy a potion).
  await page.getByRole('button', { name: 'Stop auto-play' }).click();
  await expect(page.getByText('Auto-play stopped.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start auto-play' })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByText('Bought Healing potion')).toHaveCount(0);
});
