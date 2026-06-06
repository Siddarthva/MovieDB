import { expect, test } from '@playwright/test';

test('showcase hover reveals censor node and synopsis overlay', async ({ page }) => {
  await page.goto('http://localhost:5174');

  const offlineBanner = page.getByText('System Offline - Reconnecting...');
  if (await offlineBanner.count()) {
    await offlineBanner.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
  }

  const firstCard = page.locator('[data-testid="title-card"]').first();
  await expect(firstCard).toBeVisible({ timeout: 45000 });

  await firstCard.dispatchEvent('mouseover');

  await expect(page.locator('[data-testid="censor-node"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="card-synopsis"]').first()).toBeVisible();
});
