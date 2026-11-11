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

/* -------------------------------------------------------------------------- */
/* The public hero control                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The hero borrows OpusClip's and Vizard's "the input is the product" device
 * (docs/design/COMPETITOR_REFERENCES.md §2.1). Its rules differ from the
 * studio panel's in one way that matters: it must never vanish. The studio
 * can hide a control this machine cannot honour; a landing page that loses
 * its main action on every deployment cannot.
 */
test('the hero keeps a way in when there is no engine', async ({ page }) => {
  await stubEngine(page, false)
  await page.goto('/')

  // The field is still there — it is the shape of the page, not a feature flag.
  await expect(page.getByText('Drop a talk, podcast or webinar')).toBeVisible()

  // But it does not pretend a run can start here. It offers the pilot instead.
  await expect(page.getByRole('button', { name: 'Cut it up' })).toHaveCount(0)
  await expect(page.getByText(/We run the first cuts with you on a pilot call/)).toBeVisible()
})

test('the hero runs the engine where there is one, behind the rights gate', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  // CLAUDE.md non-negotiable 1 again, on the public page this time: no file
  // and no confirmation means no run, and the form says so before the API
  // has to.
  const cut = page.getByRole('button', { name: 'Cut it up' })
  await expect(cut).toBeVisible()
  await expect(cut).toBeDisabled()

  // The rights gate stays out of the way until there is something to confirm.
  await expect(page.getByLabel('Who owns this footage?')).toHaveCount(0)
})

test('the hero never offers to fetch someone else’s video', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  // Both reference sites take a YouTube URL. We cannot: non-negotiable 1
  // allows only client-owned material. This asserts the absence, because the
  // absence is the product decision — if a link field ever appears here, it
  // is a breach and not a feature.
  await expect(page.locator('input[type="url"]')).toHaveCount(0)
  await expect(page.getByPlaceholder(/paste.*link/i)).toHaveCount(0)
  await expect(page.getByText(/no links to other people’s videos/)).toBeVisible()
})
