// Mock exam, reference search, offline use and every route without console errors.
import { expect, test } from '@playwright/test';
import { go, shot, skipSetup, watchErrors } from './helpers';

test('a mock exam can be taken and scored', async ({ page }) => {
  const w = watchErrors(page);
  page.on('dialog', (d) => d.accept());
  await skipSetup(page);
  await go(page, '/mock');
  const start = page.locator('button.card:not([disabled])').first();
  await expect(start).toBeVisible();
  await start.click();
  await expect(page.getByRole('timer')).toBeVisible();
  // Answer every question with its first option, then submit.
  for (let i = 0; i < 80; i++) {
    const opt = page.locator('button.choice:not([disabled])').first();
    if (await opt.count()) await opt.click();
    const next = page.getByRole('button', { name: /^Next/ });
    if (await next.count() && await next.isVisible()) { await next.click(); continue; }
    break;
  }
  await shot(page, 'mock-last-question');
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.getByText('Accuracy by topic')).toBeVisible();
  await expect(page.getByText(/\d+(\.\d)?\s*%/).first()).toBeVisible();
  await shot(page, 'mock-report');
  w.assertClean();
});

test('the reference opens and search finds formulas', async ({ page }) => {
  const w = watchErrors(page);
  await skipSetup(page);
  await go(page, '/reference');
  await expect(page.getByText('Before you rely on this in the exam')).toBeVisible();
  await expect(page.getByText('Which test?').first()).toBeVisible();
  const search = page.getByRole('searchbox').or(page.getByPlaceholder(/Search/)).first();
  await search.fill('variance');
  await expect(page.getByText(/variance/i).nth(1)).toBeVisible();
  await shot(page, 'reference-search');
  w.assertClean();
});

test('works offline after the first visit', async ({ page, context }) => {
  await skipSetup(page);
  await go(page, '/');
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
    return reg ? 'ready' : 'none';
  });
  expect(sw, 'service worker registered').toBe('ready');
  // Visit the main pages once so they are cached, then go offline.
  for (const r of ['/learn', '/reference', '/mock']) await go(page, r);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Quant Camp').first()).toBeVisible();
  await go(page, '/reference').catch(() => {});
  await expect(page.getByText('Which test?').first()).toBeVisible();
  await context.setOffline(false);
});

const ROUTES = ['/', '/learn', '/practice', '/quiz', '/mock', '/reference', '/python', '/labs', '/glossary', '/notes', '/setup'];
for (const r of ROUTES) {
  test(`route ${r} renders without console errors`, async ({ page }) => {
    const w = watchErrors(page);
    await skipSetup(page);
    await go(page, r);
    await expect(page.locator('main, #root > *').first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/Something went wrong|Unexpected Application Error/);
    w.assertClean();
  });
}
