import { expect, test } from '@playwright/test';

test('admin adds a movie and it is discoverable on showcase app', async ({ page, request }) => {
  const unique = Date.now();
  const titleName = `E2E Showcase ${unique}`;

  await page.goto('http://localhost:5175');

  await page.getByRole('button', { name: 'Add Title' }).click();
  await page.getByLabel('Title').fill(titleName);
  await page.getByLabel('Type').selectOption('movie');
  await page.getByLabel('Year').fill('2026');
  await page.getByLabel('Poster URL').fill('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600');
  await page.getByLabel('Backdrop URL').fill('https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200');
  await page.getByLabel('Trailer URL').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByLabel('Synopsis').fill('Automated E2E seeded title for showcase verification.');

  const createResponse = page.waitForResponse((response) => (
    response.url().includes('/api/titles') &&
    response.request().method() === 'POST' &&
    response.ok()
  ));

  await page.getByRole('button', { name: /Create Title|Update Title/ }).click();
  await createResponse;

  await expect(page.getByText('Title created successfully.')).toBeVisible();

  const titlesResponse = await request.get('http://localhost:5000/api/titles');
  expect(titlesResponse.ok()).toBeTruthy();
  const payload = await titlesResponse.json();
  expect(payload.some((item) => item.title === titleName)).toBeTruthy();

  await page.goto('http://localhost:5174');
  const offlineBanner = page.getByText('System Offline - Reconnecting...');
  if (await offlineBanner.count()) {
    await offlineBanner.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
  }
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByPlaceholder('Search movies, shows, people...').fill(titleName);
  await expect(page.getByText(titleName)).toBeVisible();
});
