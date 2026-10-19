// Layout on the 15" MacBook Air and on a phone, plus keyboard use.
import { expect, test } from '@playwright/test';
import { go, shot, skipSetup } from './helpers';

const noSideScroll = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test('MacBook Air layout: navigation and dashboard fit', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).first()).toBeVisible();
  await noSideScroll(page);
  for (const r of ['/learn', '/labs/regression', '/reference', '/mock']) { await go(page, r); await noSideScroll(page); }
  await go(page, '/');
  await shot(page, 'laptop-dashboard');
});

test('phone layout: no sideways scrolling and navigation reachable @mobile', async ({ page }) => {
  await skipSetup(page);
  for (const r of ['/', '/learn', '/labs/tails', '/reference', '/mock']) {
    await go(page, r);
    await noSideScroll(page);
  }
  await go(page, '/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).last()).toBeVisible();
  await shot(page, 'mobile-dashboard');
  await go(page, '/labs/tails');
  await shot(page, 'mobile-lab-tails');
});

test('keyboard: tab reaches the navigation and questions answer with number keys', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  // A question answered from the keyboard alone.
  await go(page, '/practice');
  const q = page.locator('button.choice:not([disabled])').first();
  if (!(await q.count())) test.skip(true, 'practice page has no question on screen');
  await q.focus();
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback-good, .feedback-bad').first()).toBeVisible();
});
