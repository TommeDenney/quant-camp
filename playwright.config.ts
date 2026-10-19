import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the PRODUCTION build (run `npm run build` first),
// served by `vite preview` at the GitHub Pages base path, in the installed Google Chrome.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/artifacts',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:4173/quant-camp/',
    launchOptions: { executablePath: process.env.PW_CHROME || CHROME },
    viewport: { width: 1470, height: 956 }, // 15" MacBook Air (Divine's laptop)
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'laptop', use: { browserName: 'chromium' }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { browserName: 'chromium', ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, defaultBrowserType: 'chromium' }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --base /quant-camp/',
    url: 'http://localhost:4173/quant-camp/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
