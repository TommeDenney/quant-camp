// Every simulator renders, is labelled, and responds to a control.
import { expect, test } from '@playwright/test';
import { go, shot, skipSetup, watchErrors } from './helpers';

const VIZ = ['distribution', 'moments', 'pdfcdf', 'bayes', 'tails', 'testpicker', 'permutation', 'bootstrap', 'acf', 'ar1', 'filtering', 'spectral', 'regression', 'crossval', 'attribution'];

test('the simulators index lists all 15', async ({ page }) => {
  await skipSetup(page);
  await go(page, '/labs');
  for (const id of VIZ) await expect(page.locator(`a[href$="#/labs/${id}"]`)).toHaveCount(1);
});

for (const id of VIZ) {
  test(`simulator ${id} renders and responds`, async ({ page }) => {
    const w = watchErrors(page);
    await skipSetup(page);
    await go(page, `/labs/${id}`);
    const viz = page.locator('section.viz').first();
    await expect(viz).toBeVisible();
    await expect(viz.getByRole('button', { name: 'Reset' })).toBeVisible();
    if (id !== 'testpicker') await expect(viz.locator('svg, canvas').first()).toBeVisible();
    const before = await viz.innerHTML();
    const range = viz.locator('input[type=range]').first();
    if (await range.count()) {
      // Keyboard on the slider: accessible and changes the output.
      await range.focus();
      for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
    } else {
      const btn = viz.locator('button.choice:not([disabled]), [role=radio][aria-checked=false]').first();
      await btn.click();
    }
    await expect.poll(async () => (await viz.innerHTML()) !== before).toBe(true);
    if (['tails', 'acf', 'regression', 'spectral', 'testpicker'].includes(id)) await shot(page, `lab-${id}`);
    w.assertClean();
  });
}
