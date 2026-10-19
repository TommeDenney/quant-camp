import { expect, type ConsoleMessage, type Page } from '@playwright/test';

export const STORE_KEY = 'quant-camp.v1';

/** Collect console errors and page errors; call `assertClean()` at the end of a test. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|Failed to load resource: net::ERR_INTERNET_DISCONNECTED/i.test(t)) return;
    errors.push(t);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return {
    errors,
    assertClean: () => expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]),
  };
}

/** Seed progress so the setup screen is skipped (zustand persist format). */
export async function skipSetup(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript(([key, extraJson]) => {
    if (sessionStorage.getItem('qc-seeded')) return;
    sessionStorage.setItem('qc-seeded', '1');
    const state = {
      setup: { done: true, hoursMon: 4, hoursTue: 5, minutesWed: 60, confStats: 2, confPython: 3, examAt: '2026-10-21T13:10' },
      objectives: {}, attempts: [], seen: {}, lessons: {}, lastLesson: null, bookmarks: [], notes: {}, studyMs: 0, mocks: [], stars: 0,
      theme: 'light', reducedMotion: true,
      ...JSON.parse(extraJson),
    };
    localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
  }, [STORE_KEY, JSON.stringify(extra)] as const);
}

export const go = async (page: Page, hash: string) => {
  await page.goto(`./#${hash.startsWith('/') ? hash : `/${hash}`}`);
  await page.waitForLoadState('networkidle');
};

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: false });
}
