import { defineConfig, devices } from '@playwright/test';

import { STUDIO_STORAGE_STATE } from './e2e/helpers/test-accounts';

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
  /**
   * Sweep the test accounts out of the shared preview database, pass or fail.
   * D76 put every preview on one project, so rows left here pile up where real
   * work happens. See `e2e/global-teardown.ts`.
   */
  globalTeardown: './e2e/global-teardown.ts',
  projects: [
    /**
     * Sign in once, before anything else.
     *
     * `/app/*` is behind a session now (B1), and `helpers/routes.ts` feeds 21
     * studio and onboarding routes into the shared route, responsive, a11y and
     * screenshot specs — so without this they all redirect to `/sign-in`.
     *
     * **The session is the default for every project**, which is safe because
     * the marketing pages render the same either way: nothing in the site
     * header is session-aware yet. The exception is the auth pages themselves,
     * where a signed-in visitor is redirected away on purpose — the specs that
     * test `/sign-in` and `/sign-up` clear their cookies first, and say why.
     */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: DESKTOP_VIEWPORT,
        storageState: STUDIO_STORAGE_STATE,
      },
    },
    {
      // `pnpm screenshots` targets this project. e2e/screenshots.spec.ts sets
      // both reference viewports itself (1440x900 and 390x844), so this project
      // needs no `dependencies`. It used to depend on `mobile`; Playwright skips
      // a project whose dependency failed, which meant one failing responsive
      // assertion silently produced no reference PNGs at all.
      name: 'screenshots',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: DESKTOP_VIEWPORT,
        storageState: STUDIO_STORAGE_STATE,
      },
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: MOBILE_VIEWPORT,
        storageState: STUDIO_STORAGE_STATE,
      },
    },
  ],
  webServer: {
    command: USE_DEV_SERVER
      ? 'pnpm --filter @mirrorline/web dev'
      : 'pnpm --filter @mirrorline/web build && pnpm --filter @mirrorline/web start',
    /**
     * The suite runs the co-pilot in sample mode, always, whatever is in
     * `.env.local`.
     *
     * A key landed in `apps/web/.env.local` on 15 November and twelve tests
     * went red in the same run — not because anything broke, but because
     * `/api/copilot/status` correctly answered `live`. Two things were wrong
     * with that, and neither is the tests' fault:
     *
     * 1. **The run made real API calls.** Non-negotiable 11 is "no paid API
     *    calls beyond test mode", and a suite that spends money every time it
     *    runs breaks that quietly, nine hundred tests deep.
     * 2. **It stopped being deterministic.** 18 §8's co-pilot tests are
     *    written against canned mode on purpose: they assert the sample
     *    label, the exact refusal text and the citation that comes with it.
     *    A live model answers differently every time, so with a key those
     *    assertions test the weather.
     *
     * Empty rather than deleted, because `delete process.env.X` in a config
     * mutates the shell the developer is standing in. The adapter treats an
     * empty string as no key — `copilotMode` trims before testing it — so
     * this is the supported sample path rather than a special case.
     *
     * Verifying the live path is a deliberate act with the key put back, not
     * something the default suite should do by accident.
     */
    env: { ANTHROPIC_API_KEY: '' },
    url: BASE_URL,
    // Only the dev loop reuses whatever is already on the port. Reusing a
    // server the suite did not start is how a run silently changes what it is
    // testing — a stale dev server on 3000 was exactly the difference between
    // a clean run and a broken one.
    reuseExistingServer: USE_DEV_SERVER && !process.env.CI,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
});
