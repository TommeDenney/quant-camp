import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
const base = 'http://localhost:4173/quant-camp/';
await page.goto(base);
await page.waitForTimeout(800);
console.log('first url', page.url());
await page.getByRole('button', { name: /Build my plan/ }).click();
await page.waitForTimeout(500);
const routes = ['/', '/learn', '/practice', '/mock', '/reference', '/python', '/labs', '/labs/regression', '/labs/spectral', '/labs/attribution', '/labs/crossval', '/glossary', '/notes', '/quiz?mode=mixed&n=5'];
const { readdirSync } = await import('fs');
for (const r of routes) { await page.goto(base + '#' + r); await page.waitForTimeout(600); console.log(r, (await page.locator('h1').first().textContent().catch(() => '?'))?.slice(0, 60)); }
// open first lesson
await page.goto(base + '#/learn'); await page.waitForTimeout(400);
const first = page.locator('a[href^="#/learn/"]').first();
if (await first.count()) { await first.click(); await page.waitForTimeout(500); console.log('lesson', await page.locator('h1').textContent());
  for (let k = 0; k < 10; k++) { const nx = page.getByRole('button', { name: /^Next$/ }); if (!(await nx.count())) break; await nx.click(); await page.waitForTimeout(350); console.log(' step', await page.locator('.eyebrow').filter({ hasText: 'Step' }).textContent()); }
  await page.screenshot({ path: process.argv[2] + '/lesson.png' });
}
await page.goto(base + '#/quiz?mode=mixed&n=3'); await page.waitForTimeout(500);
await page.locator('button.choice').first().click().catch(() => {});
await page.getByRole('button', { name: 'Check answer' }).click().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: process.argv[2] + '/quiz.png' });
await page.goto(base + '#/'); await page.waitForTimeout(600);
await page.screenshot({ path: process.argv[2] + '/dash.png', fullPage: true });
await page.goto(base + '#/mock'); await page.waitForTimeout(400);
await page.getByRole('button', { name: /Sprint/ }).click().catch((e) => console.log('nosprint', e.message));
await page.waitForTimeout(400);
await page.screenshot({ path: process.argv[2] + '/mock.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '#/'); await page.waitForTimeout(600);
await page.screenshot({ path: process.argv[2] + '/mobile.png' });
console.log('overflow', await page.evaluate(() => document.documentElement.scrollWidth));
console.log('ERRORS', JSON.stringify(errs, null, 1));
await browser.close();
