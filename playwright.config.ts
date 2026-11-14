import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * The suite runs against a production build, and that is the fix for the
 * flake rather than a preference.
 *
 * `next dev` compiles a route the first time it is asked for. Playwright runs
 * seven workers on this machine, so a cold dev server meets seven browsers at
 * once, each asking for a different uncompiled screen: one run of the full
 * suite in that state produced 179 failures, several of them axe reporting
 * `<html>` with no `lang` and no `<title>` — the server had answered with
 * nothing at all. A warm server passes the same suite in about a minute. That
 * difference, not any single assertion, is what made this suite "flaky in the
 * full run, fine on its own": whether the route had been compiled by some
 * earlier test.
 *
 * `next build` once, then `next start`, removes the variable. It also serves
 * the marketing routes as the static HTML they are meant to be, which closes
 * the window in which `<Suspense fallback={null}>` in the marketing layout
 * leaves a page with no `<main>` after `load`.
 *
 * `E2E_DEV=1` keeps the old behaviour for the edit-and-rerun loop, where
 * rebuilding between runs is the wrong trade. Nothing in CI should set it.
 */
const USE_DEV_SERVER = process.env.E2E_DEV === '1';

/** A build plus a start, so the timeout has to cover compiling the app. */
const WEB_SERVER_TIMEOUT_MS = USE_DEV_SERVER ? 120_000 : 300_000;

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
    command: USE_DEV_SERVER
      ? 'pnpm --filter @mirrorline/web dev'
      : 'pnpm --filter @mirrorline/web build && pnpm --filter @mirrorline/web start',
    url: BASE_URL,
    // Only the dev loop reuses whatever is already on the port. Reusing a
    // server the suite did not start is how a run silently changes what it is
    // testing — a stale dev server on 3000 was exactly the difference between
    // a clean run and a broken one.
    reuseExistingServer: USE_DEV_SERVER && !process.env.CI,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
});
