/**
 * The upload screen's two modes.
 *
 * The engine only runs where uv and ffmpeg are, which is a developer's
 * machine and not a deployment. That makes the interesting assertion an
 * environment-dependent one, and an environment-dependent test is a coin
 * toss: it would pass on CI for the wrong reason and fail on a laptop that
 * happens to have the binaries.
 *
 * So both modes are driven by stubbing `/api/engine/status`. The test says
 * what the screen does with each answer, and says it the same way everywhere.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'the two modes are the same at any viewport')

const UPLOAD = '/app/upload?state=ready'
const LIVE_HEADING = 'Run the engine on your own video'

async function stubEngine(page: Page, available: boolean) {
  await page.route('**/api/engine/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        available,
        reason: available ? 'everything is here.' : 'uv is not on PATH.',
      }),
    }),
  )
}

test('with no engine, the screen keeps its demo states and offers no upload', async ({ page }) => {
  await stubEngine(page, false)
  await page.goto(UPLOAD)

  // The panel is absent rather than disabled: a disabled control still
  // advertises something this machine cannot do.
  await expect(page.getByRole('heading', { name: LIVE_HEADING })).toHaveCount(0)

  // And the demo path is untouched, which is what a Vercel preview shows.
  await expect(page.getByRole('region', { name: 'Cuts' })).toBeVisible()
})

test('with an engine, the panel appears', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto(UPLOAD)

  await expect(page.getByRole('heading', { name: LIVE_HEADING })).toBeVisible()
})

test('a run cannot start until there is a file and a rights confirmation', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto(UPLOAD)

  // CLAUDE.md non-negotiable 1: only client-owned material. The API refuses
  // without a confirmation, and the form refuses before the API has to.
  const start = page.getByRole('button', { name: 'Make cuts' })
  await expect(start).toBeDisabled()

  await page.getByLabel('Who owns it').fill('Maya Torres Coaching')
  await expect(start).toBeDisabled()

  await page.getByRole('checkbox', { name: /I own this footage/ }).check()
  // Still disabled: there is no file yet. Both halves are required.
  await expect(start).toBeDisabled()
})
