import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const WEB_SERVER_TIMEOUT_MS = 120000;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    // Keep artefacts cheap: capture only when something actually broke.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      // `pnpm screenshots` targets this project. e2e/screenshots.spec.ts sets
      // both reference viewports itself (1440x900 and 390x844), so this project
      // needs no `dependencies`. It used to depend on `mobile`; Playwright skips
      // a project whose dependency failed, which meant one failing responsive
      // assertion silently produced no reference PNGs at all.
      name: 'screenshots',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE_VIEWPORT },
    },
  ],
  webServer: {
    command: 'pnpm --filter @mirrorline/web dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
});
