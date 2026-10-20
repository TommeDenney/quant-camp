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
  for (const r of ['/learn', '/labs/regression', '/reference', '/mock', '/python']) { await go(page, r); await noSideScroll(page); }
  await go(page, '/');
  await shot(page, 'laptop-dashboard');
});

test('phone layout: no sideways scrolling and navigation reachable @mobile', async ({ page }) => {
  await skipSetup(page);
  for (const r of ['/', '/learn', '/labs/tails', '/reference', '/mock', '/python']) {
    await go(page, r);
    await noSideScroll(page);
  }
  await go(page, '/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).last()).toBeVisible();
  await shot(page, 'mobile-dashboard');
  await go(page, '/labs/tails');
  await shot(page, 'mobile-lab-tails');
});

test('pale study themes persist after reloading', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/python');
  for (const theme of ['light', 'sage', 'blue', 'lavender']) {
    await page.getByRole('combobox', { name: 'Study theme' }).selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Study theme' })).toHaveValue(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await noSideScroll(page);
  }
});

test('keyboard: tab reaches the navigation and questions answer with number keys', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  // A question answered from the keyboard alone.
  await go(page, '/quiz?obj=m0.what&n=1');
  const q = page.locator('button.choice:not([disabled])').first();
  await expect(q).toBeVisible();
  await q.focus();
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback-good, .feedback-bad').first()).toBeVisible();
});

test('keyboard Enter activates Hint without submitting the selected answer', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/quiz?obj=m0.what&n=1');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Hint', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.callout-tip')).toBeVisible();
  await expect(page.locator('.feedback-good, .feedback-bad')).toHaveCount(0);
});
