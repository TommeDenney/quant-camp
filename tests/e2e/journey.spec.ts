// The core study journey: onboarding → dashboard → lesson → knowledge check → saved progress.
import { expect, test } from '@playwright/test';
import { go, shot, skipSetup, STORE_KEY, watchErrors } from './helpers';

test('first launch asks for the plan, then shows Mission Control', async ({ page }) => {
  const w = watchErrors(page);
  await go(page, '/');
  await expect(page.getByText("Let's plan your boot camp")).toBeVisible();
  await page.getByLabel('Monday (hours)').fill('3');
  await page.getByLabel('Tuesday (hours)').fill('4.5');
  await page.getByRole('radiogroup', { name: 'Statistics' }).getByRole('radio', { name: '2' }).click();
  await shot(page, 'onboarding');
  await page.getByRole('button', { name: /Build my plan/ }).click();
  await expect(page.getByRole('link', { name: /Continue studying/i }).or(page.getByRole('button', { name: /Continue studying/i })).first()).toBeVisible();
  await expect(page.getByText('Overall mastery')).toBeVisible();
  await shot(page, 'dashboard');
  // Saved: a reload keeps the plan.
  await page.reload();
  await expect(page.getByText("Let's plan your boot camp")).toHaveCount(0);
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORE_KEY);
  expect(saved.state.setup).toMatchObject({ done: true, hoursMon: 3, hoursTue: 4.5, confStats: 2 });
  w.assertClean();
});

test('a lesson walks through its steps, checks understanding and saves progress', async ({ page }) => {
  const w = watchErrors(page);
  await skipSetup(page);
  await go(page, '/learn');
  const first = page.locator('a[href*="#/learn/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/#\/learn\/[^/]+$/);
  await expect(page.getByRole('navigation', { name: 'Lesson steps' }).or(page.locator('[aria-label="Lesson steps"]')).first()).toBeVisible();
  await shot(page, 'lesson-step1');
  // Walk forward until the quick check appears.
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole('button', { name: 'Check answer' }).first().isVisible().catch(() => false)) break;
    await page.getByRole('button', { name: /^Next/ }).last().click();
  }
  const check = page.getByRole('button', { name: 'Check answer' }).first();
  await expect(check).toBeVisible();
  const card = page.locator('.card', { has: check }).first();
  const option = card.locator('button.choice:not([disabled])').first();
  if (await option.count()) await option.click();
  else await card.getByLabel('Your numeric answer').fill('1');
  await check.click();
  await expect(page.getByText(/Correct|Not quite/).first()).toBeVisible();
  await expect(page.locator('.feedback-good, .feedback-bad').first()).toBeVisible();
  await shot(page, 'lesson-feedback');
  // Progress persisted and restored after reload.
  const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').state, STORE_KEY);
  expect(before.attempts.length).toBeGreaterThan(0);
  expect(before.lastLesson).toBeTruthy();
  await page.reload();
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').state, STORE_KEY);
  expect(after.attempts.length).toBe(before.attempts.length);
  expect(Object.keys(after.objectives).length).toBeGreaterThan(0);
  w.assertClean();
});

test('Learn lists every module and lessons open from each', async ({ page }) => {
  const w = watchErrors(page);
  await skipSetup(page);
  await go(page, '/learn');
  for (const title of ['Statistics Foundations', 'Describing Data', 'Hypothesis Testing', 'Time-Series Foundations', 'Regression Foundations', 'Detection & Attribution']) {
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
  }
  const links = await page.locator('a[href*="#/learn/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  expect(links.length).toBeGreaterThan(3);
  for (const href of links.slice(0, 40)) {
    await page.goto(`./${href!.replace(/^.*#/, '#')}`);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  w.assertClean();
});

test('the dashboard Continue button takes you somewhere useful', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/');
  const cont = page.getByRole('link', { name: /Continue studying/i }).or(page.getByRole('button', { name: /Continue studying/i })).first();
  await cont.click();
  await expect(page).toHaveURL(/#\/(learn\/|practice|quiz|mock)/);
});

test('opening another lesson resets the current step', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/learn/m0-l1');
  await page.getByRole('button', { name: /^Next/ }).last().click();
  await expect(page.getByText(/Step 2 of 10/)).toBeVisible();
  await page.evaluate(() => { location.hash = '/learn/m0-l2'; });
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
});
