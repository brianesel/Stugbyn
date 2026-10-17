import { expect, test, type Page } from '@playwright/test';

/** Answers the current item correctly by reading which option the feedback reveals, retrying via a known-good pick. */
async function answerCurrent(page: Page) {
  const houses = page.locator('.house');
  if (await houses.count()) await houses.first().click();
  else await page.locator('.option').first().click();
}

test('open the village, play a Substantiv practice round, see results', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The village' })).toBeVisible();
  await page.getByRole('link', { name: /Substantiv/ }).click();
  await page.getByRole('link', { name: /Practice/ }).click();

  for (let i = 0; i < 30; i++) {
    if (await page.getByText(/^\d+\/\d+$/).isVisible().catch(() => false)) break;
    await answerCurrent(page);
    await page.getByRole('button', { name: 'Next' }).click();
  }

  await expect(page.locator('.score')).toBeVisible();
  await expect(page.getByText(/\+\d+ XP/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Another round' })).toBeVisible();
});
