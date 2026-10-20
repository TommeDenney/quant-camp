import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { go, skipSetup, watchErrors } from './helpers';

test('Colab guide downloads an importable starter notebook and its practice CSV', async ({ page }) => {
  const errors = watchErrors(page);
  await skipSetup(page);
  await go(page, '/python');
  await expect(page.getByRole('heading', { name: 'Google Colab, step by step' })).toBeVisible();
  const starterPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Colab starter', exact: true }).click();
  const starter = await starterPromise;
  expect(starter.suggestedFilename()).toBe('quant-camp-colab-starter.ipynb');
  const nb = JSON.parse(await readFile((await starter.path())!, 'utf8'));
  expect(nb.nbformat).toBe(4);
  expect(nb.cells.filter((c: { cell_type: string }) => c.cell_type === 'code').length).toBeGreaterThanOrEqual(6);
  expect(nb.cells.every((c: { id: string }) => !!c.id)).toBe(true);
  const csvPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download practice CSV', exact: true }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe('quant-camp-practice.csv');
  expect((await readFile((await csv.path())!, 'utf8')).trim().split('\n').length).toBeGreaterThan(3);
  errors.assertClean();
});
